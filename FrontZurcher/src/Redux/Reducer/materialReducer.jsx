import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  materials: [], // Lista de materiales
  loading: false, // Estado de carga
  error: null, // Mensaje de error
};

const materialSlice = createSlice({
  name: 'material',
  initialState,
  reducers: {
    // Obtener materiales por obra
    fetchMaterialsRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchMaterialsSuccess: (state, action) => {
      state.loading = false;
      state.materials = action.payload;
    },
    fetchMaterialsFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },

    // Crear material
    createMaterialRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    createMaterialSuccess: (state, action) => {
      state.loading = false;
      state.materials.push(action.payload);
    },
    createMaterialFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },

    // Actualizar material
    updateMaterialRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    updateMaterialSuccess: (state, action) => {
      state.loading = false;
      const index = state.materials.findIndex((material) => material.id === action.payload.id);
      if (index !== -1) {
        state.materials[index] = action.payload;
      }
    },
    updateMaterialFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },

    // Limpiar errores
    clearMaterialError: (state) => {
      state.error = null;
    },
  },
});

export const {
  fetchMaterialsRequest,
  fetchMaterialsSuccess,
  fetchMaterialsFailure,
  createMaterialRequest,
  createMaterialSuccess,
  createMaterialFailure,
  updateMaterialRequest,
  updateMaterialSuccess,
  updateMaterialFailure,
  clearMaterialError,
} = materialSlice.actions;

export default materialSlice.reducer;