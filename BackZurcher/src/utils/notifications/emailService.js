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
  try {
    // *** LOG DETALLADO ***
    console.log('📧 ENVIANDO CORREO:');
    console.log('  → Destinatario:', mailOptions?.to);
    console.log('  → Asunto:', mailOptions?.subject);
    console.log('  → Desde:', `"Zurcher Septic " <${process.env.SMTP_USER}>`);
    
    if (!mailOptions || !mailOptions.to || !mailOptions.to.includes('@')) {
       console.error('❌ Error: Destinatario inválido o faltante:', mailOptions?.to);
       return; // No intentar enviar si el 'to' es inválido
    }

    // Asegúrate de que el 'from' esté configurado con correo corporativo profesional
    const optionsToSend = {
      from: `"Zurcher Septic " <${process.env.SMTP_USER}>`, // Usar el Gmail que funciona
      ...mailOptions, // Incluye 'to', 'subject', 'text', 'attachments', etc.
    };

    let info = await transporter.sendMail(optionsToSend);
    console.log('✅ Correo enviado exitosamente a:', mailOptions.to);
    console.log('   Message ID:', info.messageId);
    return info;
  } catch (error) {
    // *** LOG DETALLADO ***
    console.error('❌ Error DETALLADO al enviar correo a:', mailOptions?.to);
    console.error('   Error:', error.message);
    // Propagar el error para que notificationManager lo capture si es necesario
    throw error; 
  }
};
module.exports = { sendEmail };