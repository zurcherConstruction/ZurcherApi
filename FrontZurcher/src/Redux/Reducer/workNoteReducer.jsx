import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  notesByWork: {}, // { workId: [notes] }
  statsByWork: {}, // { workId: stats }
  loading: false,
  error: null,
  loadingStats: false,
  errorStats: null,
  creatingNote: false,
  updatingNote: false,
  deletingNote: false,
};

const workNoteSlice = createSlice({
  name: 'workNote',
  initialState,
  reducers: {
    // Obtener notas de una obra
    fetchWorkNotesRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchWorkNotesSuccess: (state, action) => {
      state.loading = false;
      const { workId, notes } = action.payload;
      state.notesByWork[workId] = notes;
    },
    fetchWorkNotesFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },

    // Obtener estadísticas de una obra
    fetchWorkStatsRequest: (state) => {
      state.loadingStats = true;
      state.errorStats = null;
    },
    fetchWorkStatsSuccess: (state, action) => {
      state.loadingStats = false;
      const { workId, stats } = action.payload;
      state.statsByWork[workId] = stats;
    },
    fetchWorkStatsFailure: (state, action) => {
      state.loadingStats = false;
      state.errorStats = action.payload;
    },

    // Crear nota
    createWorkNoteRequest: (state) => {
      state.creatingNote = true;
      state.error = null;
    },
    createWorkNoteSuccess: (state, action) => {
      state.creatingNote = false;
      // La nota se agregará cuando se recarguen las notas
    },
    createWorkNoteFailure: (state, action) => {
      state.creatingNote = false;
      state.error = action.payload;
    },

    // Actualizar nota
    updateWorkNoteRequest: (state) => {
      state.updatingNote = true;
      state.error = null;
    },
    updateWorkNoteSuccess: (state, action) => {
      state.updatingNote = false;
      // La nota se actualizará cuando se recarguen las notas
    },
    updateWorkNoteFailure: (state, action) => {
      state.updatingNote = false;
      state.error = action.payload;
    },

    // Eliminar nota
    deleteWorkNoteRequest: (state) => {
      state.deletingNote = true;
      state.error = null;
    },
    deleteWorkNoteSuccess: (state, action) => {
      state.deletingNote = false;
      // La nota se eliminará cuando se recarguen las notas
    },
    deleteWorkNoteFailure: (state, action) => {
      state.deletingNote = false;
      state.error = action.payload;
    },

    // Limpiar errores
    clearWorkNoteError: (state) => {
      state.error = null;
      state.errorStats = null;
    },

    // Limpiar notas de una obra (cuando se cierra el modal)
    clearWorkNotes: (state, action) => {
      const workId = action.payload;
      delete state.notesByWork[workId];
      delete state.statsByWork[workId];
    },
  },
});

export const {
  fetchWorkNotesRequest,
  fetchWorkNotesSuccess,
  fetchWorkNotesFailure,
  fetchWorkStatsRequest,
  fetchWorkStatsSuccess,
  fetchWorkStatsFailure,
  createWorkNoteRequest,
  createWorkNoteSuccess,
  createWorkNoteFailure,
  updateWorkNoteRequest,
  updateWorkNoteSuccess,
  updateWorkNoteFailure,
  deleteWorkNoteRequest,
  deleteWorkNoteSuccess,
  deleteWorkNoteFailure,
  clearWorkNoteError,
  clearWorkNotes,
} = workNoteSlice.actions;

export default workNoteSlice.reducer;
