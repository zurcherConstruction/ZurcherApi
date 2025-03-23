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
  deleteWorkRequest,
  deleteWorkSuccess,
  deleteWorkFailure,
} from '../Reducer/workReducer';

// Obtener todas las obras
export const fetchWorks = () => async (dispatch) => {
  dispatch(fetchWorksRequest());
  try {
    const response = await api.get('/works'); // Ruta del backend
    dispatch(fetchWorksSuccess(response.data));
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || 'Error al obtener las obras';
    dispatch(fetchWorksFailure(errorMessage));
  }
};

// Obtener una obra por ID
export const fetchWorkById = (idWork) => async (dispatch) => {
  dispatch(fetchWorkByIdRequest());
  try {
    const response = await api.get(`/works/${idWork}`); // Ruta del backend
    dispatch(fetchWorkByIdSuccess(response.data));
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || 'Error al obtener la obra';
    dispatch(fetchWorkByIdFailure(errorMessage));
  }
};

// Crear una obra
export const createWork = (workData) => async (dispatch) => {
  dispatch(createWorkRequest());
  try {
    const response = await api.post('/works', workData); // Ruta del backend
    dispatch(createWorkSuccess(response.data));
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || 'Error al crear la obra';
    dispatch(createWorkFailure(errorMessage));
  }
};

// Actualizar una obra
export const updateWork = (idWork, workData) => async (dispatch) => {
  dispatch(updateWorkRequest());
  try {
    const response = await api.put(`/works/${idWork}`, workData); // Ruta del backend
    dispatch(updateWorkSuccess(response.data));
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || 'Error al actualizar la obra';
    dispatch(updateWorkFailure(errorMessage));
  }
};

// Eliminar una obra
export const deleteWork = (idWork) => async (dispatch) => {
  dispatch(deleteWorkRequest());
  try {
    await api.delete(`/works/${idWork}`); // Ruta del backend
    dispatch(deleteWorkSuccess(idWork));
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || 'Error al eliminar la obra';
    dispatch(deleteWorkFailure(errorMessage));
  }
};