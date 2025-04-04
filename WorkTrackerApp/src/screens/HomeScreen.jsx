import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useDispatch } from 'react-redux';
import { logoutUser } from '../Redux/Actions/authActions';

const HomeScreen = ({ navigation }) => {
  const dispatch = useDispatch();

  const handleLogout = () => {
    dispatch(logoutUser());
    // Opcional: navegar a la pantalla de login si lo deseas
    navigation.replace('LoginScreen');
  };

  return (
    <View className="flex-1 justify-center items-center bg-gray-100 p-5">
      <Text className="text-2xl font-bold text-blue-600 mb-5">Home Screen</Text>
      <Pressable
        onPress={handleLogout}
        className="bg-red-600 py-3 px-6 rounded-full"
      >
        <Text className="text-white text-lg">Cerrar Sesión</Text>
      </Pressable>
    </View>
  );
};

export default HomeScreen;