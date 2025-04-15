import api from '../../utils/axios';

// Helper function to handle API errors
export const handleError = (error, message) => {
  console.error(`${message} - Detalles del error:`, error.response?.data || error.message);
  return { error: true, message: error.response?.data?.message || error.message };
};

// Income Actions
export const incomeActions = {
  create: async (incomeData) => {
    try {
      const response = await api.post('/income', incomeData);
      return response.data;
    } catch (error) {
      return handleError(error, 'Error al crear el ingreso');
    }
  },
  getAll: async () => {
    try {
      const response = await api.get('/income');
      return response.data;
    } catch (error) {
      return handleError(error, 'Error al obtener los ingresos');
    }
  },
  getById: async (id) => {
    try {
      const response = await api.get(`/income/${id}`);
      return response.data;
    } catch (error) {
      return handleError(error, 'Error al obtener el ingreso');
    }
  },
  update: async (id, incomeData) => {
    try {
      const response = await api.put(`/income/${id}`, incomeData);
      return response.data;
    } catch (error) {
      return handleError(error, 'Error al actualizar el ingreso');
    }
  },
  delete: async (id) => {
    try {
      const response = await api.delete(`/income/${id}`);
      return response.data;
    } catch (error) {
      return handleError(error, 'Error al eliminar el ingreso');
    }
  },
};

// Expense Actions
export const expenseActions = {
  create: async (expenseData) => {
    try {
      const response = await api.post('/expense', expenseData);
      return response.data;
    } catch (error) {
      return handleError(error, 'Error al crear el gasto');
    }
  },
  getAll: async () => {
    try {
      const response = await api.get('/expense');
      return response.data;
    } catch (error) {
      return handleError(error, 'Error al obtener los gastos');
    }
  },
  getById: async (id) => {
    try {
      const response = await api.get(`/expense/${id}`);
      return response.data;
    } catch (error) {
      return handleError(error, 'Error al obtener el gasto');
    }
  },
  update: async (id, expenseData) => {
    try {
      const response = await api.put(`/expense/${id}`, expenseData);
      return response.data;
    } catch (error) {
      return handleError(error, 'Error al actualizar el gasto');
    }
  },
  delete: async (id) => {
    try {
      const response = await api.delete(`/expense/${id}`);
      return response.data;
    } catch (error) {
      return handleError(error, 'Error al eliminar el gasto');
    }
  },
};