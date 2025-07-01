
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

// Descargar PDF firmado de presupuesto
export const downloadSignedBudget = (idBudget) => async () => {
  try {
    // Usar el mismo cliente axios configurado (api)
    const response = await api.get(`/budget/${idBudget}/download-signed`, {
      responseType: 'blob',
      withCredentials: true,
    });
    // Descargar el archivo
    const blob = response.data;
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = `Presupuesto_Firmado_${idBudget}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    return { type: 'DOWNLOAD_SIGNED_BUDGET_SUCCESS' };
  } catch (error) {
    return { type: 'DOWNLOAD_SIGNED_BUDGET_FAILURE', payload: error.message };
  }
};

import { createAsyncThunk } from '@reduxjs/toolkit';

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
export const createBudget = createAsyncThunk(
  'budgets/create', // Nombre base de la acción (generará budgets/create/pending, /fulfilled, /rejected)
  async (budgetData, { rejectWithValue }) => {
    try {
      const response = await api.post('/budget', budgetData); // Ruta del backend
      // Simplemente retorna los datos exitosos. RTK los pondrá en el payload de 'fulfilled'.
      return response.data;
    } catch (error) {
      // Usa rejectWithValue para enviar un payload de error estructurado.
      const errorMessage =
        error.response?.data?.message || 'Error al crear el presupuesto';
      // RTK despachará la acción 'rejected' con este payload.
      return rejectWithValue(errorMessage);
    }
  }
);

// Actualizar un presupuesto
export const updateBudget = (idBudget, budgetData) => async (dispatch) => {
  dispatch(updateBudgetRequest());
  try {
    const response = await api.put(`/budget/${idBudget}`, budgetData);
    dispatch(updateBudgetSuccess(response.data));
    return {
      type: 'UPDATE_BUDGET_SUCCESS',
      payload: response.data
    };
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al actualizar el presupuesto';
    dispatch(updateBudgetFailure(errorMessage));
    return {
      type: 'UPDATE_BUDGET_FAILURE',
      payload: errorMessage
    };
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

export const uploadInvoice = (budgetId, file, uploadedAmount, onProgress) => async (dispatch) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('uploadedAmount', uploadedAmount); // <--- AÑADIR ESTA LÍNEA

    const response = await api.post(`/budget/${budgetId}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        if (onProgress) onProgress(percentCompleted);
      },
      timeout: 30000, // 30 seconds timeout
    });

    return {
      type: 'UPLOAD_INVOICE_SUCCESS',
      payload: response.data
    };

  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message || 'Error al subir el comprobante';
    return {
      type: 'UPLOAD_INVOICE_FAILURE',
      payload: errorMessage
    };
  }
};
