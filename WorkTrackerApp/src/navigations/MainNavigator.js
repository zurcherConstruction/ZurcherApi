import React, { useContext } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { useSelector } from 'react-redux';
import LoginScreen from '../screens/LoginScreen';
import BottomTabNavigator from './BottomTabNavigator';
import PendingWorks from '../screens/PendingWorks';
import { NotificationContext } from '../utils/notificationContext';
import { StyleSheet, TouchableOpacity, View, Text } from 'react-native';
import Notifications from '../screens/Notifications'; // Asegúrate de tener este componente
import AssignedWorksScreen from '../screens/AssignedWorksScreen';
import { logoutUser } from '../Redux/Actions/authActions'; // Asegúrate de tener esta acción
import { useDispatch } from 'react-redux';
const Stack = createStackNavigator();
const Drawer = createDrawerNavigator();


const OwnerDrawerNavigator = () => {
  return (
    <Drawer.Navigator>
      <Drawer.Screen
        name="OwnerHome"
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
  const { isAuthenticated, staff } = useSelector((state) => state.auth);
  const notificationContext = useContext(NotificationContext);
  const unreadCount = notificationContext?.unreadCount || 0;
  const dispatch = useDispatch();

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={({ navigation }) => ({
          headerShown: true,
          headerTitle: "", // Oculta el título del componente
          headerLeft: () =>
            navigation.canGoBack() && (
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={{ marginLeft: 15 }}
              >
                <Ionicons name="arrow-back-outline" size={24} color="#1e3a8a" />
              </TouchableOpacity>
            ),
          headerRight: () => (
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              {/* Campana de notificaciones */}
              {isAuthenticated && notificationContext && (
                <TouchableOpacity
                  onPress={() => navigation.navigate("Notifications")}
                  style={{ marginRight: 15 }}
                >
                  <Ionicons name="notifications-outline" size={24} color="#1e3a8a" />
                  {unreadCount > 0 && (
                    <View style={styles.notificationBadge}>
                      <Text style={styles.badgeText}>{unreadCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}
              {/* Logout */}
              <TouchableOpacity
                onPress={() => {
                  dispatch(logoutUser()); // Llama a la acción de logout
                  navigation.replace("Login"); // Redirige al login
                }}
                style={{ marginRight: 15 }}
              >
                <Ionicons name="log-out-outline" size={24} color="#1e3a8a" />
              </TouchableOpacity>
            </View>
          ),
        })}
      >
        {!isAuthenticated ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : staff?.role === 'owner' ? (
          <Stack.Screen name="OwnerDrawer" component={OwnerDrawerNavigator} />
        ) : staff?.role === 'worker' ? (
          <Stack.Screen name="AssignedWorks" options={{ headerShown: true }}>
            {(props) => <AssignedWorksScreen {...props} staffId={staff?.id} />}
          </Stack.Screen>
        ) : (
          <Stack.Screen name="Main" component={BottomTabNavigator} />
        )}
        <Stack.Screen name="Notifications">
          {(props) => <Notifications {...props} staffId={staff?.id} />}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
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
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default MainNavigator;