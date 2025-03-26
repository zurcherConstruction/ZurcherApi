import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  staff: null,
  token: localStorage.getItem('token') || null,
  isAuthenticated: !!localStorage.getItem('token'), // Autenticado si hay un token
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginRequest: (state) => {
      state.loading = true;
      state.error = null; // Limpiar errores previos
    },
    loginSuccess: (state, action) => {
      state.loading = false;
      state.staff = action.payload.staff; // Aquí se almacena el objeto staff
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.error = null;
      localStorage.setItem('token', action.payload.token); // Almacena el token en localStorage
    },
    loginFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
      state.isAuthenticated = false;
    },
    logout: (state) => {
      state.staff = null;
      state.token = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;
      localStorage.removeItem('token'); // Eliminar token del almacenamiento local
    },
    clearError: (state) => {
      state.error = null; // Acción para limpiar errores
    },
  },
});

export const { loginRequest, loginSuccess, loginFailure, logout, clearError } = authSlice.actions;
export default authSlice.reducer;