const { WorkNote, Work, Staff, Notification, sequelize } = require('../data');
const { Op } = require('sequelize');

// 🔧 Helper: Extraer menciones @usuario del mensaje
const extractMentions = (message) => {
  const mentionRegex = /@(\w+)/g;
  const mentions = [];
  let match;
  while ((match = mentionRegex.exec(message)) !== null) {
    mentions.push(match[1]); // match[1] es el nombre después de @
  }
  return mentions;
};

// 🔧 Helper: Encontrar IDs de staff por nombres mencionados
const findStaffByNames = async (names) => {
  if (!names || names.length === 0) return [];
  
  const staff = await Staff.findAll({
    where: {
      [Op.or]: names.map(name => ({
        name: {
          [Op.iLike]: `%${name}%` // Búsqueda case-insensitive individual
        }
      })),
      isActive: true
    },
    attributes: ['id', 'name']
  });
  
  return staff;
};

const WorkNoteController = {
  
  // 📝 Crear una nueva nota de seguimiento
  async createNote(req, res) {
    try {
      const { workId, message, noteType, priority, relatedStatus } = req.body;
      const staffId = req.user?.id; // ID del usuario autenticado

      // Validaciones
      if (!workId || !message) {
        return res.status(400).json({ 
          error: 'workId y message son requeridos' 
        });
      }

      if (!staffId) {
        return res.status(401).json({ 
          error: 'Usuario no autenticado' 
        });
      }

      // Verificar que la obra existe
      const work = await Work.findByPk(workId);
      if (!work) {
        return res.status(404).json({ 
          error: 'Obra no encontrada' 
        });
      }

      // 👥 Detectar menciones en el mensaje
      const mentionedNames = extractMentions(message);
      const mentionedStaff = await findStaffByNames(mentionedNames);
      const mentionedStaffIds = mentionedStaff.map(s => s.id);

      // Crear la nota
      const note = await WorkNote.create({
        workId,
        staffId,
        message: message.trim(),
        noteType: noteType || 'follow_up',
        priority: priority || 'medium',
        relatedStatus: relatedStatus || work.status,
        isResolved: false,
        mentionedStaffIds // Guardar IDs de mencionados
      });

      // 🔔 Crear notificaciones para usuarios mencionados
      if (mentionedStaffIds.length > 0) {
        const author = await Staff.findByPk(staffId, { attributes: ['name'] });
        const notificationPromises = mentionedStaffIds.map(mentionedId => {
          // No notificar al autor si se menciona a sí mismo
          if (mentionedId === staffId) return null;
          
          return Notification.create({
            staffId: mentionedId,
            senderId: staffId, // 👤 ID del autor que menciona
            type: 'mention',
            title: `${author?.name || 'Alguien'} te mencionó en un seguimiento de obra`,
            message: `📍 ${work.propertyAddress || `Obra #${workId}`}: ${message.substring(0, 80)}${message.length > 80 ? '...' : ''}`,
            relatedId: workId,
            relatedType: 'work_note',
            isRead: false
          });
        });

        await Promise.all(notificationPromises.filter(p => p !== null));
      }

      // Cargar la nota con el autor para devolverla completa
      const noteWithAuthor = await WorkNote.findByPk(note.id, {
        include: [
          {
            model: Staff,
            as: 'author',
            attributes: ['id', 'name', 'email']
          }
        ]
      });

      res.status(201).json({
        message: 'Nota de seguimiento creada exitosamente',
        note: noteWithAuthor
      });

    } catch (error) {
      console.error('Error al crear nota de seguimiento:', error);
      res.status(500).json({ 
        error: 'Error al crear la nota de seguimiento',
        details: error.message 
      });
    }
  },

  // 📋 Obtener todas las notas de una obra
  async getNotesByWork(req, res) {
    try {
      const { workId } = req.params;
      const { noteType, priority, unresolved } = req.query;

      // Construir filtros
      const whereClause = { workId };
      
      if (noteType && noteType !== 'all') {
        whereClause.noteType = noteType;
      }
      
      if (priority && priority !== 'all') {
        whereClause.priority = priority;
      }
      
      if (unresolved === 'true') {
        whereClause.isResolved = false;
      }

      const notes = await WorkNote.findAll({
        where: whereClause,
        include: [
          {
            model: Staff,
            as: 'author',
            attributes: ['id', 'name', 'email']
          },
          {
            model: Work,
            as: 'work',
            attributes: ['idWork', 'propertyAddress', 'status'] // 🆕 Incluir propertyAddress
          }
        ],
        order: [['createdAt', 'DESC']] // Más recientes primero
      });

      res.status(200).json({
        count: notes.length,
        notes
      });

    } catch (error) {
      console.error('Error al obtener notas:', error);
      res.status(500).json({ 
        error: 'Error al obtener las notas',
        details: error.message 
      });
    }
  },

  // 🔍 Obtener una nota específica
  async getNoteById(req, res) {
    try {
      const { noteId } = req.params;

      const note = await WorkNote.findByPk(noteId, {
        include: [
          {
            model: Staff,
            as: 'author',
            attributes: ['id', 'name', 'email']
          },
          {
            model: Work,
            as: 'work',
            attributes: ['idWork', 'propertyAddress', 'status']
          }
        ]
      });

      if (!note) {
        return res.status(404).json({ 
          error: 'Nota no encontrada' 
        });
      }

      res.status(200).json(note);

    } catch (error) {
      console.error('Error al obtener nota:', error);
      res.status(500).json({ 
        error: 'Error al obtener la nota',
        details: error.message 
      });
    }
  },

  // ✏️ Actualizar una nota (solo el autor o admin)
  async updateNote(req, res) {
    try {
      const { noteId } = req.params;
      const { message, noteType, priority, isResolved } = req.body;
      const staffId = req.user?.id;

      const note = await WorkNote.findByPk(noteId);

      if (!note) {
        return res.status(404).json({ 
          error: 'Nota no encontrada' 
        });
      }

      // Verificar que el usuario es el autor o admin
      const isAdmin = req.user?.role === 'admin';
      const isAuthor = note.staffId === staffId;

      if (!isAdmin && !isAuthor) {
        return res.status(403).json({ 
          error: 'No tienes permiso para editar esta nota' 
        });
      }

      // Actualizar campos permitidos
      const updates = {};
      if (message !== undefined) updates.message = message.trim();
      if (noteType !== undefined) updates.noteType = noteType;
      if (priority !== undefined) updates.priority = priority;
      if (isResolved !== undefined) updates.isResolved = isResolved;

      await note.update(updates);

      // Recargar con autor
      const updatedNote = await WorkNote.findByPk(noteId, {
        include: [
          {
            model: Staff,
            as: 'author',
            attributes: ['id', 'name', 'email']
          }
        ]
      });

      res.status(200).json({
        message: 'Nota actualizada exitosamente',
        note: updatedNote
      });

    } catch (error) {
      console.error('Error al actualizar nota:', error);
      res.status(500).json({ 
        error: 'Error al actualizar la nota',
        details: error.message 
      });
    }
  },

  // 🗑️ Eliminar una nota (solo el autor o admin)
  async deleteNote(req, res) {
    try {
      const { noteId } = req.params;
      const staffId = req.user?.id;

      const note = await WorkNote.findByPk(noteId);

      if (!note) {
        return res.status(404).json({ 
          error: 'Nota no encontrada' 
        });
      }

      // Verificar que el usuario es el autor o admin
      const isAdmin = req.user?.role === 'admin';
      const isAuthor = note.staffId === staffId;

      if (!isAdmin && !isAuthor) {
        return res.status(403).json({ 
          error: 'No tienes permiso para eliminar esta nota' 
        });
      }

      await note.destroy();

      res.status(200).json({
        message: 'Nota eliminada exitosamente'
      });

    } catch (error) {
      console.error('Error al eliminar nota:', error);
      res.status(500).json({ 
        error: 'Error al eliminar la nota',
        details: error.message 
      });
    }
  },

  // 📊 Obtener estadísticas de seguimiento
  async getFollowUpStats(req, res) {
    try {
      const { workId } = req.params;

      const stats = await WorkNote.findAll({
        where: { workId },
        attributes: [
          'noteType',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['noteType']
      });

      // Última nota
      const lastNote = await WorkNote.findOne({
        where: { workId },
        order: [['createdAt', 'DESC']],
        attributes: ['createdAt', 'noteType', 'message'],
        include: [
          {
            model: Staff,
            as: 'author',
            attributes: ['name']
          }
        ]
      });

      // Problemas sin resolver
      const unresolvedProblems = await WorkNote.count({
        where: {
          workId,
          noteType: 'problem',
          isResolved: false
        }
      });

      res.status(200).json({
        stats,
        lastNote,
        unresolvedProblems,
        totalNotes: await WorkNote.count({ where: { workId } })
      });

    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      res.status(500).json({ 
        error: 'Error al obtener estadísticas',
        details: error.message 
      });
    }
  },

  // 👥 Obtener lista de staff activo para menciones
  async getActiveStaff(req, res) {
    try {
      const staff = await Staff.findAll({
        where: { isActive: true },
        attributes: ['id', 'name', 'email', 'role'],
        order: [['name', 'ASC']]
      });

      res.status(200).json(staff);

    } catch (error) {
      console.error('Error al obtener staff activo:', error);
      res.status(500).json({ 
        error: 'Error al obtener lista de staff',
        details: error.message 
      });
    }
  }
};

module.exports = WorkNoteController;
