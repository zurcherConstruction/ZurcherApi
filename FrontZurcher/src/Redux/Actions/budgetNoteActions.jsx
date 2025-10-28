import api from '../../utils/axios';
import {
  fetchBudgetNotesRequest,
  fetchBudgetNotesSuccess,
  fetchBudgetNotesFailure,
  fetchBudgetStatsRequest,
  fetchBudgetStatsSuccess,
  fetchBudgetStatsFailure,
  createBudgetNoteRequest,
  createBudgetNoteSuccess,
  createBudgetNoteFailure,
  updateBudgetNoteRequest,
  updateBudgetNoteSuccess,
  updateBudgetNoteFailure,
  deleteBudgetNoteRequest,
  deleteBudgetNoteSuccess,
  deleteBudgetNoteFailure,
  clearBudgetNoteError,
} from '../Reducer/budgetNoteReducer';

// Obtener notas de un budget
export const fetchBudgetNotes = (budgetId, filters = {}) => async (dispatch) => {
  dispatch(fetchBudgetNotesRequest());
  try {
    const params = new URLSearchParams();
    if (filters.noteType) params.append('noteType', filters.noteType);
    if (filters.priority) params.append('priority', filters.priority);
    if (filters.unresolved !== undefined) params.append('unresolved', filters.unresolved);

    const response = await api.get(`/budget-notes/budget/${budgetId}?${params.toString()}`);
    dispatch(fetchBudgetNotesSuccess({ budgetId, notes: response.data.notes || [] }));
  } catch (error) {
    const errorMessage =
      error.response?.data?.error || 'Error al cargar las notas';
    dispatch(fetchBudgetNotesFailure(errorMessage));
  }
};

// Obtener estadísticas de un budget
export const fetchBudgetStats = (budgetId) => async (dispatch) => {
  dispatch(fetchBudgetStatsRequest());
  try {
    const response = await api.get(`/budget-notes/budget/${budgetId}/stats`);
    dispatch(fetchBudgetStatsSuccess({ budgetId, stats: response.data }));
  } catch (error) {
    const errorMessage =
      error.response?.data?.error || 'Error al cargar las estadísticas';
    dispatch(fetchBudgetStatsFailure(errorMessage));
  }
};

// Crear nota
export const createBudgetNote = (budgetId, noteData) => async (dispatch) => {
  dispatch(createBudgetNoteRequest());
  try {
    const response = await api.post('/budget-notes', {
      budgetId,
      ...noteData
    });
    dispatch(createBudgetNoteSuccess(response.data));
    // Recargar notas para tener la lista actualizada
    dispatch(fetchBudgetNotes(budgetId));
    return { success: true, data: response.data };
  } catch (error) {
    const errorMessage =
      error.response?.data?.error || 'Error al crear la nota';
    dispatch(createBudgetNoteFailure(errorMessage));
    return { success: false, error: errorMessage };
  }
};

// Actualizar nota
export const updateBudgetNote = (noteId, budgetId, noteData) => async (dispatch) => {
  dispatch(updateBudgetNoteRequest());
  try {
    const response = await api.put(`/budget-notes/${noteId}`, noteData);
    dispatch(updateBudgetNoteSuccess(response.data));
    // Recargar notas para tener la lista actualizada
    dispatch(fetchBudgetNotes(budgetId));
    return { success: true, data: response.data };
  } catch (error) {
    const errorMessage =
      error.response?.data?.error || 'Error al actualizar la nota';
    dispatch(updateBudgetNoteFailure(errorMessage));
    return { success: false, error: errorMessage };
  }
};

// Eliminar nota
export const deleteBudgetNote = (noteId, budgetId) => async (dispatch) => {
  dispatch(deleteBudgetNoteRequest());
  try {
    await api.delete(`/budget-notes/${noteId}`);
    dispatch(deleteBudgetNoteSuccess(noteId));
    // Recargar notas para tener la lista actualizada
    dispatch(fetchBudgetNotes(budgetId));
    return { success: true };
  } catch (error) {
    const errorMessage =
      error.response?.data?.error || 'Error al eliminar la nota';
    dispatch(deleteBudgetNoteFailure(errorMessage));
    return { success: false, error: errorMessage };
  }
};

// Limpiar errores
export const clearError = () => (dispatch) => {
  dispatch(clearBudgetNoteError());
};
