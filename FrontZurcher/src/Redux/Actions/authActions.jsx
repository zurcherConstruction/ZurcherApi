import api from '../../utils/axios';
import { loginRequest, loginSuccess, loginFailure, logout } from '../Reducer/authReducer';

// Rename loginUser to login to match the import
export const login = (credentials) => async (dispatch) => {
  try {
    dispatch(loginRequest());
    const { data } = await api.post('/auth/login', credentials);
    dispatch(loginSuccess(data));
    localStorage.setItem('token', data.token);
    return data;
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error en el login';
    dispatch(loginFailure(errorMessage));
    throw error;
  }
};

export const logoutUser = () => (dispatch) => {
  dispatch(logout());
};

// Export the actions
export { loginRequest, loginSuccess, loginFailure, logout };