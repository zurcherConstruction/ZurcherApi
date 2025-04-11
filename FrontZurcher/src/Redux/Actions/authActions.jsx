import api from '../../utils/axios';
import { loginRequest, loginSuccess, loginFailure, logout,forgotPasswordRequest,
  forgotPasswordSuccess,
  forgotPasswordFailure,
  resetPasswordRequest,
  resetPasswordSuccess,
  resetPasswordFailure,
  changePasswordRequest,
  changePasswordSuccess,
  changePasswordFailure, } from '../Reducer/authReducer';

// Acción para iniciar sesión
export const login = (email, password) => async (dispatch) => {
  dispatch(loginRequest());
  try {
    // Verificar los datos enviados al backend
    console.log('Datos enviados al backend:', { email, password });

    const response = await api.post('/auth/login', { email, password });

    // Verificar la respuesta del backend
    console.log('Respuesta del backend:', response.data);

    const { token, staff } = response.data.data;

    // Guardar el token y el staff en localStorage
    localStorage.setItem('token', token);
    localStorage.setItem('staff', JSON.stringify(staff));

    // Verificar los datos enviados al reducer
    console.log('Datos enviados al reducer:', { token, staff });

    dispatch(loginSuccess({ token, staff }));
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || // Mensaje del backend
      error.message || // Mensaje del cliente (por ejemplo, error de red)
      'Error al iniciar sesión'; // Mensaje por defecto

    console.error('Error en login:', errorMessage); // Registro en consola para depuración
    dispatch(loginFailure(errorMessage));
  }
};

// Acción para cerrar sesión
export const logoutStaff = () => (dispatch) => {
  try {
    // Eliminar token y usuario de localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('staff');
    dispatch(logout());
  } catch (error) {
    console.error('Error al cerrar sesión:', error); // Registro en consola
  }
};

// Acción para restaurar sesión
export const restoreSession = () => (dispatch) => {
  return new Promise((resolve) => {
    try {
      const token = localStorage.getItem('token');
      const staff = JSON.parse(localStorage.getItem('staff'));

      if (token && staff) {
        dispatch(loginSuccess({ token, staff }));
      } else {
        dispatch(logout());
      }
    } catch (error) {
      console.error('Error al restaurar la sesión:', error);
      dispatch(logout());
    } finally {
      resolve();
    }
  });
};

// Acción para registrar un nuevo usuario
export const register = (userData) => async (dispatch) => {
  dispatch(loginRequest()); // Reutilizamos loginRequest para manejar el estado de carga
  try {
    console.log('Datos enviados al backend para registro:', userData); // Depuración
    const response = await api.post('/auth/register', userData);
    const { token, user } = response.data.data;

    // Guardar el token en localStorage
    localStorage.setItem('token', token);
    localStorage.setItem('staff', JSON.stringify(user));

    dispatch(loginSuccess({ token, staff: user })); // Reutilizamos loginSuccess
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || // Mensaje del backend
      error.message || // Mensaje del cliente (por ejemplo, error de red)
      'Error al registrarse'; // Mensaje por defecto
    console.error('Error en register:', errorMessage); // Registro en consola para depuración
    dispatch(loginFailure(errorMessage));
  }
};
// Forgot Password
export const forgotPassword = (email) => async (dispatch) => {
  dispatch(forgotPasswordRequest());
  try {
    const response = await api.post('/auth/forgot-password', { email });
    dispatch(forgotPasswordSuccess(response.data.message));
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al solicitar restablecimiento de contraseña';
    dispatch(forgotPasswordFailure(errorMessage));
  }
};

// Reset Password
export const resetPassword = (token, password) => async (dispatch) => {
  dispatch(resetPasswordRequest());
  try {
    const response = await api.post(`/auth/reset-password/${token}`, { password });
    dispatch(resetPasswordSuccess(response.data.message));
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al restablecer la contraseña';
    dispatch(resetPasswordFailure(errorMessage));
  }
};

// Change Password
export const changePassword = (currentPassword, newPassword) => async (dispatch) => {
  dispatch(changePasswordRequest());
  try {
    const response = await api.put('/auth/change-password', { currentPassword, newPassword });
    dispatch(changePasswordSuccess(response.data.message));
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al cambiar la contraseña';
    dispatch(changePasswordFailure(errorMessage));
  }
};