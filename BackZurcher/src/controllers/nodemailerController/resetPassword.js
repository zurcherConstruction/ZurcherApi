// const bcrypt = require('bcrypt');
// const { User } = require('../../data');
// const response = require('../../utils/response');
// const { Op } = require('sequelize');
// const transporter = require('../../utils/transporter');
// const { emailTemplates } = require('../../utils/emailTemplates');

// exports.resetPassword = async (req, res) => {
//   const { token } = req.params;
//   const { password } = req.body;

//   try {
//     // Validar contraseña
//     if (!password || password.length < 6) {
//       return response(res, 400, "La contraseña debe tener al menos 6 caracteres");
//     }

//     // Buscar usuario con token válido
//     const user = await User.findOne({
//       where: {
//         passwordResetToken: { [Op.ne]: null },
//         passwordResetExpires: { [Op.gt]: Date.now() }
//       }
//     });

//     if (!user) {
//       return response(res, 400, "El enlace ha expirado o no es válido");
//     }

//     // Validar token
//     const isTokenValid = await bcrypt.compare(token, user.passwordResetToken);
//     if (!isTokenValid) {
//       return response(res, 400, "Token inválido");
//     }

//     // Actualizar contraseña
//     const hashedPassword = await bcrypt.hash(password, 10);
//     await user.update({
//       password: hashedPassword,
//       passwordResetToken: null,
//       passwordResetExpires: null
//     });

//     // Enviar confirmación por email
//     await transporter.sendMail({
//       from: process.env.SMTP_USER,
//       to: user.email,
//       subject: 'Contraseña actualizada - Balu Hotel',
//       html: emailTemplates.passwordChanged(user.name)
//     });

//     response(res, 200, "Contraseña actualizada correctamente");
//   } catch (error) {
//     console.error('Error en resetPassword:', error);
//     response(res, 500, "Error al restablecer la contraseña");
//   }
// };