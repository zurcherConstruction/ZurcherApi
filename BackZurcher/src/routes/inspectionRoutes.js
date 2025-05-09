const express = require('express');
const InspectionController = require('../controllers/InspectionController');
const { verifyToken } = require('../middleware/isAuth');
const { allowRoles } = require('../middleware/byRol'); // Ajusta según tus middlewares
const { upload } = require('../middleware/multer');
const router = express.Router();

// 1. Iniciar proceso de inspección inicial (envía correo a inspectores)
router.post(
    '/:workId/request-initial',
    verifyToken, allowRoles(['admin', 'recept', 'owner']),
    InspectionController.requestInitialInspection
  );
  
  // 2. Registrar respuesta de inspectores (sube doc para aplicante)
  router.put(
    '/:inspectionId/schedule-received',
    verifyToken, allowRoles(['admin', 'recept', 'owner']),
    upload.single('documentForApplicantFile'), // 'documentForApplicantFile' es el name del input file en el form
    InspectionController.registerInspectorResponse
  );
  
  // 3. Enviar documento (de inspectores) al aplicante para firma
  router.post(
    '/:inspectionId/send-to-applicant',
    verifyToken, allowRoles(['admin', 'recept', 'owner']),
    InspectionController.sendDocumentToApplicant
  );
  
  // 4. Registrar documento firmado devuelto por el aplicante (sube doc firmado)
  router.put(
    '/:inspectionId/applicant-document-received',
    verifyToken, allowRoles(['admin', 'recept', 'owner']),
    upload.single('signedDocumentFile'), // 'signedDocumentFile' es el name del input file
    InspectionController.registerSignedApplicantDocument
  );
  
  // 5. Registrar resultado final de la inspección (sube doc de resultado)
  router.put(
    '/:inspectionId/register-result',
    verifyToken, allowRoles(['admin', 'recept', 'owner']),
    upload.array('resultDocumentFiles', 2), // 'resultDocumentFile' es el name del input file
    InspectionController.registerInspectionResult
  );
  
  // Rutas para obtener inspecciones
  router.get(
    '/work/:workId', 
    verifyToken, allowRoles(['admin', 'recept', 'owner']), 
    InspectionController.getInspectionsByWork
  );
  
  router.get(
    '/:inspectionId', 
    verifyToken, allowRoles(['admin', 'recept', 'owner']), 
    InspectionController.getInspectionById
  );
  

// // Crear una inspección (solo administradores)
// router.post('/', verifyToken, allowRoles(['admin', 'recept', 'owner']), InspectionController.createInspection);

// // Obtener inspecciones por obra (personal del hotel)
// router.get('/work/:workId', verifyToken, allowRoles(['admin', 'recept', 'owner']), InspectionController.getInspectionsByWork);

// // Actualizar una inspección (solo administradores)
// router.put('/:id', verifyToken, allowRoles(['admin', 'recept', 'owner']), InspectionController.updateInspection);

module.exports = router;