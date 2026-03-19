const { Reminder, ReminderAssignment, ReminderComment, Staff, sequelize } = require('../data');
const { Op } = require('sequelize');

// Atributos del staff para incluir
const STAFF_ATTRS = ['id', 'name', 'role'];

// Incluye assignments + comments + creator en una consulta
const reminderIncludes = (staffId) => [
  { model: Staff, as: 'creator', attributes: STAFF_ATTRS },
  {
    model: ReminderAssignment,
    as: 'assignments',
    include: [{ model: Staff, as: 'staff', attributes: STAFF_ATTRS }],
  },
  {
    model: ReminderComment,
    as: 'comments',
    include: [{ model: Staff, as: 'author', attributes: STAFF_ATTRS }],
    order: [['createdAt', 'ASC']],
  },
];

// Enriquecer con campo myAssignment para el staff autenticado
const enrichWithMine = (reminder, staffId) => {
  const plain = reminder.toJSON ? reminder.toJSON() : reminder;
  plain.myAssignment = plain.assignments?.find(a => a.staff_id === staffId || a.staffId === staffId) || null;
  return plain;
};

module.exports = {

  // GET /reminders — Recordatorios del staff autenticado (pendientes)
  async getMyReminders(req, res) {
    try {
      const staffId = req.staff.id;

      // Buscar recordatorios donde el staff tiene assignment
      const assignments = await ReminderAssignment.findAll({
        where: { staff_id: staffId },
        include: [{
          model: Reminder,
          as: 'reminder',
          include: [
            { model: Staff, as: 'creator', attributes: STAFF_ATTRS },
            { model: ReminderAssignment, as: 'assignments', include: [{ model: Staff, as: 'staff', attributes: STAFF_ATTRS }] },
            { model: ReminderComment, as: 'comments', include: [{ model: Staff, as: 'author', attributes: STAFF_ATTRS }] },
          ]
        }],
        order: [[{ model: Reminder, as: 'reminder' }, 'createdAt', 'DESC']],
      });

      const reminders = assignments.map(a => {
        const r = a.reminder.toJSON();
        r.myAssignment = { completed: a.completed, completedAt: a.completedAt, id: a.id };
        return r;
      });

      res.json({ success: true, reminders });
    } catch (err) {
      console.error('[ReminderController] getMyReminders:', err);
      res.status(500).json({ error: true, message: 'Error obteniendo recordatorios' });
    }
  },

  // GET /reminders/all — Todos los recordatorios (admin/owner)
  async getAllReminders(req, res) {
    try {
      const reminders = await Reminder.findAll({
        include: reminderIncludes(),
        order: [['createdAt', 'DESC']],
      });
      res.json({ success: true, reminders: reminders.map(r => r.toJSON()) });
    } catch (err) {
      console.error('[ReminderController] getAllReminders:', err);
      res.status(500).json({ error: true, message: 'Error obteniendo recordatorios' });
    }
  },

  // POST /reminders — Crear recordatorio
  async createReminder(req, res) {
    try {
      const staffId = req.staff.id;
      const { title, description, type = 'personal', priority = 'medium', dueDate, assignedTo = [],
              linkedEntityType, linkedEntityId, linkedEntityLabel } = req.body;

      if (!title?.trim()) {
        return res.status(400).json({ error: true, message: 'El título es requerido' });
      }

      const reminder = await sequelize.transaction(async (t) => {
        const r = await Reminder.create({
          title: title.trim(),
          description: description?.trim() || null,
          type,
          priority,
          dueDate: dueDate || null,
          createdBy: staffId,
          linkedEntityType: linkedEntityType || null,
          linkedEntityId: linkedEntityId ? String(linkedEntityId) : null,
          linkedEntityLabel: linkedEntityLabel?.trim() || null,
        }, { transaction: t });

        // Determinar a quiénes asignar
        let targetIds = [];
        if (type === 'personal') {
          targetIds = [staffId];
        } else if (type === 'tagged' && assignedTo.length > 0) {
          targetIds = [...new Set([...assignedTo, staffId])]; // incluir creador
        } else if (type === 'broadcast') {
          const allStaff = await Staff.findAll({ attributes: ['id'], where: { isActive: true }, transaction: t });
          targetIds = allStaff.map(s => s.id);
        }

        if (targetIds.length > 0) {
          await ReminderAssignment.bulkCreate(
            targetIds.map(id => ({ reminderId: r.id, staffId: id })),
            { transaction: t, ignoreDuplicates: true }
          );
        }

        return r;
      });

      // Recargar con todo incluido
      const full = await Reminder.findByPk(reminder.id, { include: reminderIncludes() });
      res.status(201).json({ success: true, reminder: enrichWithMine(full, staffId) });
    } catch (err) {
      console.error('[ReminderController] createReminder:', err);
      res.status(500).json({ error: true, message: 'Error creando recordatorio' });
    }
  },

  // PATCH /reminders/:id/complete — Marcar como completado (solo para mi assignment)
  async toggleComplete(req, res) {
    try {
      const staffId = req.staff.id;
      const { id } = req.params;

      const assignment = await ReminderAssignment.findOne({
        where: { reminderId: id, staffId },
      });
      if (!assignment) {
        return res.status(404).json({ error: true, message: 'No tienes acceso a este recordatorio' });
      }

      assignment.completed = !assignment.completed;
      assignment.completedAt = assignment.completed ? new Date() : null;
      await assignment.save();

      res.json({ success: true, completed: assignment.completed, completedAt: assignment.completedAt });
    } catch (err) {
      console.error('[ReminderController] toggleComplete:', err);
      res.status(500).json({ error: true, message: 'Error actualizando estado' });
    }
  },

  // DELETE /reminders/:id — Eliminar (solo creador o admin/owner)
  async deleteReminder(req, res) {
    try {
      const staffId = req.staff.id;
      const role = req.staff.role;
      const { id } = req.params;

      const reminder = await Reminder.findByPk(id);
      if (!reminder) return res.status(404).json({ error: true, message: 'Recordatorio no encontrado' });

      if (reminder.createdBy !== staffId && !['admin', 'owner'].includes(role)) {
        return res.status(403).json({ error: true, message: 'No tienes permiso para eliminar este recordatorio' });
      }

      await reminder.destroy();
      res.json({ success: true, message: 'Recordatorio eliminado' });
    } catch (err) {
      console.error('[ReminderController] deleteReminder:', err);
      res.status(500).json({ error: true, message: 'Error eliminando recordatorio' });
    }
  },

  // POST /reminders/:id/comments — Agregar comentario
  async addComment(req, res) {
    try {
      const staffId = req.staff.id;
      const { id } = req.params;
      const { message } = req.body;

      if (!message?.trim()) {
        return res.status(400).json({ error: true, message: 'El comentario no puede estar vacío' });
      }

      // Verificar que el staff tiene acceso al recordatorio
      const assignment = await ReminderAssignment.findOne({ where: { reminderId: id, staffId } });
      const reminder = await Reminder.findByPk(id);
      if (!reminder) return res.status(404).json({ error: true, message: 'Recordatorio no encontrado' });
      if (!assignment && reminder.createdBy !== staffId) {
        return res.status(403).json({ error: true, message: 'No tienes acceso a este recordatorio' });
      }

      const comment = await ReminderComment.create({
        reminderId: id,
        staffId,
        message: message.trim(),
      });

      const full = await ReminderComment.findByPk(comment.id, {
        include: [{ model: Staff, as: 'author', attributes: STAFF_ATTRS }],
      });

      res.status(201).json({ success: true, comment: full.toJSON() });
    } catch (err) {
      console.error('[ReminderController] addComment:', err);
      res.status(500).json({ error: true, message: 'Error agregando comentario' });
    }
  },

  // DELETE /reminders/:id/comments/:commentId — Eliminar comentario
  async deleteComment(req, res) {
    try {
      const staffId = req.staff.id;
      const role = req.staff.role;
      const { commentId } = req.params;

      const comment = await ReminderComment.findByPk(commentId);
      if (!comment) return res.status(404).json({ error: true, message: 'Comentario no encontrado' });

      if (comment.staffId !== staffId && !['admin', 'owner'].includes(role)) {
        return res.status(403).json({ error: true, message: 'No tienes permiso para eliminar este comentario' });
      }

      await comment.destroy();
      res.json({ success: true });
    } catch (err) {
      console.error('[ReminderController] deleteComment:', err);
      res.status(500).json({ error: true, message: 'Error eliminando comentario' });
    }
  },

  // PATCH /reminders/:id — Editar recordatorio (solo creador o admin/owner)
  async updateReminder(req, res) {
    try {
      const staffId = req.staff.id;
      const role = req.staff.role;
      const { id } = req.params;
      const { title, description, priority, dueDate,
              linkedEntityType, linkedEntityId, linkedEntityLabel } = req.body;

      const reminder = await Reminder.findByPk(id);
      if (!reminder) return res.status(404).json({ error: true, message: 'Recordatorio no encontrado' });

      if (reminder.createdBy !== staffId && !['admin', 'owner'].includes(role)) {
        return res.status(403).json({ error: true, message: 'No tienes permiso para editar este recordatorio' });
      }

      if (title?.trim()) reminder.title = title.trim();
      if (description !== undefined) reminder.description = description?.trim() || null;
      if (priority) reminder.priority = priority;
      if (dueDate !== undefined) reminder.dueDate = dueDate || null;
      // Linked entity (can be cleared by passing linkedEntityType: '')
      if (linkedEntityType !== undefined) {
        reminder.linkedEntityType = linkedEntityType || null;
        reminder.linkedEntityId = linkedEntityId ? String(linkedEntityId) : null;
        reminder.linkedEntityLabel = linkedEntityLabel?.trim() || null;
      }
      await reminder.save();

      const full = await Reminder.findByPk(id, { include: reminderIncludes() });
      res.json({ success: true, reminder: enrichWithMine(full, staffId) });
    } catch (err) {
      console.error('[ReminderController] updateReminder:', err);
      res.status(500).json({ error: true, message: 'Error actualizando recordatorio' });
    }
  },
};
