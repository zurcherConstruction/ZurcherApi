const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/isAuth');
const { validateRegister, validateLogin } = require('../middleware/validation/validateUser');
const {
    login,
    register, // This will be used only for owner registration
    logout,
    changePassword,
    forgotPassword,
    resetPassword,
} = require('../controllers/User/authController');

// Public routes - Owner registration and login
router.post('/register', validateRegister, register); // Only for owner registration
router.post('/login', validateLogin, login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);

// Protected routes
router.use(verifyToken);
router.post('/logout', logout);
router.put('/change-password', changePassword);

module.exports = router;
