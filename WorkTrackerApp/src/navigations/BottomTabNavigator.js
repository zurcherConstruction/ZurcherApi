import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from '../screens/HomeScreen';
import AssignedWorksScreen from '../screens/AssignedWorksScreen';
import { Ionicons } from '@expo/vector-icons';
import WorkDetail from '../screens/WorkDetail';

import LogoutScreen from '../screens/LogoutScreen'; 


const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function HomeStackNavigator() {
  return (
    <Stack.Navigator
    screenOptions={{
      headerShown: false, // Habilita el encabezado
      headerTitle: "Home", // Título único
      headerBackTitleVisible: false, // Oculta el texto del botón de "Volver"
      headerTintColor: "#1e3a8a", // Color del botón de "Volver"
    }}
  >
    <Stack.Screen name="HomeScreen" component={HomeScreen} />
    <Stack.Screen
      name="WorkDetail"
      component={WorkDetail}
      options={{
        title: "Detalles de la Obra", // Título del encabezado para WorkDetail
      }}
    />
  </Stack.Navigator>
  );
}

const BottomTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName;
          if (route.name === "Home") {
            iconName = "home";
          } else if (route.name === "AssignedWorks") {
            iconName = "list";
          } else if (route.name === "Logout") {
            iconName = "log-out"; // Icono para logout
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: "blue",
        tabBarInactiveTintColor: "gray",
        headerShown: false, // Oculta el encabezado para todas las pestañas
      })}
    >
      <Tab.Screen
        name="Home" // Cambié el nombre a "Home" para consistencia
        component={HomeStackNavigator}
        options={{
          tabBarLabel: "Inicio", // Texto en la barra inferior
        }}
      />
      <Tab.Screen
        name="AssignedWorks"
        component={AssignedWorksScreen}
        options={{
          tabBarLabel: "Trabajos Asignados", // Texto en la barra inferior
        }}
      />
      <Tab.Screen
        name="Logout"
        component={LogoutScreen} // Pantalla de logout
        options={{
          tabBarLabel: "Cerrar Sesión", // Texto en la barra inferior
        }}
      />
    </Tab.Navigator>
  );
};

export default BottomTabNavigator;

