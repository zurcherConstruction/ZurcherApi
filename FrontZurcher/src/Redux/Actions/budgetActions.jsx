import api from '../../utils/axios';
import {
  fetchBudgetsRequest,
  fetchBudgetsSuccess,
  fetchBudgetsFailure,
  fetchBudgetByIdRequest,
  fetchBudgetByIdSuccess,
  fetchBudgetByIdFailure,
  createBudgetRequest,
  createBudgetSuccess,
  createBudgetFailure,
  updateBudgetRequest,
  updateBudgetSuccess,
  updateBudgetFailure,
  deleteBudgetRequest,
  deleteBudgetSuccess,
  deleteBudgetFailure,
  fetchArchivedBudgetsRequest,
  fetchArchivedBudgetsSuccess,
  fetchArchivedBudgetsFailure,
} from '../Reducer/BudgetReducer';

// Obtener todos los presupuestos
export const fetchBudgets = () => async (dispatch) => {
  dispatch(fetchBudgetsRequest());
  try {
    const response = await api.get('/budget/all'); // Ruta del backend
    dispatch(fetchBudgetsSuccess(response.data));
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || 'Error al obtener los presupuestos';
    dispatch(fetchBudgetsFailure(errorMessage));
  }
};

// Obtener un presupuesto por ID
export const fetchBudgetById = (idBudget) => async (dispatch) => {
  dispatch(fetchBudgetByIdRequest());
  try {
    const response = await api.get(`/budget/${idBudget}`); // Ruta del backend
    dispatch(fetchBudgetByIdSuccess(response.data));
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || 'Error al obtener el presupuesto';
    dispatch(fetchBudgetByIdFailure(errorMessage));
  }
};

// Crear un presupuesto
export const createBudget = (budgetData) => async (dispatch) => {
  dispatch(createBudgetRequest());
  try {
    const response = await api.post('/budget', budgetData); // Ruta del backend
    dispatch(createBudgetSuccess(response.data));
    return response.data; // Retorna la data para poder usarla en el front
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || 'Error al crear el presupuesto';
    dispatch(createBudgetFailure(errorMessage));
    return undefined;
  }
};

// Actualizar un presupuesto
export const updateBudget = (idBudget, budgetData) => async (dispatch) => {
  dispatch(updateBudgetRequest());
  try {
    const response = await api.put(`/budget/${idBudget}`, budgetData); // Ruta del backend
    dispatch(updateBudgetSuccess(response.data));
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || 'Error al actualizar el presupuesto';
    dispatch(updateBudgetFailure(errorMessage));
  }
};

// Eliminar un presupuesto
export const deleteBudget = (idBudget) => async (dispatch) => {
  dispatch(deleteBudgetRequest());
  try {
    await api.delete(`/budget/${idBudget}`); // Ruta del backend
    dispatch(deleteBudgetSuccess(idBudget));
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || 'Error al eliminar el presupuesto';
    dispatch(deleteBudgetFailure(errorMessage));
  }
};

// Obtener archivos archivados
export const fetchArchivedBudgets = () => async (dispatch) => {
  dispatch(fetchArchivedBudgetsRequest());
  try {
    const response = await api.get(`/archive?timestamp=${new Date().getTime()}`); // Agregar un parámetro único
    dispatch(fetchArchivedBudgetsSuccess(response.data));
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || "Error al obtener los archivos archivados";
    dispatch(fetchArchivedBudgetsFailure(errorMessage));
  }
};

export const uploadInvoice = (idBudget, invoiceFile) => async (dispatch) => {
  try {
    // Crear un FormData para enviar el archivo
    const formData = new FormData();
    formData.append('file', invoiceFile);

    // Hacer la solicitud al backend
    const response = await api.post(`/budget/${idBudget}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data', // Asegurarse de que se envíe como multipart
      },
    });

    return response.data; // Retorna la respuesta del backend
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || 'Error al subir la factura';
    console.error(errorMessage);
    throw new Error(errorMessage); // Lanza el error para manejarlo en el componente
  }
};