import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  works: [], // Lista de obras
  work: null, // Obra específica
  images: [], // Lista de imágenes asociadas a un trabajo
  loadingMarkCorrection: false, // Nuevo estado para la carga de marcar corrección
  errorMarkCorrection: null,
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

      // 1. Actualizar la lista de trabajos (state.works)
      const workIndexInList = state.works.findIndex(w => w.idWork === idWork);
      if (workIndexInList !== -1) {
        const workToUpdateInList = { ...state.works[workIndexInList] };
        if (workToUpdateInList.images && Array.isArray(workToUpdateInList.images)) {
          workToUpdateInList.images = workToUpdateInList.images.filter(img => img.id !== imageId);
          state.works[workIndexInList] = workToUpdateInList;
        }
      } else {
        console.warn(`deleteImagesSuccess: Trabajo con ID ${idWork} no encontrado en state.works.`);
      }

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
    markInspectionCorrectedRequest: (state, action) => {
      state.loadingMarkCorrection = true;
      state.errorMarkCorrection = null;
    },
    markInspectionCorrectedSuccess: (state, action) => {
      state.loadingMarkCorrection = false;
      const updatedInspection = action.payload; // La inspección actualizada desde el backend

      // Si currentWork está cargado y tiene inspecciones, actualiza la específica.
      // Esto es opcional si confías en el refetch de fetchWorkById desde la acción.
      // Pero puede dar una actualización más rápida de la UI si la estructura lo permite.
      if (state.currentWork && state.currentWork.inspections) {
        const index = state.currentWork.inspections.findIndex(
          (insp) => insp.idInspection === updatedInspection.idInspection
        );
        if (index !== -1) {
          state.currentWork.inspections[index] = updatedInspection;
        } else {
          // Si no la encuentra, podría ser una nueva (aunque no en este flujo) o un problema.
          // El refetch de fetchWorkById se encargará de la consistencia.
        }
      }
      // También podrías querer actualizar la inspección en la lista `assignedWorks` si está allí
      // y si `assignedWorks` contiene los detalles completos de las inspecciones.
    },
    markInspectionCorrectedFailure: (state, action) => {
      state.loadingMarkCorrection = false;
      state.errorMarkCorrection = action.payload.error;
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
  markInspectionCorrectedRequest,
  markInspectionCorrectedSuccess,
  markInspectionCorrectedFailure,
} = workSlice.actions;

// Exportar el reducer para integrarlo en el store
export default workSlice.reducer;