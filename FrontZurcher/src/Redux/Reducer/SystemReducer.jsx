import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  systemTypes: [],
  loading: false,
  error: null,
};

const systemSlice = createSlice({
  name: 'systemType',
  initialState,
  reducers: {
    fetchSystemTypesRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchSystemTypesSuccess: (state, action) => {
      state.loading = false;
      state.systemTypes = action.payload;
    },
    fetchSystemTypesFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
    createSystemTypeRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    createSystemTypeSuccess: (state, action) => {
      state.loading = false;
      state.systemTypes.push(action.payload);
    },
    createSystemTypeFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
    updateSystemTypeRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    updateSystemTypeSuccess: (state, action) => {
      state.loading = false;
      state.systemTypes = state.systemTypes.map(systemType =>
        systemType.id === action.payload.id ? action.payload : systemType
      );
    },
    updateSystemTypeFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
    deleteSystemTypeRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    deleteSystemTypeSuccess: (state, action) => {
      state.loading = false;
      state.systemTypes = state.systemTypes.filter(systemType => systemType.id !== action.payload);
    },
    deleteSystemTypeFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
  },
});

export const {
  fetchSystemTypesRequest,
  fetchSystemTypesSuccess,
  fetchSystemTypesFailure,
  createSystemTypeRequest,
  createSystemTypeSuccess,
  createSystemTypeFailure,
  updateSystemTypeRequest,
  updateSystemTypeSuccess,
  updateSystemTypeFailure,
  deleteSystemTypeRequest,
  deleteSystemTypeSuccess,
  deleteSystemTypeFailure,
} = systemSlice.actions;

export default systemSlice.reducer;