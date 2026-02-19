import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  simpleWorks: [],
  loading: false,
  error: null,
  lastUpdate: null,
};

const simpleWorkSlice = createSlice({
  name: 'simpleWork',
  initialState,
  reducers: {
    fetchSimpleWorksRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchSimpleWorksSuccess: (state, action) => {
      state.loading = false;
      state.simpleWorks = action.payload;
      state.lastUpdate = Date.now();
      state.error = null;
    },
    fetchSimpleWorksFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
    updateSimpleWorkStatus: (state, action) => {
      const { id, status } = action.payload;
      const index = state.simpleWorks.findIndex(sw => sw.id === id);
      if (index !== -1) {
        state.simpleWorks[index].status = status;
      }
    },
  },
});

export const {
  fetchSimpleWorksRequest,
  fetchSimpleWorksSuccess,
  fetchSimpleWorksFailure,
  updateSimpleWorkStatus,
} = simpleWorkSlice.actions;

export default simpleWorkSlice.reducer;
