// const crypto = require('crypto');
// const bcrypt = require('bcrypt');
// const { Staff } = require('../../data');
// const response = require('../../utils/response');
// const { transporter } = require('../../utils/transporter');
// const { emailTemplates } = require('../../utils/emailTemplates');
// const { CustomError } = require('../../middleware/error');

// const forgotPassword = async (req, res, next) => {
//   try {
//     const { email } = req.body;

//     // Buscar usuario activo
//     const user = await Staff.findOne({ 
//       where: { 
//         email,
//         isActive: true,
//         deletedAt: null
//       } 
//     });

//     if (!user) {
//       throw new CustomError('Usuario no encontrado', 404);
//     }

//     // Validar si ya existe una solicitud reciente (15 minutos)
//     if (user.tokenCreatedAt && 
//         Date.now() - new Date(user.tokenCreatedAt).getTime() < 900000) {
//       throw new CustomError(
//         'Ya existe una solicitud reciente. Por favor espera 15 minutos.', 
//         429
//       );
//     }

//     // Generar token seguro
//     const resetToken = crypto.randomBytes(32).toString('hex');
//     const hashedToken = await bcrypt.hash(resetToken, 10);

//     // Actualizar usuario con token
//     await user.update({
//       passwordResetToken: hashedToken,
//       passwordResetExpires: Date.now() + 3600000, // 1 hora
//       tokenCreatedAt: Date.now()
//     });

//     // Crear URL de reset
//     const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

//     try {
//       // Enviar email
//       await transporter.sendMail({
//         from: process.env.SMTP_USER,
//         to: user.email,
//         subject: 'Restablecimiento de contraseña - Balu Hotel',
//         html: emailTemplates.resetPassword(user.name, resetUrl)
//       });

//       return response(res, 200, "Se ha enviado un correo para restablecer tu contraseña");
//     } catch (emailError) {
//       // Revertir cambios si falla el envío
//       await user.update({
//         passwordResetToken: null,
//         passwordResetExpires: null,
//         tokenCreatedAt: null
//       });
//       throw new CustomError('Error al enviar el correo. Intenta más tarde.', 500);
//     }

//   } catch (error) {
//     next(error);
//   }
// };

// module.exports = forgotPassword;