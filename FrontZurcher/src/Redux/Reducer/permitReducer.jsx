import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  permits: [], // Lista de permisos
  selectedPermit: null, // Permiso seleccionado (por ID)
  contacts: [], // Lista de contactos asociados a un permiso
  loading: false, // Estado de carga
  error: null, // Mensaje de error
};

const permitSlice = createSlice({
  name: 'permit',
  initialState,
  reducers: {
    // Obtener todos los permisos
    fetchPermitsRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchPermitsSuccess: (state, action) => {
      state.loading = false;
      state.permits = action.payload;
    },
    fetchPermitsFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },

    // Obtener un permiso por ID
    fetchPermitByIdRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchPermitByIdSuccess: (state, action) => {
      state.loading = false;
      state.selectedPermit = action.payload;
    },
    fetchPermitByIdFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },

    // Crear un permiso
    createPermitRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    createPermitSuccess: (state, action) => {
      state.loading = false;
      state.permits.push(action.payload);
    },
    createPermitFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },

    // Actualizar un permiso
    updatePermitRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    updatePermitSuccess: (state, action) => {
      state.loading = false;
      const index = state.permits.findIndex((permit) => permit.id === action.payload.id);
      if (index !== -1) {
        state.permits[index] = action.payload;
      }
    },
    updatePermitFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },

    // Obtener contactos de un permiso
    fetchContactsRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchContactsSuccess: (state, action) => {
      state.loading = false;
      state.contacts = action.payload;
    },
    fetchContactsFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },

    // Limpiar errores
    clearPermitError: (state) => {
      state.error = null;
    },
  },
});

export const {
  fetchPermitsRequest,
  fetchPermitsSuccess,
  fetchPermitsFailure,
  fetchPermitByIdRequest,
  fetchPermitByIdSuccess,
  fetchPermitByIdFailure,
  createPermitRequest,
  createPermitSuccess,
  createPermitFailure,
  updatePermitRequest,
  updatePermitSuccess,
  updatePermitFailure,
  fetchContactsRequest,
  fetchContactsSuccess,
  fetchContactsFailure,
  clearPermitError,
} = permitSlice.actions;

export default permitSlice.reducer;