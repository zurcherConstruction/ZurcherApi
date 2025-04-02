import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  budgets: [], // Lista de presupuestos
  archivedBudgets: [],
  loading: false, // Estado de carga
  error: null, // Mensaje de error
};

const budgetSlice = createSlice({
  name: 'budget',
  initialState,
  reducers: {
    // Obtener todos los presupuestos
    fetchBudgetsRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchBudgetsSuccess: (state, action) => {
      state.loading = false;
      state.budgets = action.payload;
    },
    fetchBudgetsFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },

    // Obtener un presupuesto por ID
    fetchBudgetByIdRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchBudgetByIdSuccess: (state, action) => {
      state.loading = false;
      const index = state.budgets.findIndex((budget) => budget.id === action.payload.id);
      if (index !== -1) {
        state.budgets[index] = action.payload;
      } else {
        state.budgets.push(action.payload);
      }
    },
    fetchBudgetByIdFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },

    // Crear presupuesto
    createBudgetRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    createBudgetSuccess: (state, action) => {
      state.loading = false;
      state.budgets.push(action.payload);
    },
    createBudgetFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },

    // Actualizar presupuesto
    updateBudgetRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    updateBudgetSuccess: (state, action) => {
      state.loading = false;
      const index = state.budgets.findIndex((budget) => budget.id === action.payload.id);
      if (index !== -1) {
        state.budgets[index] = action.payload;
      }
    },
    updateBudgetFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },

    // Eliminar presupuesto
    deleteBudgetRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    deleteBudgetSuccess: (state, action) => {
      state.loading = false;
      state.budgets = state.budgets.filter((budget) => budget.id !== action.payload);
    },
    deleteBudgetFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },

    fetchArchivedBudgetsRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchArchivedBudgetsSuccess: (state, action) => {
      state.loading = false;
      state.archivedBudgets = action.payload;
    },
    fetchArchivedBudgetsFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },

    // Limpiar errores
    clearBudgetsError: (state) => {
      state.error = null;
    },
  },
});

export const {
  fetchBudgetsRequest,
  fetchBudgetsSuccess,
  fetchBudgetsFailure,
  fetchBudgetByIdRequest,
  fetchBudgetByIdSuccess,
  fetchBudgetByIdFailure,
  createBudgetRequest,
  createBudgetSuccess,
  createBudgetFailure,
  updateBudgetRequest,
  updateBudgetSuccess,
  updateBudgetFailure,
  deleteBudgetRequest,
  deleteBudgetSuccess,
  deleteBudgetFailure,
  fetchArchivedBudgetsRequest,
  fetchArchivedBudgetsSuccess,
  fetchArchivedBudgetsFailure,
  clearBudgetsError,
} = budgetSlice.actions;

export default budgetSlice.reducer;