import api from '../../utils/axios';
import {
  fetchWorkNotesRequest,
  fetchWorkNotesSuccess,
  fetchWorkNotesFailure,
  fetchWorkStatsRequest,
  fetchWorkStatsSuccess,
  fetchWorkStatsFailure,
  createWorkNoteRequest,
  createWorkNoteSuccess,
  createWorkNoteFailure,
  updateWorkNoteRequest,
  updateWorkNoteSuccess,
  updateWorkNoteFailure,
  deleteWorkNoteRequest,
  deleteWorkNoteSuccess,
  deleteWorkNoteFailure,
  clearWorkNoteError,
} from '../Reducer/workNoteReducer';

// Obtener notas de una obra
export const fetchWorkNotes = (workId, filters = {}) => async (dispatch) => {
  dispatch(fetchWorkNotesRequest());
  try {
    const params = new URLSearchParams();
    if (filters.noteType) params.append('noteType', filters.noteType);
    if (filters.priority) params.append('priority', filters.priority);
    if (filters.unresolved !== undefined) params.append('unresolved', filters.unresolved);

    const response = await api.get(`/work-notes/work/${workId}?${params.toString()}`);
    dispatch(fetchWorkNotesSuccess({ workId, notes: response.data.notes || [] }));
  } catch (error) {
    const errorMessage =
      error.response?.data?.error || 'Error al cargar las notas';
    dispatch(fetchWorkNotesFailure(errorMessage));
  }
};

// Obtener estadísticas de una obra
export const fetchWorkStats = (workId) => async (dispatch) => {
  dispatch(fetchWorkStatsRequest());
  try {
    const response = await api.get(`/work-notes/work/${workId}/stats`);
    dispatch(fetchWorkStatsSuccess({ workId, stats: response.data }));
  } catch (error) {
    const errorMessage =
      error.response?.data?.error || 'Error al cargar las estadísticas';
    dispatch(fetchWorkStatsFailure(errorMessage));
  }
};

// Crear nota
export const createWorkNote = (workId, noteData) => async (dispatch) => {
  dispatch(createWorkNoteRequest());
  try {
    const response = await api.post('/work-notes', {
      workId,
      ...noteData
    });
    dispatch(createWorkNoteSuccess(response.data));
    // Recargar notas para tener la lista actualizada
    dispatch(fetchWorkNotes(workId));
    return { success: true, data: response.data };
  } catch (error) {
    const errorMessage =
      error.response?.data?.error || 'Error al crear la nota';
    dispatch(createWorkNoteFailure(errorMessage));
    return { success: false, error: errorMessage };
  }
};

// Actualizar nota
export const updateWorkNote = (noteId, workId, noteData) => async (dispatch) => {
  dispatch(updateWorkNoteRequest());
  try {
    const response = await api.put(`/work-notes/${noteId}`, noteData);
    dispatch(updateWorkNoteSuccess(response.data));
    // Recargar notas para tener la lista actualizada
    dispatch(fetchWorkNotes(workId));
    return { success: true, data: response.data };
  } catch (error) {
    const errorMessage =
      error.response?.data?.error || 'Error al actualizar la nota';
    dispatch(updateWorkNoteFailure(errorMessage));
    return { success: false, error: errorMessage };
  }
};

// Eliminar nota
export const deleteWorkNote = (noteId, workId) => async (dispatch) => {
  dispatch(deleteWorkNoteRequest());
  try {
    await api.delete(`/work-notes/${noteId}`);
    dispatch(deleteWorkNoteSuccess(noteId));
    // Recargar notas para tener la lista actualizada
    dispatch(fetchWorkNotes(workId));
    return { success: true };
  } catch (error) {
    const errorMessage =
      error.response?.data?.error || 'Error al eliminar la nota';
    dispatch(deleteWorkNoteFailure(errorMessage));
    return { success: false, error: errorMessage };
  }
};

// Limpiar errores
export const clearError = () => (dispatch) => {
  dispatch(clearWorkNoteError());
};
