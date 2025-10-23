const { Income, Staff, Receipt, Work } = require('../data'); // Agregar Work
const { Op } = require('sequelize');
const { sendNotifications } = require('../utils/notifications/notificationManager'); // Importar notificaciones

// 🔧 Helper: Normalizar fecha de ISO a YYYY-MM-DD (acepta ambos formatos)
const normalizeDateToLocal = (dateInput) => {
  if (!dateInput) return null;
  
  // Si ya es formato YYYY-MM-DD (10 caracteres), devolverlo tal cual
  if (typeof dateInput === 'string' && dateInput.length === 10 && dateInput.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return dateInput;
  }
  
  // Si es formato ISO completo (ej: 2025-10-22T12:34:56.789Z), convertir a fecha local
  try {
    const date = new Date(dateInput);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch (e) {
    console.error('Error normalizando fecha:', dateInput, e);
    return dateInput; // Devolver el original si falla
  }
};

// Crear un nuevo ingreso
const createIncome = async (req, res) => {
  let { date, amount, typeIncome, notes, workId, staffId, paymentMethod, paymentDetails, verified } = req.body;
  
  // ✅ Normalizar fecha (acepta ISO completo o YYYY-MM-DD)
  date = normalizeDateToLocal(date);
  
  try {
    // ✅ VALIDACIÓN: paymentMethod es OBLIGATORIO
    if (!paymentMethod) {
      return res.status(400).json({
        error: 'El método de pago es obligatorio',
        message: 'Debe seleccionar un método de pago para registrar el ingreso'
      });
    }

    const newIncome = await Income.create({ 
      date, 
      amount, 
      typeIncome, 
      notes, 
      workId, 
      staffId, 
      paymentMethod, 
      paymentDetails,
      verified: verified || false 
    });
    
    // Enviar notificaciones al equipo de finanzas
    try {
      // Obtener información adicional para la notificación
      const incomeWithDetails = await Income.findByPk(newIncome.idIncome, {
        include: [
          { model: Staff, as: 'Staff', attributes: ['id', 'name', 'email'] },
          { model: Work, as: 'Work', attributes: ['idWork', 'propertyAddress'] }
        ]
      });

      // Preparar datos para la notificación
      const notificationData = {
        ...incomeWithDetails.toJSON(),
        propertyAddress: incomeWithDetails.work?.propertyAddress || null
      };

      // Enviar notificación
      await sendNotifications('incomeRegistered', notificationData);
      console.log(`✅ Notificación de ingreso enviada: $${amount} - ${typeIncome}`);
    } catch (notificationError) {
      console.error('❌ Error enviando notificación de ingreso:', notificationError.message);
    }
    
    res.status(201).json(newIncome);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear el ingreso', error: error.message });
  }
};

// Obtener todos los ingresos CON relaciones
const getAllIncomes = async (req, res) => {
  try {
    // Obtener ingresos con Staff
    const incomes = await Income.findAll({
      include: [
        {
          model: Staff,
          as: 'Staff',
          attributes: ['id', 'name', 'email'],
          required: false
        }
      ],
      order: [['date', 'DESC']]
    });

    // Obtener receipts por separado
    const incomeIds = incomes.map(income => income.idIncome);
    const receipts = await Receipt.findAll({
      where: {
        relatedModel: 'Income',
        relatedId: {
          [Op.in]: incomeIds.map(id => id.toString())
        }
      },
      attributes: ['idReceipt', 'relatedId', 'fileUrl', 'mimeType', 'originalName', 'notes']
    });

    // Asociar receipts manualmente
    const incomesWithReceipts = incomes.map(income => {
      const incomeReceipts = receipts.filter(receipt => 
        receipt.relatedId === income.idIncome.toString()
      );
      return {
        ...income.toJSON(),
        Receipts: incomeReceipts
      };
    });

    res.status(200).json(incomesWithReceipts);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener los ingresos', error: error.message });
  }
};

// Obtener un ingreso por ID CON relaciones
const getIncomeById = async (req, res) => {
  const { id } = req.params;
  try {
    const income = await Income.findByPk(id, {
      include: [
        {
          model: Staff,
          as: 'Staff',
          attributes: ['id', 'name', 'email'],
          required: false
        },
        {
          model: Receipt,
          as: 'Receipts',
          required: false,
          on: {
            [Op.and]: [
              literal(`"Receipts"."relatedModel" = 'Income'`),
              literal(`"Income"."idIncome" = CAST("Receipts"."relatedId" AS UUID)`)
            ]
          },
          attributes: ['idReceipt', 'fileUrl', 'mimeType', 'originalName', 'notes'],
        }
      ]
    });
    if (!income) return res.status(404).json({ message: 'Ingreso no encontrado' });
    res.status(200).json(income);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener el ingreso', error: error.message });
  }
};

// Actualizar un ingreso
const updateIncome = async (req, res) => {
  const { id } = req.params;
  let { date, amount, typeIncome, notes, workId, staffId, paymentMethod, paymentDetails, verified } = req.body; // Agregar paymentDetails
  
  // ✅ Normalizar fecha si se proporciona
  if (date) {
    date = normalizeDateToLocal(date);
  }
  
  try {
    const income = await Income.findByPk(id);
    if (!income) return res.status(404).json({ message: 'Ingreso no encontrado' });

    // Actualizar el ingreso
    await income.update({ date, amount, typeIncome, notes, workId, staffId, paymentMethod, paymentDetails, verified }); // Incluir paymentDetails
    
    // Enviar notificación de actualización (opcional - solo para cambios importantes)
    try {
      // Solo notificar si es un cambio significativo en el monto
      const originalAmount = parseFloat(income._previousDataValues?.amount || 0);
      const newAmount = parseFloat(amount || 0);
      const amountChanged = Math.abs(originalAmount - newAmount) > 0.01; // Cambio mayor a 1 centavo
      
      if (amountChanged) {
        // Obtener información actualizada para la notificación
        const incomeWithDetails = await Income.findByPk(id, {
          include: [
            { model: Staff, as: 'Staff', attributes: ['id', 'name', 'email'] },
            { model: Work, as: 'Work', attributes: ['idWork', 'propertyAddress'] }
          ]
        });

        // Preparar datos para la notificación
        const notificationData = {
          ...incomeWithDetails.toJSON(),
          propertyAddress: incomeWithDetails.Work?.propertyAddress || 'Obra no especificada',
          // Agregar información del cambio
          previousAmount: originalAmount,
          newAmount: newAmount
        };

        // Usar el mismo tipo de notificación que para registros nuevos
        await sendNotifications('incomeRegistered', notificationData);
        console.log(`✅ Notificación de actualización de ingreso enviada: $${originalAmount} → $${newAmount}`);
      }
    } catch (notificationError) {
      console.error('❌ Error enviando notificación de actualización de ingreso:', notificationError.message);
    }
    
    res.status(200).json(income);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar el ingreso', error: error.message });
  }
};

// Eliminar un ingreso
const deleteIncome = async (req, res) => {
  const { id } = req.params;
  try {
    const income = await Income.findByPk(id);
    if (!income) return res.status(404).json({ message: 'Ingreso no encontrado' });

    await income.destroy();
    res.status(200).json({ message: 'Ingreso eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar el ingreso', error: error.message });
  }
};

// Obtener tipos de ingreso disponibles (desde el modelo ENUM)
const getIncomeTypes = async (req, res) => {
  try {
    // Los tipos vienen del ENUM definido en el modelo Income
    const types = [
      'Factura Pago Inicial Budget',
      'Factura Pago Final Budget',
      'DiseñoDif',
      'Comprobante Ingreso'
    ];
    
    res.status(200).json({ types });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener tipos de ingreso', error: error.message });
  }
};

module.exports = {
  createIncome,
  getAllIncomes,
  getIncomeById,
  updateIncome,
  deleteIncome,
  getIncomeTypes,
};