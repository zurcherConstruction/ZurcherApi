import api from '../../utils/axios';

// Helper para manejar errores
const handleError = (error, message) => {
  console.error(`${message} - Detalles del error:`, error.response?.data || error.message);
  return { error: true, message: error.response?.data?.message || error.message };
};

// Actions para Bank Accounts
export const bankAccountActions = {
  // Obtener todas las cuentas
  getAll: async () => {
    try {
      const response = await api.get('/bank-accounts');
      return response.data;
    } catch (error) {
      return handleError(error, 'Error al obtener las cuentas bancarias');
    }
  },

  // Obtener dashboard con resumen
  getDashboard: async () => {
    try {
      const response = await api.get('/bank-accounts/summary/dashboard');
      return response.data;
    } catch (error) {
      return handleError(error, 'Error al obtener el dashboard de cuentas');
    }
  },

  // Obtener una cuenta por ID
  getById: async (id) => {
    try {
      const response = await api.get(`/bank-accounts/${id}`);
      return response.data;
    } catch (error) {
      return handleError(error, 'Error al obtener la cuenta bancaria');
    }
  },

  // Obtener balance de una cuenta
  getBalance: async (id) => {
    try {
      const response = await api.get(`/bank-accounts/${id}/balance`);
      return response.data;
    } catch (error) {
      return handleError(error, 'Error al obtener el balance');
    }
  },

  // Crear nueva cuenta
  create: async (accountData) => {
    try {
      const response = await api.post('/bank-accounts', accountData);
      return response.data;
    } catch (error) {
      return handleError(error, 'Error al crear la cuenta bancaria');
    }
  },

  // Actualizar cuenta
  update: async (id, accountData) => {
    try {
      const response = await api.put(`/bank-accounts/${id}`, accountData);
      return response.data;
    } catch (error) {
      return handleError(error, 'Error al actualizar la cuenta bancaria');
    }
  }
};

// Actions para Bank Transactions
export const bankTransactionActions = {
  // Obtener todas las transacciones
  getAll: async (params = {}) => {
    try {
      const response = await api.get('/bank-transactions', { params });
      return response.data;
    } catch (error) {
      return handleError(error, 'Error al obtener las transacciones');
    }
  },

  // Obtener transacciones de una cuenta
  getByAccount: async (accountId) => {
    try {
      const response = await api.get(`/bank-accounts/${accountId}/transactions`);
      return response.data;
    } catch (error) {
      return handleError(error, 'Error al obtener las transacciones de la cuenta');
    }
  },

  // Obtener una transacción por ID
  getById: async (id) => {
    try {
      const response = await api.get(`/bank-transactions/${id}`);
      return response.data;
    } catch (error) {
      return handleError(error, 'Error al obtener la transacción');
    }
  },

  // Crear depósito
  createDeposit: async (depositData) => {
    try {
      const response = await api.post('/bank-transactions/deposit', depositData);
      return response.data;
    } catch (error) {
      return handleError(error, 'Error al crear el depósito');
    }
  },

  // Crear retiro
  createWithdrawal: async (withdrawalData) => {
    try {
      const response = await api.post('/bank-transactions/withdrawal', withdrawalData);
      return response.data;
    } catch (error) {
      return handleError(error, 'Error al crear el retiro');
    }
  },

  // Crear transferencia
  createTransfer: async (transferData) => {
    try {
      const response = await api.post('/bank-transactions/transfer', transferData);
      return response.data;
    } catch (error) {
      return handleError(error, 'Error al crear la transferencia');
    }
  },

  // Eliminar transacción
  delete: async (id) => {
    try {
      const response = await api.delete(`/bank-transactions/${id}`);
      return response.data;
    } catch (error) {
      return handleError(error, 'Error al eliminar la transacción');
    }
  }
};
