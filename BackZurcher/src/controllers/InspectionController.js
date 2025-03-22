const { Inspection, Work } = require('../data');

const createInspection = async (req, res) => {
  try {
    const { workId, type, dateRequested, dateCompleted, status, notes } = req.body;

    // Verificar que la obra (Work) exista
    const work = await Work.findByPk(workId);
    if (!work) {
      return res.status(404).json({ error: true, message: 'Obra no encontrada' });
    }

    // Crear la inspección
    const inspection = await Inspection.create({
      workId,
      type,
      dateRequested,
      dateCompleted,
      status,
      notes,
    });

    res.status(201).json(inspection);
  } catch (error) {
    console.error('Error al crear la inspección:', error);
    res.status(500).json({ error: true, message: 'Error interno del servidor' });
  }
};

const getInspectionsByWork = async (req, res) => {
  try {
    const { workId } = req.params;

    // Verificar que la obra (Work) exista
    const work = await Work.findByPk(workId);
    if (!work) {
      return res.status(404).json({ error: true, message: 'Obra no encontrada' });
    }

    // Obtener las inspecciones asociadas a la obra
    const inspections = await Inspection.findAll({ where: { workId } });
    res.status(200).json(inspections);
  } catch (error) {
    console.error('Error al obtener inspecciones:', error);
    res.status(500).json({ error: true, message: 'Error interno del servidor' });
  }
};

const updateInspection = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, dateRequested, dateCompleted, status, notes } = req.body;

    // Verificar que la inspección exista
    const inspection = await Inspection.findByPk(id);
    if (!inspection) {
      return res.status(404).json({ error: true, message: 'Inspección no encontrada' });
    }

    // Actualizar la inspección
    inspection.type = type || inspection.type;
    inspection.dateRequested = dateRequested || inspection.dateRequested;
    inspection.dateCompleted = dateCompleted || inspection.dateCompleted;
    inspection.status = status || inspection.status;
    inspection.notes = notes || inspection.notes;

    await inspection.save();

    res.status(200).json(inspection);
  } catch (error) {
    console.error('Error al actualizar la inspección:', error);
    res.status(500).json({ error: true, message: 'Error interno del servidor' });
  }
};

module.exports = {
  createInspection,
  getInspectionsByWork,
  updateInspection,
};