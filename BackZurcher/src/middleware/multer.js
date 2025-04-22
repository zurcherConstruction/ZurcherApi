const multer = require('multer');

// Almacenar el archivo en memoria como Buffer
const storage = multer.memoryStorage();

// Filtrar para aceptar PDF e imágenes
const fileFilter = (req, file, cb) => {
  console.log("Archivo recibido en Multer:", file); // Verifica el archivo recibido
  console.log("Tipo MIME del archivo:", file.mimetype); // Verifica el tipo MIME del archivo

  // Lista de tipos MIME permitidos
  const allowedTypes = [
    'application/pdf', 
    'image/jpeg', 
    'image/png', 
    'image/gif',
    'image/webp' 
  ];

  if (allowedTypes.includes(file.mimetype)) {
    console.log("Archivo permitido, procesando..."); // Confirma que el archivo es válido
    cb(null, true); 
  } else {
    console.error("Archivo rechazado, tipo no permitido:", file.mimetype); // Indica que el archivo fue rechazado
    cb(new Error('Tipo de archivo no permitido. Solo se aceptan PDF, JPG, PNG, GIF, WEBP.'), false); 
  }
};

const upload = multer({ 
  storage, 
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

module.exports = { upload };