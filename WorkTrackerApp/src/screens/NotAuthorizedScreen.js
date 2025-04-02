import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const NotAuthorizedScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>No tienes permiso para acceder a esta pantalla.</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  text: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    color: 'red',
  },
});

export default NotAuthorizedScreen;