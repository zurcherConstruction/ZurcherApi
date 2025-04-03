import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  works: [], // Lista de obras
  work: null, // Obra específica
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
      state.works = action.payload; // Guardar la lista de obras
      state.error = null;
    },
    fetchWorksFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload; // Guardar el mensaje de error
    },

    // Obtener una obra por ID
    fetchWorkByIdRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchWorkByIdSuccess: (state, action) => {
      state.loading = false;
      state.work = action.payload; // Guardar la obra específica
      state.error = null;
    },
    fetchWorkByIdFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload; // Guardar el mensaje de error
    },

    // Crear una obra
    createWorkRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    createWorkSuccess: (state, action) => {
      state.loading = false;
      state.works.push(action.payload); // Agregar la nueva obra a la lista
      state.error = null;
    },
    createWorkFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload; // Guardar el mensaje de error
    },

    // Actualizar una obra
    updateWorkRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    updateWorkSuccess: (state, action) => {
      state.loading = false;
      const updatedWork = action.payload;
      state.works = state.works.map((work) =>
        work.id === updatedWork.id ? updatedWork : work
      ); // Actualizar la obra en la lista
      state.error = null;
    },
    updateWorkFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload; // Guardar el mensaje de error
    },

    // Eliminar una obra
    deleteWorkRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    deleteWorkSuccess: (state, action) => {
      state.loading = false;
      const deletedWorkId = action.payload;
      state.works = state.works.filter((work) => work.id !== deletedWorkId); // Eliminar la obra de la lista
      state.error = null;
    },
    deleteWorkFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload; // Guardar el mensaje de error
    },

    // Agregar un detalle de instalación
    addInstallationDetailRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    addInstallationDetailSuccess: (state, action) => {
      state.loading = false;
      const updatedWork = action.payload;
      state.works = state.works.map((work) =>
        work.id === updatedWork.id ? updatedWork : work
      ); // Actualizar la obra con el nuevo detalle
      state.error = null;
    },
    addInstallationDetailFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload; // Guardar el mensaje de error
    },
  },
});

// Exportar las acciones generadas automáticamente
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
  deleteWorkRequest,
  deleteWorkSuccess,
  deleteWorkFailure,
  addInstallationDetailRequest,
  addInstallationDetailSuccess,
  addInstallationDetailFailure,
} = workSlice.actions;

// Exportar el reducer para integrarlo en el store
export default workSlice.reducer;