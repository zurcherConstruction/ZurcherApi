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
} from '../features/workSlice'; // Importar las acciones del slice de trabajo
import { Alert } from 'react-native'; // Importar Alert para mostrar errores

// Obtener todas las obras
export const fetchWorks = (staffId = null) => async (dispatch) => {
  dispatch(fetchWorksRequest());
  try {
    const response = await api.get('/work'); // Ruta del backend
    let works = response.data;

    // Filtrar los trabajos por staffId si se proporciona
    if (staffId) {
      works = works.filter((work) => work.staffId === staffId);
    }

    dispatch(fetchWorksSuccess(works));
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || 'Error al obtener las obras';
    dispatch(fetchWorksFailure(errorMessage));
    Alert.alert('Error', errorMessage); // Mostrar error en una alerta
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
    const response = await api.put(`/work/${idWork}`, workData); // Ruta del backend
    dispatch(updateWorkSuccess(response.data));
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || 'Error al actualizar la obra';
    dispatch(updateWorkFailure(errorMessage));
    Alert.alert('Error', errorMessage); // Mostrar error en una alerta
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
export const addImagesToWork = (idWork, imageData) => async (dispatch) => {
  dispatch(addImagesRequest()); 
  try {
    const response = await api.post(`/work/${idWork}/images`, imageData); 
  
    dispatch(addImagesSuccess(response.data)); 
    return response.data; 
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || 'Error al agregar las imágenes';
    dispatch(addImagesFailure(errorMessage)); 
    Alert.alert('Error', errorMessage); 
    return { error: errorMessage }; 
  }
};

export const deleteImagesFromWork = (idWork, imageData) => async (dispatch) => {
  dispatch(deleteImagesRequest()); // Acción para iniciar la solicitud
  try {
    const response = await api.delete(`/work/${idWork}/images`, { data: imageData }); // Ruta del backend
    dispatch(deleteImagesSuccess(response.data)); // Acción para éxito
    return response.data; // Devolver los datos para usarlos en el componente
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || 'Error al eliminar las imágenes';
    dispatch(deleteImagesFailure(errorMessage)); // Acción para error
    Alert.alert('Error', errorMessage); // Mostrar error en una alerta
    throw error; // Lanzar el error para manejarlo en el componente
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
