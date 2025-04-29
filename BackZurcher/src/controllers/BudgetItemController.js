const {BudgetItem} = require('../data'); // Asegúrate de que la ruta sea correcta

const budgetItemController = {
  // --- CREAR un nuevo BudgetItem ---
  async createBudgetItem(req, res) {
    try {
      const {
        name,
        description,
        category,
        marca, // Opcional
        capacity,    // Opcional
        unitPrice,
        unit,        // Opcional
        supplierName, // Opcional
        supplierLocation // Opcional
        // isActive se establece por defecto en true
      } = req.body;

      // Validación básica de campos requeridos
      if (!name || !category || unitPrice === undefined || unitPrice === null) {
        return res.status(400).json({ error: 'Faltan campos obligatorios: name,  category, unitPrice.' });
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
        isActive: true // Asegurar que se cree como activo
      });

      res.status(201).json(newItem);
    } catch (error) {
      console.error("Error al crear BudgetItem:", error);
      // Manejar error de unicidad si el 'name' ya existe
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
      const { active = 'true' } = req.query; // Por defecto solo activos
      const whereCondition = {};

      if (active === 'true') {
        whereCondition.isActive = true;
      } else if (active === 'false') {
         whereCondition.isActive = false;
      } // Si active es diferente, trae todos

      const items = await BudgetItem.findAll({ where: whereCondition });
      res.status(200).json(items);
    } catch (error) {
      console.error("Error al obtener BudgetItems:", error);
      res.status(500).json({ error: 'Error interno del servidor al obtener los items.' });
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
      const fieldsToUpdate = req.body;

      // No permitir actualizar el ID
      delete fieldsToUpdate.id;

      // Validar que al menos se envíe un campo para actualizar
      if (Object.keys(fieldsToUpdate).length === 0) {
          return res.status(400).json({ error: 'No se proporcionaron campos para actualizar.' });
      }

      const [updated] = await BudgetItem.update(fieldsToUpdate, {
        where: { id }
      });

      if (!updated) {
        return res.status(404).json({ error: 'BudgetItem no encontrado para actualizar.' });
      }

      const updatedItem = await BudgetItem.findByPk(id); // Devolver el item actualizado
      res.status(200).json(updatedItem);
    } catch (error) {
      console.error("Error al actualizar BudgetItem:", error);
       // Manejar error de unicidad si se intenta cambiar a un 'name' que ya existe
       if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({ error: `El nombre del item '${req.body.name}' ya existe.` });
    }
      res.status(500).json({ error: 'Error interno del servidor al actualizar el item.' });
    }
  },

  // --- ELIMINAR un BudgetItem por ID (Soft Delete recomendado) ---
  async deleteBudgetItem(req, res) {
    try {
      const { id } = req.params;

      // Opción 1: Soft Delete (Marcar como inactivo) - RECOMENDADO
    //   const [updated] = await BudgetItem.update({ isActive: false }, {
    //      where: { id }
    //   });

    //    if (!updated) {
    //      return res.status(404).json({ error: 'BudgetItem no encontrado para desactivar.' });
    //    }
    //    res.status(200).json({ message: 'BudgetItem desactivado correctamente.' });


      // Opción 2: Hard Delete (Eliminar permanentemente) - Usar con precaución
      
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