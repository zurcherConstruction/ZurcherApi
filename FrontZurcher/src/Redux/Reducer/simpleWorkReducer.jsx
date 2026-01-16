import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  simpleWorks: [],
  currentSimpleWork: null,
  clientWorks: [], // Para almacenar trabajos del cliente al hacer linking
  loading: false,
  error: null,
  successMessage: null,
};

const simpleWorkSlice = createSlice({
  name: 'simpleWork',
  initialState,
  reducers: {
    // Acciones genéricas
    simpleWorkRequest: (state) => {
      state.loading = true;
      state.error = null;
      state.successMessage = null;
    },
    simpleWorkFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },

    // Obtener lista de trabajos simples
    fetchSimpleWorksSuccess: (state, action) => {
      state.loading = false;
      state.simpleWorks = action.payload.data || action.payload;
      state.error = null;
    },

    // Obtener trabajo simple por ID
    fetchSimpleWorkByIdSuccess: (state, action) => {
      state.loading = false;
      state.currentSimpleWork = action.payload.data || action.payload;
      state.error = null;
    },

    // Crear trabajo simple
    createSimpleWorkSuccess: (state, action) => {
      state.loading = false;
      const newWork = action.payload.data || action.payload;
      state.simpleWorks.push(newWork);
      state.currentSimpleWork = newWork;
      state.successMessage = 'Trabajo simple creado exitosamente';
      state.error = null;
    },

    // Actualizar trabajo simple
    updateSimpleWorkSuccess: (state, action) => {
      state.loading = false;
      const updatedWork = action.payload.data || action.payload;
      const index = state.simpleWorks.findIndex(work => work.id === updatedWork.id);
      if (index !== -1) {
        state.simpleWorks[index] = updatedWork;
      }
      state.currentSimpleWork = updatedWork;
      state.successMessage = 'Trabajo simple actualizado exitosamente';
      state.error = null;
    },

    // Eliminar trabajo simple
    deleteSimpleWorkSuccess: (state, action) => {
      state.loading = false;
      state.simpleWorks = state.simpleWorks.filter(work => work.id !== action.payload);
      if (state.currentSimpleWork && state.currentSimpleWork.id === action.payload) {
        state.currentSimpleWork = null;
      }
      state.successMessage = 'Trabajo simple eliminado exitosamente';
      state.error = null;
    },

    // Generar PDF
    generateSimpleWorkPdfSuccess: (state) => {
      state.loading = false;
      state.successMessage = 'PDF generado exitosamente';
      state.error = null;
    },

    // Obtener trabajos del cliente
    fetchClientWorksSuccess: (state, action) => {
      state.loading = false;
      state.clientWorks = action.payload.data || action.payload;
      state.error = null;
    },

    // Limpiar errores
    clearSimpleWorkError: (state) => {
      state.error = null;
    },

    // Limpiar mensaje de éxito
    clearSimpleWorkSuccessMessage: (state) => {
      state.successMessage = null;
    },

    // Limpiar trabajo actual
    clearCurrentSimpleWork: (state) => {
      state.currentSimpleWork = null;
    },

    // Limpiar trabajos del cliente
    clearClientWorks: (state) => {
      state.clientWorks = [];
    },
  },
});

export const {
  simpleWorkRequest,
  simpleWorkFailure,
  fetchSimpleWorksSuccess,
  fetchSimpleWorkByIdSuccess,
  createSimpleWorkSuccess,
  updateSimpleWorkSuccess,
  deleteSimpleWorkSuccess,
  generateSimpleWorkPdfSuccess,
  fetchClientWorksSuccess,
  clearSimpleWorkError,
  clearSimpleWorkSuccessMessage,
  clearCurrentSimpleWork,
  clearClientWorks,
} = simpleWorkSlice.actions;

export default simpleWorkSlice.reducer;