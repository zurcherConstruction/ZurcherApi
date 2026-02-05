const { ContactRequest, ContactFile } = require('../data');
const { uploadBufferToCloudinary } = require('../utils/cloudinaryUploader');
const { sendEmail } = require('../utils/notifications/emailService');
const { CustomError } = require('../middleware/error');
const catchedAsync = require('../utils/catchedAsync');
const { PDFDocument } = require('pdf-lib');
const axios = require('axios');

// Helper: Convierte imagen buffer a PDF buffer
async function imageBufferToPdfBuffer(imageBuffer, imageType) {
  const pdfDoc = await PDFDocument.create();
  let image;
  if (imageType === 'image/jpeg' || imageType === 'image/jpg') {
    image = await pdfDoc.embedJpg(imageBuffer);
  } else if (imageType === 'image/png') {
    image = await pdfDoc.embedPng(imageBuffer);
  } else {
    throw new Error('Unsupported image type for PDF conversion');
  }
  const page = pdfDoc.addPage([image.width, image.height]);
  page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
  return await pdfDoc.save();
}

const submitContactRequest = catchedAsync(async (req, res) => {
  const { name, phone, email, message } = req.body;
  if (!name || !email) throw new CustomError('Name and email are required', 400);

  // Procesar archivos (soporta uno o varios)
  let files = [];
  if (Array.isArray(req.files)) {
    files = req.files;
  } else if (req.files && req.files.attachments) {
    files = req.files.attachments;
  }
  const fileRecords = [];
  const attachmentsForEmail = [];

  for (const file of files) {
    let fileBuffer = file.buffer;
    let fileName = file.originalname;
    let fileType = file.mimetype;
    let pdfBuffer = null;
    let isPdf = fileType === 'application/pdf';

    // Si no es PDF y es imagen, convertir a PDF
    if (!isPdf && fileType.startsWith('image/')) {
      pdfBuffer = await imageBufferToPdfBuffer(fileBuffer, fileType);
      fileName = fileName.replace(/\.[^.]+$/, '.pdf');
      fileType = 'application/pdf';
      isPdf = true;
    }

    // Subir a Cloudinary (siempre sube el PDF si se generó)
    let uploadResult;
    if (isPdf && pdfBuffer) {
      uploadResult = await uploadBufferToCloudinary(pdfBuffer, { folder: 'contact_files', resource_type: 'raw' });
    } else {
      uploadResult = await uploadBufferToCloudinary(fileBuffer, { folder: 'contact_files', resource_type: 'auto' });
    }

    fileRecords.push({
      fileUrl: uploadResult.secure_url,
      fileName,
      fileType,
      publicId: uploadResult.public_id,
    });

    // Para el email, descargar el archivo de Cloudinary (si es PDF generado, ya lo tienes en buffer)
    if (isPdf && pdfBuffer) {
      attachmentsForEmail.push({ filename: fileName, content: pdfBuffer });
    } else {
      // Descargar desde Cloudinary para adjuntar
      const response = await axios.get(uploadResult.secure_url, { responseType: 'arraybuffer' });
      attachmentsForEmail.push({ filename: fileName, content: Buffer.from(response.data) });
    }
  }

  // Guardar en la base
  const contactRequest = await ContactRequest.create({ name, phone, email, message });
  for (const file of fileRecords) {
    await ContactFile.create({ ...file, contactRequestId: contactRequest.id });
  }

  // Detectar si es solicitud de presupuesto (por el formato del mensaje)
  const isQuoteRequest = message && message.includes('📅 SOLICITUD DE PRESUPUESTO');
  
  // Asunto llamativo según el tipo
  const subject = isQuoteRequest
    ? `🔔 NUEVA SOLICITUD DE PRESUPUESTO - ${name}`
    : `📧 NUEVO CONTACTO WEB - ${name}`;

  // Enviar email a la empresa
  await sendEmail({
    to: process.env.CONTACT_FORM_EMAIL || process.env.SMTP_USER,
    subject: subject,
    text: `Name: ${name}\nEmail: ${email}\nPhone: ${phone || ''}\nMessage: ${message || ''}`,
    attachments: attachmentsForEmail,
  });

  // Enviar email de confirmación al cliente
  const clientEmailHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(to right, #1e40af, #06b6d4); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .logo { max-width: 80px; height: auto; background: white; padding: 10px; border-radius: 10px; }
        .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
        .footer { background: #f9fafb; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; font-size: 14px; color: #6b7280; }
        .button { display: inline-block; padding: 12px 30px; background: linear-gradient(to right, #1e40af, #06b6d4); color: white; text-decoration: none; border-radius: 25px; margin: 20px 0; font-weight: bold; }
        .info-box { background: #eff6ff; border-left: 4px solid #1e40af; padding: 15px; margin: 20px 0; }
        h1 { color: white; margin: 0; font-size: 24px; }
        h2 { color: #1e40af; font-size: 20px; }
        .contact-info { margin: 20px 0; }
        .contact-item { margin: 10px 0; }
        .icon { color: #1e40af; margin-right: 8px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="https://res.cloudinary.com/dt4ah1jmy/image/upload/v1770244237/logo_v2cxn3.png" alt="Zurcher Septic Logo" class="logo" />
          <h1>Thank You for Contacting Us!</h1>
        </div>
        
        <div class="content">
          <h2>Hi ${name},</h2>
          
          <p>We've received your ${isQuoteRequest ? 'quote request' : 'message'} and we're excited to help you!</p>
          
          <div class="info-box">
            <strong>What happens next?</strong><br>
            Our team will review your request and get back to you within 24 hours. We're committed to providing you with the best septic system solutions in Southwest Florida.
          </div>
          
          <p>If you need immediate assistance, feel free to reach out to us directly:</p>
          
          <div class="contact-info">
            <div class="contact-item">
              <span class="icon">📞</span> <strong>Phone:</strong> <a href="tel:+19546368200" style="color: #1e40af;">+1 (954) 636-8200</a>
            </div>
            <div class="contact-item">
              <span class="icon">📧</span> <strong>Email:</strong> <a href="mailto:admin@zurcherseptic.com" style="color: #1e40af;">admin@zurcherseptic.com</a>
            </div>

          </div>
          
          <center>
            <a href="https://zurcherseptic.com" class="button">Visit Our Website</a>
          </center>
          
          <p style="margin-top: 30px;">We appreciate your interest in Zurcher Septic Systems!</p>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
            <em>This is an automated confirmation. Please do not reply to this email.</em>
          </p>
        </div>
        
        <div class="footer">
          <p><strong>Zurcher Septic Systems</strong></p>
          <p>Professional Septic Solutions | Serving Southwest & South-Central Florida</p>
          <p style="font-size: 12px; color: #9ca3af;">
            © ${new Date().getFullYear()} Zurcher Septic. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: email,
    subject: isQuoteRequest 
      ? 'Quote Request Received - Zurcher Septic' 
      : 'Message Received - Zurcher Septic',
    html: clientEmailHTML,
  });

  res.status(201).json({ error: false, message: 'Contact request sent successfully' });
});

module.exports = { submitContactRequest };
