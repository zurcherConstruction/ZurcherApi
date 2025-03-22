// const transporter = require('../../utils/transporter');
  


// const sendEmail = async (req, res) => {
//   const { to, subject, text, html } = req.body;

//   try {
//     const mailOptions = {
//       from: process.env.SMTP_USER,  
//       to,
//       subject,
//       text,
//       html,
//     };

//     await transporter.sendMail(mailOptions);
//     res.status(200).json({ message: 'Correo enviado con éxito' });
//   } catch (error) {
//     res.status(500).json({ message: 'Error al enviar el correo', error });
//   }
// };

// module.exports = sendEmail;