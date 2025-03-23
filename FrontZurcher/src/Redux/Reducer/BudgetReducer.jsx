import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  budgets: [],
  loading: false,
  error: null,
};

const budgetSlice = createSlice({
  name: 'budget',
  initialState,
  reducers: {
    fetchBudgetsRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchBudgetsSuccess: (state, action) => {
      state.loading = false;
      state.budgets = action.payload;
    },
    fetchBudgetsFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
    clearBudgetsError: (state) => {
      state.error = null;
    },
  },
});

export const {
  fetchBudgetsRequest,
  fetchBudgetsSuccess,
  fetchBudgetsFailure,
  clearBudgetsError,
} = budgetSlice.actions;

export default budgetSlice.reducer;