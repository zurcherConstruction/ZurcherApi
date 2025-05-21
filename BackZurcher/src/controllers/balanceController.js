const { Income, Expense, Receipt, Staff } = require('../data');
const { Sequelize, Op, literal } = require('sequelize');

const getIncomesAndExpensesByWorkId = async (req, res) => {
  const { workId } = req.params;
  try {
    const incomes = await Income.findAll({ 
      where: { workId },
     include: [{
        model: Receipt,
        as: 'Receipts',
        required: false,
        on: { // Condición de JOIN explícita
          [Op.and]: [
            literal(`"Receipts"."relatedModel" = 'Income'`), // Asegura que el recibo es de tipo Income
            // Asume que la PK de Income es 'idIncome' y es UUID
            // y se une con Receipt.relatedId (que es STRING)
            literal(`"Income"."idIncome" = CAST("Receipts"."relatedId" AS UUID)`) 
          ]
        },
        attributes: ['idReceipt', 'fileUrl', 'mimeType', 'originalName', 'notes'],
    }]
     });
    const expenses = await Expense.findAll({ 
      where: { workId },
      include: [{
        model: Receipt,
        as: 'Receipts', 
        required: false,
        on: { // Condición de JOIN explícita
          [Op.and]: [
            literal(`"Receipts"."relatedModel" = 'Expense'`), // Asegura que el recibo es de tipo Expense
            // Asume que la PK de Expense es 'idExpense' y es UUID
            // y se une con Receipt.relatedId (que es STRING)
            literal(`"Expense"."idExpense" = CAST("Receipts"."relatedId" AS UUID)`)
          ]
        },
        attributes: ['idReceipt', 'fileUrl', 'mimeType', 'originalName', 'notes'],
      }]
     });

    res.status(200).json({ incomes, expenses });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error al obtener ingresos y gastos', 
      error: error.message 
    });
  }
};

const getBalanceByWorkId = async (req, res) => {
  const { workId } = req.params;
  const { type } = req.query;

  try {
    // Consultar ingresos y agruparlos por tipo
    const incomes = await Income.findAll({ 
      where: { workId },
      attributes: [
        'typeIncome',
        [Sequelize.fn('SUM', Sequelize.col('amount')), 'total'],
        [Sequelize.fn('COUNT', Sequelize.col('typeIncome')), 'count']
      ],
      group: ['typeIncome']
    });

    // Consultar gastos y agruparlos por tipo
    const expenses = await Expense.findAll({
      where: { workId },
      attributes: [
        'typeExpense',
        [Sequelize.fn('SUM', Sequelize.col('amount')), 'total'],
        [Sequelize.fn('COUNT', Sequelize.col('typeExpense')), 'count']
      ],
      group: ['typeExpense']
    });

    // Calcular totales
    const totalIncome = incomes.reduce((sum, income) => 
      sum + parseFloat(income.getDataValue('total') || 0), 0
    );
    const totalExpense = expenses.reduce((sum, expense) => 
      sum + parseFloat(expense.getDataValue('total') || 0), 0
    );
    const balance = totalIncome - totalExpense;

    // Formatear los datos para el gráfico
    const incomesData = incomes.map(income => ({
      name: income.typeIncome || 'Sin clasificar',
      value: parseFloat(income.getDataValue('total')) || 0,
      count: parseInt(income.getDataValue('count')) || 0,
      type: 'income'
    }));

    const expensesData = expenses.map(expense => ({
      name: expense.typeExpense || 'Sin clasificar',
      value: parseFloat(expense.getDataValue('total')) || 0,
      count: parseInt(expense.getDataValue('count')) || 0,
      type: 'expense'
    }));

    // Preparar respuesta
    const responseData = {
      totalIncome,
      totalExpense,
      balance,
      details: {
        incomes: incomesData,
        expenses: expensesData
      }
    };

    // Filtrar por tipo si se especifica
    if (type === 'income') {
      responseData.details = { incomes: incomesData };
    } else if (type === 'expense') {
      responseData.details = { expenses: expensesData };
    }

    res.status(200).json(responseData);
  } catch (error) {
    console.error("Error en getBalanceByWorkId:", error);
    res.status(500).json({ 
      message: 'Error al obtener el balance', 
      error: error.message 
    });
  }
};

const getGeneralBalance = async (req, res) => {
  const { type, startDate, endDate, workId, typeIncome, typeExpense, staffId } = req.query;

  try {
    const incomeWhere = {};
    const expenseWhere = {};

    if (workId !== undefined) {
      incomeWhere.workId = workId === '' ? null : workId;
      expenseWhere.workId = workId === '' ? null : workId;
    }

    if (startDate && endDate) {
      incomeWhere.date = { [Sequelize.Op.between]: [startDate, endDate] };
      expenseWhere.date = { [Sequelize.Op.between]: [startDate, endDate] };
    }

    if (typeIncome) incomeWhere.typeIncome = typeIncome;
    if (typeExpense) expenseWhere.typeExpense = typeExpense;

    if (staffId) {
      incomeWhere.staffId = staffId;
      expenseWhere.staffId = staffId;
    }

    // --- Consulta agrupada para gráficos ---
    const incomes = await Income.findAll({
      where: incomeWhere,
      attributes: [
        'typeIncome',
        [Sequelize.fn('SUM', Sequelize.col('amount')), 'total'],
        [Sequelize.fn('COUNT', Sequelize.col('typeIncome')), 'count']
      ],
      group: ['typeIncome']
    });

    const expenses = await Expense.findAll({
      where: expenseWhere,
      attributes: [
        'typeExpense',
        [Sequelize.fn('SUM', Sequelize.col('amount')), 'total'],
        [Sequelize.fn('COUNT', Sequelize.col('typeExpense')), 'count']
      ],
      group: ['typeExpense']
    });

    // --- Consulta detallada de todos los ingresos/gastos con includes ---
    const allIncomes = await Income.findAll({
      where: incomeWhere,
      order: [['date', 'DESC']],
      include: [
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
        },
        {
          model: Staff,
          as: 'Staff',
          attributes: ['id', 'name', 'email'],
          required: false
        }
      ]
    });

    const allExpenses = await Expense.findAll({
      where: expenseWhere,
      order: [['date', 'DESC']],
      include: [
         {
          model: Receipt,
          as: 'Receipts',
          required: false,
          on: {
            [Op.and]: [
              literal(`"Receipts"."relatedModel" = 'Expense'`),
              literal(`"Expense"."idExpense" = CAST("Receipts"."relatedId" AS UUID)`)
            ]
          },
          attributes: ['idReceipt', 'fileUrl', 'mimeType', 'originalName', 'notes'],
        },
        {
          model: Staff,
          as: 'Staff',
          attributes: ['id', 'name', 'email'],
          required: false
        }
      ]
    });

    // ...el resto del código igual...
    const totalIncome = incomes.reduce((sum, income) =>
      sum + parseFloat(income.getDataValue('total') || 0), 0
    );
    const totalExpense = expenses.reduce((sum, expense) =>
      sum + parseFloat(expense.getDataValue('total') || 0), 0
    );
    const balance = totalIncome - totalExpense;

    const incomesData = incomes.map(income => ({
      name: income.typeIncome || 'Sin clasificar',
      value: parseFloat(income.getDataValue('total')) || 0,
      count: parseInt(income.getDataValue('count')) || 0
    }));

    const expensesData = expenses.map(expense => ({
      name: expense.typeExpense || 'Sin clasificar',
      value: parseFloat(expense.getDataValue('total')) || 0,
      count: parseInt(expense.getDataValue('count')) || 0
    }));

    const responseData = {
      totalIncome,
      totalExpense,
      balance,
      details: {
        incomes: incomesData,
        expenses: expensesData
      },
      list: {
        incomes: allIncomes,
        expenses: allExpenses
      }
    };

    if (type === 'income') {
      responseData.details = { incomes: incomesData };
      responseData.list = { incomes: allIncomes };
    } else if (type === 'expense') {
      responseData.details = { expenses: expensesData };
      responseData.list = { expenses: allExpenses };
    }

    res.status(200).json(responseData);
  } catch (error) {
    console.error("Error en getGeneralBalance:", error);
    res.status(500).json({
      message: 'Error al obtener el balance general',
      error: error.message
    });
  }
};

module.exports = {
  getIncomesAndExpensesByWorkId,
  getBalanceByWorkId,
  getGeneralBalance
};