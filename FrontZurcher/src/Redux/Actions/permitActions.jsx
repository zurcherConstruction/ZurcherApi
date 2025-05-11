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
  checkPermitByAddressRequest,
  checkPermitByAddressSuccess,
  checkPermitByAddressFailure,
} from '../Reducer/permitReducer';

// --- NUEVA ACCIÓN: Verificar Permit por Property Address ---
export const checkPermitByAddress = (propertyAddress) => async (dispatch) => {
  dispatch(checkPermitByAddressRequest());
  try {
    // Asegúrate que la ruta '/permit/check-by-address' coincida con la que definiste en tu backend
    const response = await api.get(`/permit/check-by-address?propertyAddress=${encodeURIComponent(propertyAddress)}`);
    dispatch(checkPermitByAddressSuccess(response.data));
    return response.data; // Devolver los datos para que el componente los use directamente
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message || "Error al verificar el permiso por dirección";
    dispatch(checkPermitByAddressFailure(errorMessage));
    // Re-lanzar un error formateado para que el componente lo capture en su try/catch si es necesario
    // Esto es crucial si tu componente PdfReceipt.jsx usa try/catch alrededor de la llamada a esta acción.
    const errorToThrow = new Error(errorMessage);
    errorToThrow.response = error.response; // Adjuntar la respuesta original si existe
    errorToThrow.details = error.response?.data; // Adjuntar detalles si existen
    throw errorToThrow;
  }
};

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



// Crear un permiso
export const createPermit = (formData) => async (dispatch) => {
  dispatch(createPermitRequest());
  try {
    const response = await api.post('/permit', formData);
    // --- DEVUELVE explícitamente la acción de éxito ---
    dispatch(createPermitSuccess(response.data));
    // Devuelve los datos para que el componente pueda usarlos si es necesario
    return response.data;
  } catch (error) {
    console.error("Error en createPermit action:", error.response?.data || error.message);
    let errorPayload;
    if (error.response && error.response.data) {
        errorPayload = error.response.data;
    } else {
        errorPayload = { message: error.message || 'Error de red o servidor no disponible.' };
    }
    dispatch(createPermitFailure(errorPayload)); // Despacha estado de error
    const errorToThrow = new Error(errorPayload.message || 'Error al crear el permiso');
    errorToThrow.details = errorPayload; // <-- ¡ASEGÚRATE DE QUE ESTA LÍNEA EXISTE!
    throw errorToThrow; // <-- ¡ASEGÚRATE DE QUE SE LANZA EL ERROR!
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