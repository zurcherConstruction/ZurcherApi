import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  works: [], // Lista de obras
  work: null, // Obra específica
  images: [], // Lista de imágenes asociadas a un trabajo
  loading: false, // Estado de carga
  error: null,
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
    addImagesRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    addImagesSuccess: (state, action) => {
      state.loading = false;
      // Verifica que el payload y imageRecord existan antes de intentar agregarlo
      if (action.payload && action.payload.imageRecord) {
        // Agrega el objeto imageRecord completo al array state.images
        state.images.push(action.payload.imageRecord); 
      } else {
        // Opcional: Loguea un error si la respuesta no es la esperada
        console.error("addImagesSuccess: La respuesta no contiene imageRecord:", action.payload);
        state.error = "Respuesta inesperada del servidor al agregar la imagen.";
      }
      // Limpia el error si la operación fue exitosa (incluso si la respuesta no fue perfecta)
      // state.error = null; // Puedes decidir si limpiar el error aquí o no, dependiendo de si el 'else' debe considerarse un fallo
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
      const { imageUrls } = action.payload;
      state.images = state.images.filter((url) => !imageUrls.includes(url)); // Eliminar las imágenes especificadas
      state.error = null;
    },
    deleteImagesFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload; // Guardar el mensaje de error
    },
    fetchAssignedWorksRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchAssignedWorksSuccess: (state, action) => {
      state.loading = false;
      state.works = action.payload; // Guardar los trabajos asignados
      state.error = null;
    },
    fetchAssignedWorksFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload; // Guardar el mensaje de error
    },

  },

});

// Exportar las acciones generadas automáticamente
export const {
  fetchAssignedWorksRequest,
  fetchAssignedWorksSuccess,
  fetchAssignedWorksFailure,
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
  addImagesRequest,
  addImagesSuccess,
  addImagesFailure,
  deleteImagesRequest,
  deleteImagesSuccess,
  deleteImagesFailure,
  fetchWorksRequest,
  fetchWorksSuccess,
  fetchWorksFailure,
} = workSlice.actions;

// Exportar el reducer para integrarlo en el store
export default workSlice.reducer;