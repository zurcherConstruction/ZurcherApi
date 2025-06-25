import React, { useEffect } from 'react';
import { Provider, useSelector } from 'react-redux';
import { View, ActivityIndicator } from 'react-native';
import { store } from './Redux/store';
import MainNavigator from './navigations/MainNavigator';
import '../global.css';
import Toast from "react-native-toast-message";
import { NotificationProvider } from './utils/notificationContext';
import { restoreSession } from './Redux/Actions/authActions';
import { registerForPushNotificationsAsync } from './utils/notificationService'; // AGREGAR IMPORT
import * as Notifications from 'expo-notifications'; // AGREGAR IMPORT

const AppContent = () => {
  const { isAuthenticated, staff, isLoading } = useSelector((state) => state.auth);
  const staffId = staff?.id;

  console.log('AppContent mounted with staffId:', staffId);

  // Restaurar sesión al iniciar la app
  useEffect(() => {
    store.dispatch(restoreSession());
  }, []);

  // Configurar notificaciones cuando el usuario esté autenticado
  useEffect(() => {
    if (isAuthenticated && staffId) {
      setupNotifications();
    }
  }, [isAuthenticated, staffId]);

  // Función para configurar las notificaciones
  const setupNotifications = async () => {
    try {
      console.log('Configurando notificaciones para staffId:', staffId);
      
      // Registrar para notificaciones push
      const token = await registerForPushNotificationsAsync();
      if (token) {
        console.log('Token de notificación obtenido:', token);
        // Aquí podrías enviar el token al backend si es necesario
        // await api.post('/staff/update-push-token', { staffId, pushToken: token });
      }

      // Listener para cuando se toca una notificación
      const notificationResponseListener = Notifications.addNotificationResponseReceivedListener(
        response => {
          console.log('Notificación tocada:', response);
          // Aquí podrías navegar a una pantalla específica si necesitas
          // Por ejemplo: navigation.navigate('Notifications');
        }
      );

      // Limpiar listeners al desmontar
      return () => {
        notificationResponseListener.remove();
      };
    } catch (error) {
      console.error('Error configurando notificaciones:', error);
    }
  };

  // Mostrar un indicador de carga mientras se verifica la sesión
  if (isLoading || (isAuthenticated && !staffId)) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <>
      {isAuthenticated ? (
        <NotificationProvider staffId={staffId}>
          <MainNavigator />
        </NotificationProvider>
      ) : (
        <MainNavigator />
      )}
    </>
  );
};

export default function App() {
  return (
    <Provider store={store}>
      <AppContent />
      <Toast />
    </Provider>
  );
}