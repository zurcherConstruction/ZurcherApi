import api from '../../utils/axios';
import {
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
  addImagesRequest,
  addImagesSuccess,
  addImagesFailure,
  deleteImagesRequest,
  deleteImagesSuccess,
  deleteImagesFailure,
  fetchAssignedWorksRequest,
  fetchAssignedWorksSuccess,
  fetchAssignedWorksFailure,
  markInspectionCorrectedRequest,
  markInspectionCorrectedSuccess,
  markInspectionCorrectedFailure,
} from '../features/workSlice'; // Importar las acciones del slice de trabajo
import { Alert } from 'react-native'; // Importar Alert para mostrar errores

// Obtener todas las obras
export const fetchWorks = (staffId = null, skipLoading = false) => async (dispatch) => {
  dispatch(fetchWorksRequest());
  try {
    const response = await api.get('/work'); // Ruta del backend
    let works = response.data;

    // Filtrar los trabajos por staffId si se proporciona
    if (staffId) {
      works = works.filter((work) => work.staffId === staffId);
    }

    dispatch(fetchWorksSuccess(works));
      // Solo loggear cuando es background refresh y en desarrollo
    if (skipLoading && __DEV__) {
      console.log('🔄 Background refresh:', works?.length || 0, 'trabajos');
    }
    
    return works;
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || 'Error al obtener las obras';
    dispatch(fetchWorksFailure(errorMessage));

    // Solo mostrar alert si no es background refresh
    if (!skipLoading) {
      Alert.alert('Error', errorMessage);
    } else if (__DEV__) {
      console.log('❌ Error en background refresh:', errorMessage);
    }
    throw error;
  }
};

export const refreshWorksInBackground = (staffId) => async (dispatch, getState) => {
  try {
    if (__DEV__) {
      console.log('🔄 Actualizando trabajos en segundo plano');
    }
    await dispatch(fetchWorks(staffId, true));
  } catch (error) {
    if (__DEV__) {
      console.log('❌ Error en actualización:', error.message);
    }
  }
};

// Obtener una obra por ID
export const fetchWorkById = (idWork) => async (dispatch) => {
  dispatch(fetchWorkByIdRequest());
  try {
    const response = await api.get(`/work/${idWork}`); // Ruta del backend
    dispatch(fetchWorkByIdSuccess(response.data));
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || 'Error al obtener la obra';
    dispatch(fetchWorkByIdFailure(errorMessage));
    Alert.alert('Error', errorMessage); // Mostrar error en una alerta
  }
};

// Crear una obra
export const createWork = (workData) => async (dispatch) => {
  dispatch(createWorkRequest());
  try {
    const response = await api.post('/work', workData); // Ruta del backend
    dispatch(createWorkSuccess(response.data)); // Actualizar el estado global con el nuevo Work
    return response.data; // Devolver el Work creado
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || 'Error al crear la obra';
    dispatch(createWorkFailure(errorMessage));
    Alert.alert('Error', errorMessage); // Mostrar error en una alerta
    throw error; // Lanzar el error para manejarlo en el componente
  }
};

// Actualizar una obra
export const updateWork = (idWork, workData) => async (dispatch) => {
  dispatch(updateWorkRequest());
  try {
    const response = await api.put(`/work/${idWork}`, workData);
    console.log('[workActions] updateWork SUCCESS, response.data:', response.data);
    
    // ✅ SOLUCIÓN: Solo verificar que el status sea exitoso
    if (response.status >= 200 && response.status < 300) {
      // Despachar éxito con cualquier estructura que venga
      dispatch(updateWorkSuccess(response.data));
      
      // Devolver la respuesta tal como viene del backend
      return response.data;
    } else {
      throw new Error(`Status no exitoso: ${response.status}`);
    }
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al actualizar la obra';
    console.error('[workActions] updateWork FAILURE:', errorMessage, 'Error details:', error.response?.data);
    dispatch(updateWorkFailure(errorMessage));
    Alert.alert('Error', errorMessage);
    return { error: true, message: errorMessage };
  }
};

// Eliminar una obra
export const deleteWork = (idWork) => async (dispatch) => {
  dispatch(deleteWorkRequest());
  try {
    await api.delete(`/work/${idWork}`); // Ruta del backend
    dispatch(deleteWorkSuccess(idWork));
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || 'Error al eliminar la obra';
    dispatch(deleteWorkFailure(errorMessage));
    Alert.alert('Error', errorMessage); // Mostrar error en una alerta
  }
};

// Agregar un detalle de instalación
export const addInstallationDetail = (idWork, installationData) => async (dispatch) => {
  dispatch(addInstallationDetailRequest());
  try {
    const response = await api.post(`/work/${idWork}/installation-details`, installationData);
    dispatch(addInstallationDetailSuccess(response.data)); // Despacha los datos recibidos
    return response.data; // Devuelve los datos para usarlos en el componente
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || 'Error al agregar el detalle de instalación';
    dispatch(addInstallationDetailFailure(errorMessage));
    Alert.alert('Error', errorMessage); // Mostrar error en una alerta
    throw error; // Lanza el error para manejarlo en el componente
  }
};
// ...
export const addImagesToWork = (idWork, formData) => async (dispatch) => {
  dispatch(addImagesRequest());
  try {
    const response = await api.post(`/work/${idWork}/images`, formData);
    console.log('[workActions] addImagesToWork SUCCESS, response.data:', response.data);
    
    // ✅ SOLUCIÓN: Solo verificar que el status sea exitoso
    if (response.status >= 200 && response.status < 300) {
      // Despachar éxito con cualquier estructura que venga
      dispatch(addImagesSuccess(response.data));
      
      // Si hay un trabajo actualizado en la respuesta, genial
      if (response.data && response.data.work) {
        return response.data;
      }
      // Si no, devolver éxito simple
      return { success: true, message: response.data?.message || 'Imagen subida correctamente' };
    } else {
      throw new Error(`Status no exitoso: ${response.status}`);
    }
  } catch (error) {
    const backendErrorMessage = error.response?.data?.message;
    const displayErrorMessage = backendErrorMessage || 'Error al agregar las imágenes';
    console.error('[workActions] addImagesToWork FAILURE:', displayErrorMessage, 'Error details:', error.response?.data);
    dispatch(addImagesFailure(displayErrorMessage));
    Alert.alert('Error', displayErrorMessage);
    return { error: true, message: displayErrorMessage };
  }
};
// ...
export const deleteImagesFromWork = (idWork, imageId) => async (dispatch) => {
  dispatch(deleteImagesRequest());
  try {
    const response = await api.delete(`/work/${idWork}/images/${imageId}`);
    console.log('[workActions] deleteImagesFromWork SUCCESS, status:', response.status);

    // ✅ SOLUCIÓN: Aceptar cualquier status exitoso (200, 204, etc.)
    if (response.status >= 200 && response.status < 300) {
      dispatch(deleteImagesSuccess({ idWork, imageId }));
      
      // Refrescar trabajos asignados para actualizar la UI
      dispatch(fetchAssignedWorks());
      
      return { success: true, message: 'Imagen eliminada correctamente' };
    } else {
      throw new Error(`Status no exitoso: ${response.status}`);
    }
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message || 'Error al eliminar la imagen';
    console.error('[workActions] deleteImagesFromWork FAILURE:', errorMessage);
    dispatch(deleteImagesFailure(errorMessage));
    Alert.alert('Error', errorMessage);
    return { error: true, message: errorMessage };
  }
};

export const fetchAssignedWorks = () => async (dispatch) => {
  dispatch(fetchAssignedWorksRequest()); // Inicia la solicitud
  try {
    const response = await api.get('/work/assigned'); // Llama al endpoint del backend
    const works = response.data.works; // Extrae los trabajos asignados de la respuesta
    dispatch(fetchAssignedWorksSuccess(works)); // Despacha los trabajos al estado global
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || 'Error al obtener los trabajos asignados';
    dispatch(fetchAssignedWorksFailure(errorMessage)); // Maneja el error
    Alert.alert('Error', errorMessage); // Muestra el error en una alerta
  }
};

// --- ACCIÓN PARA MARCAR UNA INSPECCIÓN COMO CORREGIDA POR EL EMPLEADO ---
export const markInspectionCorrectedByWorker = (inspectionId) => async (dispatch) => {
  dispatch(markInspectionCorrectedRequest({ inspectionId }));
  try {
    const response = await api.post(`/inspection/${inspectionId}/mark-corrected`); // El backend no espera body

    if (response.data && response.data.inspection) {
      dispatch(markInspectionCorrectedSuccess(response.data.inspection));
      // ✅ ALERT REMOVIDO - se muestra inmediatamente en UploadScreen para mejor UX
      
      if (response.data.inspection.workId) {
        dispatch(fetchWorkById(response.data.inspection.workId)); // Clave para actualizar la UI
      }
      return response.data.inspection;
    } else {
      throw new Error('Respuesta inesperada del servidor al marcar corrección.');
    }
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message || 'Error al marcar la corrección.';
    dispatch(markInspectionCorrectedFailure({ inspectionId, error: errorMessage }));
    Alert.alert('Error', errorMessage);
    throw error;
  }
};