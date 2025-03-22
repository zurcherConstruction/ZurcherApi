const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);
  
    // Handle Sequelize validation errors
    if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        error: true,
        message: err.errors.map(e => e.message).join(', ')
      });
    }
  
    // Handle custom errors
    if (err.status) {
      return res.status(err.status).json({
        error: true,
        message: err.message
      });
    }
  
    // Handle all other errors
    return res.status(500).json({
      error: true,
      message: 'Error interno del servidor'
    });
  };
  
  module.exports = errorHandler;