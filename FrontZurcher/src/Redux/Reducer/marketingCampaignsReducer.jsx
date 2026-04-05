import { createSlice } from '@reduxjs/toolkit';
import {
  fetchUniqueRecipients,
  sendCampaign,
  fetchCampaigns,
  fetchCampaignById
} from '../Actions/marketingCampaignsActions';

const initialState = {
  campaigns: [],
  currentCampaign: null,
  recipients: [],
  recipientsCount: 0,
  loading: false,
  sendingCampaign: false,
  error: null,
  total: 0,
  page: 1,
  pageSize: 20,
  totalPages: 1
};

const marketingCampaignsSlice = createSlice({
  name: 'marketingCampaigns',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentCampaign: (state) => {
      state.currentCampaign = null;
    }
  },
  extraReducers: (builder) => {
    // ========== FETCH UNIQUE RECIPIENTS ==========
    builder
      .addCase(fetchUniqueRecipients.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUniqueRecipients.fulfilled, (state, action) => {
        state.loading = false;
        state.recipients = action.payload.recipients;
        state.recipientsCount = action.payload.count;
      })
      .addCase(fetchUniqueRecipients.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.error || 'Error al obtener destinatarios';
      });

    // ========== SEND CAMPAIGN ==========
    builder
      .addCase(sendCampaign.pending, (state) => {
        state.sendingCampaign = true;
        state.error = null;
      })
      .addCase(sendCampaign.fulfilled, (state, action) => {
        state.sendingCampaign = false;
        // La campaña se agregará cuando se recargue la lista
      })
      .addCase(sendCampaign.rejected, (state, action) => {
        state.sendingCampaign = false;
        state.error = action.payload?.error || 'Error al enviar campaña';
      });

    // ========== FETCH CAMPAIGNS ==========
    builder
      .addCase(fetchCampaigns.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCampaigns.fulfilled, (state, action) => {
        state.loading = false;
        state.campaigns = action.payload.campaigns;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.pageSize = action.payload.pageSize;
        state.totalPages = action.payload.totalPages;
      })
      .addCase(fetchCampaigns.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.error || 'Error al obtener campañas';
      });

    // ========== FETCH CAMPAIGN BY ID ==========
    builder
      .addCase(fetchCampaignById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCampaignById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentCampaign = action.payload.campaign;
      })
      .addCase(fetchCampaignById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.error || 'Error al obtener campaña';
      });
  }
});

export const { clearError, clearCurrentCampaign } = marketingCampaignsSlice.actions;
export default marketingCampaignsSlice.reducer;
