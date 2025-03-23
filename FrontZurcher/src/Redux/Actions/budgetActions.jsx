import api from '../../utils/axios';
import {
  fetchBudgetsRequest,
  fetchBudgetsSuccess,
  fetchBudgetsFailure,
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

export const fetchBudgets = () => async (dispatch) => {
    dispatch(fetchBudgetsRequest());
    try {
      const response = await api.get('/budgets'); // Ajusta la ruta según tu backend
      dispatch(fetchBudgetsSuccess(response.data));
    } catch (error) {
      // Manejo de errores
      const errorMessage =
        error.response?.data?.message || // Mensaje del backend
        error.message || // Mensaje del cliente (por ejemplo, error de red)
        'Error al obtener presupuestos'; // Mensaje por defecto
      dispatch(fetchBudgetsFailure(errorMessage));
    }
  };

  export const createBudget = (budgetData) => async (dispatch) => {
    dispatch(createBudgetRequest());
    try {
      const response = await api.post('/budgets', budgetData); // Ruta del backend
      dispatch(createBudgetSuccess(response.data));
    } catch (error) {
      const errorMessage =
        error.response?.data?.error || // Mensaje del backend
        error.message || // Mensaje del cliente (por ejemplo, error de red)
        'Error al crear el presupuesto'; // Mensaje por defecto
      dispatch(createBudgetFailure(errorMessage));
    }
  };
  
  // Acción para actualizar un presupuesto
  export const updateBudget = (id, budgetData) => async (dispatch) => {
    dispatch(updateBudgetRequest());
    try {
      const response = await api.put(`/budgets/${id}`, budgetData); // Ruta del backend
      dispatch(updateBudgetSuccess(response.data));
    } catch (error) {
      const errorMessage =
        error.response?.data?.error || 'Error al actualizar el presupuesto';
      dispatch(updateBudgetFailure(errorMessage));
    }
  };
  
  // Acción para eliminar un presupuesto
  export const deleteBudget = (id) => async (dispatch) => {
    dispatch(deleteBudgetRequest());
    try {
      await api.delete(`/budgets/${id}`); // Ruta del backend
      dispatch(deleteBudgetSuccess(id));
    } catch (error) {
      const errorMessage =
        error.response?.data?.error || 'Error al eliminar el presupuesto';
      dispatch(deleteBudgetFailure(errorMessage));
    }
  };