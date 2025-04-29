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
    const response = await api.post('/budget-item', itemData);
    dispatch(createBudgetItemSuccess(response.data));
    // Opcional: puedes retornar la data si necesitas hacer algo después en el componente
    return response.data;
  } catch (error) {
    const errorMessage =
      error.response?.data?.error || 'Error al crear el item del presupuesto';
    dispatch(createBudgetItemFailure(errorMessage));
    // Opcional: retornar undefined o lanzar el error para manejo en el componente
    return undefined;
  }
};

// --- Acción para actualizar un BudgetItem ---
export const updateBudgetItem = (itemId, itemData) => async (dispatch) => {
  dispatch(updateBudgetItemRequest());
  try {
    const response = await api.put(`/budget-item/${itemId}`, itemData);
    dispatch(updateBudgetItemSuccess(response.data));
    return response.data; // Retorna el item actualizado
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