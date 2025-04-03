import React from 'react';
import { Platform } from 'react-native';
import { Provider } from 'react-redux';
import { store } from './Redux/store';
import BottomTabNavigator from './navigations/BottomTabNavigator';
import MainNavigator from './navigations/MainNavigator';
import "../global.css"

export default function App() {
  return (
    <Provider store={store}>
      {Platform.OS === 'web' ? <MainNavigator /> : <BottomTabNavigator />}
    </Provider>
  );
}