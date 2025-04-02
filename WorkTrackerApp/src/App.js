import React from 'react';
import { Provider } from 'react-redux';
import { store } from './Redux/store';
import BottomTabNavigator from './navigations/BottomTabNavigator';

export default function App() {
  return (
    <Provider store={store}>
      <BottomTabNavigator />
    </Provider>
  );
}