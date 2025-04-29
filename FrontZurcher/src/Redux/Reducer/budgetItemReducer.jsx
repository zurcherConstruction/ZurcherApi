import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  items: [], // Array para almacenar los budget items
  loading: false,
  error: null,
  // Podrías añadir estados específicos si necesitas, como 'currentItem'
};

const budgetItemSlice = createSlice({
  name: 'budgetItems',
  initialState,
  reducers: {
    // Fetch Items
    fetchBudgetItemsRequest(state) {
      state.loading = true;
      state.error = null;
    },
    fetchBudgetItemsSuccess(state, action) {
      state.loading = false;
      state.items = action.payload; // Reemplaza la lista con la obtenida
    },
    fetchBudgetItemsFailure(state, action) {
      state.loading = false;
      state.error = action.payload;
    },
    // Create Item
    createBudgetItemRequest(state) {
      state.loading = true;
      state.error = null;
    },
    createBudgetItemSuccess(state, action) {
      state.loading = false;
      state.items.push(action.payload); // Añade el nuevo item a la lista
    },
    createBudgetItemFailure(state, action) {
      state.loading = false;
      state.error = action.payload;
    },
    // Update Item
    updateBudgetItemRequest(state) {
      state.loading = true;
      state.error = null;
    },
    updateBudgetItemSuccess(state, action) {
      state.loading = false;
      // Encuentra el índice del item actualizado y reemplázalo
      const index = state.items.findIndex(item => item.id === action.payload.id);
      if (index !== -1) {
        state.items[index] = action.payload;
      }
    },
    updateBudgetItemFailure(state, action) {
      state.loading = false;
      state.error = action.payload;
    },
    // Delete Item (Soft Delete en backend, removemos del estado activo)
    deleteBudgetItemRequest(state) {
      state.loading = true;
      state.error = null;
    },
    deleteBudgetItemSuccess(state, action) {
      state.loading = false;
      // Filtra el item eliminado (por ID) de la lista actual
      // Nota: Si fetchBudgetItems solo trae activos, esto funciona bien.
      // Si fetchBudgetItems puede traer inactivos, necesitarías marcarlo como inactivo aquí también.
      state.items = state.items.filter(item => item.id !== action.payload);
    },
    deleteBudgetItemFailure(state, action) {
      state.loading = false;
      state.error = action.payload;
    },
    // Puedes añadir un reducer para limpiar el estado si es necesario
    // clearBudgetItems(state) {
    //   state.items = [];
    //   state.loading = false;
    //   state.error = null;
    // }
  },
});

// Exporta las actions generadas por createSlice
export const {
  fetchBudgetItemsRequest,
  fetchBudgetItemsSuccess,
  fetchBudgetItemsFailure,
  createBudgetItemRequest,
  createBudgetItemSuccess,
  createBudgetItemFailure,
  updateBudgetItemRequest,
  updateBudgetItemSuccess,
  updateBudgetItemFailure,
  deleteBudgetItemRequest,
  deleteBudgetItemSuccess,
  deleteBudgetItemFailure,
  // clearBudgetItems
} = budgetItemSlice.actions;

// Exporta el reducer
export default budgetItemSlice.reducer;