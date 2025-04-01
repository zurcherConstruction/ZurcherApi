import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  staff: null,
  token: localStorage.getItem('token') || null,
  isAuthenticated: !!localStorage.getItem('token'), // Autenticado si hay un token
  loading: false,
  error: null,
  successMessage: null,
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
    clearSuccessMessage: (state) => {
      state.successMessage = null; // Acción para limpiar mensajes de éxito
    },

    // Forgot Password
    forgotPasswordRequest: (state) => {
      state.loading = true;
      state.error = null;
      state.successMessage = null;
    },
    forgotPasswordSuccess: (state, action) => {
      state.loading = false;
      state.successMessage = action.payload; // Mensaje de éxito del backend
    },
    forgotPasswordFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },

    // Reset Password
    resetPasswordRequest: (state) => {
      state.loading = true;
      state.error = null;
      state.successMessage = null;
    },
    resetPasswordSuccess: (state, action) => {
      state.loading = false;
      state.successMessage = action.payload; // Mensaje de éxito del backend
    },
    resetPasswordFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },

    // Change Password
    changePasswordRequest: (state) => {
      state.loading = true;
      state.error = null;
      state.successMessage = null;
    },
    changePasswordSuccess: (state, action) => {
      state.loading = false;
      state.successMessage = action.payload; // Mensaje de éxito del backend
    },
    changePasswordFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
  },
});

export const { loginRequest, loginSuccess, loginFailure, logout, clearError, clearSuccessMessage,
  forgotPasswordRequest,
  forgotPasswordSuccess,
  forgotPasswordFailure,
  resetPasswordRequest,
  resetPasswordSuccess,
  resetPasswordFailure,
  changePasswordRequest,
  changePasswordSuccess,
  changePasswordFailure, } = authSlice.actions;
export default authSlice.reducer;