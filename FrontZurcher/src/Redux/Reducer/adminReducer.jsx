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
      // Transformar los datos para manejar valores null
      state.staff = action.payload.map((staff) => ({
        id: staff.id,
        name: staff.name || 'No especificado',
        email: staff.email || 'No especificado',
        phone: staff.phone || 'No especificado',
        role: staff.role || 'No especificado',
        isActive: staff.isActive,
        lastLogin: staff.lastLogin || 'No registrado',
        lastLogout: staff.lastLogout || 'No registrado',
        createdAt: staff.createdAt,
        updatedAt: staff.updatedAt,
      }));
    },
    fetchStaffFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
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
} = adminSlice.actions;

export default adminSlice.reducer;