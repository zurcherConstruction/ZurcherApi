const jwt = require('jsonwebtoken');
const {Staff} = require('../data'); // Asegúrate de que la ruta sea correcta
require('dotenv').config();

const verifyToken = async (req, res, next) => {
  try {
    const authorization = req.headers.authorization;

    if (!authorization) {
      return res.status(401).json({
        error: true,
        message: 'Sesión expirada. Por favor cierre sesión e inicie sesión nuevamente.',
      });
    }

    const token = authorization.split(' ')[1];
    jwt.verify(token, process.env.JWT_SECRET_KEY, async (err, decoded) => {
      if (err) {
        return res.status(401).json({
          error: true,
          message: 'Sesión expirada. Por favor cierre sesión e inicie sesión nuevamente.',
        });
      }

      // Buscar el Staff en la base de datos
      const staff = await Staff.findByPk(decoded.id);
      if (!staff) {
        return res.status(401).json({
          error: true,
          message: 'Usuario no encontrado. Por favor inicie sesión nuevamente.',
        });
      }

      // Asignar el Staff autenticado a req.staff Y req.user (para compatibilidad)
      req.staff = staff;
      req.user = staff; // ✅ Agregar también a req.user para compatibilidad
      next();
    });
  } catch (error) {
    console.error('❌ [AUTH] Error de autenticación:', error);
    return res.status(500).json({
      error: true,
      message: 'Error interno del servidor',
    });
  }
};


const generateToken = (staffData) => {
  return jwt.sign(
    {
      id: staffData.id,
      role: staffData.role,
      email: staffData.email
    },
    process.env.JWT_SECRET_KEY,
    { expiresIn: '7d' } // ⏰ Cambiado de 24h a 7 días para app móvil
  );
};

module.exports = { verifyToken, generateToken };


