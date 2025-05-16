import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  works: [], // Lista de obras
  selectedWork: null, // Obra seleccionada (por ID)
  loading: false, // Estado de carga
  error: null, // Mensaje de error
  loadingChangeOrder: false, // Estado de carga específico para CO
  errorChangeOrder: null,
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
      state.works = action.payload;
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
} = workSlice.actions;

export default workSlice.reducer;