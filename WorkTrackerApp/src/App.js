import React, { useEffect } from 'react';
import { Provider, useSelector } from 'react-redux';
import { View, ActivityIndicator } from 'react-native';
import { store } from './Redux/store';
import MainNavigator from './navigations/MainNavigator';
import '../global.css';
import Toast from "react-native-toast-message";
import { NotificationProvider } from './utils/notificationContext';
import { restoreSession } from './Redux/Actions/authActions'; // Asegúrate de importar esto

const AppContent = () => {
  const { isAuthenticated, staff, isLoading } = useSelector((state) => state.auth);
  const staffId = staff?.id;

  console.log('AppContent mounted with staffId:', staffId);

  // Restaurar sesión al iniciar la app
  useEffect(() => {
    store.dispatch(restoreSession());
  }, []);

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