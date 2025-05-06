const { Income } = require('../data'); // Importa el modelo Income

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

// Obtener todos los ingresos
const getAllIncomes = async (req, res) => {
  try {
    const incomes = await Income.findAll();
    res.status(200).json(incomes);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener los ingresos', error: error.message });
  }
};

// Obtener un ingreso por ID
const getIncomeById = async (req, res) => {
  const { id } = req.params;
  try {
    const income = await Income.findByPk(id);
    if (!income) return res.status(404).json({ message: 'Ingreso no encontrado' });
    res.status(200).json(income);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener el ingreso', error: error.message });
  }
};

// Actualizar un ingreso
const updateIncome = async (req, res) => {
  const { id } = req.params;
  const { date, amount, typeIncome, notes, workId } = req.body;
  try {
    const income = await Income.findByPk(id);
    if (!income) return res.status(404).json({ message: 'Ingreso no encontrado' });

    await income.update({ date, amount, typeIncome, notes, workId });
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