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
      // El backend devuelve un objeto, por ejemplo: { message: "...", inspection: { ... }, workStatus? (opcional) }
      // Accedemos a la inspección y al mensaje directamente desde el payload.
      const newOrUpdatedInspection = action.payload.inspection; 
      const message = action.payload.message;

      // Solo proceder si newOrUpdatedInspection existe en el payload
      if (newOrUpdatedInspection) {
        state.selectedInspection = newOrUpdatedInspection; // Actualiza la inspección seleccionada
        
        // Actualizar la inspección en la lista inspectionsByWork
        const index = state.inspectionsByWork.findIndex(
          (insp) => insp.idInspection === newOrUpdatedInspection.idInspection
        );

        if (index !== -1) {
          // Si la inspección existe, la actualizamos en la lista
          state.inspectionsByWork[index] = newOrUpdatedInspection;
        } else {
          // Si la inspección es nueva y no está en la lista, la añadimos.
          // Es importante asegurarse que la nueva inspección pertenezca a la obra
          // cuyas inspecciones están actualmente en `inspectionsByWork`.
          if (state.inspectionsByWork.length > 0) {
            // Si ya hay inspecciones cargadas, solo añadir si el workId coincide.
            if (state.inspectionsByWork[0].workId === newOrUpdatedInspection.workId) {
                 state.inspectionsByWork.push(newOrUpdatedInspection);
                 // Opcionalmente, podrías querer ordenar la lista aquí, por ejemplo, por fecha:
                  state.inspectionsByWork.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            }
            // Si el workId no coincide, no la añadimos para evitar mezclar datos.
            // En este caso, se esperaría un fetchInspectionsByWork para la obra correcta.
          } else {
            // Si la lista `inspectionsByWork` está vacía, podemos añadir la nueva inspección.
            // Esto podría ocurrir si el usuario interactúa con una inspección sin haber cargado
            // previamente la lista completa de inspecciones para esa obra.
            state.inspectionsByWork.push(newOrUpdatedInspection);
          }
        }
      }
      // Establecer el mensaje de éxito
      state.successMessage = message || 'Operación exitosa';
      state.error = null; // Limpiar cualquier error previo
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