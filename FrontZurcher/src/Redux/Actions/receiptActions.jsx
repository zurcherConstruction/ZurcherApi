import api from '../../utils/axios';
import {
  createReceiptRequest,
  createReceiptSuccess,
  createReceiptFailure,
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