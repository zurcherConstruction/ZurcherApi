import { createSlice } from '@reduxjs/toolkit';
import { uploadPdf } from '../Actions/pdfActions';

const initialState = {
  data: null,
  loading: false,
  error: null,
};

const pdfSlice = createSlice({
  name: 'pdf',
  initialState,
  reducers: {
    resetPdf: (state) => {
      state.data = null;
      state.loading = false;
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(uploadPdf.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(uploadPdf.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(uploadPdf.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const { resetPdf } = pdfSlice.actions;
export default pdfSlice.reducer;