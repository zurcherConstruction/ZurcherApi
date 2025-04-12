import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/HomeScreen';
// import UploadScreen from '../screens/UploadScreen'; // Elimina esta línea
import AssignedWorksScreen from '../screens/AssignedWorksScreen'; // Importar la pantalla de trabajos asignados
import { Ionicons } from '@expo/vector-icons'; // Asegúrate de tener `expo-vector-icons` disponible

const Tab = createBottomTabNavigator();

const BottomTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = 'home';
          } else if (route.name === 'AssignedWorks') {
            iconName = 'list';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: 'blue',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen
        name="AssignedWorks"
        component={AssignedWorksScreen}
        options={{ title: 'Trabajos Asignados' }}
      />
    </Tab.Navigator>
  );
};

export default BottomTabNavigator;