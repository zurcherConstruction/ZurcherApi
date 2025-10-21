import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  supplierInvoices: [], // Lista de facturas de proveedores
  currentInvoice: null, // Factura seleccionada/en edición
  unpaidExpenses: [], // Gastos disponibles para vincular
  accountsPayable: [], // Cuentas por pagar (facturas pendientes)
  loading: false, // Estado de carga
  error: null, // Mensaje de error
  filters: {
    paymentStatus: '', // '', 'pending', 'partial', 'paid', 'overdue', 'cancelled'
    vendorName: '',
    startDate: '',
    endDate: '',
  },
};

const supplierInvoiceSlice = createSlice({
  name: 'supplierInvoice',
  initialState,
  reducers: {
    // Obtener todas las facturas
    fetchSupplierInvoicesRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchSupplierInvoicesSuccess: (state, action) => {
      state.loading = false;
      state.supplierInvoices = action.payload;
    },
    fetchSupplierInvoicesFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },

    // Obtener factura por ID
    fetchSupplierInvoiceByIdRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchSupplierInvoiceByIdSuccess: (state, action) => {
      state.loading = false;
      state.currentInvoice = action.payload;
    },
    fetchSupplierInvoiceByIdFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },

    // Crear factura
    createSupplierInvoiceRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    createSupplierInvoiceSuccess: (state, action) => {
      state.loading = false;
      state.supplierInvoices.push(action.payload);
      state.currentInvoice = action.payload;
    },
    createSupplierInvoiceFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },

    // Actualizar factura
    updateSupplierInvoiceRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    updateSupplierInvoiceSuccess: (state, action) => {
      state.loading = false;
      const index = state.supplierInvoices.findIndex(
        (inv) => inv.idSupplierInvoice === action.payload.idSupplierInvoice
      );
      if (index !== -1) {
        state.supplierInvoices[index] = action.payload;
      }
      if (state.currentInvoice?.idSupplierInvoice === action.payload.idSupplierInvoice) {
        state.currentInvoice = action.payload;
      }
    },
    updateSupplierInvoiceFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },

    // Eliminar factura
    deleteSupplierInvoiceRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    deleteSupplierInvoiceSuccess: (state, action) => {
      state.loading = false;
      state.supplierInvoices = state.supplierInvoices.filter(
        (inv) => inv.idSupplierInvoice !== action.payload
      );
      if (state.currentInvoice?.idSupplierInvoice === action.payload) {
        state.currentInvoice = null;
      }
    },
    deleteSupplierInvoiceFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },

    // Registrar pago
    registerPaymentRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    registerPaymentSuccess: (state, action) => {
      state.loading = false;
      const index = state.supplierInvoices.findIndex(
        (inv) => inv.idSupplierInvoice === action.payload.idSupplierInvoice
      );
      if (index !== -1) {
        state.supplierInvoices[index] = action.payload;
      }
      if (state.currentInvoice?.idSupplierInvoice === action.payload.idSupplierInvoice) {
        state.currentInvoice = action.payload;
      }
    },
    registerPaymentFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },

    // Obtener gastos sin pagar
    fetchUnpaidExpensesRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchUnpaidExpensesSuccess: (state, action) => {
      state.loading = false;
      state.unpaidExpenses = action.payload;
    },
    fetchUnpaidExpensesFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },

    // Obtener cuentas por pagar
    fetchAccountsPayableRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchAccountsPayableSuccess: (state, action) => {
      state.loading = false;
      state.accountsPayable = action.payload;
    },
    fetchAccountsPayableFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },

    // Establecer factura actual
    setCurrentInvoice: (state, action) => {
      state.currentInvoice = action.payload;
    },

    // Limpiar factura actual
    clearCurrentInvoice: (state) => {
      state.currentInvoice = null;
    },

    // Actualizar filtros
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },

    // Limpiar filtros
    clearFilters: (state) => {
      state.filters = initialState.filters;
    },

    // Limpiar errores
    clearSupplierInvoiceError: (state) => {
      state.error = null;
    },
  },
});

export const {
  fetchSupplierInvoicesRequest,
  fetchSupplierInvoicesSuccess,
  fetchSupplierInvoicesFailure,
  fetchSupplierInvoiceByIdRequest,
  fetchSupplierInvoiceByIdSuccess,
  fetchSupplierInvoiceByIdFailure,
  createSupplierInvoiceRequest,
  createSupplierInvoiceSuccess,
  createSupplierInvoiceFailure,
  updateSupplierInvoiceRequest,
  updateSupplierInvoiceSuccess,
  updateSupplierInvoiceFailure,
  deleteSupplierInvoiceRequest,
  deleteSupplierInvoiceSuccess,
  deleteSupplierInvoiceFailure,
  registerPaymentRequest,
  registerPaymentSuccess,
  registerPaymentFailure,
  fetchUnpaidExpensesRequest,
  fetchUnpaidExpensesSuccess,
  fetchUnpaidExpensesFailure,
  fetchAccountsPayableRequest,
  fetchAccountsPayableSuccess,
  fetchAccountsPayableFailure,
  setCurrentInvoice,
  clearCurrentInvoice,
  setFilters,
  clearFilters,
  clearSupplierInvoiceError,
} = supplierInvoiceSlice.actions;

export default supplierInvoiceSlice.reducer;
