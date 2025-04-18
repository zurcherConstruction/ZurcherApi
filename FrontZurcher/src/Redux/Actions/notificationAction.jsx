import api from '../../utils/axios';
import {
  fetchNotificationsRequest,
  fetchNotificationsSuccess,
  fetchNotificationsFailure,
  createNotificationRequest,
  createNotificationSuccess,
  createNotificationFailure,
  markNotificationAsReadRequest,
  markNotificationAsReadSuccess,
  markNotificationAsReadFailure,
} from '../Reducer/notificationReducer';

// Obtener notificaciones de un usuario
export const fetchNotifications = (staffId) => async (dispatch) => {
    dispatch(fetchNotificationsRequest());
    try {
      const response = await api.get(`/notification/io/${staffId}`);
      console.log("Respuesta del backend:", response.data); // Agrega este log para depurar
      dispatch(fetchNotificationsSuccess(response.data.notifications));
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || "Error al obtener las notificaciones";
      console.error("Error al obtener las notificaciones:", errorMessage);
      dispatch(fetchNotificationsFailure(errorMessage));
    }
  };

// Crear una notificación
export const createNotification = (notificationData) => async (dispatch) => {
  dispatch(createNotificationRequest());
  try {
    const response = await api.post('/notification/io', notificationData);
    dispatch(createNotificationSuccess(response.data.notification));
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || 'Error al crear la notificación';
    dispatch(createNotificationFailure(errorMessage));
  }
};

// Marcar una notificación como leída
export const markNotificationAsRead = (notificationId) => async (dispatch) => {
  dispatch(markNotificationAsReadRequest());
  try {
    await api.put(`/notification/io/${notificationId}/read`);
    dispatch(markNotificationAsReadSuccess(notificationId));
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || 'Error al marcar la notificación como leída';
    dispatch(markNotificationAsReadFailure(errorMessage));
  }
};