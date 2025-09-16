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

// Función para enviar el correo
const sendEmail = async (staff, message) => {
  try {
    const mailOptions = {
      from: 'zurcherseptic@gmail.com', // Dirección de correo del remitente
      to: Array.isArray(staff.email) ? staff.email.join(",") : staff.email, // Correo del empleado, imagen traer de cloudinary
      subject: 'Notificación de cambio de estado de trabajo',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="https://res.cloudinary.com/dt4ah1jmy/image/upload/v1751206826/logo_zlxdhw.png" alt="Zurcher Construction" style="height:60px; margin-bottom:20px;" />
          </div>
          <h2 style="color: #0056b3;">Hola ${staff.name || staff.email},</h2>
          <p>${message}</p>
          <p>Por favor, revisa el sistema para más detalles.</p>
          <div style="text-align: center; margin-top: 20px;">
            <a href="https://www.zurcherseptic.com" style="background-color: #0056b3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Ir a la página</a>
          </div>
          <p style="margin-top: 20px;">Gracias,</p>
          <p><strong>Zurcher Septic</strong></p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Correo enviado a ${staff.email}`);
  } catch (error) {
    console.error('Error al enviar el correo:', error);
  }
};

module.exports = { sendEmail };