import api from '../../utils/axios';

// Helper para manejar errores
const handleError = (error, message) => {
  console.error(`${message} - Detalles del error:`, error.response?.data || error.message);
  return { error: true, message: error.response?.data?.message || error.message };
};

// Actions para FixedExpense (Gastos Fijos)
export const fixedExpenseActions = {
  // Crear un nuevo gasto fijo
  create: async (expenseData) => {
    try {
      const response = await api.post('/fixed-expenses', expenseData);
      return response.data;
    } catch (error) {
      return handleError(error, 'Error al crear el gasto fijo');
    }
  },

  // Obtener todos los gastos fijos
  getAll: async (filters = {}) => {
    try {
      const response = await api.get('/fixed-expenses', { params: filters });
      return response.data;
    } catch (error) {
      return handleError(error, 'Error al obtener los gastos fijos');
    }
  },

  // Obtener gasto fijo por ID
  getById: async (id) => {
    try {
      const response = await api.get(`/fixed-expenses/${id}`);
      return response.data;
    } catch (error) {
      return handleError(error, 'Error al obtener el gasto fijo');
    }
  },

  // Actualizar gasto fijo
  update: async (id, expenseData) => {
    try {
      const response = await api.put(`/fixed-expenses/${id}`, expenseData);
      return response.data;
    } catch (error) {
      return handleError(error, 'Error al actualizar el gasto fijo');
    }
  },

  // Eliminar gasto fijo (soft delete)
  delete: async (id) => {
    try {
      const response = await api.delete(`/fixed-expenses/${id}`);
      return response.data;
    } catch (error) {
      return handleError(error, 'Error al eliminar el gasto fijo');
    }
  },

  // Obtener gastos fijos sin pagar (disponibles para vincular a facturas)
  getUnpaid: async (filters = {}) => {
    try {
      const response = await api.get('/fixed-expenses/unpaid', { params: filters });
      return response.data;
    } catch (error) {
      return handleError(error, 'Error al obtener gastos fijos sin pagar');
    }
  },

  // Obtener gastos fijos por estado de pago
  getByPaymentStatus: async (status) => {
    try {
      const response = await api.get(`/fixed-expenses/by-status/${status}`);
      return response.data;
    } catch (error) {
      return handleError(error, 'Error al obtener gastos fijos por estado de pago');
    }
  },

  // Marcar gasto fijo como pagado
  markAsPaid: async (id, paymentData) => {
    try {
      const response = await api.post(`/fixed-expenses/${id}/mark-paid`, paymentData);
      return response.data;
    } catch (error) {
      return handleError(error, 'Error al marcar el gasto fijo como pagado');
    }
  },

  // Generar siguiente ocurrencia de un gasto fijo recurrente
  generateNext: async (id) => {
    try {
      const response = await api.post(`/fixed-expenses/${id}/generate-next`);
      return response.data;
    } catch (error) {
      return handleError(error, 'Error al generar la siguiente ocurrencia');
    }
  },

  // Obtener historial de un gasto fijo
  getHistory: async (id) => {
    try {
      const response = await api.get(`/fixed-expenses/${id}/history`);
      return response.data;
    } catch (error) {
      return handleError(error, 'Error al obtener el historial del gasto fijo');
    }
  },
};
