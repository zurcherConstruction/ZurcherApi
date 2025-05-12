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
    // inspectionSuccess: (state, action) => {
    //   state.loading = false;
    //   // Si la acción tiene un payload específico para selectedInspection o inspectionsByWork, se manejará allí
    //   // Si es un mensaje general de éxito
    //   if (action.payload?.message) {
    //     state.successMessage = action.payload.message;
    //   }
    // },
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
      const newOrUpdatedInspection = action.payload.inspection || action.payload; // Puede venir anidado o directo
      state.selectedInspection = newOrUpdatedInspection;
      state.successMessage = action.payload.message || 'Operación exitosa';
      state.error = null;
      
      // Actualizar en la lista inspectionsByWork si existe o añadir si es nueva
      const index = state.inspectionsByWork.findIndex(
        (insp) => insp.idInspection === newOrUpdatedInspection.idInspection
      );
      if (index !== -1) {
        state.inspectionsByWork[index] = newOrUpdatedInspection;
      } else {
        // Si es una nueva inspección (ej. requestInitialInspection o requestReinspection)
        // y pertenece a la obra actualmente cargada en inspectionsByWork (esto es una suposición)
        // la añadimos. Es más seguro recargar inspectionsByWork después de crear una nueva.
        // Sin embargo, para una UX más rápida, podemos intentar añadirla.
        if (state.inspectionsByWork.length > 0 && state.inspectionsByWork[0].workId === newOrUpdatedInspection.workId) {
            state.inspectionsByWork.push(newOrUpdatedInspection);
        } else if (state.inspectionsByWork.length === 0 && state.selectedInspection?.workId === newOrUpdatedInspection.workId) {
            // Si no hay inspecciones cargadas pero la nueva corresponde al workId de la seleccionada (si hay)
            state.inspectionsByWork.push(newOrUpdatedInspection);
        }
        // Considera despachar fetchInspectionsByWork(newOrUpdatedInspection.workId) después de esta acción
        // en el componente para asegurar consistencia si la lógica de arriba no es suficiente.
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
  //inspectionSuccess,
  inspectionFailure,
  fetchInspectionsByWorkSuccess,
  fetchInspectionByIdSuccess,
  upsertInspectionSuccess,
  clearInspectionError,
  clearInspectionSuccessMessage,
} = inspectionSlice.actions;

export default inspectionSlice.reducer;