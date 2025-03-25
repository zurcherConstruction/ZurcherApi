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
} from '../Reducer/BudgetReducer';

// Obtener todos los presupuestos
export const fetchBudgets = () => async (dispatch) => {
  dispatch(fetchBudgetsRequest());
  try {
    const response = await api.get('/budgets/all'); // Ruta del backend
    dispatch(fetchBudgetsSuccess(response.data));
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || 'Error al obtener los presupuestos';
    dispatch(fetchBudgetsFailure(errorMessage));
  }
};

// Obtener un presupuesto por ID
export const fetchBudgetById = (id) => async (dispatch) => {
  dispatch(fetchBudgetByIdRequest());
  try {
    const response = await api.get(`/budgets/${id}`); // Ruta del backend
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
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || 'Error al crear el presupuesto';
    dispatch(createBudgetFailure(errorMessage));
  }
};

// Actualizar un presupuesto
export const updateBudget = (id, budgetData) => async (dispatch) => {
  dispatch(updateBudgetRequest());
  try {
    const response = await api.put(`/budgets/${id}`, budgetData); // Ruta del backend
    dispatch(updateBudgetSuccess(response.data));
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || 'Error al actualizar el presupuesto';
    dispatch(updateBudgetFailure(errorMessage));
  }
};

// Eliminar un presupuesto
export const deleteBudget = (id) => async (dispatch) => {
  dispatch(deleteBudgetRequest());
  try {
    await api.delete(`/budgets/${id}`); // Ruta del backend
    dispatch(deleteBudgetSuccess(id));
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || 'Error al eliminar el presupuesto';
    dispatch(deleteBudgetFailure(errorMessage));
  }
};