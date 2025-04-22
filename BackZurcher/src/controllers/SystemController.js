const { SystemType } = require('../data');

const SystemController = {
  // Crear un nuevo SystemType
  async createSystemType(req, res) {
    try {
      const { name, price } = req.body;

      const newSystemType = await SystemType.create({ name, price });

      res.status(201).json({
        message: 'SystemType creado exitosamente.',
        systemType: newSystemType,
      });
    } catch (error) {
      console.error('Error al crear SystemType:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // Obtener todos los SystemType
  async getSystemTypes(req, res) {
    try {
      const systemTypes = await SystemType.findAll();
      res.status(200).json(systemTypes);
    } catch (error) {
      console.error('Error al obtener SystemTypes:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // Obtener un SystemType por su ID
  async getSystemTypeById(req, res) {
    try {
      const { id } = req.params;
      const systemType = await SystemType.findByPk(id);

      if (!systemType) {
        return res.status(404).json({ message: 'SystemType no encontrado.' });
      }

      res.status(200).json(systemType);
    } catch (error) {
      console.error('Error al obtener SystemType por ID:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // Actualizar un SystemType existente
  async updateSystemType(req, res) {
    try {
      const { id } = req.params;
      const { name, price } = req.body;

      const systemType = await SystemType.findByPk(id);

      if (!systemType) {
        return res.status(404).json({ message: 'SystemType no encontrado.' });
      }

      await systemType.update({ name, price });

      res.status(200).json({
        message: 'SystemType actualizado exitosamente.',
        systemType: systemType,
      });
    } catch (error) {
      console.error('Error al actualizar SystemType:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // Eliminar un SystemType
  async deleteSystemType(req, res) {
    try {
      const { id } = req.params;
      const systemType = await SystemType.findByPk(id);

      if (!systemType) {
        return res.status(404).json({ message: 'SystemType no encontrado.' });
      }

      await systemType.destroy();

      res.status(200).json({ message: 'SystemType eliminado exitosamente.' });
    } catch (error) {
      console.error('Error al eliminar SystemType:', error);
      res.status(500).json({ error: error.message });
    }
  },
};

module.exports = SystemController;