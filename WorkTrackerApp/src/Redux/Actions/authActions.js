import api from '../../utils/axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loginRequest, loginSuccess, loginFailure, logout } from '../features/authSlice';

// Acción para iniciar sesión
export const login = (email, password) => async (dispatch) => {
  dispatch(loginRequest());
  try {
    const response = await api.post('/auth/login', { email, password });
    const { token, staff } = response.data.data;

    // Guardar el token y el staff en AsyncStorage
    await AsyncStorage.setItem('token', token);
    await AsyncStorage.setItem('staff', JSON.stringify(staff));

    dispatch(loginSuccess({ token, staff }));
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || error.message || 'Error al iniciar sesión';
    dispatch(loginFailure(errorMessage));
  }
};

// Acción para cerrar sesión
export const logoutUser = () => async (dispatch) => {
  try {
    // Eliminar token y usuario de AsyncStorage
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('staff');
    dispatch(logout());
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
  }
};

// Acción para restaurar sesión
export const restoreSession = () => async (dispatch) => {
  try {
    const token = await AsyncStorage.getItem('token');
    const staff = JSON.parse(await AsyncStorage.getItem('staff'));

    if (token && staff) {
      dispatch(loginSuccess({ token, staff }));
    }
  } catch (error) {
    console.error('Error al restaurar la sesión:', error);
  }
};