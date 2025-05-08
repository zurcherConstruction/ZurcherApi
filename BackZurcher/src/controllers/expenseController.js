const { Expense } = require('../data'); // Importa el modelo Expense

// Crear un nuevo gasto
const createExpense = async (req, res) => {
  const { date, amount, typeExpense, notes, workId, staffId } = req.body;
  try {
    const newExpense = await Expense.create({ date, amount, typeExpense, notes, workId, staffId });
    res.status(201).json(newExpense);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear el gasto', error: error.message });
  }
};

// Obtener todos los gastos
const getAllExpenses = async (req, res) => {
  try {
    const expenses = await Expense.findAll();
    res.status(200).json(expenses);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener los gastos', error: error.message });
  }
};

// Obtener un gasto por ID
const getExpenseById = async (req, res) => {
  const { id } = req.params;
  try {
    const expense = await Expense.findByPk(id);
    if (!expense) return res.status(404).json({ message: 'Gasto no encontrado' });
    res.status(200).json(expense);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener el gasto', error: error.message });
  }
};

// Actualizar un gasto
const updateExpense = async (req, res) => {
  const { id } = req.params;
  const { date, amount, typeExpense, notes, workId } = req.body;
  try {
    const expense = await Expense.findByPk(id);
    if (!expense) return res.status(404).json({ message: 'Gasto no encontrado' });

    await expense.update({ date, amount, typeExpense, notes, workId });
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