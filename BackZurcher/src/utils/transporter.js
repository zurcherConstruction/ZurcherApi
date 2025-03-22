const nodemailer = require('nodemailer');
require('dotenv').config();

// Configuración de Nodemailer
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,        
  port: process.env.SMTP_PORT,        
  secure: process.env.SMTP_SECURE === 'true', 
  auth: {
    user: process.env.SMTP_USER,      
    pass: process.env.SMTP_PASSWORD   
  }
});

// Verificación de conexión a SMTP
transporter.verify((error, success) => {
  if (error) {
    console.error('Error en la configuración de Nodemailer:', error);
  } else {
    console.log('Servidor SMTP listo para enviar correos');
  }
});

module.exports = transporter;