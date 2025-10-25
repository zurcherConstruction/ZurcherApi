const { Expense, Staff, Receipt, Work } = require('../data'); // Agregar Work para las notificaciones
const { Op } = require('sequelize'); // Agregar para las consultas
const { uploadBufferToCloudinary } = require('../utils/cloudinaryUploader');
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

// Crear un nuevo gasto
const createExpense = async (req, res) => {
  let { date, amount, typeExpense, notes, workId, staffId, paymentMethod, paymentDetails, verified } = req.body;
  
  // ✅ Normalizar fecha (acepta ISO completo o YYYY-MM-DD)
  date = normalizeDateToLocal(date);
  
  try {
    // ✅ VALIDACIÓN: paymentMethod es OBLIGATORIO
    if (!paymentMethod) {
      return res.status(400).json({
        error: 'El método de pago es obligatorio',
        message: 'Debe seleccionar un método de pago para registrar el gasto'
      });
    }

    // 1. Crear el Expense normalmente (con estado unpaid por defecto)
    const newExpense = await Expense.create({ 
      date, 
      amount, 
      typeExpense, 
      notes, 
      workId, 
      staffId, 
      paymentMethod, 
      paymentDetails,
      verified: verified || false,
      paymentStatus: 'unpaid'  // 🆕 Todos los gastos inician como no pagados
    });

    // 2. Si es Inspección Inicial o Inspección Final y hay archivo, crear Receipt asociado
    let createdReceipt = null;
    if ((typeExpense === 'Inspección Inicial' || typeExpense === 'Inspección Final') && req.file) {
      // Subir archivo a Cloudinary
      const result = await uploadBufferToCloudinary(req.file.buffer, {
        folder: 'zurcher_receipts',
        resource_type: req.file.mimetype === 'application/pdf' ? 'raw' : 'auto',
        format: req.file.mimetype === 'application/pdf' ? undefined : 'jpg',
        access_mode: 'public'
      });

      // Crear Receipt asociado al Expense
      createdReceipt = await Receipt.create({
        relatedModel: 'Expense',
        relatedId: newExpense.idExpense.toString(),
        type: typeExpense,
        notes,
        fileUrl: result.secure_url,
        publicId: result.public_id,
        mimeType: req.file.mimetype,
        originalName: req.file.originalname
      });
    }

    // 3. Enviar notificaciones al equipo de finanzas
    try {
      // Obtener información adicional para la notificación
      const expenseWithDetails = await Expense.findByPk(newExpense.idExpense, {
        include: [
          { model: Staff, as: 'Staff', attributes: ['id', 'name', 'email'] },
          { model: Work, as: 'work', attributes: ['idWork', 'propertyAddress'] }
        ]
      });

      // Preparar datos para la notificación
      const notificationData = {
        ...expenseWithDetails.toJSON(),
        // Agregar propiedades adicionales si no están en las relaciones
        propertyAddress: expenseWithDetails.work?.propertyAddress || null
      };

      // Enviar notificación
      await sendNotifications('expenseCreated', notificationData);
      console.log(`✅ Notificación de gasto enviada: $${amount} - ${typeExpense}`);
    } catch (notificationError) {
      console.error('❌ Error enviando notificación de gasto:', notificationError.message);
      // No fallar la creación del gasto por error de notificación
    }

    // Devolver ambos si corresponde
    res.status(201).json({
      ...newExpense.toJSON(),
      Receipt: createdReceipt ? createdReceipt.toJSON() : null
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al crear el gasto', error: error.message });
  }
};

// Obtener todos los gastos CON relaciones
const getAllExpenses = async (req, res) => {
  try {
    // Obtener gastos con Staff
    const expenses = await Expense.findAll({
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
    const expenseIds = expenses.map(expense => expense.idExpense);
    const receipts = await Receipt.findAll({
      where: {
        relatedModel: 'Expense',
        relatedId: {
          [Op.in]: expenseIds.map(id => id.toString())
        }
      },
      attributes: ['idReceipt', 'relatedId', 'fileUrl', 'mimeType', 'originalName', 'notes']
    });

    // Asociar receipts manualmente
    const expensesWithReceipts = expenses.map(expense => {
      const expenseReceipts = receipts.filter(receipt => 
        receipt.relatedId === expense.idExpense.toString()
      );
      return {
        ...expense.toJSON(),
        Receipts: expenseReceipts
      };
    });

    res.status(200).json(expensesWithReceipts);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener los gastos', error: error.message });
  }
};

// Obtener un gasto por ID CON relaciones
const getExpenseById = async (req, res) => {
  const { id } = req.params;
  try {
    const expense = await Expense.findByPk(id, {
      include: [
        {
          model: Staff,
          as: 'Staff',
          attributes: ['id', 'name', 'email'],
          required: false
        }
      ]
    });

    if (!expense) return res.status(404).json({ message: 'Gasto no encontrado' });

    // Obtener receipts por separado
    const receipts = await Receipt.findAll({
      where: {
        relatedModel: 'Expense',
        relatedId: id.toString()
      },
      attributes: ['idReceipt', 'fileUrl', 'mimeType', 'originalName', 'notes']
    });

    res.status(200).json({
      ...expense.toJSON(),
      Receipts: receipts
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener el gasto', error: error.message });
  }
};


// Actualizar un gasto
const updateExpense = async (req, res) => {
  const { id } = req.params;
  let { date, amount, typeExpense, notes, workId, staffId, paymentMethod, paymentDetails, verified } = req.body; // Agregar paymentDetails
  
  // ✅ Normalizar fecha si se proporciona
  if (date) {
    date = normalizeDateToLocal(date);
  }
  
  try {
    const expense = await Expense.findByPk(id);
    if (!expense) return res.status(404).json({ message: 'Gasto no encontrado' });

    // Actualizar el gasto
    await expense.update({ date, amount, typeExpense, notes, workId, staffId, paymentMethod, paymentDetails, verified }); // Incluir paymentDetails
    
    // Enviar notificación de actualización
    try {
      // Obtener información actualizada para la notificación
      const expenseWithDetails = await Expense.findByPk(id, {
        include: [
          { model: Staff, as: 'Staff', attributes: ['id', 'name', 'email'] },
          { model: Work, as: 'work', attributes: ['idWork', 'propertyAddress'] }
        ]
      });

      // Preparar datos para la notificación
      const notificationData = {
        ...expenseWithDetails.toJSON(),
        propertyAddress: expenseWithDetails.work?.propertyAddress || null
      };

      // Enviar notificación
      await sendNotifications('expenseUpdated', notificationData);
      console.log(`✅ Notificación de actualización de gasto enviada: $${amount} - ${typeExpense}`);
    } catch (notificationError) {
      console.error('❌ Error enviando notificación de actualización de gasto:', notificationError.message);
    }
    
    res.status(200).json(expense);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar el gasto', error: error.message });
  }
};

// Eliminar un gasto
const deleteExpense = async (req, res) => {
  const { id } = req.params;
  try {
    const expense = await Expense.findByPk(id);
    if (!expense) return res.status(404).json({ message: 'Gasto no encontrado' });

    await expense.destroy();
    res.status(200).json({ message: 'Gasto eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar el gasto', error: error.message });
  }
};

// Obtener tipos de gasto disponibles (desde el modelo ENUM)
const getExpenseTypes = async (req, res) => {
  try {
    // Los tipos vienen del ENUM definido en el modelo Expense
    const types = [
      'Materiales',
      'Diseño',
      'Workers',
      'Imprevistos',
      'Comprobante Gasto',
      'Gastos Generales',
      'Materiales Iniciales',
      'Inspección Inicial',
      'Inspección Final',
      'Comisión Vendedor',
      'Gasto Fijo'
    ];
    
    res.status(200).json({ types });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener tipos de gasto', error: error.message });
  }
};

// Obtener gastos no pagados (para vincular con invoices)
const getUnpaidExpenses = async (req, res) => {
  try {
    const { workId, vendor } = req.query;

    const where = {
      paymentStatus: 'unpaid'
    };

    if (workId) {
      where.workId = workId;
    }

    if (vendor) {
      where.vendor = { [Op.iLike]: `%${vendor}%` };
    }

    const unpaidExpenses = await Expense.findAll({
      where,
      include: [
        {
          model: Work,
          as: 'work',
          attributes: ['idWork', 'propertyAddress'] // Work NO tiene campo 'name'
        },
        {
          model: Staff,
          as: 'Staff',
          attributes: ['id', 'name']
        }
      ],
      order: [['date', 'DESC']]
    });

    // Devolver array directamente para compatibilidad con frontend
    res.json(unpaidExpenses);

  } catch (error) {
    res.status(500).json({
      error: 'Error al obtener gastos no pagados',
      details: error.message
    });
  }
};

// Obtener gastos por estado de pago
const getExpensesByPaymentStatus = async (req, res) => {
  try {
    const { status } = req.params; // Obtener status desde params de URL
    const { workId } = req.query;

    const where = {};

    // Validar que el status sea válido
    const validStatuses = ['unpaid', 'paid', 'paid_via_invoice'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        error: 'Estado de pago inválido',
        validStatuses
      });
    }

    if (status) {
      where.paymentStatus = status;
    }

    if (workId) {
      where.workId = workId;
    }

    const expenses = await Expense.findAll({
      where,
      include: [
        {
          model: Work,
          as: 'work',
          attributes: ['idWork', 'propertyAddress', 'name']
        },
        {
          model: Staff,
          as: 'Staff',
          attributes: ['id', 'name']
        }
      ],
      order: [['date', 'DESC']]
    });

    // Devolver array directamente para compatibilidad con frontend
    res.json(expenses);

  } catch (error) {
    res.status(500).json({
      error: 'Error al obtener gastos por estado',
      details: error.message
    });
  }
};

// 🆕 Crear gasto general con recibo (para workers)
const createGeneralExpenseWithReceipt = async (req, res) => {
  const { amount, notes, staffId } = req.body;
  
  try {
    // Validaciones
    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({
        error: true,
        message: 'El monto debe ser mayor a 0'
      });
    }

    if (!staffId) {
      return res.status(400).json({
        error: true,
        message: 'Se requiere el ID del staff'
      });
    }

    // Crear fecha actual en formato local
    const now = new Date();
    const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    // Crear el gasto general
    const newExpense = await Expense.create({
      date: localDate,
      amount: parseFloat(amount),
      typeExpense: 'Gastos Generales',
      notes: notes || 'Gasto general registrado por worker',
      workId: null, // No está asociado a un trabajo específico
      staffId: staffId,
      paymentMethod: 'Chase Credit Card', // Método por defecto según especificación
      paymentStatus: 'unpaid',
      verified: false
    });

    // Si hay archivo (recibo), subirlo a Cloudinary y crear Receipt
    let createdReceipt = null;
    if (req.file) {
      try {
        const result = await uploadBufferToCloudinary(req.file.buffer, {
          folder: 'zurcher_receipts/general_expenses',
          resource_type: req.file.mimetype === 'application/pdf' ? 'raw' : 'auto',
          format: req.file.mimetype === 'application/pdf' ? undefined : 'jpg',
          access_mode: 'public'
        });

        createdReceipt = await Receipt.create({
          relatedModel: 'Expense',
          relatedId: newExpense.idExpense.toString(),
          type: 'Gastos Generales',
          notes: notes || 'Comprobante de gasto general',
          fileUrl: result.secure_url,
          publicId: result.public_id,
          mimeType: req.file.mimetype,
          originalName: req.file.originalname
        });
      } catch (uploadError) {
        console.error('Error al subir recibo:', uploadError);
        // No fallar la creación del gasto si falla la subida del recibo
      }
    }

    // Enviar notificaciones
    try {
      const expenseWithDetails = await Expense.findByPk(newExpense.idExpense, {
        include: [
          { model: Staff, as: 'Staff', attributes: ['id', 'name', 'email'] }
        ]
      });

      await sendNotifications('expenseCreated', expenseWithDetails.toJSON());
      console.log(`✅ Notificación de gasto general enviada: $${amount}`);
    } catch (notificationError) {
      console.error('❌ Error enviando notificación:', notificationError.message);
    }

    res.status(201).json({
      success: true,
      message: 'Gasto general creado correctamente',
      expense: {
        ...newExpense.toJSON(),
        Receipt: createdReceipt ? createdReceipt.toJSON() : null
      }
    });
  } catch (error) {
    console.error('Error al crear gasto general:', error);
    res.status(500).json({ 
      error: true,
      message: 'Error al crear el gasto general', 
      details: error.message 
    });
  }
};

module.exports = {
  createExpense,
  getAllExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
  getExpenseTypes,
  getUnpaidExpenses,
  getExpensesByPaymentStatus,
  createGeneralExpenseWithReceipt
};