import React from 'react';
import { Provider } from 'react-redux';
import { store } from './Redux/store';
import MainNavigator from './navigations/MainNavigator'; // Usar siempre MainNavigator
import '../global.css'

export default function App() {
  return (
    <Provider store={store}>
      <MainNavigator /> {/* Usar MainNavigator para todas las plataformas */}
    </Provider>
  );
}