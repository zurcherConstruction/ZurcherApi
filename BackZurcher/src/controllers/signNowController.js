const SignNowService = require('../services/ServiceSignNow')

const signNowController = {
  // Test de conexión
  async testConnection(req, res) {
    try {
      const signNowService = new SignNowService();
      const result = await signNowService.testConnection();
      
      if (result.success) {
        res.json({
          success: true,
          message: 'Conexión con SignNow exitosa',
          data: result
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Error conectando con SignNow',
          error: result.error
        });
      }
    } catch (error) {
      console.error('Error en test de conexión:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }
};

module.exports = signNowController;
//probando // Este controlador maneja las rutas relacionadas con SignNow, como la prueba de conexión.