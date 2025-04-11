import api from '../../utils/axios';

// Helper para manejar errores
const handleError = (error, message) => {
  console.error(message, error);
  throw error;
};

// Actions para Income
export const incomeActions = {
  create: async (incomeData) => {
    try {
      const response = await api.post('/income', incomeData);
      return response.data;
    } catch (error) {
      handleError(error, 'Error al crear el ingreso:');
    }
  },

  getAll: async () => {
    try {
      const response = await api.get('/income');
      return response.data;
    } catch (error) {
      handleError(error, 'Error al obtener los ingresos:');
    }
  },

  getById: async (id) => {
    try {
      const response = await api.get(`/income/${id}`);
      return response.data;
    } catch (error) {
      handleError(error, 'Error al obtener el ingreso:');
    }
  },

  update: async (id, incomeData) => {
    try {
      const response = await api.put(`/income/${id}`, incomeData);
      return response.data;
    } catch (error) {
      handleError(error, 'Error al actualizar el ingreso:');
    }
  },

  delete: async (id) => {
    try {
      const response = await api.delete(`/income/${id}`);
      return response.data;
    } catch (error) {
      handleError(error, 'Error al eliminar el ingreso:');
    }
  },
};

// Actions para Expense
export const expenseActions = {
  create: async (expenseData) => {
    try {
      const response = await api.post('/expense', expenseData);
      return response.data;
    } catch (error) {
      handleError(error, 'Error al crear el gasto:');
    }
  },

  getAll: async () => {
    try {
      const response = await api.get('/expense');
      return response.data;
    } catch (error) {
      handleError(error, 'Error al obtener los gastos:');
    }
  },

  getById: async (id) => {
    try {
      const response = await api.get(`/expense/${id}`);
      return response.data;
    } catch (error) {
      handleError(error, 'Error al obtener el gasto:');
    }
  },

  update: async (id, expenseData) => {
    try {
      const response = await api.put(`/expense/${id}`, expenseData);
      return response.data;
    } catch (error) {
      handleError(error, 'Error al actualizar el gasto:');
    }
  },

  delete: async (id) => {
    try {
      const response = await api.delete(`/expense/${id}`);
      return response.data;
    } catch (error) {
      handleError(error, 'Error al eliminar el gasto:');
    }
  },
};

// Actions para Balance
export const balanceActions = {
  getIncomesAndExpensesByWorkId: async (workId) => {
    try {
      const response = await api.get(`/balance/work/${workId}`);
      return response.data;
    } catch (error) {
      handleError(error, 'Error al obtener ingresos y gastos por workId:');
    }
  },

  getBalanceByWorkId: async (workId) => {
    try {
      const response = await api.get(`/balance/balance/${workId}`);
      return response.data;
    } catch (error) {
      handleError(error, 'Error al obtener el balance por workId:');
    }
  },

  getGeneralBalance: async (filters) => {
    try {
      const response = await api.get('/balance/generalBalance', { params: filters });
      return response.data;
    } catch (error) {
      handleError(error, 'Error al obtener el balance general:');
    }
  },
};