const { Income, Expense, Receipt } = require('../data');
const { Sequelize } = require('sequelize');

const getIncomesAndExpensesByWorkId = async (req, res) => {
  const { workId } = req.params;
  try {
    const incomes = await Income.findAll({ 
      where: { workId },
      include: [{ // <-- Incluir Recibos
        model: Receipt,
        as: 'Receipts',
        attributes: ['idReceipt', 'fileUrl', 'mimeType', 'originalName', 'notes'], // Especifica columnas
        required: false // Para que no falle si no hay recibo
    }]
     });
    const expenses = await Expense.findAll({ 
      where: { workId },
      include: [{ // <-- Include para Expense (AÑADIDO)
        model: Receipt,
        as: 'Receipts', // Asegúrate que este alias coincida con tu definición en index.js
        attributes: ['idReceipt', 'fileUrl', 'mimeType', 'originalName', 'notes'],
        required: false
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
  const { type, startDate, endDate, workId } = req.query;

  try {
    // Construir where clause base
    const whereClause = {};
    if (workId) whereClause.workId = workId;
    if (startDate && endDate) {
      whereClause.date = {
        [Sequelize.Op.between]: [startDate, endDate]
      };
    }

    // Consultar y agrupar ingresos
    const incomes = await Income.findAll({
      where: whereClause,
      attributes: [
        'typeIncome',
        [Sequelize.fn('SUM', Sequelize.col('amount')), 'total'],
        [Sequelize.fn('COUNT', Sequelize.col('typeIncome')), 'count']
      ],
      group: ['typeIncome']
    });

    // Consultar y agrupar gastos
    const expenses = await Expense.findAll({
      where: whereClause,
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

    // Formatear datos para gráficos
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