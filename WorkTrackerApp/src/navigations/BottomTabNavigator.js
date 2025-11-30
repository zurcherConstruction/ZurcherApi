import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import AssignedWorksScreen from '../screens/AssignedWorksScreen';
import WorkZoneMapScreen from '../screens/WorkZoneMapScreen';
import MaintenanceList from '../screens/MaintenanceList';
import CompletedMaintenanceList from '../screens/CompletedMaintenanceList';
import MaintenanceWebView from '../screens/MaintenanceWebView';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import WorkDetail from '../screens/WorkDetail';

import LogoutScreen from '../screens/LogoutScreen'; 


const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

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

function MaintenanceStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerTitle: "Mantenimientos",
        headerBackTitleVisible: false,
        headerTintColor: "#1e3a8a",
      }}
    >
      <Stack.Screen 
        name="MaintenanceListScreen" 
        component={MaintenanceList}
        options={{
          title: "Pendientes",
        }}
      />
      <Stack.Screen 
        name="CompletedMaintenanceListScreen" 
        component={CompletedMaintenanceList}
        options={{
          title: "Completados",
        }}
      />
      <Stack.Screen
        name="MaintenanceWebView"
        component={MaintenanceWebView}
        options={{
          title: "Formulario de Mantenimiento",
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
          } else if (route.name === "WorkZoneMap") {
            // Usamos MaterialCommunityIcons para el mapa
            return <MaterialCommunityIcons name="map-marker-multiple" size={size} color={color} />;
          } else if (route.name === "Maintenance") {
            iconName = "build"; // Icono de herramientas para mantenimiento
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
        name="WorkZoneMap"
        component={WorkZoneMapScreen}
        options={{
          tabBarLabel: "Mapa de Zonas", // Texto en la barra inferior
        }}
      />
      <Tab.Screen
        name="Maintenance"
        component={MaintenanceStackNavigator}
        options={{
          tabBarLabel: "Mantenimientos", // Texto en la barra inferior
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

