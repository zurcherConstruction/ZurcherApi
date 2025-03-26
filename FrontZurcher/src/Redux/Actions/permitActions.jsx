import api from '../../utils/axios';
import {
  fetchPermitsRequest,
  fetchPermitsSuccess,
  fetchPermitsFailure,
  fetchPermitByIdRequest,
  fetchPermitByIdSuccess,
  fetchPermitByIdFailure,
  createPermitRequest,
  createPermitSuccess,
  createPermitFailure,
  updatePermitRequest,
  updatePermitSuccess,
  updatePermitFailure,
  fetchContactsRequest,
  fetchContactsSuccess,
  fetchContactsFailure,
} from '../Reducer/permitReducer';

// Obtener todos los permisos
export const fetchPermits = () => async (dispatch) => {
  dispatch(fetchPermitsRequest());
  try {
    const response = await api.get('/permit'); // Ruta del backend
    dispatch(fetchPermitsSuccess(response.data));
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || 'Error al obtener los permisos';
    dispatch(fetchPermitsFailure(errorMessage));
  }
};

// Obtener un permiso por ID
export const fetchPermitById = (idPermit) => async (dispatch) => {
  dispatch(fetchPermitByIdRequest());
  try {
    const response = await api.get(`/permits/${idPermit}`); // Ruta del backend
    dispatch(fetchPermitByIdSuccess(response.data));
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || 'Error al obtener el permiso';
    dispatch(fetchPermitByIdFailure(errorMessage));
  }
};

// Crear un permiso
export const createPermit = (formData) => async (dispatch) => {
  dispatch(createPermitRequest());
  try {
    console.log("Datos enviados al backend para crear el permiso:", formData); // Log para depuración
    const response = await api.post('/permit', formData); // Ruta del backend
    console.log("Respuesta del backend al crear el permiso:", response.data); // Log para depuración
    dispatch(createPermitSuccess(response.data));
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || 'Error al crear el permiso';
    console.error("Error al crear el permiso:", errorMessage); // Log para depuración
    dispatch(createPermitFailure(errorMessage));
  }
};

// Actualizar un permiso
export const updatePermit = (idPermit, permitData) => async (dispatch) => {
  dispatch(updatePermitRequest());
  try {
    const response = await api.put(`/permits/${idPermit}`, permitData); // Ruta del backend
    dispatch(updatePermitSuccess(response.data));
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || 'Error al actualizar el permiso';
    dispatch(updatePermitFailure(errorMessage));
  }
};

// Obtener contactos de un permiso
export const fetchContacts = (idPermit) => async (dispatch) => {
  dispatch(fetchContactsRequest());
  try {
    const response = await api.get(`/permits/contacts/${idPermit || ''}`); // Ruta del backend
    dispatch(fetchContactsSuccess(response.data));
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || 'Error al obtener los contactos';
    dispatch(fetchContactsFailure(errorMessage));
  }
};