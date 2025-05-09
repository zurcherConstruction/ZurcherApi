import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  inspectionsByWork: [], // Lista de inspecciones para una obra específica
  selectedInspection: null, // Inspección seleccionada (por ID)
  loading: false,
  error: null,
  successMessage: null, // Para mensajes de éxito de operaciones
};

const inspectionSlice = createSlice({
  name: 'inspection',
  initialState,
  reducers: {
    // Genéricos para request, success, failure
    inspectionRequest: (state) => {
      state.loading = true;
      state.error = null;
      state.successMessage = null;
    },
    inspectionSuccess: (state, action) => {
      state.loading = false;
      // Si la acción tiene un payload específico para selectedInspection o inspectionsByWork, se manejará allí
      // Si es un mensaje general de éxito
      if (action.payload?.message) {
        state.successMessage = action.payload.message;
      }
    },
    inspectionFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
      state.successMessage = null;
    },

    // Obtener inspecciones por Work ID
    fetchInspectionsByWorkSuccess: (state, action) => {
      state.loading = false;
      state.inspectionsByWork = action.payload;
      state.error = null;
    },

    // Obtener una inspección por ID
    fetchInspectionByIdSuccess: (state, action) => {
      state.loading = false;
      state.selectedInspection = action.payload;
      state.error = null;
    },

    // Para operaciones de creación/actualización que devuelven la inspección actualizada
    upsertInspectionSuccess: (state, action) => {
      state.loading = false;
      state.selectedInspection = action.payload.inspection || action.payload; // Puede venir anidado o directo
      state.successMessage = action.payload.message || 'Operación exitosa';
      state.error = null;
      // Actualizar en la lista inspectionsByWork si existe
      const index = state.inspectionsByWork.findIndex(
        (insp) => insp.idInspection === (action.payload.inspection || action.payload).idInspection
      );
      if (index !== -1) {
        state.inspectionsByWork[index] = action.payload.inspection || action.payload;
      } else {
        // Si es una nueva inspección (ej. requestInitialInspection) y tenemos el workId
        // podríamos añadirla, pero es más seguro recargar inspectionsByWork
      }
    },
    
    clearInspectionError: (state) => {
      state.error = null;
    },
    clearInspectionSuccessMessage: (state) => {
      state.successMessage = null;
    },
  },
});

export const {
  inspectionRequest,
  inspectionSuccess,
  inspectionFailure,
  fetchInspectionsByWorkSuccess,
  fetchInspectionByIdSuccess,
  upsertInspectionSuccess,
  clearInspectionError,
  clearInspectionSuccessMessage,
} = inspectionSlice.actions;

export default inspectionSlice.reducer;