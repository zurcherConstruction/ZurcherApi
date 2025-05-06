// Opcional: utils/cloudinaryUploader.js
const { cloudinary } = require('./cloudinaryConfig'); // Asumiendo que ya lo tienes
const fs = require('fs');

const uploadToCloudinary = (filePath, folder = 'work_images') => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload(filePath, { folder: folder }, (error, result) => {
      if (error) {
        // Eliminar archivo local si la subida falla y fue un archivo temporal
        fs.unlinkSync(filePath); // Asegúrate de que filePath sea el correcto
        return reject(error);
      }
      // Eliminar archivo local después de la subida exitosa
      fs.unlinkSync(filePath);
      resolve({ secure_url: result.secure_url, public_id: result.public_id });
    });
  });
};

const uploadBufferToCloudinary = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) {
        return reject(error);
      }
      if (!result) { // Añadir verificación por si result es undefined
        return reject(new Error("Cloudinary did not return a result."));
      }
      resolve({ secure_url: result.secure_url, public_id: result.public_id });
    });
    uploadStream.end(buffer);
  });
};

const deleteFromCloudinary = (publicId) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(publicId, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
  });
};

module.exports = { uploadToCloudinary, deleteFromCloudinary, uploadBufferToCloudinary, };