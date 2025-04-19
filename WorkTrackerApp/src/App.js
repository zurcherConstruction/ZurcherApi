import React from 'react';
import { Provider, useSelector } from 'react-redux';
import { store } from './Redux/store';
import MainNavigator from './navigations/MainNavigator'; // Usar siempre MainNavigator
import '../global.css';
import Toast from "react-native-toast-message";
import { NotificationProvider } from './utils/notificationContext';

const AppContent = () => {
  const { isAuthenticated, staff } = useSelector((state) => state.auth);
  const staffId = staff?.id;

  console.log('AppContent mounted with staffId:', staffId);

  // Mostrar un indicador de carga si el usuario está autenticado pero el staffId aún no está disponible
  if (isAuthenticated && !staffId) {
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