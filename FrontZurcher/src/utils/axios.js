import axios from 'axios';
import { store } from '../Redux/Store/Store';
import { logout } from '../Redux/Reducer/authReducer';
import { setLoading } from '../Redux/Reducer/uiReducer'; // You'll need to create this

const api = axios.create({


  baseURL: 'http://localhost:3001/', // Change to your API base URL
  timeout: 80000,


});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    store.dispatch(setLoading(true)); // Start loading
    
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
    store.dispatch(setLoading(false)); // Stop loading on request error
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    store.dispatch(setLoading(false)); // Stop loading on success
    return response;
  },
  (error) => {
    store.dispatch(setLoading(false)); // Stop loading on response error
    if (error.response?.status === 401) {
      store.dispatch(logout());
    }
    return Promise.reject(error);
  }
);

export default api;