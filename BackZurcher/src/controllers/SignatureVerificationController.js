const { Budget, Permit } = require('../data');
const SignNowService = require('../services/ServiceSignNow');
const path = require('path');
const fs = require('fs');
const { cloudinary } = require('../utils/cloudinaryConfig');
const { Op } = require('sequelize');

/**
 * Verificar manualmente las firmas pendientes de SignNow
 * Similar al cron job pero se ejecuta bajo demanda
 */
const verifyPendingSignatures = async (req, res) => {
  try {
    const signNowService = new SignNowService();

    const pendingBudgets = await Budget.findAll({
      where: {
        signNowDocumentId: { [Op.ne]: null },
        status: { 
          [Op.in]: ['pending_review', 'created', 'sent_for_signature', 'client_approved', 'send']
        },
        signatureMethod: 'signnow'
      },
      include: [{ model: Permit, attributes: ['applicantName', 'propertyAddress'] }]
    });

    if (pendingBudgets.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No hay presupuestos pendientes de verificación',
        checked: 0,
        signed: 0
      });
    }

    let signedCount = 0;
    const results = [];

    for (const budget of pendingBudgets) {
      try {
        const signatureStatus = await signNowService.isDocumentSigned(budget.signNowDocumentId);

        if (signatureStatus.isSigned) {
          signedCount++;

          // Descargar y subir a Cloudinary
          try {
            const tempDir = path.join(__dirname, '../../temp');
            if (!fs.existsSync(tempDir)) {
              fs.mkdirSync(tempDir, { recursive: true });
            }

            const tempFilePath = path.join(tempDir, `budget_${budget.idBudget}_signed_${Date.now()}.pdf`);
            
            await signNowService.downloadSignedDocument(budget.signNowDocumentId, tempFilePath);

            const uploadResult = await cloudinary.uploader.upload(tempFilePath, {
              folder: 'signed_budgets',
              resource_type: 'raw',
              public_id: `budget_${budget.idBudget}_signed_${Date.now()}`,
              tags: [
                `invoice-${budget.idBudget}`,
                `property-${(budget.Permit?.propertyAddress || '').replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`,
                'budget',
                'signed'
              ],
              context: {
                invoice: budget.idBudget.toString(),
                property: budget.Permit?.propertyAddress || budget.propertyAddress,
                signed_at: new Date().toISOString()
              }
            });

            await budget.update({
              status: 'signed',
              signatureMethod: 'signnow',
              signedAt: new Date(),
              signedPdfPath: uploadResult.secure_url,
              signedPdfPublicId: uploadResult.public_id
            });

            fs.unlinkSync(tempFilePath);

            results.push({
              idBudget: budget.idBudget,
              propertyAddress: budget.Permit?.propertyAddress || budget.propertyAddress,
              status: 'signed',
              pdfUrl: uploadResult.secure_url
            });

          } catch (downloadError) {
            await budget.update({
              status: 'signed',
              signatureMethod: 'signnow',
              signedAt: new Date()
            });

            results.push({
              idBudget: budget.idBudget,
              propertyAddress: budget.Permit?.propertyAddress || budget.propertyAddress,
              status: 'signed',
              error: 'PDF no descargado'
            });
          }
        } else {
          results.push({
            idBudget: budget.idBudget,
            propertyAddress: budget.Permit?.propertyAddress || budget.propertyAddress,
            status: 'pending'
          });
        }
      } catch (error) {
        results.push({
          idBudget: budget.idBudget,
          error: error.message
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `Verificación completada: ${signedCount} presupuestos firmados de ${pendingBudgets.length} revisados`,
      checked: pendingBudgets.length,
      signed: signedCount,
      results
    });

  } catch (error) {
    console.error('Error en verificación manual de firmas:', error);
    res.status(500).json({
      success: false,
      error: 'Error al verificar firmas',
      details: error.message
    });
  }
};

module.exports = {
  verifyPendingSignatures
};
