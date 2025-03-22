const jwt = require('jsonwebtoken');
require('dotenv').config();

const verifyToken = (req, res, next) => {
  try {
    const authorization = req.headers.authorization;

    if (!authorization) {
      return res.status(401).json({ 
        error: true, 
        message: 'Token no proporcionado' 
      });
    }

    const token = authorization.split(' ')[1];
    jwt.verify(token, process.env.JWT_SECRET_KEY, (err, decoded) => {
      if (err) {
        return res.status(401).json({ 
          error: true, 
          message: 'Token inválido o expirado' 
        });
      }
      req.user = decoded;
      next();
    });
  } catch (error) {
    console.error('Error de autenticación:', error);
    return res.status(500).json({ 
      error: true, 
      message: 'Error interno del servidor'
    });
  }
};

const generateToken = (userData) => {
  return jwt.sign(
    {
      n_document: userData.n_document, // Usar el PK n_document
      role: userData.role,
      email: userData.email
    },
    process.env.JWT_SECRET_KEY,
    { expiresIn: '24h' }
  );
};

module.exports = { verifyToken, generateToken };


