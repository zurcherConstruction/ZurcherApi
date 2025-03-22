const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const adminRoutes = require('./adminRoutes');


// Rutas públicas
router.use('/auth', authRoutes);


// Rutas protegidas
router.use('/admin', adminRoutes);
router.use('/pdf', require('./pdfRoutes'));



module.exports = router;