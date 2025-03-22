const errorHandler = (err, req, res, next) => {
    // Log error for debugging with timestamp
    console.error(`[${new Date().toISOString()}] Error:`, {
        name: err.name,
        message: err.message,
        path: req.path,
        method: req.method,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });

    // Database Errors
    if (err.name.startsWith('Sequelize')) {
        return handleSequelizeError(err, res);
    }

    // Authentication Errors
    if (err.name.includes('Token') || err.name === 'JsonWebTokenError') {
        return handleAuthError(err, res);
    }

    // Validation Errors
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            error: true,
            message: 'Error de validación',
            details: err.details || err.message,
            timestamp: new Date().toISOString()
        });
    }

    // Custom Application Errors
    if (err.customError) {
        return res.status(err.status || 500).json({
            error: true,
            message: err.message,
            code: err.code,
            details: err.details,
            timestamp: new Date().toISOString()
        });
    }

    // Default Server Error
    const isDevelopment = process.env.NODE_ENV === 'development';
    return res.status(500).json({
        error: true,
        message: 'Error interno del servidor',
        timestamp: new Date().toISOString(),
        ...(isDevelopment && { 
            stack: err.stack,
            path: req.path,
            method: req.method
        })
    });
};

const handleSequelizeError = (err, res) => {
    if (err.name === 'SequelizeValidationError') {
        return res.status(400).json({
            error: true,
            message: 'Error de validación de datos',
            details: err.errors.map(e => ({
                field: e.path,
                message: e.message,
                value: e.value
            })),
            timestamp: new Date().toISOString()
        });
    }

    if (err.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({
            error: true,
            message: 'El registro ya existe',
            details: err.errors.map(e => ({
                field: e.path,
                message: e.message
            })),
            timestamp: new Date().toISOString()
        });
    }

    return res.status(500).json({
        error: true,
        message: 'Error de base de datos',
        timestamp: new Date().toISOString()
    });
};

const handleAuthError = (err, res) => {
    const isExpired = err.name === 'TokenExpiredError';
    return res.status(401).json({
        error: true,
        message: isExpired ? 'Token expirado' : 'Token inválido',
        code: isExpired ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN',
        timestamp: new Date().toISOString()
    });
};

class CustomError extends Error {
    constructor(message, status = 500, code = null, details = null) {
        super(message);
        this.name = 'CustomError';
        this.customError = true;
        this.status = status;
        this.code = code;
        this.details = details;
        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = {
    errorHandler,
    CustomError
};