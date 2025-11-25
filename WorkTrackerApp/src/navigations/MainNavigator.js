import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItemList, DrawerItem } from '@react-navigation/drawer';
import { useSelector, useDispatch } from 'react-redux';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
// --- Screen Imports ---
import LoginScreen from '../screens/LoginScreen';
import AssignedWorksScreen from '../screens/AssignedWorksScreen';
import WorkDetail from '../screens/WorkDetail';
import AllMyWorksScreen from '../screens/AllMyWorksScreen';
import MaintenanceWorkDetailScreen from '../screens/MaintenanceWorkDetailScreen';
import GeneralExpenseScreen from '../screens/GeneralExpenseScreen';
import { logout } from '../Redux/features/authSlice';

const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

// --- Componente para Header Derecho ---
const AuthenticatedHeaderRight = () => {
  return (
    <View style={styles.headerRightContainer}>
      {/* Removido NotificationBell - simplificando */}
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


// --- DRAWER NAVIGATOR SIMPLIFICADO PARA WORKER Y MAINTENANCE ---
const AppDrawerNavigator = () => {
  const { staff } = useSelector((state) => state.auth);

  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={({ navigation }) => ({
        headerShown: true,
        swipeEnabled: false, // Deshabilitar swipe del drawer para evitar errores de gestos
        headerLeft: () => (
          <TouchableOpacity
            onPress={() => navigation.toggleDrawer()}
            style={styles.headerButton}
          >
            <Ionicons name="menu-outline" size={28} color="#1e3a8a" />
          </TouchableOpacity>
        ),
        headerRight: () => <AuthenticatedHeaderRight />,
      })}
    >
      {/* --- Worker --- */}
      {staff?.role === 'worker' && (
        <>
          <Drawer.Screen 
            name="MyAssignedWorks" 
            options={{ 
              title: 'Mis Trabajos Asignados',
              drawerIcon: ({ color, size }) => (
                <Ionicons name="hammer-outline" color={color} size={size} />
              ),
            }}
          >
            {(props) => <AssignedWorksScreen {...props} staffId={staff?.idStaff} />}
          </Drawer.Screen>
          
          <Drawer.Screen 
            name="MyAllWorksView"
            component={AllMyWorksScreen}
            options={{ 
              title: 'Historial de Mis Obras',
              drawerIcon: ({ color, size }) => (
                <Ionicons name="time-outline" color={color} size={size} />
              ),
            }} 
          />
          
          <Drawer.Screen 
            name="GeneralExpense"
            component={GeneralExpenseScreen}
            options={{ 
              title: 'Registrar Gasto',
              drawerIcon: ({ color, size }) => (
                <Ionicons name="receipt-outline" color={color} size={size} />
              ),
            }} 
          />
        </>
      )}
      
      {/* --- Maintenance --- */}
      {staff?.role === 'maintenance' && (
        <>
          <Drawer.Screen 
            name="MyAssignedWorks" 
            options={{ 
              title: 'Mis Trabajos Asignados',
              drawerIcon: ({ color, size }) => (
                <Ionicons name="hammer-outline" color={color} size={size} />
              ),
            }}
          >
            {(props) => <AssignedWorksScreen {...props} staffId={staff?.idStaff} />}
          </Drawer.Screen>
          
          <Drawer.Screen 
            name="MyAllWorksView"
            component={AllMyWorksScreen}
            options={{ 
              title: 'Historial de Mis Obras',
              drawerIcon: ({ color, size }) => (
                <Ionicons name="time-outline" color={color} size={size} />
              ),
            }} 
          />
          
          <Drawer.Screen 
            name="GeneralExpense"
            component={GeneralExpenseScreen}
            options={{ 
              title: 'Registrar Gasto',
              drawerIcon: ({ color, size }) => (
                <Ionicons name="receipt-outline" color={color} size={size} />
              ),
            }} 
          />
        </>
      )}

    </Drawer.Navigator>
  );
};


// --- Main Application Navigator ---
const MainNavigator = () => {
  const { isAuthenticated, staff } = useSelector((state) => state.auth);

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          gestureEnabled: false,
          animation: 'none', // Deshabilitar animaciones
        }}
      >
        {!isAuthenticated ? (
          <Stack.Group screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Login" component={LoginScreen} />
          </Stack.Group>
        ) : (
          <Stack.Group
            screenOptions={({ navigation }) => ({
              headerShown: true,
              headerTitle: "",
              headerLeft: () =>
                navigation.canGoBack() ? (
                  <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.headerButton}
                  >
                    <Ionicons name="arrow-back-outline" size={24} color="#1e3a8a" />
                  </TouchableOpacity>
                ) : null,
              headerRight: () => <AuthenticatedHeaderRight />,
            })}
          >
            <Stack.Screen
              name="AppDrawer"
              component={AppDrawerNavigator}
              options={{ headerShown: false }}
            />

            {/* Pantallas de detalle y carga de imágenes/gastos */}
            <Stack.Screen 
              name="WorkDetail" 
              component={WorkDetail} 
              options={{ title: 'Detalle de Obra' }} 
            />
            
            <Stack.Screen
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


const styles = StyleSheet.create({
  headerButton: {
    marginHorizontal: 15,
    padding: 5,
  },
  headerRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 5,
  },
});

export default MainNavigator;