const DocuSignTokenService = require('../services/DocuSignTokenService');

/**
 * Middleware para manejo automático de tokens DocuSign
 * Se encarga de verificar y renovar tokens automáticamente
 */

/**
 * Middleware que garantiza un token válido para operaciones DocuSign
 */
const ensureValidDocuSignToken = async (req, res, next) => {
  try {
    console.log('🔐 Verificando token DocuSign...');
    
    // Intentar obtener un token válido (auto-refresh si es necesario)
    const accessToken = await DocuSignTokenService.getValidAccessToken();
    
    // Adjuntar token a la request para uso posterior
    req.docuSignToken = accessToken;
    
    console.log('✅ Token DocuSign válido obtenido');
    next();
    
  } catch (error) {
    console.error('❌ Error con token DocuSign:', error.message);
    
    // Respuesta amigable con instrucciones para el usuario
    return res.status(401).json({
      error: 'Token DocuSign no disponible o expirado',
      message: 'Debes autorizar la aplicación DocuSign',
      authUrl: `${process.env.API_URL}/docusign/auth`,
      details: error.message
    });
  }
};

/**
 * Middleware opcional para logging de uso de tokens
 */
const logTokenUsage = (operation = 'unknown') => {
  return (req, res, next) => {
    console.log(`📝 Operación DocuSign: ${operation} iniciada`);
    
    // Agregar timestamp de operación
    req.docuSignOperation = {
      name: operation,
      startTime: new Date(),
      userAgent: req.get('User-Agent'),
      ip: req.ip
    };
    
    next();
  };
};

/**
 * Middleware para manejo de errores específicos de DocuSign
 */
const handleDocuSignErrors = (error, req, res, next) => {
  console.error('❌ Error en operación DocuSign:', error);
  
  // Errores específicos de autenticación
  if (error.message.includes('AUTHORIZATION_INVALID_TOKEN') || 
      error.message.includes('PARTNER_AUTHENTICATION_FAILED') ||
      error.response?.status === 401) {
    
    return res.status(401).json({
      error: 'Token DocuSign inválido',
      message: 'El token ha expirado o es inválido. Debes re-autorizar la aplicación.',
      authUrl: `${process.env.API_URL}/docusign/auth`,
      shouldReauthorize: true
    });
  }
  
  // Error de account ID incorrecto
  if (error.message.includes('USER_DOES_NOT_BELONG_TO_ACCOUNT') ||
      error.response?.status === 403) {
    
    return res.status(403).json({
      error: 'Cuenta DocuSign incorrecta',
      message: 'El token no pertenece a la cuenta configurada. Verifica el DOCUSIGN_ACCOUNT_ID.',
      configuredAccountId: process.env.DOCUSIGN_ACCOUNT_ID
    });
  }
  
  // Errores de límite de API
  if (error.response?.status === 429) {
    return res.status(429).json({
      error: 'Límite de API excedido',
      message: 'Has alcanzado el límite de llamadas a la API de DocuSign. Intenta más tarde.',
      retryAfter: error.response.headers['retry-after'] || '60'
    });
  }
  
  // Error genérico
  res.status(500).json({
    error: 'Error en operación DocuSign',
    message: error.message,
    operation: req.docuSignOperation?.name || 'unknown'
  });
};

/**
 * Función utilitaria para operaciones DocuSign con manejo automático de tokens
 */
const withAutoRefreshToken = async (operation) => {
  try {
    // Obtener token válido automáticamente
    const accessToken = await DocuSignTokenService.getValidAccessToken();
    
    // Ejecutar operación con token fresco
    return await operation(accessToken);
    
  } catch (error) {
    // Si el error es de autenticación, intentar un refresh manual
    if (error.message.includes('AUTHORIZATION_INVALID_TOKEN') || 
        error.response?.status === 401) {
      
      console.log('🔄 Token inválido, intentando refresh manual...');
      
      try {
        const token = await DocuSignTokenService.getActiveToken();
        if (token) {
          await DocuSignTokenService.refreshToken(token);
          const newAccessToken = await DocuSignTokenService.getValidAccessToken();
          return await operation(newAccessToken);
        }
      } catch (refreshError) {
        console.error('❌ Error en refresh manual:', refreshError.message);
      }
    }
    
    throw error;
  }
};

/**
 * Wrapper para funciones que usan DocuSign
 */
const docuSignOperation = (operationName, operationFunction) => {
  return async (...args) => {
    console.log(`🚀 Iniciando operación DocuSign: ${operationName}`);
    const startTime = new Date();
    
    try {
      const result = await withAutoRefreshToken(operationFunction);
      
      const duration = new Date() - startTime;
      console.log(`✅ Operación DocuSign completada: ${operationName} (${duration}ms)`);
      
      return result;
      
    } catch (error) {
      const duration = new Date() - startTime;
      console.error(`❌ Error en operación DocuSign: ${operationName} (${duration}ms)`, error.message);
      
      throw error;
    }
  };
};

module.exports = {
  ensureValidDocuSignToken,
  logTokenUsage,
  handleDocuSignErrors,
  withAutoRefreshToken,
  docuSignOperation
};