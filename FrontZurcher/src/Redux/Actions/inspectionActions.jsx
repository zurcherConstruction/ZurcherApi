import api from '../../utils/axios';
import {
  inspectionRequest,
  // inspectionSuccess, // Usaremos upsertInspectionSuccess o específicas
  inspectionFailure,
  fetchInspectionsByWorkSuccess,
  fetchInspectionByIdSuccess,
  upsertInspectionSuccess,
} from '../Reducer/inspectionReducer'; // Ajusta la ruta si es necesario
import { fetchWorkById } from './workActions';
// 1. Solicitar Inspección Inicial
export const requestInitialInspection = (workId, inspectionData) => async (dispatch) => {
  dispatch(inspectionRequest());
  try {
    // inspectionData: { inspectorEmail, workImageId }
    const response = await api.post(`/inspection/${workId}/request-initial`, inspectionData);
    dispatch(upsertInspectionSuccess(response.data)); // response.data = { message, inspection, workStatus }
    if (response.data.workStatus && workId) {
      dispatch(fetchWorkById(workId)); // Para obtener el work actualizado con el nuevo status
  }
    return response.data;
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al solicitar la inspección inicial.';
    dispatch(inspectionFailure(errorMessage));
    throw error;
  }
};

// 2. Registrar Respuesta de Inspectores (sube doc para aplicante)
export const registerInspectorResponse = (inspectionId, formData) => async (dispatch) => {
  // formData debe ser un objeto FormData que incluya:
  // inspectorScheduledDate (text)
  // documentForApplicantFile (file)
  // notes (text, opcional)
  dispatch(inspectionRequest());
  try {
    const response = await api.put(`/inspection/${inspectionId}/schedule-received`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    dispatch(upsertInspectionSuccess(response.data)); // response.data = { message, inspection }
    return response.data;
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al registrar la respuesta de los inspectores.';
    dispatch(inspectionFailure(errorMessage));
    throw error;
  }
};

// 3. Enviar Documento al Aplicante
export const sendDocumentToApplicant = (inspectionId, applicantData) => async (dispatch) => {
  // applicantData: { applicantEmail, applicantName }
  dispatch(inspectionRequest());
  try {
    const response = await api.post(`/inspection/${inspectionId}/send-to-applicant`, applicantData);
    dispatch(upsertInspectionSuccess(response.data)); // response.data = { message, inspection }
    return response.data;
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al enviar el documento al aplicante.';
    dispatch(inspectionFailure(errorMessage));
    throw error;
  }
};

// 4. Registrar Documento Firmado por el Aplicante
export const registerSignedApplicantDocument = (inspectionId, formData) => async (dispatch) => {
  // formData debe ser un objeto FormData que incluya:
  // signedDocumentFile (file)
  // notes (text, opcional)
  dispatch(inspectionRequest());
  try {
    const response = await api.put(`/inspection/${inspectionId}/applicant-document-received`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    dispatch(upsertInspectionSuccess(response.data)); // response.data = { message, inspection }
    return response.data;
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al registrar el documento firmado.';
    dispatch(inspectionFailure(errorMessage));
    throw error;
  }
};

// 5. Registrar Resultado Final de la Inspección
export const registerInspectionResult = (inspectionId, formData) => async (dispatch) => {
  // formData debe ser un objeto FormData que incluya:
  // finalStatus (text: 'approved' o 'rejected')
  // dateInspectionPerformed (text: YYYY-MM-DD, opcional)
  // resultDocumentFiles (array de files, hasta 2)
  // notes (text, opcional)
  dispatch(inspectionRequest());
  try {
    const response = await api.put(`/inspection/${inspectionId}/register-result`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    dispatch(upsertInspectionSuccess(response.data)); // response.data = { message, inspection, workStatus }
    return response.data;
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al registrar el resultado de la inspección.';
    dispatch(inspectionFailure(errorMessage));
    throw error;
  }
};

// Obtener Inspecciones por Work ID
export const fetchInspectionsByWork = (workId) => async (dispatch) => {
  dispatch(inspectionRequest());
  try {
    const response = await api.get(`/inspection/work/${workId}`);
    dispatch(fetchInspectionsByWorkSuccess(response.data));
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al obtener las inspecciones de la obra.';
    dispatch(inspectionFailure(errorMessage));
  }
};

// Obtener una Inspección por ID
export const fetchInspectionById = (inspectionId) => async (dispatch) => {
  dispatch(inspectionRequest());
  try {
    const response = await api.get(`/inspection/${inspectionId}`);
    dispatch(fetchInspectionByIdSuccess(response.data));
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al obtener la inspección.';
    dispatch(inspectionFailure(errorMessage));
  }
};