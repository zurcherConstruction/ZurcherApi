import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  checklists: {}, // { workId: checklistData }
  stats: null, // Estadísticas de checklists
  loading: false,
  error: null,
  loadingStats: false,
  errorStats: null,
};

const checklistSlice = createSlice({
  name: 'checklist',
  initialState,
  reducers: {
    // Obtener checklists múltiples
    fetchChecklistsRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchChecklistsSuccess: (state, action) => {
      state.loading = false;
      state.checklists = { ...state.checklists, ...action.payload };
    },
    fetchChecklistsFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },

    // Obtener checklist por workId
    fetchChecklistByWorkIdRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchChecklistByWorkIdSuccess: (state, action) => {
      state.loading = false;
      const { workId, checklist } = action.payload;
      state.checklists[workId] = checklist;
    },
    fetchChecklistByWorkIdFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },

    // Actualizar checklist
    updateChecklistRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    updateChecklistSuccess: (state, action) => {
      state.loading = false;
      const { workId, checklist } = action.payload;
      state.checklists[workId] = checklist;
    },
    updateChecklistFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },

    // Obtener estadísticas
    fetchChecklistStatsRequest: (state) => {
      state.loadingStats = true;
      state.errorStats = null;
    },
    fetchChecklistStatsSuccess: (state, action) => {
      state.loadingStats = false;
      state.stats = action.payload;
    },
    fetchChecklistStatsFailure: (state, action) => {
      state.loadingStats = false;
      state.errorStats = action.payload;
    },

    // Limpiar errores
    clearChecklistError: (state) => {
      state.error = null;
      state.errorStats = null;
    },
  },
});

export const {
  fetchChecklistsRequest,
  fetchChecklistsSuccess,
  fetchChecklistsFailure,
  fetchChecklistByWorkIdRequest,
  fetchChecklistByWorkIdSuccess,
  fetchChecklistByWorkIdFailure,
  updateChecklistRequest,
  updateChecklistSuccess,
  updateChecklistFailure,
  fetchChecklistStatsRequest,
  fetchChecklistStatsSuccess,
  fetchChecklistStatsFailure,
  clearChecklistError,
} = checklistSlice.actions;

export default checklistSlice.reducer;
