const nodemailer = require('nodemailer');

// Configurar el transporte de Nodemailer
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // true para el puerto 465, false para otros puertos
  auth: {
    user: 'guatapenocountry@gmail.com', // Tu correo de Gmail
    pass: 'kgiz adhs boqt hedg', // Tu contraseña de aplicación
  },
});

// Función para enviar el correo
const sendEmail = async (staff, message) => {
  try {
    const mailOptions = {
      from: 'guatapenocountry@gmail.com', // Dirección de correo del remitente
      to: staff.email, // Correo del empleado
      subject: 'Notificación de cambio de estado de trabajo',
      html: `
        <p>Hola ${staff.name || 'Empleado'},</p>
        <p>${message}</p>
        <p>Por favor, revisa el sistema para más detalles.</p>
        <p>Gracias,</p>
        <p><strong>Zurcher Construction</strong></p>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Correo enviado a ${staff.email}`);
  } catch (error) {
    console.error('Error al enviar el correo:', error);
  }
};

module.exports = { sendEmail };