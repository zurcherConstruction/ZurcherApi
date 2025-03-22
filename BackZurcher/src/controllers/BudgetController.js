const { Budget } = require('../data/models');

const BudgetController = {
  async createBudget(req, res) {
    try {
      const budget = await Budget.create(req.body);
      res.status(201).json(budget);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  async getBudgets(req, res) {
    try {
      const budgets = await Budget.findAll();
      res.status(200).json(budgets);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async getBudgetById(req, res) {
    try {
      const budget = await Budget.findByPk(req.params.id);
      if (!budget) {
        return res.status(404).json({ error: 'Budget not found' });
      }
      res.status(200).json(budget);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async updateBudget(req, res) {
    try {
      const [updated] = await Budget.update(req.body, {
        where: { idBudget: req.params.id },
      });
      if (!updated) {
        return res.status(404).json({ error: 'Budget not found' });
      }
      const updatedBudget = await Budget.findByPk(req.params.id);
      res.status(200).json(updatedBudget);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  async deleteBudget(req, res) {
    try {
      const deleted = await Budget.destroy({
        where: { idBudget: req.params.id },
      });
      if (!deleted) {
        return res.status(404).json({ error: 'Budget not found' });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
};

module.exports = BudgetController;
