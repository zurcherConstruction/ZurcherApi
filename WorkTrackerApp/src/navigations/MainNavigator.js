import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { useSelector } from 'react-redux';
import LoginScreen from '../screens/LoginScreen';
import BottomTabNavigator from './BottomTabNavigator';
import PendingWorks from '../screens/PendingWorks'; // Importa el nuevo componente

const Stack = createStackNavigator();
const Drawer = createDrawerNavigator();

const OwnerDrawerNavigator = () => {
  return (
    <Drawer.Navigator>
      <Drawer.Screen
        name="OwnerHome" // Cambia el nombre para evitar conflictos
        component={BottomTabNavigator}
        options={{ title: 'Home' }}
      />
      <Drawer.Screen
        name="PendingWorks"
        component={PendingWorks}
        options={{ title: 'Pending Works' }}
      />
    </Drawer.Navigator>
  );
};

const MainNavigator = () => {
  // Obtener el estado de autenticación y el rol del staff
  const { isAuthenticated, staff } = useSelector((state) => state.auth);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : staff?.role === 'owner' ? ( // Verifica el rol del staff
          <Stack.Screen name="OwnerDrawer" component={OwnerDrawerNavigator} />
        ) : (
          <Stack.Screen name="Main" component={BottomTabNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default MainNavigator;