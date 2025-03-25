import api from '../../utils/axios';
import { createAsyncThunk } from '@reduxjs/toolkit';

export const uploadPdf = createAsyncThunk(
  'pdf/upload',
  async (file, thunkAPI) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      // Enviar el archivo al backend para procesarlo
      const { data } = await api.post('/pdf/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      console.log('Datos extraídos del PDF:', data); // Log para depuración
      return data; // Devolver los datos extraídos al frontend
    } catch (error) {
      console.error('Error al subir el PDF:', error); // Log para depuración
      return thunkAPI.rejectWithValue(
        error.response?.data || { message: 'Error al subir el PDF' }
      );
    }
  }
);