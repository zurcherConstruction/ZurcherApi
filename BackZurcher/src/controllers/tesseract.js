const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { createWorker } = require('tesseract.js');

// Configurar multer para almacenar el archivo en memoria
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        // Solo se permiten imágenes para OCR (jpg, png, etc.)
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Solo se permiten imágenes para OCR'), false);
        }
        cb(null, true);
    }
});

const processImage = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No se recibió ningún archivo' });
    }
    try {
        // Guardar el buffer en un archivo temporal
        const tempFilePath = path.join(__dirname, 'temp_image.jpg'); // Ajusta la extensión si es necesario
        fs.writeFileSync(tempFilePath, req.file.buffer);
        console.log('Archivo temporal guardado en:', tempFilePath);

        // Crear e iniciar el worker de Tesseract
        const worker = createWorker({
            logger: m => console.log(m)  // Opcional, muestra el progreso en la consola
        });
        await worker.load();
        await worker.loadLanguage('eng'); // Puedes cambiar el idioma según tus necesidades
        await worker.initialize('eng');

        console.log('Iniciando OCR en la imagen...');
        const { data: { text } } = await worker.recognize(tempFilePath);
        console.log('Texto extraído:', text);

        await worker.terminate();

        // Borrar el archivo temporal
        fs.unlinkSync(tempFilePath);

        res.json({
            message: 'Imagen procesada correctamente',
            text: text
        });
    } catch (err) {
        console.error('Error procesando la imagen:', err);
        res.status(500).json({ message: 'Error al procesar la imagen' });
    }
};

module.exports = {
    upload,
    processImage
};