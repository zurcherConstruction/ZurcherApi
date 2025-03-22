exports.emailTemplates = {
    resetPassword: (userName, resetUrl) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Hola ${userName}</h2>
        <p>Has solicitado restablecer tu contraseña.</p>
        <p>Haz clic en el siguiente botón para crear una nueva contraseña:</p>
        <a href="${resetUrl}" style="background-color: #4CAF50; color: white; padding: 14px 20px; text-decoration: none; display: inline-block; margin: 20px 0;">
          Restablecer Contraseña
        </a>
        <p>Si no solicitaste este cambio, puedes ignorar este correo.</p>
        <p>El enlace expirará en 1 hora por seguridad.</p>
        <hr>
        <p style="font-size: 12px; color: #666;">Este es un correo automático, por favor no responder.</p>
      </div>
    `,
  
    passwordChanged: (userName) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Hola ${userName}</h2>
        <p>Tu contraseña ha sido actualizada exitosamente.</p>
        <p>Si no realizaste este cambio, por favor contáctanos inmediatamente.</p>
        <hr>
        <p style="font-size: 12px; color: #666;">Este es un correo automático, por favor no responder.</p>
      </div>
    `
  };