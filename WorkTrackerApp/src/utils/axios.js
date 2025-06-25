import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { store } from '../Redux/store';
import { logout } from '../Redux/features/authSlice';

// Crear instancia de Axios con la URL base
const api = axios.create({

  baseURL: 'https://zurcherapi.up.railway.app/', // Reemplaza el puerto si tu backend usa otro
  timeout: 20000,
});

// Interceptor para requests
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token'); // Obtener el token desde AsyncStorage
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // No establecer Content-Type si es FormData
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    } else {
      config.headers['Content-Type'] = 'application/json';
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para responses
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Si el token es inválido o ha expirado, cerrar sesión
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('staff');
      store.dispatch(logout());
    }
    return Promise.reject(error);
  }
);

export default api;