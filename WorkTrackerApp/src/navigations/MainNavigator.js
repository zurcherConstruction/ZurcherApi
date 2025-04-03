import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import UploadScreen from '../screens/UploadScreen';
import NotAuthorizedScreen from '../screens/NotAuthorizedScreen';

const Stack = createStackNavigator();

const MainNavigator = () => {
  const { isAuthenticated, staff } = useSelector((state) => state.auth);

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        {!isAuthenticated ? (
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ title: 'Iniciar Sesión', path: 'login' }}
          />
        ) : staff.role === 'owner' ? (
          <>
            <Stack.Screen
              name="Home"
              component={HomeScreen}
              options={{ title: 'Inicio', path: 'home' }}
            />
            <Stack.Screen
              name="Upload"
              component={UploadScreen}
              options={{ title: 'Subir Imagen', path: 'upload' }}
            />
          </>
        ) : staff.role === 'worker' ? (
          <Stack.Screen
            name="Upload"
            component={UploadScreen}
            options={{ title: 'Subir Imagen', path: 'upload' }}
          />
        ) : (
          <Stack.Screen
            name="NotAuthorized"
            component={NotAuthorizedScreen}
            options={{ title: 'No Autorizado', path: 'not-authorized' }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default MainNavigator;