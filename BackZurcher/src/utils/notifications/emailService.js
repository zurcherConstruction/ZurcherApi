const nodemailer = require('nodemailer');
require('dotenv').config();

// Configurar el transporte de Nodemailer
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === 'true', // true para el puerto 465, false para otros puertos
  auth: {
    user: process.env.SMTP_USER, // Tu correo de Gmail
    pass: process.env.SMTP_PASSWORD, // Tu contraseña de aplicación
  },
  // ✅ OPTIMIZACIONES PARA PRODUCCIÓN
  connectionTimeout: 30000,  // 30 segundos (reducido)
  greetingTimeout: 15000,    // 15 segundos (reducido)
  socketTimeout: 30000,      // 30 segundos (reducido)
  pool: true,                // Usar pool de conexiones
  maxConnections: 3,         // Reducido para Railway
  maxMessages: 50,           // Reducido para Railway
  rateDelta: 500,            // 0.5 segundos entre mensajes
  rateLimit: 3,              // Máximo 3 mensajes por rateDelta
  // ✅ CONFIGURACIONES ADICIONALES PARA GMAIL EN PRODUCCIÓN
  requireTLS: true,          // Requerir TLS
  logger: false,             // Desactivar logging detallado
  debug: false,              // Desactivar debug en producción
  // ✅ CONFIGURACIONES ESPECÍFICAS PARA GMAIL
  service: process.env.NODE_ENV === 'production' ? 'gmail' : undefined,
  tls: {
    rejectUnauthorized: false // Para servidores con certificados self-signed
  }
});

// Verificar la configuración del transporter
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Error al verificar la configuración SMTP:', error);
  } else {
    console.log('✅ Servidor SMTP listo para enviar correos');
  }
});

// Función para enviar el correo
const sendEmail = async (mailOptions) => {
  const startTime = Date.now();
  try {
    // *** LOG DETALLADO ***
    console.log('📧 Iniciando envío de email a:', mailOptions?.to); 
    
    if (!mailOptions || !mailOptions.to || !mailOptions.to.includes('@')) {
       console.error('❌ Error en sendEmail: Destinatario inválido o faltante:', mailOptions?.to);
       return { success: false, error: 'Destinatario inválido' }; // Retornar resultado en lugar de throw
    }

    // Asegúrate de que el 'from' esté configurado
    const optionsToSend = {
      from: `"ZURCHER CONSTRUCTION" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      ...mailOptions,
    };

    console.log(`📤 Enviando email a ${optionsToSend.to} con subject: "${optionsToSend.subject}"`);

    // ✅ TIMEOUT REDUCIDO PARA PRODUCCIÓN
    const timeoutMs = process.env.NODE_ENV === 'production' ? 25000 : 45000; // 25s en prod, 45s en dev
    const sendWithTimeout = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Email timeout después de ${timeoutMs/1000} segundos`));
      }, timeoutMs);

      console.log(`⏱️ Enviando email con timeout de ${timeoutMs/1000}s...`);
      
      transporter.sendMail(optionsToSend)
        .then(result => {
          clearTimeout(timeout);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeout);
          reject(error);
        });
    });

    const info = await sendWithTimeout;
    const duration = Date.now() - startTime;
    
    console.log(`✅ Email enviado exitosamente en ${duration}ms. MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId, duration };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ Error enviando email después de ${duration}ms:`, {
      error: error.message,
      to: mailOptions?.to,
      subject: mailOptions?.subject,
      stack: error.stack
    });
    
    // ✅ RETORNAR ERROR EN LUGAR DE LANZARLO PARA NO ROMPER EL PROCESO
    return { 
      success: false, 
      error: error.message, 
      duration,
      to: mailOptions?.to 
    };
  }
};

module.exports = { sendEmail };