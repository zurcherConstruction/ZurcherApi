import api from '../../utils/axios';
import { createAsyncThunk } from '@reduxjs/toolkit';

// 📧 Obtener destinatarios únicos
export const fetchUniqueRecipients = createAsyncThunk(
  'marketingCampaigns/fetchUniqueRecipients',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/company-emails/unique-recipients');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { error: 'Error al obtener destinatarios' });
    }
  }
);

// 📤 Enviar campaña de email masivo
export const sendCampaign = createAsyncThunk(
  'marketingCampaigns/sendCampaign',
  async (campaignData, { rejectWithValue }) => {
    try {
      const response = await api.post('/company-emails/send-campaign', campaignData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { error: 'Error al enviar campaña' });
    }
  }
);

// 📋 Obtener lista de campañas con filtros y paginación
export const fetchCampaigns = createAsyncThunk(
  'marketingCampaigns/fetchCampaigns',
  async (params = {}, { rejectWithValue }) => {
    try {
      const {
        page = 1,
        pageSize = 20,
        status = null,
        campaignType = null
      } = params;

      const queryParams = new URLSearchParams();
      queryParams.append('page', page);
      queryParams.append('pageSize', pageSize);
      if (status) queryParams.append('status', status);
      if (campaignType) queryParams.append('campaignType', campaignType);

      const response = await api.get(`/company-emails/campaigns?${queryParams.toString()}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { error: 'Error al obtener campañas' });
    }
  }
);

// 🔍 Obtener detalles de una campaña específica
export const fetchCampaignById = createAsyncThunk(
  'marketingCampaigns/fetchCampaignById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`/company-emails/campaigns/${id}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { error: 'Error al obtener campaña' });
    }
  }
);
