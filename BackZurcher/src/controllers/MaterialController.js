const { Material, Work, MaterialSet } = require('../data');

const createMaterialSet = async (req, res) => {
  try {
    const { materials, workId, purchaseDate } = req.body;

    // Crear el conjunto de materiales con staffId
    const materialSet = await MaterialSet.create({
      workId,
      purchaseDate,
      staffId: req.user?.id, // Agregar staffId del usuario autenticado
    });

    // Asociar los materiales al conjunto
    const materialsToSave = materials.map((material) => ({
      name: material.material,
      quantity: material.quantity,
      comment: material.comment || "",
      materialSetId: materialSet.idMaterialSet,
      staffId: req.user?.id, // Agregar staffId para cada material
    }));

    const savedMaterials = await Material.bulkCreate(materialsToSave);

    res.status(201).json({
      message: 'Conjunto de materiales guardado exitosamente.',
      materialSet,
      materials: savedMaterials,
    });
  } catch (error) {
    console.error('Error al guardar el conjunto de materiales:', error);
    res.status(500).json({ error: 'Error al guardar el conjunto de materiales.' });
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
    const { name, quantity, cost } = req.body;

    // Verificar que el material exista
    const material = await Material.findByPk(id);
    if (!material) {
      return res.status(404).json({ error: true, message: 'Material no encontrado' });
    }

    // Actualizar el material con staffId
    material.name = name || material.name;
    material.quantity = quantity || material.quantity;
    material.cost = cost || material.cost;
    material.staffId = req.user?.id; // Agregar staffId del usuario que actualiza
    await material.save();

    res.status(200).json(material);
  } catch (error) {
    console.error('Error al actualizar el material:', error);
    res.status(500).json({ error: true, message: 'Error interno del servidor' });
  }
};

module.exports = {
  createMaterialSet,
  getMaterialsByWork,
  updateMaterial,
};
