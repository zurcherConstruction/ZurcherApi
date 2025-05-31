import { createSlice } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';

const initialState = {
  staff: null,
  token: null,
  isAuthenticated: false,
   isLoading: true,
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    loginSuccess: (state, action) => {
      state.loading = false;
      state.isLoading = false;
      state.isAuthenticated = true;
      state.staff = action.payload.staff;
      state.token = action.payload.token;
      state.error = null;
    },
    loginFailure: (state, action) => {
      state.loading = false;
      state.isLoading = false;
      state.error = action.payload;
      state.isAuthenticated = false;
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.staff = null;
      state.token = null;
      state.loading = false;
      state.isLoading = false;
      state.error = null;
    },
     sessionCheckComplete: (state) => {
      state.isLoading = false;
    },
  },
});

export const { loginRequest, loginSuccess, loginFailure, logout, sessionCheckComplete  } = authSlice.actions;
export default authSlice.reducer;