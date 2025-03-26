const { Work, Permit, Budget } = require('../data');


const createWork = async (req, res) => {
  try {
    const { idBudget } = req.body;

    // Buscar el presupuesto con estado "approved"
    const budget = await Budget.findOne({
      where: { idBudget, status: 'approved' },
      include: [{ model: Permit }], // Incluir el permiso relacionado
    });

    if (!budget) {
      return res.status(404).json({ error: true, message: 'Presupuesto no encontrado o no aprobado' });
    }

    // Verificar si ya existe un Work asociado al Budget
    const existingWork = await Work.findOne({ where: { propertyAddress: budget.propertyAddress } });
    if (existingWork) {
      return res.status(400).json({ error: true, message: 'Ya existe una obra asociada a este presupuesto' });
    }

    // Crear la obra
    const work = await Work.create({
      propertyAddress: budget.propertyAddress,
      status: 'pending', // Estado inicial
      idPermit: budget.permit?.idPermit || null, // Asociar el permiso si existe
      notes: `Obra creada desde el presupuesto ${idBudget}`,
    });

    res.status(201).json({ message: 'Obra creada correctamente', work });
  } catch (error) {
    console.error('Error al crear la obra desde el presupuesto aprobado:', error);
    res.status(500).json({ error: true, message: 'Error interno del servidor' });
  }
};

// Obtener todas las obras
const getWorks = async (req, res) => {
  try {
    const works = await Work.findAll({
      include: [
        {
          model: Budget,
          as: 'budget', // Alias definido en la relación
          attributes: ['idBudget', 'propertyAddress', 'status', 'price'], // Campos relevantes del presupuesto
        },
        {
          model: Permit,
          
          attributes: ['idPermit', 'propertyAddress'], // Campos relevantes del permiso
        },
      ],
    });
    res.status(200).json(works);
  } catch (error) {
    console.error('Error al obtener las obras:', error);
    res.status(500).json({ error: true, message: 'Error interno del servidor' });
  }
};

// Obtener una obra por ID
const getWorkById = async (req, res) => {
  try {
    const { idWork } = req.params;
    const work = await Work.findByPk(idWork, {
      include: [
        {
          model: Budget,
          as: 'budget', // Alias definido en la relación
          attributes: ['idBudget', 'propertyAddress', 'status', 'price'], // Campos relevantes del presupuesto
        },
        {
          model: Permit,
          
          attributes: ['idPermit',  'propertyAddress'], // Campos relevantes del permiso
        },
      ],
    });

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
    const { idWork } = req.params;
    const { propertyAddress, status, startDate,  notes } = req.body;

    const work = await Work.findByPk(idWork);
    if (!work) {
      return res.status(404).json({ error: true, message: 'Obra no encontrada' });
    }

    // Actualizar los campos
    work.propertyAddress = propertyAddress || work.propertyAddress;
    work.status = status || work.status;
    work.startDate = startDate || work.startDate;
   
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
    const { idWork } = req.params;

    const work = await Work.findByPk(idWork);
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