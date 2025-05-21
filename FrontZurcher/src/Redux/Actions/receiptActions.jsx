import api from '../../utils/axios';
import {
  createReceiptRequest,
  createReceiptSuccess,
  createReceiptFailure,
  deleteReceiptRequest,
  deleteReceiptSuccess,
  deleteReceiptFailure,
} from '../Reducer/receiptReducer';

// Crear un comprobante
export const createReceipt = (receiptData) => async (dispatch) => {
  dispatch(createReceiptRequest());
  try {
    const response = await api.post('/receipt', receiptData, {
      headers: {
        'Content-Type': 'multipart/form-data', // Necesario para enviar archivos
      },
    });
    dispatch(createReceiptSuccess(response.data));
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || 'Error al crear el comprobante';
    dispatch(createReceiptFailure(errorMessage));
    throw new Error(errorMessage);
  }
};

// Eliminar un comprobante
export const deleteReceipt = (idReceipt) => async (dispatch) => {
  dispatch(deleteReceiptRequest());
  try {
    console.log(`RECEIPTACTIONS: Enviando DELETE a /receipt/${idReceipt}`); // <--- AÑADE ESTE LOG
    // La ruta es /receipt/:idReceipt según tu archivo de rutas del backend
    await api.delete(`/receipt/${idReceipt}`); // <--- ESTA LÍNEA ES CRUCIAL
    dispatch(deleteReceiptSuccess(idReceipt));
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || 'Error al eliminar el comprobante';
    console.error(`RECEIPTACTIONS: Error en deleteReceipt para ID ${idReceipt}:`, error); // <--- AÑADE ESTE LOG
    dispatch(deleteReceiptFailure(errorMessage));
    throw error;
  }
};