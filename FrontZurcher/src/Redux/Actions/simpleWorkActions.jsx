import api from '../../utils/axios';
import {
  simpleWorkRequest,
  fetchSimpleWorksSuccess,
  fetchSimpleWorkByIdSuccess,
  createSimpleWorkSuccess,
  updateSimpleWorkSuccess,
  deleteSimpleWorkSuccess,
  generateSimpleWorkPdfSuccess,
  simpleWorkFailure,
  clearSimpleWorkError,
  clearSimpleWorkSuccessMessage,
  fetchClientWorksSuccess,
} from '../Reducer/simpleWorkReducer';

// Helper para manejar errores
const handleError = (error, message) => {
  console.error(`${message} - Detalles del error:`, error.response?.data || error.message);
  return error.response?.data?.message || error.message;
};

// Obtener todos los trabajos simples
export const fetchSimpleWorks = (filters = {}) => async (dispatch) => {
  dispatch(simpleWorkRequest());
  try {
    const queryParams = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
        queryParams.append(key, filters[key]);
      }
    });

    const response = await api.get(`/simple-works?${queryParams.toString()}`);
    dispatch(fetchSimpleWorksSuccess(response.data));
  } catch (error) {
    dispatch(simpleWorkFailure(handleError(error, 'Error al obtener trabajos simples')));
  }
};

// Obtener trabajo simple por ID
export const fetchSimpleWorkById = (id) => async (dispatch) => {
  dispatch(simpleWorkRequest());
  try {
    const response = await api.get(`/simple-works/${id}`, {
      headers: { 'Cache-Control': 'no-cache' }
    });
    dispatch(fetchSimpleWorkByIdSuccess(response.data));
  } catch (error) {
    dispatch(simpleWorkFailure(handleError(error, 'Error al obtener trabajo simple')));
  }
};

// Crear nuevo trabajo simple
export const createSimpleWork = (simpleWorkData) => async (dispatch) => {
  dispatch(simpleWorkRequest());
  try {
    const response = await api.post('/simple-works', simpleWorkData);
    dispatch(createSimpleWorkSuccess(response.data));
    return response.data;
  } catch (error) {
    const errorMessage = handleError(error, 'Error al crear trabajo simple');
    dispatch(simpleWorkFailure(errorMessage));
    throw new Error(errorMessage);
  }
};

// Actualizar trabajo simple
export const updateSimpleWork = (id, simpleWorkData) => async (dispatch) => {
  dispatch(simpleWorkRequest());
  try {
    const response = await api.put(`/simple-works/${id}`, simpleWorkData);
    dispatch(updateSimpleWorkSuccess(response.data));
    return response.data;
  } catch (error) {
    const errorMessage = handleError(error, 'Error al actualizar trabajo simple');
    dispatch(simpleWorkFailure(errorMessage));
    throw new Error(errorMessage);
  }
};

// Eliminar trabajo simple
export const deleteSimpleWork = (id) => async (dispatch) => {
  dispatch(simpleWorkRequest());
  try {
    await api.delete(`/simple-works/${id}`);
    dispatch(deleteSimpleWorkSuccess(id));
  } catch (error) {
    dispatch(simpleWorkFailure(handleError(error, 'Error al eliminar trabajo simple')));
  }
};

// Generar PDF del trabajo simple (descarga)
export const generateSimpleWorkPdf = (id) => async (dispatch) => {
  dispatch(simpleWorkRequest());
  try {
    const response = await api.get(`/simple-works/${id}/pdf`, {
      responseType: 'blob'
    });

    // Crear URL para el blob y descargar
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `simple-work-${id}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    dispatch(generateSimpleWorkPdfSuccess());
  } catch (error) {
    dispatch(simpleWorkFailure(handleError(error, 'Error al generar PDF')));
  }
};

// Ver PDF del trabajo simple (para modal)
export const viewSimpleWorkPdf = (id) => async (dispatch) => {
  dispatch(simpleWorkRequest());
  try {
    // Intentar primero con endpoint específico para vista previa
    let response;
    try {
      response = await api.get(`/simple-works/${id}/view-pdf`, {
        responseType: 'blob',
        withCredentials: true
      });
    } catch (viewError) {
      // Si no existe endpoint específico, usar el general con headers inline
      console.log('Endpoint view-pdf no disponible, usando pdf general:', viewError.message);
      response = await api.get(`/simple-works/${id}/pdf`, {
        responseType: 'blob',
        params: { inline: true }, // Parámetro para indicar vista previa
        withCredentials: true
      });
    }

    // Crear URL directamente desde response.data como en BudgetList
    const url = window.URL.createObjectURL(response.data);
    
    dispatch(generateSimpleWorkPdfSuccess());
    return url; // Retornar URL para usar en modal
  } catch (error) {
    dispatch(simpleWorkFailure(handleError(error, 'Error al ver PDF')));
    throw error;
  }
};

// Enviar trabajo simple por email al cliente
export const sendSimpleWorkToClient = (id) => async (dispatch) => {
  console.log(`📧 [Redux] Enviando SimpleWork ${id} por email...`);
  dispatch(simpleWorkRequest());
  try {
    const response = await api.post(`/simple-works/${id}/send-email`);
    console.log(`✅ [Redux] Email enviado exitosamente:`, response.data);
    
    // Disparar success general
    dispatch(generateSimpleWorkPdfSuccess());
    
    // Forzar un refresh completo de la lista con cache buster
    console.log(`🔄 [Redux] Refrescando lista de SimpleWorks...`);
    await dispatch(fetchSimpleWorks());
    
    return response.data;
  } catch (error) {
    console.error(`❌ [Redux] Error enviando email:`, error);
    const errorMessage = handleError(error, 'Error al enviar email');
    dispatch(simpleWorkFailure(errorMessage));
    throw new Error(errorMessage);
  }
};

// Marcar SimpleWork como completado
export const markSimpleWorkAsCompleted = (id) => async (dispatch) => {
  dispatch(simpleWorkRequest());
  try {
    const response = await api.patch(`/simple-works/${id}/complete`);
    dispatch(updateSimpleWorkSuccess(response.data)); // Usar success action existente
    return response.data;
  } catch (error) {
    const errorMessage = handleError(error, 'Error al marcar como completado');
    dispatch(simpleWorkFailure(errorMessage));
    throw new Error(errorMessage);
  }
};

// Obtener trabajos del cliente (para linking)
export const fetchClientWorks = (clientData) => async (dispatch) => {
  dispatch(simpleWorkRequest());
  try {
    const response = await api.get('/simple-works/link-works', {
      params: clientData
    });
    dispatch(fetchClientWorksSuccess(response.data));
  } catch (error) {
    dispatch(simpleWorkFailure(handleError(error, 'Error al obtener trabajos del cliente')));
  }
};

// Limpiar errores
export const clearError = () => (dispatch) => {
  dispatch(clearSimpleWorkError());
};

// Actions para pagos del trabajo simple
export const createSimpleWorkPayment = (simpleWorkId, paymentData) => async (dispatch) => {
  dispatch(simpleWorkRequest());
  try {
    const response = await api.post(`/simple-works/${simpleWorkId}/payment`, paymentData);
    // Refetch the simple work to update the payments
    dispatch(fetchSimpleWorkById(simpleWorkId));
    return response.data;
  } catch (error) {
    const errorMessage = handleError(error, 'Error al crear pago');
    dispatch(simpleWorkFailure(errorMessage));
    throw new Error(errorMessage);
  }
};

export const updateSimpleWorkPayment = (simpleWorkId, paymentId, paymentData) => async (dispatch) => {
  dispatch(simpleWorkRequest());
  try {
    const response = await api.put(`/simple-works/${simpleWorkId}/payment/${paymentId}`, paymentData);
    // Refetch the simple work to update the payments
    dispatch(fetchSimpleWorkById(simpleWorkId));
    return response.data;
  } catch (error) {
    const errorMessage = handleError(error, 'Error al actualizar pago');
    dispatch(simpleWorkFailure(errorMessage));
    throw new Error(errorMessage);
  }
};

export const deleteSimpleWorkPayment = (simpleWorkId, paymentId) => async (dispatch) => {
  dispatch(simpleWorkRequest());
  try {
    await api.delete(`/simple-works/${simpleWorkId}/payment/${paymentId}`);
    // Refetch the simple work to update the payments
    dispatch(fetchSimpleWorkById(simpleWorkId));
  } catch (error) {
    dispatch(simpleWorkFailure(handleError(error, 'Error al eliminar pago')));
  }
};

// Actions para gastos del trabajo simple
export const createSimpleWorkExpense = (simpleWorkId, expenseData) => async (dispatch) => {
  dispatch(simpleWorkRequest());
  try {
    const response = await api.post(`/simple-works/${simpleWorkId}/expense`, expenseData);
    // Refetch the simple work to update the expenses
    dispatch(fetchSimpleWorkById(simpleWorkId));
    return response.data;
  } catch (error) {
    const errorMessage = handleError(error, 'Error al crear gasto');
    dispatch(simpleWorkFailure(errorMessage));
    throw new Error(errorMessage);
  }
};

export const updateSimpleWorkExpense = (simpleWorkId, expenseId, expenseData) => async (dispatch) => {
  dispatch(simpleWorkRequest());
  try {
    const response = await api.put(`/simple-works/${simpleWorkId}/expense/${expenseId}`, expenseData);
    // Refetch the simple work to update the expenses
    dispatch(fetchSimpleWorkById(simpleWorkId));
    return response.data;
  } catch (error) {
    const errorMessage = handleError(error, 'Error al actualizar gasto');
    dispatch(simpleWorkFailure(errorMessage));
    throw new Error(errorMessage);
  }
};

export const deleteSimpleWorkExpense = (simpleWorkId, expenseId) => async (dispatch) => {
  dispatch(simpleWorkRequest());
  try {
    await api.delete(`/simple-works/${simpleWorkId}/expense/${expenseId}`);
    // Refetch the simple work to update the expenses
    dispatch(fetchSimpleWorkById(simpleWorkId));
  } catch (error) {
    dispatch(simpleWorkFailure(handleError(error, 'Error al eliminar gasto')));
  }
};

// Limpiar trabajos del cliente
export const clearClientWorks = () => (dispatch) => {
  dispatch({ type: 'simple-work/clearClientWorks' });
};

// Limpiar errores
export const clearErrors = () => (dispatch) => {
  dispatch(clearSimpleWorkError());
};

// Limpiar mensaje de éxito  
export const clearSuccessMessage = () => (dispatch) => {
  dispatch(clearSimpleWorkSuccessMessage());
};

// Re-exportar acciones del reducer para uso directo
export { clearSimpleWorkError, clearSimpleWorkSuccessMessage } from '../Reducer/simpleWorkReducer';