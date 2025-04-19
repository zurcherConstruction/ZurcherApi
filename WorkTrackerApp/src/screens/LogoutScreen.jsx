import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useDispatch } from 'react-redux';
import { logoutUser } from '../Redux/Actions/authActions';
import { CommonActions } from '@react-navigation/native';

const LogoutScreen = ({ navigation }) => {
  const dispatch = useDispatch();

  useEffect(() => {
    // Despachar la acción de logout y redirigir al login
    dispatch(logoutUser());
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Login' }], // Redirigir al login después del logout
      })
    );
  }, [dispatch, navigation]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#0000ff" />
      <Text style={styles.text}>Cerrando sesión...</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    marginTop: 10,
    fontSize: 16,
    color: '#555',
  },
});

export default LogoutScreen;