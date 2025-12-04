import api from '../../utils/axios';
import {
  fetchChecklistsRequest,
  fetchChecklistsSuccess,
  fetchChecklistsFailure,
  fetchChecklistByWorkIdRequest,
  fetchChecklistByWorkIdSuccess,
  fetchChecklistByWorkIdFailure,
  updateChecklistRequest,
  updateChecklistSuccess,
  updateChecklistFailure,
  fetchChecklistStatsRequest,
  fetchChecklistStatsSuccess,
  fetchChecklistStatsFailure,
} from '../Reducer/checklistReducer';

/**
 * Obtener el checklist de un work específico
 * GET /works/:workId/checklist
 */
export const fetchChecklistByWorkId = (workId) => async (dispatch) => {
  dispatch(fetchChecklistByWorkIdRequest());
  try {
    const response = await api.get(`/works/${workId}/checklist`);
    dispatch(fetchChecklistByWorkIdSuccess({ 
      workId, 
      checklist: response.data.checklist 
    }));
    return response.data.checklist;
  } catch (error) {
    const errorMessage =
      error.response?.data?.error || 'Error al obtener el checklist';
    dispatch(fetchChecklistByWorkIdFailure(errorMessage));
    throw error;
  }
};

/**
 * Obtener checklists de múltiples works
 * Usado para carga inicial en ProgressTracker
 * 🆕 OPTIMIZADO: 1 sola llamada batch en lugar de N llamadas
 */
export const fetchChecklists = (workIds) => async (dispatch) => {
  dispatch(fetchChecklistsRequest());
  try {
    // 🆕 BATCH REQUEST: 1 sola llamada para todos los checklists
    const response = await api.post('/works/checklists/batch', { workIds });
    
    if (response.data.success) {
      dispatch(fetchChecklistsSuccess(response.data.checklists));
    } else {
      throw new Error('Respuesta inválida del servidor');
    }
  } catch (error) {
    console.error('❌ Error al obtener checklists (batch):', error);
    const errorMessage =
      error.response?.data?.error || 'Error al obtener los checklists';
    dispatch(fetchChecklistsFailure(errorMessage));
  }
};

/**
 * Actualizar un checklist
 * PUT /works/:workId/checklist
 */
export const updateChecklist = (workId, updates) => async (dispatch) => {
  dispatch(updateChecklistRequest());
  try {
    const response = await api.put(`/works/${workId}/checklist`, updates);
    dispatch(updateChecklistSuccess({ 
      workId, 
      checklist: response.data.checklist 
    }));
    return response.data.checklist;
  } catch (error) {
    const errorMessage =
      error.response?.data?.error || 'Error al actualizar el checklist';
    dispatch(updateChecklistFailure(errorMessage));
    throw error;
  }
};

/**
 * Obtener estadísticas de checklists
 * GET /works/checklists/stats
 */
export const fetchChecklistStats = () => async (dispatch) => {
  dispatch(fetchChecklistStatsRequest());
  try {
    const response = await api.get('/works/checklists/stats');
    dispatch(fetchChecklistStatsSuccess(response.data.stats));
  } catch (error) {
    const errorMessage =
      error.response?.data?.error || 'Error al obtener estadísticas';
    dispatch(fetchChecklistStatsFailure(errorMessage));
  }
};
