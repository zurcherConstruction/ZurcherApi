const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/isAuth');
const { validateRegister, validateLogin } = require('../middleware/validation/validateUser');
const {
    login,
    register,
    logout,
    changePassword
} = require('../controllers/User/authController');

// Rutas públicas
router.post('/register', validateRegister, register); // Registro no requiere token
router.post('/login', validateLogin, login); // Login no requiere token

// Rutas protegidas
router.use(verifyToken); // Middleware para proteger las rutas siguientes
router.post('/logout', logout);
router.put('/change-password', changePassword);

module.exports = router;
