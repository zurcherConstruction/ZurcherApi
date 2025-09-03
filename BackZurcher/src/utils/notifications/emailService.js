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
  // ✅ Timeouts más cortos para Railway
  connectionTimeout: 30000, // 30 segundos
  greetingTimeout: 15000,   // 15 segundos
  socketTimeout: 30000,     // 30 segundos
  pool: true,
  maxConnections: 3,
  maxMessages: 50,
  tls: {
    rejectUnauthorized: false
  }
});
transporter.verify((error, success) => {
  if (error) {
    console.error('Error al verificar la configuración SMTP:', error);
  } else {
    console.log('Servidor SMTP listo para enviar correos');
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
       return { success: false, error: 'Destinatario inválido' };
    }

    // Asegúrate de que el 'from' esté configurado
    const optionsToSend = {
      from: `"ZURCHER CONSTRUCTION" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      ...mailOptions,
    };

    console.log(`📤 Enviando email a ${optionsToSend.to} con subject: "${optionsToSend.subject}"`);

    // ✅ Envío con timeout personalizado
    const emailPromise = transporter.sendMail(optionsToSend);
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Email timeout después de 45 segundos')), 45000);
    });

    const info = await Promise.race([emailPromise, timeoutPromise]);
    const duration = Date.now() - startTime;
    
    console.log(`✅ Email enviado exitosamente en ${duration}ms. MessageId: ${info.messageId}`);
    return { success: true, info, duration };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ Error al enviar email después de ${duration}ms:`, {
      to: mailOptions?.to,
      subject: mailOptions?.subject,
      error: error.message,
      stack: error.stack
    });
    return { success: false, error: error.message, duration };
  }
};
module.exports = { sendEmail };