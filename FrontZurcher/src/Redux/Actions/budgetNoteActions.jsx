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
    
    // Agregar timestamp para evitar caché
    params.append('_t', Date.now());

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
    // Agregar timestamp para evitar caché
    const response = await api.get(`/budget-notes/budget/${budgetId}/stats?_t=${Date.now()}`);
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

// 🆕 ===== ACCIONES DE RECORDATORIOS =====

// Configurar recordatorio en una nota
export const setReminder = (noteId, reminderData) => async (dispatch) => {
  try {
    const response = await api.post(`/budget-notes/${noteId}/reminder`, reminderData);
    return { success: true, data: response.data };
  } catch (error) {
    const errorMessage =
      error.response?.data?.error || 'Error al configurar recordatorio';
    return { success: false, error: errorMessage };
  }
};

// Completar recordatorio
export const completeReminder = (noteId) => async (dispatch) => {
  try {
    const response = await api.patch(`/budget-notes/${noteId}/reminder/complete`);
    return { success: true, data: response.data };
  } catch (error) {
    const errorMessage =
      error.response?.data?.error || 'Error al completar recordatorio';
    return { success: false, error: errorMessage };
  }
};

// Obtener recordatorios activos del usuario
export const fetchActiveReminders = () => async (dispatch) => {
  try {
    const response = await api.get('/budget-notes/reminders/active');
    return { success: true, data: response.data };
  } catch (error) {
    const errorMessage =
      error.response?.data?.error || 'Error al cargar recordatorios';
    return { success: false, error: errorMessage };
  }
};

// 🆕 ===== ACCIONES DE ALERTAS =====

// Obtener contador de alertas
export const fetchAlertCount = () => async (dispatch) => {
  try {
    const response = await api.get('/budget-notes/alerts/count');
    return { success: true, data: response.data };
  } catch (error) {
    const errorMessage =
      error.response?.data?.error || 'Error al cargar alertas';
    return { success: false, error: errorMessage };
  }
};

// Marcar nota como leída
export const markNoteAsRead = (noteId) => async (dispatch) => {
  try {
    const response = await api.patch(`/budget-notes/${noteId}/read`);
    return { success: true, data: response.data };
  } catch (error) {
    const errorMessage =
      error.response?.data?.error || 'Error al marcar nota como leída';
    return { success: false, error: errorMessage };
  }
};

// Obtener notas no leídas
export const fetchUnreadNotes = () => async (dispatch) => {
  try {
    const response = await api.get('/budget-notes/alerts/unread');
    return { success: true, data: response.data };
  } catch (error) {
    const errorMessage =
      error.response?.data?.error || 'Error al cargar notas no leídas';
    return { success: false, error: errorMessage };
  }
};
