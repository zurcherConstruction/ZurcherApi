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
    const response = await api.get(`/permit/${idPermit}`); // Ruta del backend
    dispatch(fetchPermitByIdSuccess(response.data));
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || 'Error al obtener el permiso';
    dispatch(fetchPermitByIdFailure(errorMessage));
  }
};

// ... otras importaciones y acciones ...

// Crear un permiso
export const createPermit = (formData) => async (dispatch) => {
  dispatch(createPermitRequest());
  try {
    const response = await api.post('/permit', formData);
    // --- DEVUELVE explícitamente la acción de éxito ---
    return dispatch(createPermitSuccess(response.data));
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al crear el permiso';
    dispatch(createPermitFailure(errorMessage));
    // --- Opcional: Lanza el error para que el catch del componente lo maneje ---
    // O devuelve la acción de fallo si prefieres manejarlo en el .then/.catch del componente
    // return dispatch(createPermitFailure(errorMessage));
    // Lanzar el error suele ser más directo con async/await
    throw new Error(errorMessage);
  }
};

// ... resto de acciones ...

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