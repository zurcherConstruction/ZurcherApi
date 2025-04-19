const multer = require('multer');

// Almacenar el archivo en memoria como Buffer
const storage = multer.memoryStorage();

// Filtrar para aceptar PDF e imágenes
const fileFilter = (req, file, cb) => {
  // Lista de tipos MIME permitidos
  const allowedTypes = [
    'application/pdf', 
    'image/jpeg', 
    'image/png', 
    'image/gif',
    'image/webp' 
  ];

  if (allowedTypes.includes(file.mimetype)) {
    // Si el tipo está en la lista, acepta el archivo
    cb(null, true); 
  } else {
    // Si no, rechaza el archivo con un error más descriptivo
    cb(new Error('Tipo de archivo no permitido. Solo se aceptan PDF, JPG, PNG, GIF, WEBP.'), false); 
  }
};

const upload = multer({ 
  storage, 
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

module.exports = { upload };