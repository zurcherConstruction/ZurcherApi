import api from '../../utils/axios'; // Asegúrate que la ruta sea correcta
import {
  fetchBudgetItemsRequest,
  fetchBudgetItemsSuccess,
  fetchBudgetItemsFailure,
  createBudgetItemRequest,
  createBudgetItemSuccess,
  createBudgetItemFailure,
  updateBudgetItemRequest,
  updateBudgetItemSuccess,
  updateBudgetItemFailure,
  deleteBudgetItemRequest,
  deleteBudgetItemSuccess,
  deleteBudgetItemFailure,
} from '../Reducer/budgetItemReducer'; // Crearemos este archivo a continuación

// --- Acción para obtener todos los BudgetItems ---
export const fetchBudgetItems = (params = {}) => async (dispatch) => {
  dispatch(fetchBudgetItemsRequest());
  try {
    // Usa la ruta base '/api/budget-items' que definiste en el backend
    const response = await api.get('/budget-item', { params }); // Permite pasar filtros como ?active=true
    dispatch(fetchBudgetItemsSuccess(response.data));
  } catch (error) {
    const errorMessage =
      error.response?.data?.error || 'Error al obtener los items del presupuesto';
    dispatch(fetchBudgetItemsFailure(errorMessage));
  }
};

// --- Acción para crear un BudgetItem ---
export const createBudgetItem = (itemData) => async (dispatch) => {
  dispatch(createBudgetItemRequest());
  try {
    let response;
    if (itemData instanceof FormData) {
      response = await api.post('/budget-item', itemData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    } else {
      response = await api.post('/budget-item', itemData);
    }
    dispatch(createBudgetItemSuccess(response.data));
    return response.data;
  } catch (error) {
    const errorMessage =
      error.response?.data?.error || 'Error al crear el item del presupuesto';
    dispatch(createBudgetItemFailure(errorMessage));
    return undefined;
  }
};

// --- Acción para actualizar un BudgetItem ---
export const updateBudgetItem = (itemId, itemData) => async (dispatch) => {
  dispatch(updateBudgetItemRequest());
  try {
    let response;
    if (itemData instanceof FormData) {
      response = await api.put(`/budget-item/${itemId}`, itemData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    } else {
      response = await api.put(`/budget-item/${itemId}`, itemData);
    }
    dispatch(updateBudgetItemSuccess(response.data));
    return response.data;
  } catch (error) {
    const errorMessage =
      error.response?.data?.error || 'Error al actualizar el item del presupuesto';
    dispatch(updateBudgetItemFailure(errorMessage));
    return undefined;
  }
};

// --- Acción para eliminar (desactivar) un BudgetItem ---
export const deleteBudgetItem = (itemId) => async (dispatch) => {
  dispatch(deleteBudgetItemRequest());
  try {
    await api.delete(`/budget-item/${itemId}`);
    dispatch(deleteBudgetItemSuccess(itemId)); // Pasamos el ID para poder quitarlo del estado
  } catch (error) {
    const errorMessage =
      error.response?.data?.error || 'Error al eliminar el item del presupuesto';
    dispatch(deleteBudgetItemFailure(errorMessage));
  }
};

// --- Acción para exportar items ---
export const exportBudgetItems = (format = 'excel') => async (dispatch) => {
  try {
    const response = await api.get(`/budget-item/export/items`, {
      params: { format },
      responseType: 'blob', // Importante para descargar archivos
    });

    // Crear un enlace de descarga
    const blob = new Blob([response.data]);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // Determinar el nombre del archivo y extensión
    const extension = format === 'csv' ? 'csv' : 'xlsx';
    const filename = `budget_items_${new Date().toISOString().split('T')[0]}.${extension}`;
    
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    
    return { success: true, message: 'Items exported successfully' };
  } catch (error) {
    const errorMessage = error.response?.data?.error || 'Error al exportar items';
    throw new Error(errorMessage);
  }
};

// --- Acción para descargar template ---
export const downloadBudgetItemTemplate = () => async (dispatch) => {
  try {
    const response = await api.get('/budget-item/export/template', {
      responseType: 'blob',
    });

    // Crear un enlace de descarga
    const blob = new Blob([response.data]);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'budget_items_template.xlsx');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    
    return { success: true, message: 'Template downloaded successfully' };
  } catch (error) {
    const errorMessage = error.response?.data?.error || 'Error al descargar template';
    throw new Error(errorMessage);
  }
};

// --- Acción para importar items ---
export const importBudgetItems = (file) => async (dispatch) => {
  dispatch(createBudgetItemRequest()); // Reutilizamos el loading state
  
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/budget-item/import/items', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    // Después de importar exitosamente, refrescar la lista
    dispatch(fetchBudgetItems());
    
    return {
      success: true,
      message: response.data.message,
      data: response.data
    };
  } catch (error) {
    const errorMessage = error.response?.data?.error || 'Error al importar items';
    dispatch(createBudgetItemFailure(errorMessage));
    throw new Error(errorMessage);
  }
};