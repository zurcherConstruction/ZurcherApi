const { Expense, Staff, Receipt } = require('../data'); // Agregar Staff y Receipt
const { Op } = require('sequelize'); // Agregar para las consultas
const { uploadBufferToCloudinary } = require('../utils/cloudinaryUploader');

// Crear un nuevo gasto
const createExpense = async (req, res) => {
  const { date, amount, typeExpense, notes, workId, staffId } = req.body;
  try {
    // 1. Crear el Expense normalmente
    const newExpense = await Expense.create({ date, amount, typeExpense, notes, workId, staffId });

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
  const { date, amount, typeExpense, notes, workId, staffId } = req.body; // Agregar staffId
  try {
    const expense = await Expense.findByPk(id);
    if (!expense) return res.status(404).json({ message: 'Gasto no encontrado' });

    await expense.update({ date, amount, typeExpense, notes, workId, staffId }); // Incluir staffId
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

module.exports = {
  createExpense,
  getAllExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
};