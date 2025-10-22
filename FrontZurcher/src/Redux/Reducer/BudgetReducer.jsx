import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  budgets: [], // Lista de presupuestos
  archivedBudgets: [],
  loading: false, // Estado de carga
  error: null, // Mensaje de error
  currentBudget: null, // El presupuesto cargado por ID
  loadingCurrent: false, // Loading específico para fetchBudgetById
  errorCurrent: null,
  // ✅ NUEVOS ESTADOS PARA MANEJO DE CREACIÓN
  creationStatus: null, // 'creating' | 'success' | 'failed' | null
  lastCreatedBudget: null, // Info del último budget creado
  stats: null, // 🆕 Estadísticas globales del backend
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
  // action.payload es { budgets, total, page, pageSize, stats }
  state.budgets = action.payload.budgets;
  state.total = action.payload.total;
  state.page = action.payload.page;
  state.pageSize = action.payload.pageSize;
  state.stats = action.payload.stats; // 🆕 Guardar estadísticas del backend
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
      // ✅ LIMPIAR ERRORES PREVIOS Y PREPARAR PARA NUEVA CREACIÓN
      state.creationStatus = 'creating';
    },
    createBudgetSuccess: (state, action) => {
      state.loading = false;
      state.budgets.push(action.payload);
      // ✅ MARCAR COMO EXITOSO Y GUARDAR INFO
      state.creationStatus = 'success';
      state.lastCreatedBudget = action.payload;
    },
    createBudgetFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
      // ✅ MARCAR COMO FALLIDO
      state.creationStatus = 'failed';
      state.lastCreatedBudget = null;
    },

    // Actualizar presupuesto
    updateBudgetRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    updateBudgetSuccess: (state, action) => {
      state.loading = false;
      // 🔧 FIX: Usar idBudget en lugar de id
      const index = state.budgets.findIndex((budget) => budget.idBudget === action.payload.idBudget);
      if (index !== -1) {
        state.budgets[index] = action.payload;
      }
      // ✅ TAMBIÉN ACTUALIZAR currentBudget si es el mismo presupuesto
      if (state.currentBudget && state.currentBudget.idBudget === action.payload.idBudget) {
        state.currentBudget = action.payload;
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
    
    // ✅ LIMPIAR ESTADO DE CREACIÓN
    clearCreationStatus: (state) => {
      state.creationStatus = null;
      state.lastCreatedBudget = null;
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
  clearCreationStatus,
} = budgetSlice.actions;

export default budgetSlice.reducer;