import { createSlice } from '@reduxjs/toolkit';
import {
  fetchFinalInvoiceByWorkId,
  createFinalInvoice,
  addExtraItemToInvoice,
  updateExtraItem,
  removeExtraItem,
  updateFinalInvoiceStatus,
  updateFinalInvoiceDiscount, // 🆕
  generateFinalInvoicePdf,
  emailFinalInvoice, // (Si creas una acción para esto)
} from '../Actions/finalInvoiceActions'; // Crearemos este archivo a continuación

const initialState = {
  currentInvoice: null, // Contendrá el objeto FinalInvoice con sus extraItems
  loading: false,
  error: null,
  pdfUrl: null, // Para almacenar la URL del PDF generado/descargado
  loadingPdf: false,
  errorPdf: null,
  loadingEmail: false, // Específico para envío de email
  emailSuccessMessage: null, // Mensaje de éxito para email
  errorEmail: null, // 
};

const finalInvoiceReducer = createSlice({
  name: 'finalInvoice',
  initialState,
  reducers: {
    // Reducers síncronos si necesitas (ej: limpiar estado)
    clearFinalInvoiceState: (state) => {
      state.currentInvoice = null;
      state.loading = false;
      state.error = null;
      state.pdfUrl = null;
      state.loadingPdf = false;
      state.errorPdf = null;
      state.loadingEmail = false;
      state.emailSuccessMessage = null;
      state.errorEmail = null;
    },
    clearEmailMessage: (state) => {
        state.emailSuccessMessage = null;
        state.errorEmail = null;
    },
    // Puedes añadir reducers para manejar la actualización local del estado
    // si no quieres depender siempre de la respuesta completa del backend
    // Por ejemplo:
    // _addExtraItemLocally: (state, action) => { ... }
  },
  extraReducers: (builder) => {
    builder
      // --- Fetch/Create Invoice ---
      .addCase(fetchFinalInvoiceByWorkId.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.currentInvoice = null; // Limpiar al empezar a buscar
      })
      .addCase(fetchFinalInvoiceByWorkId.fulfilled, (state, action) => {
        state.loading = false;
        state.currentInvoice = action.payload; // La API devuelve la factura o null/error
      })
      .addCase(fetchFinalInvoiceByWorkId.rejected, (state, action) => {
        state.loading = false;
        // Si el error es 404 (no encontrada), no lo marcamos como error crítico
        if (action.payload?.status === 404) {
          state.error = null; // O un mensaje específico 'No encontrada'
          state.currentInvoice = null;
        } else {
          state.error = action.payload?.message || 'Error al buscar la factura final.';
        }
      })
      .addCase(createFinalInvoice.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createFinalInvoice.fulfilled, (state, action) => {
        state.loading = false;
        console.log('✅ [Redux] Final Invoice creada exitosamente:', action.payload);
        state.currentInvoice = action.payload; // La API devuelve la factura creada
      })
      .addCase(createFinalInvoice.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Error al crear la factura final.';
      })

      // --- Modify Extra Items ---
      // Usamos la respuesta del backend para actualizar el estado completo
      .addCase(addExtraItemToInvoice.pending, (state) => {
        state.loading = true; // O un loading específico para items
        state.error = null;
      })
      .addCase(addExtraItemToInvoice.fulfilled, (state, action) => {
        state.loading = false;
        // Asume que el backend devuelve la FinalInvoice COMPLETA actualizada
        state.currentInvoice = action.payload.finalInvoice;
      })
      .addCase(addExtraItemToInvoice.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Error al añadir item extra.';
      })
      .addCase(updateExtraItem.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateExtraItem.fulfilled, (state, action) => {
        state.loading = false;
        // Asume que el backend devuelve la FinalInvoice COMPLETA actualizada
        state.currentInvoice = action.payload.finalInvoice;
      })
      .addCase(updateExtraItem.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Error al actualizar item extra.';
      })
      .addCase(removeExtraItem.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(removeExtraItem.fulfilled, (state, action) => {
        state.loading = false;
        // Asume que el backend devuelve la FinalInvoice COMPLETA actualizada
        state.currentInvoice = action.payload.finalInvoice;
      })
      .addCase(removeExtraItem.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Error al eliminar item extra.';
      })

      // --- Update Status ---
      .addCase(updateFinalInvoiceStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateFinalInvoiceStatus.fulfilled, (state, action) => {
        state.loading = false;
        // Asume que el backend devuelve la FinalInvoice COMPLETA actualizada
        state.currentInvoice = action.payload;
      })
      .addCase(updateFinalInvoiceStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Error al actualizar estado.';
      })

      // 🆕 --- Update Discount ---
      .addCase(updateFinalInvoiceDiscount.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateFinalInvoiceDiscount.fulfilled, (state, action) => {
        state.loading = false;
        // Backend devuelve la FinalInvoice COMPLETA actualizada
        state.currentInvoice = action.payload;
      })
      .addCase(updateFinalInvoiceDiscount.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Error al actualizar descuento.';
      })

      // --- INICIO: NUEVOS CASOS PDF y EMAIL ---

      // --- PDF Generation ---
      .addCase(generateFinalInvoicePdf.pending, (state) => {
        state.loadingPdf = true;
        state.errorPdf = null;
        // No limpiamos currentInvoice aquí, solo el estado de PDF
      })
     .addCase(generateFinalInvoicePdf.fulfilled, (state, action) => {
  state.loadingPdf = false;
  // action.payload debería ser el objeto completo que envió el backend
  // incluyendo { message, pdfPath, pdfUrl, finalInvoice }
  if (action.payload && action.payload.finalInvoice) {
    state.currentInvoice = action.payload.finalInvoice; // <--- ESTO ES CRUCIAL
  }
  state.errorPdf = null;
  // Opcional: puedes guardar el mensaje o la URL del PDF directamente en el estado si es útil
  // state.pdfGenerationMessage = action.payload.message;
  // state.lastGeneratedPdfUrl = action.payload.pdfUrl;
})
      .addCase(generateFinalInvoicePdf.rejected, (state, action) => {
        state.loadingPdf = false;
        state.errorPdf = action.payload?.message || 'Error al generar/obtener PDF.';
      })

      // --- Email Sending ---
      .addCase(emailFinalInvoice.pending, (state) => {
        state.loadingEmail = true;
        state.emailSuccessMessage = null;
        state.errorEmail = null;
      })
      .addCase(emailFinalInvoice.fulfilled, (state, action) => {
        state.loadingEmail = false;
        // El payload es { message: '...' }
        state.emailSuccessMessage = action.payload.message;
      })
      .addCase(emailFinalInvoice.rejected, (state, action) => {
        state.loadingEmail = false;
        state.errorEmail = action.payload?.message || 'Error al enviar el correo.';
      });

      // --- PDF Handling (Ejemplo) ---
      /*
      .addCase(generateFinalInvoicePdf.pending, (state) => {
        state.loadingPdf = true;
        state.errorPdf = null;
        state.pdfUrl = null;
      })
      .addCase(generateFinalInvoicePdf.fulfilled, (state, action) => {
        state.loadingPdf = false;
        state.pdfUrl = action.payload.pdfUrl; // Asume que la acción devuelve la URL
        // Actualizar también el pdfPath en currentInvoice si la acción lo devuelve
        if (action.payload.updatedInvoice) {
            state.currentInvoice = action.payload.updatedInvoice;
        }
      })
      .addCase(generateFinalInvoicePdf.rejected, (state, action) => {
        state.loadingPdf = false;
        state.errorPdf = action.payload?.message || 'Error al generar/obtener PDF.';
      });
      */
  },
});

export const { clearFinalInvoiceState, clearEmailMessage } = finalInvoiceReducer.actions;
export default finalInvoiceReducer.reducer;