const express = require('express');
const router = express.Router();
const multer = require('multer');
const contactController = require('../controllers/contactController');

// Multer config: memory storage, multiple files (attachments[])
const storage = multer.memoryStorage();
const upload = multer({ storage });

// POST /api/contact - recibe múltiples archivos
router.post(
  '/',
  upload.array('attachments', 5), // hasta 5 archivos, puedes ajustar
  contactController.submitContactRequest
);

module.exports = router;
