import React, { useState } from 'react';
import { View, Text, TextInput, Button, Image, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

const UploadScreen = () => {
  const [imageUri, setImageUri] = useState(null);
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [date, setDate] = useState(new Date().toLocaleDateString());

  const handlePickImage = async () => {
    // Solicitar permisos para acceder a la galería
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      alert('Se requieren permisos para acceder a la galería.');
      return;
    }

    // Abrir la galería para seleccionar una imagen
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri); // Guardar la URI de la imagen seleccionada
    }
  };

  const handleSubmit = () => {
    if (!imageUri || !description || !address) {
      alert('Por favor, completa todos los campos.');
      return;
    }

    // Aquí puedes enviar los datos al backend
    console.log({
      imageUri,
      description,
      address,
      date,
    });

    alert('Datos enviados correctamente.');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Cargar Imagen</Text>
      <Button title="Seleccionar Imagen" onPress={handlePickImage} />
      {imageUri && <Image source={{ uri: imageUri }} style={styles.image} />}
      <TextInput
        style={styles.input}
        placeholder="Descripción"
        value={description}
        onChangeText={setDescription}
      />
      <TextInput
        style={styles.input}
        placeholder="Dirección"
        value={address}
        onChangeText={setAddress}
      />
      <Text style={styles.date}>Fecha: {date}</Text>
      <Button title="Enviar" onPress={handleSubmit} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
  },
  image: {
    width: '100%',
    height: 200,
    marginBottom: 10,
  },
  date: {
    fontSize: 16,
    marginBottom: 10,
  },
});

export default UploadScreen;