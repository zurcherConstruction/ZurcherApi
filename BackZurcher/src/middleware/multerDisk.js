const multer = require('multer');
const path = require('path');

// Configuración de almacenamiento para guardar en disco
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads'); // Carpeta donde se guardarán los archivos
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${uniqueSuffix}-${file.originalname}`); // Nombre único para evitar conflictos
  },
});

// Filtrar para aceptar únicamente archivos PDF
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten archivos PDF'), false);
  }
};

const uploadToDisk = multer({ storage, fileFilter });

module.exports = { uploadToDisk };