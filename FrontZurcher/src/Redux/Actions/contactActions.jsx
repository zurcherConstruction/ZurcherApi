import api from '../../utils/axios';

// Action Types
export const CONTACT_REQUEST = 'CONTACT_REQUEST';
export const CONTACT_SUCCESS = 'CONTACT_SUCCESS';
export const CONTACT_FAILURE = 'CONTACT_FAILURE';

// Action Creators
export const contactRequest = () => ({ type: CONTACT_REQUEST });
export const contactSuccess = (data) => ({ type: CONTACT_SUCCESS, payload: data });
export const contactFailure = (error) => ({ type: CONTACT_FAILURE, payload: error });

// Thunk Action
export const sendContact = (formData) => async (dispatch) => {
  dispatch(contactRequest());
  try {
    const response = await api.post('/contact', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    dispatch(contactSuccess(response.data));
    return response.data;
  } catch (error) {
    const errorMessage =
      error.response?.data?.message ||
      error.message ||
      'Error sending contact request';
    dispatch(contactFailure(errorMessage));
    throw error;
  }
};
