import { createSlice } from '@reduxjs/toolkit';
import { uploadPdf } from '../Actions/pdfActions';

const pdfSlice = createSlice({
  name: 'pdf',
  initialState: {
    data: null,
    loading: false,
    error: null,
  },
  reducers: {},
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
  },
});

export default pdfSlice.reducer;