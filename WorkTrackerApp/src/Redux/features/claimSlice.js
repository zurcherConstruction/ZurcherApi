import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  claims: [],
  loading: false,
  error: null,
  lastUpdate: null,
};

const claimSlice = createSlice({
  name: 'claim',
  initialState,
  reducers: {
    fetchClaimsRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchClaimsSuccess: (state, action) => {
      state.loading = false;
      state.claims = action.payload;
      state.lastUpdate = Date.now();
      state.error = null;
    },
    fetchClaimsFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
    updateClaimStatus: (state, action) => {
      const { id, status } = action.payload;
      const index = state.claims.findIndex(c => c.id === id);
      if (index !== -1) {
        state.claims[index].status = status;
      }
    },
  },
});

export const {
  fetchClaimsRequest,
  fetchClaimsSuccess,
  fetchClaimsFailure,
  updateClaimStatus,
} = claimSlice.actions;

export default claimSlice.reducer;
