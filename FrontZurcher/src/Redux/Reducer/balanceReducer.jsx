import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  incomes: [], // Lista de ingresos
  expenses: [], // Lista de gastos
  balance: null, // Balance calculado
  loading: false, // Estado de carga
  error: null, // Mensaje de error
};

const balanceSlice = createSlice({
  name: 'balance',
  initialState,
  reducers: {
    // Obtener ingresos y gastos por workId
    fetchIncomesAndExpensesRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchIncomesAndExpensesSuccess: (state, action) => {
      state.loading = false;
      state.incomes = action.payload.incomes;
      state.expenses = action.payload.expenses;
    },
    fetchIncomesAndExpensesFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },

    // Obtener balance por workId
    fetchBalanceByWorkIdRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchBalanceByWorkIdSuccess: (state, action) => {
      state.loading = false;
      state.balance = action.payload;
    },
    fetchBalanceByWorkIdFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },

    // Obtener balance general
    fetchGeneralBalanceRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchGeneralBalanceSuccess: (state, action) => {
      state.loading = false;
      state.balance = action.payload;
    },
    fetchGeneralBalanceFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },

    // Limpiar errores
    clearBalanceError: (state) => {
      state.error = null;
    },
  },
});

export const {
  fetchIncomesAndExpensesRequest,
  fetchIncomesAndExpensesSuccess,
  fetchIncomesAndExpensesFailure,
  fetchBalanceByWorkIdRequest,
  fetchBalanceByWorkIdSuccess,
  fetchBalanceByWorkIdFailure,
  fetchGeneralBalanceRequest,
  fetchGeneralBalanceSuccess,
  fetchGeneralBalanceFailure,
  clearBalanceError,
} = balanceSlice.actions;

export default balanceSlice.reducer;