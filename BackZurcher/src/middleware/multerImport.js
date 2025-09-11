const multer = require('multer');

// Almacenar el archivo en memoria como Buffer
const storage = multer.memoryStorage();

// Filtrar para aceptar archivos Excel y CSV
const fileFilter = (req, file, cb) => {
  console.log("Archivo recibido en Multer Import:", file);
  console.log("Tipo MIME del archivo:", file.mimetype);

  // Lista de tipos MIME permitidos para importación
  const allowedTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'text/csv', // .csv
    'application/csv' // Alternativo para CSV
  ];

  if (allowedTypes.includes(file.mimetype)) {
    console.log("Archivo de importación permitido, procesando...");
    cb(null, true); 
  } else {
    console.error("Archivo rechazado, tipo no permitido para importación:", file.mimetype);
    cb(new Error('Tipo de archivo no permitido. Solo se aceptan archivos Excel (.xlsx, .xls) y CSV (.csv).'), false); 
  }
};

const uploadImport = multer({ 
  storage, 
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB límite para archivos de importación
});

module.exports = { uploadImport };
