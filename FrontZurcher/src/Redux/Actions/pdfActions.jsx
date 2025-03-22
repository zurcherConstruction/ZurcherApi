import api from '../../utils/axios';
import { createAsyncThunk } from '@reduxjs/toolkit';

export const uploadPdf = createAsyncThunk(
  'pdf/upload',
  async (file, thunkAPI) => {
    try {
      const formData = new FormData();
      formData.append('pdf', file);
      const { data } = await api.post('/pdf/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data || { message: 'Error al subir el PDF' }
      );
    }
  }
);