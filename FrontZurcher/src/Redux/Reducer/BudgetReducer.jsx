import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  budgets: [], // Lista de presupuestos
  archivedBudgets: [],
  loading: false, // Estado de carga
  error: null, // Mensaje de error
  currentBudget: null, // El presupuesto cargado por ID
  loadingCurrent: false, // Loading específico para fetchBudgetById
  errorCurrent: null,  
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
      // Actualiza los estados específicos para la carga individual
      state.loadingCurrent = true;
      state.errorCurrent = null;
      state.currentBudget = null; // Limpia el anterior mientras carga
    },
    fetchBudgetByIdSuccess: (state, action) => {
      state.loadingCurrent = false;
      // *** LA CLAVE: Guarda el presupuesto obtenido en currentBudget ***
      state.currentBudget = action.payload;

      // Opcional: Mantener la actualización en la lista 'budgets' si es necesario
      const index = state.budgets.findIndex((budget) => budget.idBudget === action.payload.idBudget); // Usa idBudget si ese es el campo correcto
      if (index !== -1) {
        state.budgets[index] = action.payload;
      }
      // No es necesario el 'else { state.budgets.push(...) }' aquí generalmente
    },
    fetchBudgetByIdFailure: (state, action) => {
      state.loadingCurrent = false;
      // Guarda el error específico
      state.errorCurrent = action.payload;
      state.currentBudget = null; // Asegura que no queden datos viejos
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