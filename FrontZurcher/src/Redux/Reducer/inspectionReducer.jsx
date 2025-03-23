import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  inspections: [], // Lista de inspecciones
  loading: false, // Estado de carga
  error: null, // Mensaje de error
};

const inspectionSlice = createSlice({
  name: 'inspection',
  initialState,
  reducers: {
    // Obtener inspecciones por obra
    fetchInspectionsRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchInspectionsSuccess: (state, action) => {
      state.loading = false;
      state.inspections = action.payload;
    },
    fetchInspectionsFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },

    // Crear inspección
    createInspectionRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    createInspectionSuccess: (state, action) => {
      state.loading = false;
      state.inspections.push(action.payload);
    },
    createInspectionFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },

    // Actualizar inspección
    updateInspectionRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    updateInspectionSuccess: (state, action) => {
      state.loading = false;
      const index = state.inspections.findIndex((inspection) => inspection.id === action.payload.id);
      if (index !== -1) {
        state.inspections[index] = action.payload;
      }
    },
    updateInspectionFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },

    // Limpiar errores
    clearInspectionError: (state) => {
      state.error = null;
    },
  },
});

export const {
  fetchInspectionsRequest,
  fetchInspectionsSuccess,
  fetchInspectionsFailure,
  createInspectionRequest,
  createInspectionSuccess,
  createInspectionFailure,
  updateInspectionRequest,
  updateInspectionSuccess,
  updateInspectionFailure,
  clearInspectionError,
} = inspectionSlice.actions;

export default inspectionSlice.reducer;