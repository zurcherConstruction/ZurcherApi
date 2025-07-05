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

  // Enviar email
  await sendEmail({
    to: process.env.CONTACT_FORM_EMAIL || process.env.SMTP_USER,
    subject: 'New Contact Request from Website',
    text: `Name: ${name}\nEmail: ${email}\nPhone: ${phone || ''}\nMessage: ${message || ''}`,
    attachments: attachmentsForEmail,
  });

  res.status(201).json({ error: false, message: 'Contact request sent successfully' });
});

module.exports = { submitContactRequest };
