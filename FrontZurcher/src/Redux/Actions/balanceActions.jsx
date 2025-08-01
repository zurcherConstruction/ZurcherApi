import api from '../../utils/axios';

// Helper para manejar errores
const handleError = (error, message) => {
  console.error(`${message} - Detalles del error:`, error.response?.data || error.message);
  return { error: true, message: error.response?.data?.message || error.message };
};

// Actions para Income
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

// Actions para Expense
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

// Actions para Balance
export const balanceActions = {
  getIncomesAndExpensesByWorkId: async (workId) => {
    try {
      const response = await api.get(`/balance/work/${workId}`);
      return response.data;
    } catch (error) {
      return handleError(error, 'Error al obtener ingresos y gastos por workId');
    }
  },

  getBalanceByWorkId: async (workId) => {
    try {
      const response = await api.get(`/balance/balance/${workId}`);
      return response.data;
    } catch (error) {
      return handleError(error, 'Error al obtener el balance por workId');
    }
  },
 

  getGeneralBalance: async (filters = {}) => {
  try {
    
    
    // AGREGAR: Validar y limpiar filtros vacíos
    const cleanFilters = Object.entries(filters)
      .filter(([key, value]) => value !== '' && value !== null && value !== undefined)
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
    
   
    
    const response = await api.get('/balance/generalBalance', { params: cleanFilters });
   
    return response.data;
  } catch (error) {
    return handleError(error, 'Error al obtener el balance general');
  }
},

 getFinancialStats: async (period, customDateRange = null) => {
    try {
      let filters = {};
      
      if (customDateRange) {
        filters.startDate = customDateRange.start;
        filters.endDate = customDateRange.end;
      } else {
        // Usar período predefinido
        const now = new Date();
        switch (period) {
          case 'week':
            filters.startDate = new Date(now.setDate(now.getDate() - 7)).toISOString().split('T')[0];
            filters.endDate = new Date().toISOString().split('T')[0];
            break;
          case 'month':
            filters.startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
            filters.endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
            break;
          case 'year':
            filters.startDate = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
            filters.endDate = new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0];
            break;
        }
      }
      
      
      return await this.getGeneralBalance(filters);
    } catch (error) {
      return handleError(error, 'Error al obtener estadísticas financieras');
    }
  },

  // AGREGAR: Action para obtener solo totales (más rápida)
  getBalanceSummary: async (filters = {}) => {
    try {
      // Usar los mismos filtros pero solo obtener totales
      const summaryFilters = { ...filters, summary: true };
      
      const response = await api.get('/balance/generalBalance', { params: summaryFilters });
      return {
        totalIncome: response.data.totalIncome || 0,
        totalExpense: response.data.totalExpense || 0,
        balance: response.data.balance || 0,
        details: response.data.details || { incomes: [], expenses: [] }
      };
    } catch (error) {
      return handleError(error, 'Error al obtener resumen del balance');
    }
  }
};
