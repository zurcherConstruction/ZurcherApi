import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import UploadScreen from '../screens/UploadScreen'; // Pantalla para cargar imágenes
import NotAuthorizedScreen from '../screens/NotAuthorizedScreen'; // Pantalla para usuarios no autorizados

const Stack = createStackNavigator();

const MainNavigator = () => {
  const { isAuthenticated, staff } = useSelector((state) => state.auth);

  const renderScreens = () => {
    if (!isAuthenticated) {
      return <Stack.Screen name="Login" component={LoginScreen} />;
    }

    if (staff.role === 'owner') {
      // Rutas para el rol "Owner"
      return (
        <>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Upload" component={UploadScreen} />
        </>
      );
    }

    if (staff.role === 'worker') {
      // Rutas para el rol "Worker"
      return <Stack.Screen name="Upload" component={UploadScreen} />;
    }

    // Si el rol no está autorizado
    return <Stack.Screen name="NotAuthorized" component={NotAuthorizedScreen} />;
  };

  return (
    <NavigationContainer>
      <Stack.Navigator>{renderScreens()}</Stack.Navigator>
    </NavigationContainer>
  );
};

export default MainNavigator;