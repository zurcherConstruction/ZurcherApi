import api from '../../utils/axios';
import {
  fetchSimpleWorksRequest,
  fetchSimpleWorksSuccess,
  fetchSimpleWorksFailure,
} from '../features/simpleWorkSlice';

/**
 * Fetch SimpleWorks assigned to the authenticated staff member
 */
export const fetchAssignedSimpleWorks = () => async (dispatch) => {
  dispatch(fetchSimpleWorksRequest());
  try {
    const response = await api.get('/simple-works/assigned');
    const simpleWorks = response.data.simpleWorks || response.data || [];
    dispatch(fetchSimpleWorksSuccess(simpleWorks));
    return simpleWorks;
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message || 'Error al obtener trabajos asignados';
    dispatch(fetchSimpleWorksFailure(errorMessage));
    if (__DEV__) {
      console.error('❌ fetchAssignedSimpleWorks error:', errorMessage);
    }
  }
};

/**
 * Update SimpleWork status (e.g., mark as in_progress or completed)
 */
export const updateSimpleWorkStatus = (id, data) => async (dispatch) => {
  try {
    await api.patch(`/simple-works/${id}`, data);
    // Refetch to get updated data
    dispatch(fetchAssignedSimpleWorks());
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message || 'Error al actualizar trabajo';
    if (__DEV__) {
      console.error('❌ updateSimpleWorkStatus error:', errorMessage);
    }
    throw error;
  }
};

/**
 * Upload a completion image for a SimpleWork
 */
export const uploadSimpleWorkImage = (simpleWorkId, imageUri, type = 'completion') => async () => {
  try {
    const formData = new FormData();
    const filename = imageUri.split('/').pop();
    const match = /\.(\w+)$/.exec(filename);
    const imgType = match ? `image/${match[1]}` : 'image/jpeg';

    formData.append('image', {
      uri: imageUri,
      name: filename,
      type: imgType,
    });

    await api.post(`/simple-works/${simpleWorkId}/images?type=${type}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message || 'Error al subir imagen';
    if (__DEV__) {
      console.error('❌ uploadSimpleWorkImage error:', errorMessage);
    }
    throw error;
  }
};
