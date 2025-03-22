const express = require('express');

const { upload, processPdf } = require('../controllers/pdfController');

const router = express.Router();

router.post('/upload', upload.single('pdf'), processPdf);


module.exports = router;