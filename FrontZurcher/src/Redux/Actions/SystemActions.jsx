import api from '../../utils/axios';
import {
  fetchSystemTypesRequest,
  fetchSystemTypesSuccess,
  fetchSystemTypesFailure,
  createSystemTypeRequest,
  createSystemTypeSuccess,
  createSystemTypeFailure,
  updateSystemTypeRequest,
  updateSystemTypeSuccess,
  updateSystemTypeFailure,
  deleteSystemTypeRequest,
  deleteSystemTypeSuccess,
  deleteSystemTypeFailure,
} from '../Reducer/SystemReducer';

// Obtener todos los SystemTypes
export const fetchSystemTypes = () => async (dispatch) => {
  dispatch(fetchSystemTypesRequest());
  try {
    const response = await api.get('/system'); // Ruta del backend
    dispatch(fetchSystemTypesSuccess(response.data));
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || 'Error al obtener los SystemTypes';
    dispatch(fetchSystemTypesFailure(errorMessage));
  }
};

// Crear un SystemType
export const createSystemType = (systemTypeData) => async (dispatch) => {
  dispatch(createSystemTypeRequest());
  try {
    const response = await api.post('/system', systemTypeData); // Ruta del backend
    dispatch(createSystemTypeSuccess(response.data));
    return response.data; // Retorna la data para poder usarla en el front
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || 'Error al crear el SystemType';
    dispatch(createSystemTypeFailure(errorMessage));
    return undefined;
  }
};

// Actualizar un SystemType
export const updateSystemType = (id, systemTypeData) => async (dispatch) => {
  dispatch(updateSystemTypeRequest());
  try {
    const response = await api.put(`/system/${id}`, systemTypeData);
    dispatch(updateSystemTypeSuccess(response.data));
    return response.data;
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al actualizar el SystemType';
    dispatch(updateSystemTypeFailure(errorMessage));
    return undefined;
  }
};

// Eliminar un SystemType
export const deleteSystemType = (id) => async (dispatch) => {
  dispatch(deleteSystemTypeRequest());
  try {
    await api.delete(`/system/${id}`); // Ruta del backend
    dispatch(deleteSystemTypeSuccess(id));
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || 'Error al eliminar el SystemType';
    dispatch(deleteSystemTypeFailure(errorMessage));
  }
};