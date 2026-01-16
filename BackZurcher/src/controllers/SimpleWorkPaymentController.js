/**
 * 💳 SimpleWork Payment Controller
 * 
 * Maneja el registro de pagos para SimpleWork integrando automáticamente
 * con el sistema financiero existente (Income + BankTransaction)
 */

const { SimpleWork, SimpleWorkPayment, Income, Receipt, sequelize } = require('../data');
const { createDepositTransaction } = require('../utils/bankTransactionHelper');
const { uploadBufferToCloudinary } = require('../utils/cloudinaryUploader');

class SimpleWorkPaymentController {

  /**
   * 💰 Registrar un pago para SimpleWork
   * POST /api/simple-work/:id/payments
   * 
   * Body (FormData):
   * - amount: number (monto del pago)
   * - paymentDate: string (fecha en formato YYYY-MM-DD)
   * - paymentMethod: string (método de pago del PAYMENT_METHODS)
   * - notes: string (opcional - descripción del pago)
   * - receipt: file (opcional - comprobante de pago)
   */
  async createPayment(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const { id } = req.params;
      const { amount, paymentDate, paymentMethod, notes } = req.body;

      // Validaciones
      if (!amount || !paymentDate || !paymentMethod) {
        return res.status(400).json({
          success: false,
          message: 'amount, paymentDate y paymentMethod son requeridos'
        });
      }

      const paymentAmount = parseFloat(amount);
      if (isNaN(paymentAmount) || paymentAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'El monto debe ser un número positivo'
        });
      }

      // Verificar que el SimpleWork existe
      const simpleWork = await SimpleWork.findByPk(id, { transaction });
      if (!simpleWork) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'SimpleWork no encontrado'
        });
      }

      // 1️⃣ Crear Income automáticamente
      const clientData = simpleWork.clientData || {};
      const clientName = `${clientData.firstName || ''} ${clientData.lastName || ''}`.trim() || 'Cliente';
      
      const income = await Income.create({
        date: paymentDate,
        amount: paymentAmount,
        typeIncome: 'SimpleWork Payment',
        notes: notes || `Pago SimpleWork #${simpleWork.workNumber} - ${clientName}`,
        workId: simpleWork.linkedWorkId, // Si está vinculado a un Work
        paymentMethod: paymentMethod,
        verified: false,
        staffId: req.user?.id || null
      }, { transaction });

      console.log(`💰 Income creado: SimpleWork Payment $${paymentAmount}`);

      // 2️⃣ Crear SimpleWorkPayment (tabla específica)
      const simpleWorkPayment = await SimpleWorkPayment.create({
        simpleWorkId: id,
        amount: paymentAmount,
        paymentDate: paymentDate,
        paymentMethod: paymentMethod,
        notes: notes || null,
        relatedIncomeId: income.idIncome, // Vincular con Income
        createdBy: req.user?.id || null
      }, { transaction });

      // 3️⃣ Actualizar totalPaid en SimpleWork
      const currentPaid = parseFloat(simpleWork.totalPaid) || 0;
      const newTotalPaid = currentPaid + paymentAmount;
      
      await simpleWork.update({
        totalPaid: newTotalPaid
      }, { transaction });

      console.log(`🔄 SimpleWork actualizado: totalPaid ${currentPaid} → ${newTotalPaid}`);

      // 4️⃣ Crear BankTransaction automáticamente (si es cuenta bancaria)
      let bankTransaction = null;
      try {
        bankTransaction = await createDepositTransaction({
          paymentMethod: paymentMethod,
          amount: paymentAmount,
          date: paymentDate,
          description: `SimpleWork Payment #${simpleWork.workNumber} - ${clientName}`,
          relatedIncomeId: income.idIncome,
          notes: notes,
          createdByStaffId: req.user?.id || null,
          transaction
        });

        if (bankTransaction) {
          console.log(`🏦 BankTransaction creado automáticamente`);
        }
      } catch (bankError) {
        console.error('⚠️ Error creando BankTransaction:', bankError.message);
        // No cancelamos toda la transacción por esto
      }

      // 5️⃣ Subir comprobante si existe
      let receipt = null;
      if (req.file) {
        try {
          console.log('📤 Subiendo comprobante a Cloudinary...');
          const uploadResult = await uploadBufferToCloudinary(req.file.buffer, {
            folder: 'simplework_receipts',
            resource_type: req.file.mimetype === 'application/pdf' ? 'raw' : 'auto',
            format: req.file.mimetype === 'application/pdf' ? undefined : 'jpg',
            access_mode: 'public'
          });

          receipt = await Receipt.create({
            relatedModel: 'Income',
            relatedId: income.idIncome.toString(),
            type: 'SimpleWork Payment',
            notes: `Comprobante SimpleWork #${simpleWork.workNumber}`,
            fileUrl: uploadResult.secure_url,
            publicId: uploadResult.public_id,
            mimeType: req.file.mimetype,
            originalName: req.file.originalname
          }, { transaction });

          console.log('✅ Comprobante subido y vinculado');
        } catch (uploadError) {
          console.error('⚠️ Error subiendo comprobante:', uploadError.message);
          // No cancelamos la transacción por esto
        }
      }

      // 6️⃣ Commit de la transacción
      await transaction.commit();

      // 7️⃣ Respuesta exitosa
      res.status(201).json({
        success: true,
        message: 'Pago registrado exitosamente',
        data: {
          payment: simpleWorkPayment,
          income: income,
          bankTransaction: bankTransaction,
          receipt: receipt,
          updatedTotalPaid: newTotalPaid
        }
      });

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error registrando pago SimpleWork:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * 📋 Obtener historial de pagos de un SimpleWork
   * GET /api/simple-work/:id/payments
   */
  async getPayments(req, res) {
    try {
      const { id } = req.params;

      const payments = await SimpleWorkPayment.findAll({
        where: { simpleWorkId: id },
        include: [
          {
            model: Income,
            as: 'relatedIncome',
            include: [
              {
                model: Receipt,
                as: 'Receipts',
                required: false
              }
            ]
          }
        ],
        order: [['paymentDate', 'DESC']]
      });

      res.status(200).json({
        success: true,
        data: payments
      });

    } catch (error) {
      console.error('❌ Error obteniendo pagos SimpleWork:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

}

module.exports = new SimpleWorkPaymentController();