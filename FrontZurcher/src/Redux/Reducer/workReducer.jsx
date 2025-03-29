import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  works: [], // Lista de obras
  selectedWork: null, // Obra seleccionada (por ID)
  loading: false, // Estado de carga
  error: null, // Mensaje de error
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
} = workSlice.actions;

export default workSlice.reducer;