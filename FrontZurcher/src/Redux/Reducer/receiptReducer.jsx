import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  receipts: [], // Lista de comprobantes
  loading: false, // Estado de carga
  error: null, // Mensaje de error
};

const receiptSlice = createSlice({
  name: 'receipt',
  initialState,
  reducers: {
    // Obtener comprobantes por modelo relacionado
    fetchReceiptsRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchReceiptsSuccess: (state, action) => {
      state.loading = false;
      state.receipts = action.payload;
    },
    fetchReceiptsFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },

    // Crear comprobante
    createReceiptRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    createReceiptSuccess: (state, action) => {
      state.loading = false;
      state.receipts.push(action.payload);
    },
    createReceiptFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
     deleteReceiptRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    deleteReceiptSuccess: (state, action) => {
      state.loading = false;
      // action.payload aquí debería ser el idReceipt del comprobante eliminado
      state.receipts = state.receipts.filter(
        (receipt) => receipt.idReceipt !== action.payload 
      );
      state.error = null;
    },
    deleteReceiptFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },

    // Limpiar errores
    clearReceiptError: (state) => {
      state.error = null;
    },
  },
});

export const {
  fetchReceiptsRequest,
  fetchReceiptsSuccess,
  fetchReceiptsFailure,
  createReceiptRequest,
  createReceiptSuccess,
  createReceiptFailure,
  deleteReceiptRequest,
  deleteReceiptSuccess,
  deleteReceiptFailure,
  clearReceiptError,
} = receiptSlice.actions;

export default receiptSlice.reducer;