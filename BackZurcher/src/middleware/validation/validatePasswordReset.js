const { CustomError } = require('../../middleware/error');

const validatePasswordReset = (req, res, next) => {
    const { password, confirmPassword } = req.body;

    // Validar que la contraseña exista
    if (!password) {
        return res.status(400).json({
            error: true,
            message: 'La contraseña es requerida'
        });
    }

    // Validar longitud mínima
    if (password.length < 6) {
        return res.status(400).json({
            error: true,
            message: 'La contraseña debe tener al menos 6 caracteres'
        });
    }

    // Validar que las contraseñas coincidan
    if (password !== confirmPassword) {
        return res.status(400).json({
            error: true,
            message: 'Las contraseñas no coinciden'
        });
    }

    next();
};

module.exports = {
    
    validatePasswordReset
};