import api from '../../utils/axios';

// Action Types
export const CLAIM_REQUEST = 'CLAIM_REQUEST';
export const CLAIM_FAILURE = 'CLAIM_FAILURE';
export const FETCH_CLAIMS_SUCCESS = 'FETCH_CLAIMS_SUCCESS';
export const FETCH_CLAIM_SUCCESS = 'FETCH_CLAIM_SUCCESS';
export const CREATE_CLAIM_SUCCESS = 'CREATE_CLAIM_SUCCESS';
export const UPDATE_CLAIM_SUCCESS = 'UPDATE_CLAIM_SUCCESS';
export const DELETE_CLAIM_SUCCESS = 'DELETE_CLAIM_SUCCESS';
export const FETCH_CLAIM_ADDRESSES_SUCCESS = 'FETCH_CLAIM_ADDRESSES_SUCCESS';

const handleError = (error, fallback) => {
  return error.response?.data?.message || error.message || fallback;
};

export const fetchClaims = (params = {}) => async (dispatch) => {
  dispatch({ type: CLAIM_REQUEST });
  try {
    const queryString = new URLSearchParams(params).toString();
    const response = await api.get(`/claims?${queryString}`);
    dispatch({ type: FETCH_CLAIMS_SUCCESS, payload: response.data });
    return response.data;
  } catch (error) {
    dispatch({ type: CLAIM_FAILURE, payload: handleError(error, 'Error obteniendo reclamos') });
  }
};

export const fetchClaimById = (id) => async (dispatch) => {
  dispatch({ type: CLAIM_REQUEST });
  try {
    const response = await api.get(`/claims/${id}`);
    dispatch({ type: FETCH_CLAIM_SUCCESS, payload: response.data.data });
    return response.data.data;
  } catch (error) {
    dispatch({ type: CLAIM_FAILURE, payload: handleError(error, 'Error obteniendo reclamo') });
  }
};

export const createClaim = (claimData) => async (dispatch) => {
  dispatch({ type: CLAIM_REQUEST });
  try {
    const response = await api.post('/claims', claimData);
    dispatch({ type: CREATE_CLAIM_SUCCESS, payload: response.data.data });
    return response.data.data;
  } catch (error) {
    const msg = handleError(error, 'Error creando reclamo');
    dispatch({ type: CLAIM_FAILURE, payload: msg });
    throw new Error(msg);
  }
};

export const updateClaim = (id, updates) => async (dispatch) => {
  dispatch({ type: CLAIM_REQUEST });
  try {
    const response = await api.put(`/claims/${id}`, updates);
    dispatch({ type: UPDATE_CLAIM_SUCCESS, payload: response.data.data });
    return response.data.data;
  } catch (error) {
    const msg = handleError(error, 'Error actualizando reclamo');
    dispatch({ type: CLAIM_FAILURE, payload: msg });
    throw new Error(msg);
  }
};

export const deleteClaim = (id) => async (dispatch) => {
  dispatch({ type: CLAIM_REQUEST });
  try {
    await api.delete(`/claims/${id}`);
    dispatch({ type: DELETE_CLAIM_SUCCESS, payload: id });
  } catch (error) {
    dispatch({ type: CLAIM_FAILURE, payload: handleError(error, 'Error eliminando reclamo') });
  }
};

export const uploadClaimImage = (claimId, file, type = 'claim') => async (dispatch) => {
  try {
    const formData = new FormData();
    formData.append('image', file);
    const response = await api.post(`/claims/${claimId}/images?type=${type}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    // Refrescar lista completa para que el modal y la tabla se actualicen
    dispatch(fetchClaims());
    return response.data.data;
  } catch (error) {
    throw new Error(handleError(error, 'Error subiendo imagen'));
  }
};

export const deleteClaimImage = (claimId, imageId, type = 'claim') => async (dispatch) => {
  try {
    await api.delete(`/claims/${claimId}/images/${imageId}?type=${type}`);
    // Refrescar lista completa
    dispatch(fetchClaims());
  } catch (error) {
    throw new Error(handleError(error, 'Error eliminando imagen'));
  }
};

export const fetchClaimAddresses = (search = '') => async (dispatch) => {
  try {
    const response = await api.get(`/claims/addresses?search=${search}`);
    dispatch({ type: FETCH_CLAIM_ADDRESSES_SUCCESS, payload: response.data.data });
    return response.data.data;
  } catch (error) {
    console.error('Error fetching addresses:', error);
    return [];
  }
};
