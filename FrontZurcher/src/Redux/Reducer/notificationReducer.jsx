import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    notifications: [],
    loading: false,
    error: null,
    hasMore: true, // Indica si hay más notificaciones para cargar
  };

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    // Obtener notificaciones
    fetchNotificationsRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchNotificationsSuccess: (state, action) => {
        state.loading = false;
        state.notifications = action.payload; // Actualiza las notificaciones en el estado global
      },
    fetchNotificationsFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },

    // Crear notificación
    createNotificationRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    createNotificationSuccess: (state, action) => {
        state.loading = false;
        const exists = state.notifications.some(
          (notification) => notification.id === action.payload.id
        );
        if (!exists) {
          state.notifications.unshift(action.payload); // Agregar al inicio de la lista
        }
      },
    createNotificationFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },

    addNotification: (state, action) => {
        state.notifications.unshift(action.payload); // Agregar al inicio de la lista
      },

    // Marcar notificación como leída
    markNotificationAsReadRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    markNotificationAsReadSuccess: (state, action) => {
        state.loading = false;
        const ids = action.payload; // Suponiendo que es un array de IDs
        state.notifications = state.notifications.map((notification) =>
          ids.includes(notification.id)
            ? { ...notification, isRead: true }
            : notification
        );
      },
    markNotificationAsReadFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },

    // Limpiar errores
    clearNotificationError: (state) => {
      state.error = null;
    },
  },
});

export const {
  fetchNotificationsRequest,
  fetchNotificationsSuccess,
  fetchNotificationsFailure,
  createNotificationRequest,
  createNotificationSuccess,
  createNotificationFailure,
  addNotification,
  markNotificationAsReadRequest,
  markNotificationAsReadSuccess,
  markNotificationAsReadFailure,
  clearNotificationError,
} = notificationSlice.actions;

export default notificationSlice.reducer;