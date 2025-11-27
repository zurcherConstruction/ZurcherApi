import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  works: [], // Lista de obras
  pagination: null, // 📄 Metadata de paginación
  selectedWork: null, // Obra seleccionada (por ID)
  work: null,
  images: [], 
  loading: false, // Estado de carga
  error: null, // Mensaje de error
  loadingChangeOrder: false, // Estado de carga específico para CO
  errorChangeOrder: null,
  loadingStatusChange: false,
  errorStatusChange: null,
  statusChangeConflicts: [],
  loadingStatusValidation: false,
  errorStatusValidation: null,
  statusValidationResult: null,
};

const workSlice = createSlice({
  name: 'work',
  initialState,
  reducers: {
    // Obtener todas las obras
    fetchWorksRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchWorksSuccess: (state, action) => {
      state.loading = false;
      // 📄 Manejar respuesta paginada del backend
      if (action.payload.works && action.payload.pagination) {
        state.works = action.payload.works;
        state.pagination = action.payload.pagination;
      } else {
        // Retrocompatibilidad con respuesta sin paginación
        state.works = action.payload;
        state.pagination = null;
      }
    },
    fetchWorksFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },

    // Obtener una obra por ID
    fetchWorkByIdRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchWorkByIdSuccess: (state, action) => {
      state.loading = false;
      state.selectedWork = action.payload;
    },
    fetchWorkByIdFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },

    // Crear una obra
    createWorkRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    createWorkSuccess: (state, action) => {
      state.loading = false;
      state.works.push(action.payload);
    },
    createWorkFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },

    // Actualizar una obra
    updateWorkRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    updateWorkSuccess: (state, action) => {
      state.loading = false;
      const index = state.works.findIndex((work) => work.idWork === action.payload.idWork);
      if (index !== -1) {
        state.works[index] = action.payload;
      }
      // Si la obra actualizada es la seleccionada, también actualizamos `selectedWork`
      if (state.selectedWork?.idWork === action.payload.idWork) {
        state.selectedWork = action.payload;
      }
    },
    updateWorkFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },

     // Agregar un detalle de instalación
     addInstallationDetailRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    addInstallationDetailSuccess: (state, action) => {
      state.loading = false;
      const { work, installationDetail } = action.payload;

      // Actualizar el estado del `selectedWork` si coincide con el `idWork`
      if (state.selectedWork?.idWork === work.idWork) {
        state.selectedWork = {
          ...state.selectedWork,
          ...work, // Actualizamos el estado del Work
          installationDetails: [
            ...(state.selectedWork.installationDetails || []),
            installationDetail, // Agregamos el nuevo detalle de instalación
          ],
        };
      }
    },
    addInstallationDetailFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
      

    // Eliminar una obra
    deleteWorkRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    deleteWorkSuccess: (state, action) => {
      state.loading = false;
      state.works = state.works.filter((work) => work.id !== action.payload);
    },
    deleteWorkFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
    // --- Reducers para Órdenes de Cambio ---
    createChangeOrderRequest: (state) => {
      state.loadingChangeOrder = true;
      state.errorChangeOrder = null;
    },
    createChangeOrderSuccess: (state, action) => {
      state.loadingChangeOrder = false;
      // action.payload es { message: '...', changeOrder: { ... } }
      const { changeOrder } = action.payload;
      if (state.selectedWork && state.selectedWork.idWork === changeOrder.idWork) {
        // Asegúrate que la propiedad ChangeOrders exista y sea un array
        if (!state.selectedWork.ChangeOrders) {
          state.selectedWork.ChangeOrders = [];
        }
        state.selectedWork.ChangeOrders.push(changeOrder);
      }
      // Opcional: si también mantienes una lista global de COs, actualízala aquí.
    },
    createChangeOrderFailure: (state, action) => {
      state.loadingChangeOrder = false;
      state.errorChangeOrder = action.payload.message; // action.payload es { message, details }
    },

    updateChangeOrderRequest: (state) => {
      state.loadingChangeOrder = true;
      state.errorChangeOrder = null;
    },
    updateChangeOrderSuccess: (state, action) => {
      state.loadingChangeOrder = false;
      // action.payload es { message: '...', changeOrder: { ... } }
      const { changeOrder } = action.payload;
      if (state.selectedWork && state.selectedWork.idWork === changeOrder.idWork) {
        // Asegúrate que la propiedad ChangeOrders exista y sea un array
        if (!state.selectedWork.ChangeOrders) {
          state.selectedWork.ChangeOrders = [];
        }
        const coIndex = state.selectedWork.ChangeOrders.findIndex(co => co.idChangeOrder === changeOrder.idChangeOrder);
        if (coIndex !== -1) {
          state.selectedWork.ChangeOrders[coIndex] = changeOrder;
        } else {
          // Si no se encontró, podría ser un caso raro, agrégalo
          state.selectedWork.ChangeOrders.push(changeOrder);
        }
      }
    },
    updateChangeOrderFailure: (state, action) => {
      state.loadingChangeOrder = false;
      state.errorChangeOrder = action.payload.message; // action.payload es { message, details }
    },
    clearChangeOrderError: (state) => {
      state.errorChangeOrder = null;
    },
    deleteChangeOrderRequest: (state) => {
  state.loadingChangeOrder = true;
  state.errorChangeOrder = null;
},
deleteChangeOrderSuccess: (state, action) => {
  state.loadingChangeOrder = false;
  // Elimina la CO del array de la obra seleccionada
  if (state.selectedWork && state.selectedWork.ChangeOrders) {
    state.selectedWork.ChangeOrders = state.selectedWork.ChangeOrders.filter(
      (co) => co.idChangeOrder !== action.payload
    );
  }
},
deleteChangeOrderFailure: (state, action) => {
  state.loadingChangeOrder = false;
  state.errorChangeOrder = action.payload;
},

 addImagesRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    addImagesSuccess: (state, action) => {
      state.loading = false;
      // El payload ahora es { message: '...', work: updatedWork }
      // donde updatedWork es el trabajo completo con todas sus imágenes.
      if (action.payload && action.payload.work) {
        const updatedWork = action.payload.work;

        // 1. Actualizar el trabajo en la lista general 'state.works'
        const workIndexInList = state.works.findIndex(w => w.idWork === updatedWork.idWork);
        if (workIndexInList !== -1) {
          state.works[workIndexInList] = updatedWork;
        } else {
          // Opcional: si el trabajo no estaba en la lista, podrías agregarlo
          // state.works.push(updatedWork); 
          console.warn(`addImagesSuccess: El trabajo con ID ${updatedWork.idWork} no se encontró en state.works para actualizar.`);
        }

        // 2. Actualizar el trabajo detallado 'state.work' si es el mismo que se modificó
        if (state.work && state.work.idWork === updatedWork.idWork) {
          state.work = updatedWork; // Esto actualizará UploadScreen
        }
        
        state.error = null;
      } else {
        console.error("addImagesSuccess: La respuesta no contiene la propiedad 'work':", action.payload);
        state.error = "Respuesta inesperada del servidor al agregar la imagen.";
      }
    },
    addImagesFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload; 
    },
    deleteImagesRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    deleteImagesSuccess: (state, action) => {
      state.loading = false;
      const { idWork, imageId } = action.payload;

      // 1. Actualizar la lista de trabajos (state.works) si existe
      const workIndexInList = state.works.findIndex(w => w.idWork === idWork);
      if (workIndexInList !== -1) {
        const workToUpdateInList = { ...state.works[workIndexInList] };
        if (workToUpdateInList.images && Array.isArray(workToUpdateInList.images)) {
          workToUpdateInList.images = workToUpdateInList.images.filter(img => img.id !== imageId);
          state.works[workIndexInList] = workToUpdateInList;
        }
      }
      // ℹ️ No mostrar warning si state.works está vacío (contexto de trabajo individual)

      // 2. Actualizar el trabajo detallado (state.work) si es el mismo
      if (state.work && state.work.idWork === idWork) {
        const updatedDetailedWork = { ...state.work };
        if (updatedDetailedWork.images && Array.isArray(updatedDetailedWork.images)) {
          updatedDetailedWork.images = updatedDetailedWork.images.filter(img => img.id !== imageId);
          state.work = updatedDetailedWork; // <-- ACTUALIZAR EL TRABAJO DETALLADO
        }
      }
      state.error = null;
    },
    // --- FIN REDUCER CORREGIDO ---
    deleteImagesFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload; // Guardar el mensaje de error
      console.error("Error en deleteImagesFailure:", action.payload); // Log del error
    },

        // Cambiar estado de trabajo
    changeWorkStatusRequest: (state) => {
      state.loadingStatusChange = true;
      state.errorStatusChange = null;
      state.statusChangeConflicts = [];
    },
    changeWorkStatusSuccess: (state, action) => {
      state.loadingStatusChange = false;
      state.errorStatusChange = null;
      state.statusChangeConflicts = [];
      
      // action.payload contiene: { message, work, changedBy, reason, direction }
      const { work } = action.payload;
      
      if (work) {
        // Actualizar en la lista de trabajos
        const workIndex = state.works.findIndex(w => w.idWork === work.idWork);
        if (workIndex !== -1) {
          state.works[workIndex] = work;
        }
        
        // Actualizar trabajo seleccionado si coincide
        if (state.selectedWork?.idWork === work.idWork) {
          state.selectedWork = work;
        }
        
        // Actualizar trabajo detallado si coincide
        if (state.work?.idWork === work.idWork) {
          state.work = work;
        }
      }
    },
    changeWorkStatusFailure: (state, action) => {
      state.loadingStatusChange = false;
      state.errorStatusChange = action.payload.message;
      state.statusChangeConflicts = action.payload.conflicts || [];
    },

    // Validar cambio de estado
    validateStatusChangeRequest: (state) => {
      state.loadingStatusValidation = true;
      state.errorStatusValidation = null;
      state.statusValidationResult = null;
    },
    validateStatusChangeSuccess: (state, action) => {
      state.loadingStatusValidation = false;
      state.errorStatusValidation = null;
      state.statusValidationResult = action.payload;
    },
    validateStatusChangeFailure: (state, action) => {
      state.loadingStatusValidation = false;
      state.errorStatusValidation = action.payload.message;
      state.statusValidationResult = null;
    },

    // Limpiar errores de cambio de estado
    clearStatusChangeError: (state) => {
      state.errorStatusChange = null;
      state.statusChangeConflicts = [];
    },
    clearStatusValidationError: (state) => {
      state.errorStatusValidation = null;
      state.statusValidationResult = null;
    },

    // Limpiar errores
    clearWorkError: (state) => {
      state.error = null;
    },
  },
});

export const {
  fetchWorksRequest,
  fetchWorksSuccess,
  fetchWorksFailure,
  fetchWorkByIdRequest,
  fetchWorkByIdSuccess,
  fetchWorkByIdFailure,
  createWorkRequest,
  createWorkSuccess,
  createWorkFailure,
  updateWorkRequest,
  updateWorkSuccess,
  updateWorkFailure,
  addInstallationDetailRequest,
  addInstallationDetailSuccess,
  addInstallationDetailFailure,
  deleteWorkRequest,
  deleteWorkSuccess,
  deleteWorkFailure,
  clearWorkError,
  createChangeOrderRequest,
  createChangeOrderSuccess,
  createChangeOrderFailure,
  updateChangeOrderRequest,
  updateChangeOrderSuccess,
  updateChangeOrderFailure,
  clearChangeOrderError,
  deleteChangeOrderRequest,
  deleteChangeOrderSuccess,
  deleteChangeOrderFailure,
  addImagesRequest,
  addImagesSuccess,
  addImagesFailure,
  deleteImagesRequest,
  deleteImagesSuccess,
  deleteImagesFailure,
  changeWorkStatusRequest,
  changeWorkStatusSuccess,
  changeWorkStatusFailure,
  validateStatusChangeRequest,
  validateStatusChangeSuccess,
  validateStatusChangeFailure,
  clearStatusChangeError,
  clearStatusValidationError,
} = workSlice.actions;

export default workSlice.reducer;