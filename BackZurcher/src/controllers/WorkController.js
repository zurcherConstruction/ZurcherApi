const { Work, Permit } = require('../data');

// Crear una nueva obra
const createWork = async (req, res) => {
  try {
    const { propertyAddress, status, startDate, endDate, notes } = req.body;

    // Verificar que el permiso asociado exista
    const permit = await Permit.findOne({ where: { propertyAddress } });
    if (!permit) {
      return res.status(404).json({ error: true, message: 'Permiso no encontrado para esta dirección' });
    }

    // Crear la obra
    const work = await Work.create({ propertyAddress, status, startDate, endDate, notes });
    res.status(201).json(work);
  } catch (error) {
    console.error('Error al crear la obra:', error);
    res.status(500).json({ error: true, message: 'Error interno del servidor' });
  }
};

// Obtener todas las obras
const getWorks = async (req, res) => {
  try {
    const works = await Work.findAll();
    res.status(200).json(works);
  } catch (error) {
    console.error('Error al obtener las obras:', error);
    res.status(500).json({ error: true, message: 'Error interno del servidor' });
  }
};

// Obtener una obra por ID
const getWorkById = async (req, res) => {
  try {
    const { id } = req.params;
    const work = await Work.findByPk(id);

    if (!work) {
      return res.status(404).json({ error: true, message: 'Obra no encontrada' });
    }

    res.status(200).json(work);
  } catch (error) {
    console.error('Error al obtener la obra:', error);
    res.status(500).json({ error: true, message: 'Error interno del servidor' });
  }
};

// Actualizar una obra
const updateWork = async (req, res) => {
  try {
    const { id } = req.params;
    const { propertyAddress, status, startDate, endDate, notes } = req.body;

    const work = await Work.findByPk(id);
    if (!work) {
      return res.status(404).json({ error: true, message: 'Obra no encontrada' });
    }

    // Actualizar los campos
    work.propertyAddress = propertyAddress || work.propertyAddress;
    work.status = status || work.status;
    work.startDate = startDate || work.startDate;
    work.endDate = endDate || work.endDate;
    work.notes = notes || work.notes;

    await work.save();
    res.status(200).json(work);
  } catch (error) {
    console.error('Error al actualizar la obra:', error);
    res.status(500).json({ error: true, message: 'Error interno del servidor' });
  }
};

// Eliminar una obra
const deleteWork = async (req, res) => {
  try {
    const { id } = req.params;

    const work = await Work.findByPk(id);
    if (!work) {
      return res.status(404).json({ error: true, message: 'Obra no encontrada' });
    }

    await work.destroy();
    res.status(200).json({ message: 'Obra eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar la obra:', error);
    res.status(500).json({ error: true, message: 'Error interno del servidor' });
  }
};

module.exports = {
  createWork,
  getWorks,
  getWorkById,
  updateWork,
  deleteWork,
};