const { Material, Work } = require('../data');

const createMaterial = async (req, res) => {
  try {
    const { workId, name, quantity, unit, cost } = req.body;

    // Verificar que la obra (Work) exista
    const work = await Work.findByPk(workId);
    if (!work) {
      return res.status(404).json({ error: true, message: 'Obra no encontrada' });
    }

    // Crear el material
    const material = await Material.create({ workId, name, quantity, unit, cost });
    res.status(201).json(material);
  } catch (error) {
    console.error('Error al crear el material:', error);
    res.status(500).json({ error: true, message: 'Error interno del servidor' });
  }
};

const getMaterialsByWork = async (req, res) => {
  try {
    const { workId } = req.params;

    // Verificar que la obra (Work) exista
    const work = await Work.findByPk(workId);
    if (!work) {
      return res.status(404).json({ error: true, message: 'Obra no encontrada' });
    }

    // Obtener los materiales asociados a la obra
    const materials = await Material.findAll({ where: { workId } });
    res.status(200).json(materials);
  } catch (error) {
    console.error('Error al obtener materiales:', error);
    res.status(500).json({ error: true, message: 'Error interno del servidor' });
  }
};

const updateMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, quantity, unit, cost } = req.body;

    // Verificar que el material exista
    const material = await Material.findByPk(id);
    if (!material) {
      return res.status(404).json({ error: true, message: 'Material no encontrado' });
    }

    // Actualizar el material
    material.name = name || material.name;
    material.quantity = quantity || material.quantity;
    material.unit = unit || material.unit;
    material.cost = cost || material.cost;
    await material.save();

    res.status(200).json(material);
  } catch (error) {
    console.error('Error al actualizar el material:', error);
    res.status(500).json({ error: true, message: 'Error interno del servidor' });
  }
};

module.exports = {
  createMaterial,
  getMaterialsByWork,
  updateMaterial,
};
