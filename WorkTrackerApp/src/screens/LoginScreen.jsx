import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { login } from '../Redux/Actions/authActions';
import Ionicons from 'react-native-vector-icons/Ionicons'; // Importar los íconos

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false); // Estado para alternar la visibilidad de la contraseña
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.auth);

  const handleLogin = async () => {
    await dispatch(login(email, password));
  };

  return (
    <View style={styles.container}>
      {/* Logo */}
      <Image
        source={require('../../assets/logo.png')} // Asegúrate de tener un archivo logo.png en la carpeta assets
        style={styles.logo}
        resizeMode="contain"
      />

      {/* Cuadro del formulario */}
      <View style={styles.formContainer}>
        {/* Título */}
        <Text style={styles.title}>Iniciar Sesión</Text>

        {/* Mensaje de error */}
        {error && <Text style={styles.error}>{error}</Text>}

        {/* Campo de correo electrónico */}
        <TextInput
          style={styles.input}
          placeholder="Correo electrónico"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        {/* Campo de contraseña */}
        <View style={styles.passwordContainer}>
          <TextInput
            style={[styles.input, styles.passwordInput]}
            placeholder="Contraseña"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword} // Alterna entre mostrar y ocultar la contraseña
          />
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)} // Alterna el estado de visibilidad
            style={styles.showPasswordButton}
          >
            <Ionicons
              name={showPassword ? 'eye-off' : 'eye'} // Cambia el ícono según el estado
              size={20}
              color="#1e3a8a"
            />
          </TouchableOpacity>
        </View>

        {/* Botón de inicio de sesión */}
        <Pressable onPress={handleLogin} style={styles.button}>
          <Text style={styles.buttonText}>
            {loading ? 'Cargando...' : 'Iniciar Sesión'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f9f9f9',
  },
  logo: {
    width: 150,
    height: 150,
    marginBottom: 20,
  },
  formContainer: {
    width: '90%',
    maxWidth: 400, // Limita el ancho del cuadro
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e3a8a',
    marginBottom: 20,
    textAlign: 'center',
  },
  error: {
    color: '#dc2626',
    marginBottom: 10,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    backgroundColor: '#fff',
  },
  passwordContainer: {
    position: 'relative',
    width: '100%',
  },
  passwordInput: {
    paddingRight: 50, // Espacio para el ícono de mostrar/ocultar
  },
  showPasswordButton: {
    position: 'absolute',
    right: 10,
    top: 12,
  },
  button: {
    width: '100%',
    backgroundColor: '#1e3a8a',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default LoginScreen;