const { BudgetItem } = require('../data');
const { uploadBufferToCloudinary } = require('../utils/cloudinaryUploader');

const budgetItemController = {
  // --- CREAR un nuevo BudgetItem ---
  async createBudgetItem(req, res) {
    try {
      const {
        name,
        description,
        category,
        marca,
        capacity,
        unitPrice,
        unit,
        supplierName,
        supplierLocation
      } = req.body;

      // Validación básica de campos requeridos
      if (!name || !category || unitPrice === undefined || unitPrice === null) {
        return res.status(400).json({ error: 'Faltan campos obligatorios: name,  category, unitPrice.' });
      }

      let imageUrl = null;
      // Si se envía archivo (imagen), subir a Cloudinary
      if (req.file && req.file.buffer) {
        try {
          const uploadResult = await uploadBufferToCloudinary(req.file.buffer, {
            folder: 'budget_items',
            resource_type: 'image',
          });
          imageUrl = uploadResult.secure_url;
        } catch (err) {
          console.error('Error subiendo imagen a Cloudinary:', err);
          return res.status(500).json({ error: 'Error al subir la imagen.' });
        }
      }

      const newItem = await BudgetItem.create({
        name,
        description,
        category,
        marca,
        capacity,
        unitPrice,
        unit,
        supplierName,
        supplierLocation,
        imageUrl,
        isActive: true
      });

      res.status(201).json(newItem);
    } catch (error) {
      console.error("Error al crear BudgetItem:", error);
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({ error: `El nombre del item '${req.body.name}' ya existe.` });
      }
      res.status(500).json({ error: 'Error interno del servidor al crear el item.' });
    }
  },

  // --- OBTENER todos los BudgetItems (activos por defecto) ---
  async getBudgetItems(req, res) {
    try {
      // Podrías añadir filtros por query params, ej: /budget-items?category=SystemType&active=true
      const { active = 'true', category } = req.query; // Por defecto solo activos
      const whereCondition = {};

      if (active === 'true') {
        whereCondition.isActive = true;
      } else if (active === 'false') {
         whereCondition.isActive = false;
      }
      if (category) {
        whereCondition.category = category;
      }

      const items = await BudgetItem.findAll({ 
        where: whereCondition,
        order: [['category', 'ASC'], ['name', 'ASC']]
      });
      res.status(200).json(items);
    } catch (error) {
      console.error("Error al obtener BudgetItems:", error);
      res.status(500).json({ error: 'Error interno del servidor al obtener los items.' });
    }
  },

   // --- OBTENER BudgetItems por categoría ---
  async getBudgetItemsByCategory(req, res) {
    try {
      const { category } = req.params;
      const { active = 'true' } = req.query;
      
      const whereCondition = { category };
      
      if (active === 'true') {
        whereCondition.isActive = true;
      } else if (active === 'false') {
        whereCondition.isActive = false;
      }

      const items = await BudgetItem.findAll({ 
        where: whereCondition,
        order: [['name', 'ASC']]
      });
      
      res.status(200).json(items);
    } catch (error) {
      console.error("Error al obtener BudgetItems por categoría:", error);
      res.status(500).json({ error: 'Error interno del servidor al obtener los items por categoría.' });
    }
  },

  // --- OBTENER todas las categorías disponibles ---
  async getCategories(req, res) {
    try {
      const categories = await BudgetItem.findAll({
        attributes: ['category'],
        where: { isActive: true },
        group: ['category'],
        order: [['category', 'ASC']]
      });
      
      const categoryNames = categories.map(item => item.category);
      res.status(200).json(categoryNames);
    } catch (error) {
      console.error("Error al obtener categorías:", error);
      res.status(500).json({ error: 'Error interno del servidor al obtener las categorías.' });
    }
  },

  // --- OBTENER un BudgetItem por ID ---
  async getBudgetItemById(req, res) {
    try {
      const { id } = req.params;
      const item = await BudgetItem.findByPk(id);

      if (!item) {
        return res.status(404).json({ error: 'BudgetItem no encontrado.' });
      }

      res.status(200).json(item);
    } catch (error) {
      console.error("Error al obtener BudgetItem por ID:", error);
      res.status(500).json({ error: 'Error interno del servidor.' });
    }
  },

  // --- ACTUALIZAR un BudgetItem por ID ---
async updateBudgetItem(req, res) {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      category,
      marca,
      capacity,
      unitPrice,
      unit,
      supplierName,
      supplierLocation
    } = req.body;

    const item = await BudgetItem.findByPk(id);
    if (!item) {
      return res.status(404).json({ error: 'Item no encontrado' });
    }

    let imageUrl = item.imageUrl; // Mantener la imagen existente por defecto

    // Si se envía archivo (imagen), subir a Cloudinary
    if (req.file && req.file.buffer) {
      try {
        const uploadResult = await uploadBufferToCloudinary(req.file.buffer, 'budget_items');
        imageUrl = uploadResult.secure_url;
      } catch (uploadError) {
        console.error('Error al subir imagen:', uploadError);
        return res.status(500).json({ error: 'Error al subir la imagen' });
      }
    }

    const updatedItem = await item.update({
      name: name || item.name,
      description: description || item.description,
      category: category || item.category,
      marca: marca || item.marca,
      capacity: capacity || item.capacity,
      unitPrice: unitPrice !== undefined ? unitPrice : item.unitPrice,
      unit: unit || item.unit,
      supplierName: supplierName || item.supplierName,
      supplierLocation: supplierLocation || item.supplierLocation,
      imageUrl
    });

    res.json(updatedItem);
  } catch (error) {
    console.error("Error al actualizar BudgetItem:", error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'Ya existe un item con ese nombre en esa categoría.' });
    }
    res.status(500).json({ error: 'Error interno del servidor al actualizar el item.' });
  }
},

   // --- SOFT DELETE: Desactivar item ---
  async deactivateBudgetItem(req, res) {
    try {
      const { id } = req.params;
      
      const [updated] = await BudgetItem.update(
        { isActive: false }, 
        { where: { id } }
      );

      if (!updated) {
        return res.status(404).json({ error: 'BudgetItem no encontrado.' });
      }

      const deactivatedItem = await BudgetItem.findByPk(id);
      res.status(200).json({ message: 'Item desactivado exitosamente', item: deactivatedItem });
    } catch (error) {
      console.error("Error al desactivar BudgetItem:", error);
      res.status(500).json({ error: 'Error interno del servidor al desactivar el item.' });
    }
  },

  // --- ACTIVAR item ---
  async activateBudgetItem(req, res) {
    try {
      const { id } = req.params;
      
      const [updated] = await BudgetItem.update(
        { isActive: true }, 
        { where: { id } }
      );

      if (!updated) {
        return res.status(404).json({ error: 'BudgetItem no encontrado.' });
      }

      const activatedItem = await BudgetItem.findByPk(id);
      res.status(200).json({ message: 'Item activado exitosamente', item: activatedItem });
    } catch (error) {
      console.error("Error al activar BudgetItem:", error);
      res.status(500).json({ error: 'Error interno del servidor al activar el item.' });
    }
  },


  // --- ELIMINAR un BudgetItem por ID (Soft Delete recomendado) ---
  async deleteBudgetItem(req, res) {
    try {
      const { id } = req.params;
      
      const deleted = await BudgetItem.destroy({
        where: { id }
      });

      if (!deleted) {
        return res.status(404).json({ error: 'BudgetItem no encontrado para eliminar.' });
      }
      res.status(204).send(); // No content
      

    } catch (error) {
      console.error("Error al eliminar BudgetItem:", error);
      res.status(500).json({ error: 'Error interno del servidor al eliminar el item.' });
    }
  },
};

module.exports = budgetItemController;