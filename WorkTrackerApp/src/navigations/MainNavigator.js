import React, { useContext } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { useSelector, useDispatch } from 'react-redux';
import { StyleSheet, TouchableOpacity, View, Text } from 'react-native';

// --- Screen Imports ---
import LoginScreen from '../screens/LoginScreen';
import BottomTabNavigator from './BottomTabNavigator';
import PendingWorks from '../screens/PendingWorks';
import Notifications from '../screens/Notifications';
import AssignedWorksScreen from '../screens/AssignedWorksScreen';
import WorkDetail from '../screens/WorkDetail';
import UploadScreen from '../screens/UploadScreen';
import WorkBalanceDetail from '../screens/WorkBalanceDetail';
//import BalanceUploadScreen from '../screens/BalanceUploadScreen'; // Asegúrate que esté descomentado si lo usas

// --- Context & Actions ---
import { NotificationContext } from '../utils/notificationContext';
import { logoutUser } from '../Redux/Actions/authActions';

const Stack = createStackNavigator();
const Drawer = createDrawerNavigator();

// --- Owner Drawer Navigator ---
const OwnerDrawerNavigator = () => {
  return (
    // --- MODIFICACIÓN: Añadir screenOptions al Drawer ---
    <Drawer.Navigator
      screenOptions={({ navigation }) => ({ // Usar screenOptions aquí
        headerShown: true, // Mostrar header para las pantallas del drawer
        headerLeft: () => ( // Definir el botón de menú aquí
          <TouchableOpacity
            onPress={() => navigation.toggleDrawer()} // Usar toggleDrawer directamente (navigation aquí es del Drawer)
            style={styles.headerButton} // Asegúrate que styles.headerButton esté definido o accesible
          >
            <Ionicons name="menu-outline" size={28} color="#1e3a8a" />
          </TouchableOpacity>
        ),
        // Puedes añadir headerRight aquí si quieres que sea consistente en el Drawer
         headerRight: () => <AuthenticatedHeaderRight />, // Opcional
      })}
    >
      <Drawer.Screen
        name="OwnerHome"
        component={BottomTabNavigator}
        // options={{ title: 'Home', headerShown: false }} // Quitar esto, el Drawer mostrará el header
        options={{ title: 'Home' }} // Título para el header del Drawer
      />
      <Drawer.Screen
        name="PendingWorks"
        component={PendingWorks}
        options={{ title: 'Pending Works' }} // Título para el header del Drawer
      />
    </Drawer.Navigator>
  );
};

// --- Componente para Header Derecho (Reutilizable) ---
const AuthenticatedHeaderRight = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const notificationContext = useContext(NotificationContext);
  const unreadCount = notificationContext?.unreadCount || 0;

  return (
    <View style={styles.headerRightContainer}>
      {notificationContext && (
        <TouchableOpacity
          onPress={() => navigation.navigate("Notifications")}
          style={styles.headerButton}
        >
          <Ionicons name="notifications-outline" size={24} color="#1e3a8a" />
          {unreadCount > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      )}
      <TouchableOpacity
        onPress={() => dispatch(logoutUser())}
        style={styles.headerButton}
      >
        <Ionicons name="log-out-outline" size={24} color="#1e3a8a" />
      </TouchableOpacity>
    </View>
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
                ) : null,
              headerRight: () => <AuthenticatedHeaderRight />, // Botones derechos para el Stack
            })}
          >
            {/* Pantallas Iniciales Autenticadas */}
            {staff?.role === 'owner' ? (
              <Stack.Screen
                name="OwnerDrawer" // Nombre de la pantalla en el Stack que contiene el Drawer
                component={OwnerDrawerNavigator}
                // --- MODIFICACIÓN: Ocultar el header del Stack ---
                // El Drawer Navigator ahora maneja su propio header y botón de menú
                options={{ headerShown: false }}
              />
            ) : (
              <Stack.Screen name="AssignedWorks" options={{ title: 'Trabajos Asignados' }}>
                {(props) => <AssignedWorksScreen {...props} staffId={staff?.id} />}
              </Stack.Screen>
            )}

            {/* Pantallas Comunes y de Detalle (usarán el header del Stack) */}
            <Stack.Screen name="Notifications" options={{ title: 'Notificaciones' }}>
              {(props) => <Notifications {...props} staffId={staff?.id} />}
            </Stack.Screen>
            <Stack.Screen name="WorkDetail" component={WorkDetail} options={{ title: 'Detalle de Obra' }} />
            <Stack.Screen name="UploadScreen" component={UploadScreen} options={{ title: 'Cargar Imágenes' }} />
            <Stack.Screen name="WorkBalanceDetail" component={WorkBalanceDetail} options={{ title: 'Detalle de Balance' }} />
            {/* <Stack.Screen name="BalanceUpload" component={BalanceUploadScreen} options={{ title: 'Cargar Balance' }} /> */}

          </Stack.Group>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};


// --- Styles ---
const styles = StyleSheet.create({
  headerButton: {
    marginHorizontal: 15,
  },
  headerRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    right: -6,
    top: -3,
    backgroundColor: 'red',
    borderRadius: 10,
    width: 20,
    height: 20,
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