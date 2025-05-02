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
      // 1. Obtener idWork y imageId del payload correcto
      const { idWork, imageId } = action.payload;

      // 2. Encontrar el índice del trabajo afectado en state.works
      const workIndex = state.works.findIndex(work => work.idWork === idWork);

      if (workIndex !== -1) {
        // 3. Obtener una copia del trabajo para modificar
        const workToUpdate = { ...state.works[workIndex] };

        // 4. Asegurarse de que el array 'images' exista dentro del trabajo
        if (workToUpdate.images && Array.isArray(workToUpdate.images)) {
          // 5. Filtrar el array 'images' DENTRO del trabajo, manteniendo las que NO coinciden
          workToUpdate.images = workToUpdate.images.filter(
            (image) => image.id !== imageId // Comparación directa de IDs
          );

          // 6. Actualizar el trabajo en el array 'works' del estado
          state.works[workIndex] = workToUpdate;
          console.log(`Imagen ID ${imageId} eliminada del trabajo ID ${idWork} en el estado.`);
        } else {
           console.warn(`El trabajo con ID ${idWork} no tiene un array 'images' válido para filtrar.`);
        }
      } else {
         console.warn(`No se encontró el trabajo con ID ${idWork} en el estado para eliminar la imagen.`);
      }

      // 7. Eliminar la lógica incorrecta que modificaba state.images globalmente
      // state.images = state.images.filter((url) => !imageUrls.includes(url));

      state.error = null;
    },
    // --- FIN REDUCER CORREGIDO ---
    deleteImagesFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload; // Guardar el mensaje de error
      console.error("Error en deleteImagesFailure:", action.payload); // Log del error
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