const express = require('express');
const router = express.Router();
const multer = require('multer');
const SalesController = require('../controllers/SalesController');
const { verifyToken } = require("../middleware/isAuth");
const { allowRoles } = require("../middleware/byRol");

// Almacenamiento en memoria — los PDFs se adjuntan directamente sin guardar en disco
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB por archivo
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Solo se permiten archivos PDF'));
  }
});

const salesRoles = ['sales_rep', 'recept', 'admin', 'owner'];

// Dashboard del vendedor
router.get(
  '/my-dashboard',
  verifyToken,
  allowRoles(salesRoles),
  SalesController.getMySalesDashboard
);

// Enviar propuesta comercial al cliente
router.post(
  '/send-proposal',
  verifyToken,
  allowRoles(salesRoles),
  upload.array('attachments', 2),
  SalesController.sendProposal
);

module.exports = router;
