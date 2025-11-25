import React, { useEffect } from 'react';
import { Provider, useSelector } from 'react-redux';
import { View, ActivityIndicator, Text } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { store } from './Redux/store';
import MainNavigator from './navigations/MainNavigator';
import '../global.css';
import Toast from "react-native-toast-message";
import { NotificationProvider } from './utils/notificationContext';
import { restoreSession } from './Redux/Actions/authActions';
import { registerForPushNotificationsAsync } from './utils/notificationService';
import * as Notifications from 'expo-notifications';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ErrorBoundary from './components/ErrorBoundary';

const AppContent = () => {
  const { isAuthenticated, staff, isLoading } = useSelector((state) => state.auth);
  const staffId = staff?.id;

  if (__DEV__) {
    console.log('AppContent mounted with staffId:', staffId);
  }

  // Restaurar sesión al iniciar la app
  useEffect(() => {
    const initApp = async () => {
      try {
        await store.dispatch(restoreSession());
      } catch (error) {
        console.error('Error restaurando sesión:', error);
      }
    };
    initApp();
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
      if (__DEV__) {
        console.log('Configurando notificaciones para staffId:', staffId);
      }
      
      // Registrar para notificaciones push
      const token = await registerForPushNotificationsAsync();
      if (token && __DEV__) {
        console.log('Token de notificación obtenido');
      }

      // Listener para cuando se toca una notificación
      const notificationResponseListener = Notifications.addNotificationResponseReceivedListener(
        response => {
          if (__DEV__) {
            console.log('Notificación tocada:', response);
          }
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
    <SafeAreaProvider>
      {isAuthenticated ? (
        <NotificationProvider staffId={staffId}>
          <MainNavigator />
        </NotificationProvider>
      ) : (
        <MainNavigator />
      )}
    </SafeAreaProvider>
  );
};

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <Provider store={store}>
          <SafeAreaProvider>
            <AppContent />
            <Toast />
          </SafeAreaProvider>
        </Provider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}