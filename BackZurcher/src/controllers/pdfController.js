const fs = require('fs');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const { Permit } = require('../data');
const moment = require('moment');

const { extractWithPdfJs } = require('./extractWithPdfJs');

/* ----------------------------------------------------------------------
   Configuración de multer para almacenar el archivo en memoria
---------------------------------------------------------------------- */
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype !== 'application/pdf') {
            return cb(new Error('Solo se permiten archivos PDF'), false);
        }
        cb(null, true);
    }
});

/* ----------------------------------------------------------------------
   Función para limpiar el texto extraído
---------------------------------------------------------------------- */
const cleanText = (text) => {
    return text
        .replace(/\r\n|\r|\n/g, ' ') // Reemplaza saltos de línea con espacios
        .replace(/[\u2028\u2029]/g, ' ') // Remueve saltos de línea ocultos
        .replace(/\s{2,}/g, ' ') // Remueve espacios múltiples
        .replace(/[^\x20-\x7E]/g, '') // Remueve caracteres no imprimibles
        .trim();
};
/* ----------------------------------------------------------------------
   Función para extraer datos genéricos
---------------------------------------------------------------------- */
const extractData = (text) => {
    const result = {};

    // Capturar el número de permiso
    result.permitNumber = text.match(/PERMIT #:\s*(.+?)(?=\s|$)/i)?.[1]?.trim() || null;

    // Capturar el número de aplicación
    result.applicationNumber = text.match(/APPLICATION #:\s*(.+?)(?=\s|$)/i)?.[1]?.trim() || null;

    // Capturar el nombre del solicitante
    result.applicant = text.match(/APPLICANT:\s*(.+?)(?=\sPROPERTY ADDRESS:|$)/i)?.[1]?.trim() || null;

    // Capturar la dirección de la propiedad
    result.propertyAddress = text.match(/PROPERTY ADDRESS:\s*(.+?)(?=\sLOT:|$)/i)?.[1]?.trim() || null;

    // Capturar la fecha de expiración
    const expirationDateMatch = text.match(/EXPIRATION DATE:\s*(\d{1,2}\/\d{1,2}\/\d{4})/i);
    if (expirationDateMatch) {
        const parsedDate = moment(expirationDateMatch[1], 'MM/DD/YYYY', true);
        result.expirationDate = parsedDate.isValid() ? parsedDate.format('YYYY-MM-DD') : null;
    }

    return result;
};

/* ----------------------------------------------------------------------
   Función principal para procesar el PDF
---------------------------------------------------------------------- */
const processPdf = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No se recibió ningún archivo' });
    }

    try {
        console.log('Archivo recibido:', req.file.originalname);

        const extractedData = await extractWithPdfJs(req.file.buffer);

        console.log('Datos extraídos del PDF:', extractedData);

        if (!extractedData.permitNumber || !extractedData.applicationNumber) {
            return res.status(400).json({
                message: 'No se pudieron extraer todos los datos necesarios',
                extractedData
            });
        }
        extractedData.pdfData = req.file.buffer;
        const permitData = await Permit.create(extractedData);

        res.json({
            message: 'PDF procesado correctamente',
            data: permitData
        });
    } catch (err) {
        console.error('Error procesando el PDF:', err);
        res.status(500).json({ message: 'Error al procesar el PDF' });
    }
};

module.exports = {
    upload,
    processPdf
};