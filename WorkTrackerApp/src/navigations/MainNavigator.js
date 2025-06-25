import React, { useContext } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItemList, DrawerItem } from '@react-navigation/drawer';
import { useSelector, useDispatch } from 'react-redux';
import { StyleSheet, TouchableOpacity, View, Text } from 'react-native';
import HomeScreen from '../screens/HomeScreen'; // Asumiendo que existe
import WorkScreen from '../screens/WorkScreen';
// --- Screen Imports ---
import LoginScreen from '../screens/LoginScreen';
import BottomTabNavigator from './BottomTabNavigator';
import PendingWorks from '../screens/PendingWorks';
import Notifications from '../screens/Notifications';
import AssignedWorksScreen from '../screens/AssignedWorksScreen';
import WorkDetail from '../screens/WorkDetail';
import UploadScreen from '../screens/UploadScreen';
import WorkBalanceDetail from '../screens/WorkBalanceDetail';
import BalanceUploadScreen from '../screens/BalanceUploadScreen'; // Asegúrate que esté descomentado si lo usas
import GeneralExpenseScreen from '../screens/GeneralExpenseScreen';
import AllMyWorksScreen from '../screens/AllMyWorksScreen';
import MaintenanceOverviewScreen from '../screens/MaintenanceOverviewScreen';
import MaintenanceWorkDetailScreen from '../screens/MaintenanceWorkDetailScreen';

import NotificationBell from '../components/NotificationBell';
// --- Context & Actions ---
import { NotificationContext } from '../utils/notificationContext';
import { logout } from '../Redux/features/authSlice';

const Stack = createStackNavigator();
const Drawer = createDrawerNavigator();

// --- Componente para Header Derecho (Reutilizable) ---
const AuthenticatedHeaderRight = () => {
  const navigation = useNavigation();



  return (
    <View style={styles.headerRightContainer}>
      <NotificationBell 
        onPress={() => navigation.navigate("Notifications")}
        size={24}
        color="#1e3a8a"
      />
    </View>
  );
};

// --- Contenido Personalizado del Drawer (para Logout y flexibilidad) ---
function CustomDrawerContent(props) {
  const dispatch = useDispatch();
  return (
    <DrawerContentScrollView {...props}>
      <DrawerItemList {...props} />
      {/* Ítem de Logout */}
      <DrawerItem
        label="Cerrar Sesión"
        icon={({ color, size }) => (
          <Ionicons name="log-out-outline" color={'#dc2626'} size={size} /> // Color rojo
        )}
        onPress={() => dispatch(logout())}
        labelStyle={{ color: '#dc2626' }} // Estilo opcional
        inactiveTintColor='#dc2626' // Estilo opcional
      />
    </DrawerContentScrollView>
  );
}


// --- DRAWER NAVIGATOR PRINCIPAL PARA TODOS LOS AUTENTICADOS ---
const AppDrawerNavigator = () => {
  const { staff } = useSelector((state) => state.auth); // Obtener info del usuario

  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />} // Usar contenido personalizado
      screenOptions={({ navigation }) => ({
        headerShown: true, // Mostrar header gestionado por el Drawer
        headerLeft: () => ( // Botón de menú
          <TouchableOpacity
            onPress={() => navigation.toggleDrawer()}
            style={styles.headerButton}
          >
            <Ionicons name="menu-outline" size={28} color="#1e3a8a" />
          </TouchableOpacity>
        ),
        headerRight: () => <AuthenticatedHeaderRight />, // Iconos de notificación/logout
      })}
    >
      {/* Pantallas Condicionales basadas en Rol */}

      {/* --- Owner --- */}
      {staff?.role === 'owner' && (
        <>
          <Drawer.Screen
            name="OwnerHomeView" // Nombre único
            component={HomeScreen} // <--- Usar HomeScreen en lugar de WorkScreen
            options={{ title: 'Resumen de Trabajos' }} // <--- Cambiar título si quieres
          />
          
          <Drawer.Screen
            name="PendingWorks" // Nombre único
            component={PendingWorks}
            options={{ title: 'Trabajos Pendientes' }}
          />
          <Drawer.Screen // <--- AÑADIR NUEVA PANTALLA AL DRAWER
            name="MaintenanceOverview"
            component={MaintenanceOverviewScreen}
            options={{
              title: 'Obras en Mantenimiento',
              drawerIcon: ({ focused, size, color }) => (
                <Ionicons
                  name={focused ? 'build' : 'build-outline'}
                  size={size}
                  color={color}
                />
              ),
            }}
          />
          {/* GeneralExpense se añade abajo como común */}
        </>
      )}

      {/* --- Worker --- */}
      {staff?.role === 'worker' && (
        <>
          <Drawer.Screen name="MyAssignedWorks" options={{ title: 'Mis Trabajos (Progreso)' }}>
            {(props) => <AssignedWorksScreen {...props} staffId={staff?.idStaff} />}
          </Drawer.Screen>
          {/* Nueva pantalla para TODAS las obras asignadas al worker */}
          <Drawer.Screen 
            name="MyAllWorksView" // Nombre único para la ruta del Drawer
            component={AllMyWorksScreen} // El StackNavigator que creamos
            options={{ title: 'Historial de Mis Obras' }} 
          />
        </>
      )}

      {/* --- Receipt / Admin --- */}
      {(staff?.role === 'receipt' || staff?.role === 'admin') && (
        <>
          <Drawer.Screen
            name="AllWorksAdminReceipt" // Nombre único
            component={WorkScreen} // Usamos la misma pantalla
            options={{ title: 'Ver Todos los Trabajos' }}
          />
          {/* GeneralExpense se añade abajo como común */}
        </>
      )}

      {/* --- Pantallas Comunes para TODOS los roles autenticados --- */}
      <Drawer.Screen
        name="GeneralExpenseCommon" // Nombre único
        component={GeneralExpenseScreen}
        options={{ title: 'Registrar Gasto General' }}
      />

      {/* La opción de Logout se añade a través de CustomDrawerContent */}

    </Drawer.Navigator>
  );
};


// --- Main Application Navigator ---
const MainNavigator = () => {
  const { isAuthenticated, staff } = useSelector((state) => state.auth);

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {!isAuthenticated ? (
          // --- Grupo No Autenticado ---
          <Stack.Group screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Login" component={LoginScreen} />
          </Stack.Group>
        ) : (
          // --- Grupo Autenticado ---
          <Stack.Group
            screenOptions={({ navigation }) => ({ // Opciones por defecto para el Stack
              headerShown: true,
              headerTitle: "",
              headerLeft: () => // Botón atrás por defecto para el Stack
                navigation.canGoBack() ? (
                  <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.headerButton}
                  >
                    <Ionicons name="arrow-back-outline" size={24} color="#1e3a8a" />
                  </TouchableOpacity>
                ) : null, // No mostrar si no puede ir atrás (ej: pantalla principal del Drawer)
              headerRight: () => <AuthenticatedHeaderRight />, // Header derecho consistente
            })}
          >
            {/* La pantalla principal SIEMPRE es el Drawer Navigator */}
            <Stack.Screen
              name="AppDrawer" // Nombre para el contenedor del Drawer
              component={AppDrawerNavigator}
              options={{ headerShown: false }} // El Drawer maneja su propio header
            />


            <Stack.Screen name="Notifications" options={{ title: 'Notificaciones' }}>
              {(props) => <Notifications {...props} staffId={staff?.id} />}
            </Stack.Screen>
            <Stack.Screen name="WorkDetail" component={WorkDetail} options={{ title: 'Detalle de Obra' }} />
            {/* UploadScreen genérico (si se necesita navegar a él fuera del contexto de AssignedWorks) */}
            {/* <Stack.Screen name="UploadScreen" component={UploadScreen} options={{ title: 'Cargar Imágenes' }} /> */}
            <Stack.Screen name="WorkBalanceDetail" component={WorkBalanceDetail} options={{ title: 'Detalle de Balance' }} />
            <Stack.Screen name="BalanceUpload" component={BalanceUploadScreen} options={{ title: 'Cargar Balance' }} />
            {/* GeneralExpense está en el Drawer, no es necesario repetirla aquí a menos que navegues
                a ella desde una pantalla que NO sea del Drawer. */}
            {/* <Stack.Screen name="GeneralExpense" component={GeneralExpenseScreen} options={{ title: 'Registrar Gasto General' }}/> */}
               <Stack.Screen // <--- AÑADIR PANTALLA DE DETALLE AL STACK
              name="MaintenanceWorkDetail"
              component={MaintenanceWorkDetailScreen}
              options={({ route }) => ({ title: route.params?.title || 'Detalle Mantenimiento' })}
            />
          </Stack.Group>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};


// --- Styles --- (Asegúrate que estén definidos correctamente)
const styles = StyleSheet.create({
  headerButton: {
    marginHorizontal: 15,
    padding: 5, // Añadir padding para área táctil
  },
  headerRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 5, // Ajustar margen si es necesario
  },
  notificationBadge: {
    position: 'absolute',
    right: -8, // Ajustar posición
    top: -4,   // Ajustar posición
    backgroundColor: 'red',
    borderRadius: 9, // Hacerlo más circular
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'white',
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default MainNavigator;