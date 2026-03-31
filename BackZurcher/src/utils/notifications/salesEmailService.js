const nodemailer = require('nodemailer');
require('dotenv').config();

// Transporter dedicado para correos de ventas (sales@zurcherseptic.com)
const salesTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SALES_SMTP_USER,
    pass: process.env.SALES_SMTP_PASSWORD,
  },
});

salesTransporter.verify((error) => {
  if (error) {
    console.error('❌ [Sales SMTP] Error al verificar configuración:', error.message);
  } else {
    console.log('✅ [Sales SMTP] Transporter listo:', process.env.SALES_SMTP_USER);
  }
});

const sendSalesEmail = async (mailOptions) => {
  if (!mailOptions?.to?.includes('@')) {
    throw new Error('Destinatario inválido');
  }

  const optionsToSend = {
    from: `"Zurcher Septic Sales" <${process.env.SALES_SMTP_USER}>`,
    ...mailOptions,
  };

  return salesTransporter.sendMail(optionsToSend);
};

module.exports = { sendSalesEmail };
