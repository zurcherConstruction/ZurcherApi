const express = require('express');
const { isOwner, isAdmin, isRecept, isStaff } = require('../middleware/byRol');

const { upload, processPdf } = require('../controllers/pdfController');

const router = express.Router();

router.post('/upload', upload.single('pdf'), processPdf);


module.exports = router;