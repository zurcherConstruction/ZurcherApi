import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  staff: [], // Lista de staff
  loading: false, // Estado de carga
  error: null, // Mensaje de error
};

const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {
    // Obtener staff
    fetchStaffRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchStaffSuccess: (state, action) => {
      state.loading = false;
      state.staff = action.payload; // Los datos ya están transformados en la acción
    },
    fetchStaffFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload || 'Error desconocido al obtener el staff';
    },
    // Crear staff
    createStaffRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    createStaffSuccess: (state, action) => {
      state.loading = false;
      state.staff.push(action.payload);
    },
    createStaffFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },

    // Actualizar staff
    updateStaffRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    updateStaffSuccess: (state, action) => {
      state.loading = false;
      const index = state.staff.findIndex((staff) => staff.id === action.payload.id);
      if (index !== -1) {
        state.staff[index] = action.payload;
      }
    },
    updateStaffFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },

    // Desactivar staff
    deactivateStaffRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    deactivateStaffSuccess: (state, action) => {
      state.loading = false;
      const index = state.staff.findIndex((staff) => staff.id === action.payload);
      if (index !== -1) {
        state.staff[index].isActive = false;
      }
    },
    deactivateStaffFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
    deleteStaffSuccess: (state, action) => {
      state.loading = false;
      state.staff = state.staff.filter((staff) => staff.id !== action.payload); // Eliminar del estado global
    },
  },
});

export const {
  fetchStaffRequest,
  fetchStaffSuccess,
  fetchStaffFailure,
  createStaffRequest,
  createStaffSuccess,
  createStaffFailure,
  updateStaffRequest,
  updateStaffSuccess,
  updateStaffFailure,
  deactivateStaffRequest,
  deactivateStaffSuccess,
  deactivateStaffFailure,
  deleteStaffSuccess,
} = adminSlice.actions;

export default adminSlice.reducer;