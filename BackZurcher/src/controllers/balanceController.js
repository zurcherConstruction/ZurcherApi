const { Income, Expense } = require('../data'); // Importa tus modelos

const getIncomesAndExpensesByWorkId = async (req, res) => {
  const { workId } = req.params;
  try {
    const incomes = await Income.findAll({ where: { workId: workId } });
    const expenses = await Expense.findAll({ where: { workId: workId } });

    res.status(200).json({ incomes, expenses });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener ingresos y gastos', error: error.message });
  }
};

const getBalanceByWorkId = async (req, res) => {
    const { workId } = req.params;
    try {
      const incomes = await Income.findAll({ where: { workId: workId } });
      const expenses = await Expense.findAll({ where: { workId: workId } });
  
      // Calcula el total de ingresos y gastos
      const totalIncome = incomes.reduce((sum, income) => sum + parseFloat(income.amount), 0);
      const totalExpense = expenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
  
      const balance = totalIncome - totalExpense;
  
      res.status(200).json({
        totalIncome,
        totalExpense,
        balance,
      });
    } catch (error) {
      res.status(500).json({ message: 'Error al obtener el balance', error: error.message });
    }
  };

const getGeneralBalance = async (req, res) => {
  const { type, startDate, endDate, workId } = req.query;

  try {
    let incomes = await Income.findAll({
      where: {
        ...(workId && { workId }),
        ...(type && { typeIncome: type }),
        ...(startDate && endDate && {
          date: {
            [Sequelize.Op.between]: [startDate, endDate],
          },
        }),
      },
    });

    let expenses = await Expense.findAll({
      where: {
        ...(workId && { workId }),
        ...(type && { typeExpense: type }),
        ...(startDate && endDate && {
          date: {
            [Sequelize.Op.between]: [startDate, endDate],
          },
        }),
      },
    });

    // Calcula el total de ingresos y gastos
    const totalIncome = incomes.reduce((sum, income) => sum + parseFloat(income.amount), 0);
    const totalExpense = expenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);

    const balance = totalIncome - totalExpense;

    res.status(200).json({
      totalIncome,
      totalExpense,
      balance,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener el balance general', error: error.message });
  }
};

module.exports = {
  getIncomesAndExpensesByWorkId,
  getBalanceByWorkId,
  getGeneralBalance,
};