import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  notesByBudget: {}, // { budgetId: [notes] }
  statsByBudget: {}, // { budgetId: stats }
  loading: false,
  error: null,
  loadingStats: false,
  errorStats: null,
  creatingNote: false,
  updatingNote: false,
  deletingNote: false,
};

const budgetNoteSlice = createSlice({
  name: 'budgetNote',
  initialState,
  reducers: {
    // Obtener notas de un budget
    fetchBudgetNotesRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchBudgetNotesSuccess: (state, action) => {
      state.loading = false;
      const { budgetId, notes } = action.payload;
      state.notesByBudget[budgetId] = notes;
    },
    fetchBudgetNotesFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },

    // Obtener estadísticas de un budget
    fetchBudgetStatsRequest: (state) => {
      state.loadingStats = true;
      state.errorStats = null;
    },
    fetchBudgetStatsSuccess: (state, action) => {
      state.loadingStats = false;
      const { budgetId, stats } = action.payload;
      state.statsByBudget[budgetId] = stats;
    },
    fetchBudgetStatsFailure: (state, action) => {
      state.loadingStats = false;
      state.errorStats = action.payload;
    },

    // Crear nota
    createBudgetNoteRequest: (state) => {
      state.creatingNote = true;
      state.error = null;
    },
    createBudgetNoteSuccess: (state, action) => {
      state.creatingNote = false;
      // La nota se agregará cuando se recarguen las notas
    },
    createBudgetNoteFailure: (state, action) => {
      state.creatingNote = false;
      state.error = action.payload;
    },

    // Actualizar nota
    updateBudgetNoteRequest: (state) => {
      state.updatingNote = true;
      state.error = null;
    },
    updateBudgetNoteSuccess: (state, action) => {
      state.updatingNote = false;
      // La nota se actualizará cuando se recarguen las notas
    },
    updateBudgetNoteFailure: (state, action) => {
      state.updatingNote = false;
      state.error = action.payload;
    },

    // Eliminar nota
    deleteBudgetNoteRequest: (state) => {
      state.deletingNote = true;
      state.error = null;
    },
    deleteBudgetNoteSuccess: (state, action) => {
      state.deletingNote = false;
      // La nota se eliminará cuando se recarguen las notas
    },
    deleteBudgetNoteFailure: (state, action) => {
      state.deletingNote = false;
      state.error = action.payload;
    },

    // Limpiar errores
    clearBudgetNoteError: (state) => {
      state.error = null;
      state.errorStats = null;
    },

    // Limpiar notas de un budget (cuando se cierra el modal)
    clearBudgetNotes: (state, action) => {
      const budgetId = action.payload;
      delete state.notesByBudget[budgetId];
      delete state.statsByBudget[budgetId];
    },
  },
});

export const {
  fetchBudgetNotesRequest,
  fetchBudgetNotesSuccess,
  fetchBudgetNotesFailure,
  fetchBudgetStatsRequest,
  fetchBudgetStatsSuccess,
  fetchBudgetStatsFailure,
  createBudgetNoteRequest,
  createBudgetNoteSuccess,
  createBudgetNoteFailure,
  updateBudgetNoteRequest,
  updateBudgetNoteSuccess,
  updateBudgetNoteFailure,
  deleteBudgetNoteRequest,
  deleteBudgetNoteSuccess,
  deleteBudgetNoteFailure,
  clearBudgetNoteError,
  clearBudgetNotes,
} = budgetNoteSlice.actions;

export default budgetNoteSlice.reducer;
