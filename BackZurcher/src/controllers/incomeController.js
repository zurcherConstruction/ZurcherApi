const { Income, Staff, Receipt } = require('../data');
const { Op } = require('sequelize');// Importa el modelo Income



// Crear un nuevo ingreso
const createIncome = async (req, res) => {
  const { date, amount, typeIncome, notes, workId, staffId } = req.body;
  try {
    const newIncome = await Income.create({ date, amount, typeIncome, notes, workId, staffId });
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
  const { date, amount, typeIncome, notes, workId, staffId } = req.body; // Agregar staffId
  try {
    const income = await Income.findByPk(id);
    if (!income) return res.status(404).json({ message: 'Ingreso no encontrado' });

    await income.update({ date, amount, typeIncome, notes, workId, staffId }); // Incluir staffId
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

module.exports = {
  createIncome,
  getAllIncomes,
  getIncomeById,
  updateIncome,
  deleteIncome,
};