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
  // ✅ AGREGAR TIMEOUTS Y CONFIGURACIONES DE RENDIMIENTO
  connectionTimeout: 60000, // 60 segundos para conectar
  greetingTimeout: 30000,   // 30 segundos para el saludo
  socketTimeout: 60000,     // 60 segundos para inactividad
  pool: true,               // Usar pool de conexiones
  maxConnections: 5,        // Máximo 5 conexiones concurrentes
  maxMessages: 100,         // Máximo 100 mensajes por conexión
  rateDelta: 1000,          // 1 segundo entre mensajes
  rateLimit: 5              // Máximo 5 mensajes por rateDelta
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

    // ✅ AGREGAR TIMEOUT WRAPPER
    const sendWithTimeout = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Email timeout después de 45 segundos'));
      }, 45000); // 45 segundos timeout

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