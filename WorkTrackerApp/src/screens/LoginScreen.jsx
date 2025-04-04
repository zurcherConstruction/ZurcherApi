import React, { useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { login } from '../Redux/Actions/authActions';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.auth);

  const handleLogin = async () => {
    await dispatch(login(email, password));
    // No navegamos manualmente. El MainNavigator se encargará de cambiar la pantalla
  };

  return (
    <View className="" >
      <Text className="text-3xl font-extrabold text-blue-600 mb-5 text-center">
        Iniciar Sesión
      </Text>
      {error && <Text className="text-red-500 text-center mb-3">{error}</Text>}
      <TextInput
        className="border border-gray-300 rounded-lg px-4 py-2 mb-4"
        placeholder="Correo electrónico"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        className="border border-gray-300 rounded-lg px-4 py-2 mb-4"
        placeholder="Contraseña"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Pressable
        onPress={handleLogin}
        className="bg-blue-600 py-3 rounded-lg shadow-md"
      >
        <Text className="text-white text-center text-lg font-semibold">
          {loading ? 'Cargando...' : 'Iniciar Sesión'}
        </Text>
      </Pressable>
    </View>
  );
};

export default LoginScreen;