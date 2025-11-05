import { createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/axios'; // Tu instancia configurada de Axios

// --- Fetch / Create ---
export const fetchFinalInvoiceByWorkId = createAsyncThunk(
  'finalInvoice/fetchByWorkId',
  async (workId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/final-invoice/work/${workId}/final-invoice`);
      return response.data; // Devuelve la factura encontrada (o podría ser un 404 manejado en el slice)
    } catch (error) {
      console.error("Error fetching final invoice:", error.response?.data || error.message);
      // Pasar status y message para manejo específico (ej: 404)
      return rejectWithValue({
        message: error.response?.data?.message || error.message,
        status: error.response?.status
      });
    }
  }
);

export const createFinalInvoice = createAsyncThunk(
  'finalInvoice/create',
  async (workId, { rejectWithValue }) => {
    try {
      // El backend crea la factura inicial basada en el Work/Budget
      const response = await api.post(`/final-invoice/work/${workId}/final-invoice`);
      return response.data; // Devuelve la factura recién creada
    } catch (error) {
      console.error("Error creating final invoice:", error.response?.data || error.message);
      return rejectWithValue({ message: error.response?.data?.message || error.message });
    }
  }
);

// --- Extra Items ---
export const addExtraItemToInvoice = createAsyncThunk(
  'finalInvoice/addExtraItem',
  async ({ finalInvoiceId, itemData }, { rejectWithValue }) => {
    try {
      // itemData = { description, quantity, unitPrice }
      const response = await api.post(`/final-invoice/${finalInvoiceId}/items`, itemData);
      // El backend DEBERÍA devolver la FinalInvoice completa actualizada
      return response.data;
    } catch (error) {
      console.error("Error adding extra item:", error.response?.data || error.message);
      return rejectWithValue({ message: error.response?.data?.message || error.message });
    }
  }
);

export const updateExtraItem = createAsyncThunk(
  'finalInvoice/updateExtraItem',
  async ({ itemId, itemData }, { rejectWithValue }) => {
    try {
      // itemData = { description, quantity, unitPrice }
      const response = await api.put(`/final-invoice/items/${itemId}`, itemData);
      // El backend DEBERÍA devolver la FinalInvoice completa actualizada
      return response.data;
    } catch (error) {
      console.error("Error updating extra item:", error.response?.data || error.message);
      return rejectWithValue({ message: error.response?.data?.message || error.message });
    }
  }
);

export const removeExtraItem = createAsyncThunk(
  'finalInvoice/removeExtraItem',
  async (itemId, { rejectWithValue }) => {
    try {
      const response = await api.delete(`/final-invoice/items/${itemId}`);
      // El backend DEBERÍA devolver la FinalInvoice completa actualizada
      return response.data;
    } catch (error) {
      console.error("Error removing extra item:", error.response?.data || error.message);
      return rejectWithValue({ message: error.response?.data?.message || error.message });
    }
  }
);

// --- Status Update ---
export const updateFinalInvoiceStatus = createAsyncThunk(
  'finalInvoice/updateStatus',
  async ({ finalInvoiceId, statusData }, { rejectWithValue }) => {
    try {
      // statusData = { status, paymentDate?, paymentNotes? }
      const response = await api.patch(`/final-invoice/${finalInvoiceId}/status`, statusData);
      // El backend DEBERÍA devolver la FinalInvoice completa actualizada
      return response.data;
    } catch (error) {
      console.error("Error updating final invoice status:", error.response?.data || error.message);
      return rejectWithValue({ message: error.response?.data?.message || error.message });
    }
  }
);

// 🆕 --- Actualizar Descuento ---
export const updateFinalInvoiceDiscount = createAsyncThunk(
  'finalInvoice/updateDiscount',
  async ({ finalInvoiceId, discount, discountReason }, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/final-invoice/${finalInvoiceId}/discount`, { 
        discount,
        discountReason 
      });
      // El backend devuelve la FinalInvoice completa actualizada
      return response.data;
    } catch (error) {
      console.error("Error updating final invoice discount:", error.response?.data || error.message);
      return rejectWithValue({ message: error.response?.data?.message || error.message });
    }
  }
);

// --- PDF (Ejemplo si necesitas acción específica) ---

export const generateFinalInvoicePdf = createAsyncThunk(
  'finalInvoice/generatePdf',
  async (finalInvoiceId, { rejectWithValue }) => {
    try {
      // Esta ruta podría generar el PDF si no existe y devolver la URL o el archivo
      const response = await api.get(`/final-invoice/${finalInvoiceId}/pdf`);
      // Asume que devuelve { pdfUrl: '...', updatedInvoice: {...} } o similar
      return response.data;
    } catch (error) {
      console.error("Error generating/fetching final invoice PDF:", error.response?.data || error.message);
      return rejectWithValue({ message: error.response?.data?.message || error.message });
    }
  }
);
// Acción para enviar la factura final por correo electrónico
export const emailFinalInvoice = createAsyncThunk(
    'finalInvoice/emailInvoice',
    async ({ finalInvoiceId, recipientEmail }, { rejectWithValue }) => {
      try {
        // recipientEmail es opcional, el backend usará el del cliente si no se provee
        const payload = recipientEmail ? { recipientEmail } : {};
        const response = await api.post(`/final-invoice/${finalInvoiceId}/email`, payload);
        // El backend devuelve { message }
        // Devolvemos el mensaje para mostrar una notificación
        return response.data;
      } catch (error) {
        console.error("Error emailing final invoice:", error.response?.data || error.message);
        return rejectWithValue({ message: error.response?.data?.message || error.message });
      }
    }
  );
