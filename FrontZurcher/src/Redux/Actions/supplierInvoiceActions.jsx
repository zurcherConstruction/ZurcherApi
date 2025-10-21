import api from '../../utils/axios';

// Helper para manejar errores
const handleError = (error, message) => {
  console.error(`${message} - Detalles del error:`, error.response?.data || error.message);
  return { error: true, message: error.response?.data?.message || error.message };
};

// Actions para SupplierInvoice (Facturas de Proveedores)
export const supplierInvoiceActions = {
  // Crear una nueva factura de proveedor
  create: async (invoiceData) => {
    try {
      const response = await api.post('/supplier-invoices', invoiceData);
      return response.data;
    } catch (error) {
      return handleError(error, 'Error al crear la factura del proveedor');
    }
  },

  // Obtener todas las facturas de proveedores
  getAll: async (filters = {}) => {
    try {
      const response = await api.get('/supplier-invoices', { params: filters });
      return response.data;
    } catch (error) {
      return handleError(error, 'Error al obtener las facturas de proveedores');
    }
  },

  // Obtener factura por ID
  getById: async (id) => {
    try {
      const response = await api.get(`/supplier-invoices/${id}`);
      return response.data;
    } catch (error) {
      return handleError(error, 'Error al obtener la factura del proveedor');
    }
  },

  // Actualizar factura
  update: async (id, invoiceData) => {
    try {
      const response = await api.put(`/supplier-invoices/${id}`, invoiceData);
      return response.data;
    } catch (error) {
      return handleError(error, 'Error al actualizar la factura del proveedor');
    }
  },

  // Eliminar factura
  delete: async (id) => {
    try {
      const response = await api.delete(`/supplier-invoices/${id}`);
      return response.data;
    } catch (error) {
      return handleError(error, 'Error al eliminar la factura del proveedor');
    }
  },

  // Registrar un pago para una factura
  registerPayment: async (id, paymentData) => {
    try {
      const response = await api.patch(`/supplier-invoices/${id}/pay`, paymentData);
      return response.data;
    } catch (error) {
      return handleError(error, 'Error al registrar el pago de la factura');
    }
  },

  // Obtener cuentas por pagar (facturas pendientes)
  getAccountsPayable: async () => {
    try {
      const response = await api.get('/supplier-invoices/accounts-payable');
      return response.data;
    } catch (error) {
      return handleError(error, 'Error al obtener las cuentas por pagar');
    }
  },

  // Obtener facturas por obra
  getByWork: async (workId) => {
    try {
      const response = await api.get(`/supplier-invoices/work/${workId}`);
      return response.data;
    } catch (error) {
      return handleError(error, 'Error al obtener las facturas de la obra');
    }
  },
};

// Actions extendidas para Expenses (relacionadas con supplier invoices)
export const expenseSupplierActions = {
  // Obtener gastos sin pagar (disponibles para vincular a facturas)
  getUnpaid: async () => {
    try {
      const response = await api.get('/expense/unpaid');
      return response.data;
    } catch (error) {
      return handleError(error, 'Error al obtener gastos sin pagar');
    }
  },

  // Obtener gastos por estado de pago
  getByPaymentStatus: async (status) => {
    try {
      const response = await api.get(`/expense/by-status/${status}`);
      return response.data;
    } catch (error) {
      return handleError(error, 'Error al obtener gastos por estado de pago');
    }
  },
};
