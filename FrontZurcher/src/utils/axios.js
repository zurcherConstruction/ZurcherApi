import axios from 'axios';
import { store } from '../Redux/Store/Store';
import { logout } from '../Redux/Reducer/authReducer';

const api = axios.create({
  baseURL: 'http://localhost:3001/', // Change to your API base URL
  timeout: 180000, // ⬆️ Aumentado a 3 minutos (temporal hasta optimizaciones)
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // ⚠️ NO usar setLoading global - causa re-renders infinitos
    // Cada componente debe manejar su propio loading state
    
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

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

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      store.dispatch(logout());
    }
    return Promise.reject(error);
  }
);

export default api;