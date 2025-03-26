const multer = require('multer');

// Almacenar el archivo en memoria como Buffer
const storage = multer.memoryStorage();

// Filtrar para aceptar únicamente archivos PDF
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten archivos PDF'), false);
  }
};

const upload = multer({ storage, fileFilter });

module.exports = { upload };