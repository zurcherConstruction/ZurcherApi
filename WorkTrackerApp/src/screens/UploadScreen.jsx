import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Image, Alert, ScrollView, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useDispatch } from 'react-redux';
import { addImagesToWork } from '../Redux/Actions/workActions';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import Ionicons from 'react-native-vector-icons/Ionicons';

const UploadScreen = () => {
  const { idWork, propertyAddress } = useRoute().params; // Se asume que propertyAddress viene en los params
  const navigation = useNavigation();
  const [imageUri, setImageUri] = useState(null);
  const [comment, setComment] = useState('');
  const [stage, setStage] = useState(''); // Etapa seleccionada
  const [date, setDate] = useState(new Date().toLocaleDateString());
  const dispatch = useDispatch();

  const stages = [
    'foto previa del lugar',
    'foto excavación',
    'foto tanque instalado',
    'fotos de cada camión de arena',
    'foto inspección final',
    'foto de extracción de piedras',
  ];

  const stageColors = [
    '#264653', // Dark Cyan
    '#2a9d8f', // Emerald Green
    '#e9c46a', // Saffron
    '#f4a261', // Sandy Brown
    '#e76f51', // Burnt Orange
    '#d62828', // Red
  ];

  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert('Permiso denegado', 'Se requieren permisos para acceder a la galería.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.5, // Reduce la calidad al 50%
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri); // Guardar la URI de la imagen seleccionada
    }
  };

  const handleOpenCamera = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert('Permiso denegado', 'Se requieren permisos para acceder a la cámara.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.5, // Reduce la calidad al 50%
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri); // Guardar la URI de la imagen capturada
    }
  };

  const handleSubmit = async () => {
    if (!imageUri || !comment || !stage) {
      Alert.alert('Campos incompletos', 'Por favor, completa todos los campos.');
      return;
    }

    try {
      // Reducir el tamaño de la imagen
      const resizedImage = await manipulateAsync(
        imageUri,
        [{ resize: { width: 800 } }], // Redimensiona a un ancho de 800px
        { compress: 0.7, format: SaveFormat.JPEG } // Comprime la imagen
      );

      // Convertir la imagen redimensionada a base64
      const base64Image = await FileSystem.readAsStringAsync(resizedImage.uri, { encoding: 'base64' });

      // Crear el objeto de datos a enviar al backend
      const now = new Date();
      const dateTimeString = now.toLocaleString();
      const imageData = {
        stage: stage,
        image: base64Image, // Send base64 image
        comment,
        dateTime: dateTimeString, // Send date and time
      };

      // Despachar la acción addImagesToWork
      await dispatch(addImagesToWork(idWork, imageData));

      Alert.alert('Éxito', 'Datos enviados correctamente.');
      // Limpiar los campos después de enviar
      setImageUri(null);
      setComment('');
      setStage('');
      
    } catch (error) {
      console.error('Error al cargar las imágenes:', error);
      // Mostrar un mensaje de error
      Alert.alert('Error al cargar las imágenes');
    }
  };

  return (
    <ScrollView className="flex-1 bg-gray-100 p-5">
      {/* Mostrar la dirección de la propiedad */}
      <Text className="text-xl font-medium uppercase text-gray-800 mb-5 text-center">
        {propertyAddress || 'Sin dirección'}
      </Text>

      {/* Mostrar las etapas */}

      <View style={styles.stagesContainer}>
        {stages.map((stageOption, index) => (
          <Pressable
            key={stageOption}
            onPress={() => setStage(stageOption)}
            style={[
              styles.stageButton,
              { backgroundColor: stageColors[index % stageColors.length] },
              stage === stageOption && styles.selectedStageButton,
            ]}
          >
            <Text style={styles.stageButtonText}>{stageOption.toUpperCase()}</Text>
          </Pressable>
        ))}
      </View>

      {/* Botón para seleccionar imagen */}
      <Pressable
        onPress={handlePickImage}
        className="bg-blue-600 py-3 rounded-lg shadow-md mb-5 flex-row justify-center items-center"
      >
        <Ionicons name="cloud-upload-outline" size={24} color="white" />
        <Text className="text-white text-center text-lg font-semibold ml-2">
          Image
        </Text>
      </Pressable>

      {/* Botón para abrir la cámara */}
      <Pressable
        onPress={handleOpenCamera}
        className="bg-green-600 py-3 rounded-lg shadow-md mb-5 flex-row justify-center items-center"
      >
        <Ionicons name="camera-outline" size={24} color="white" />
        <Text className="text-white text-center text-lg font-semibold ml-2">
          Cámara
        </Text>
      </Pressable>

      {/* Mostrar la imagen seleccionada */}
      {imageUri && typeof imageUri === 'string' && (
        <Image source={{ uri: imageUri }} className="w-full h-48 mb-5 rounded-lg" />
      )}

      {/* Campo de comentario */}
      <TextInput
        className="border border-gray-300 rounded-lg px-4 py-2 mb-5"
        placeholder="Comentario"
        value={comment}
        onChangeText={setComment}
      />

      {/* Mostrar la fecha */}
      <Text className="text-gray-600 mb-5">Fecha: {date || 'Sin fecha'}</Text>

      {/* Botón para enviar */}
      <Pressable
        onPress={handleSubmit}
        className="bg-green-600 py-3 rounded-lg shadow-md"
      >
        <Text className="text-white text-center text-lg font-semibold">Enviar</Text>
      </Pressable>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  stagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  stageButton: {
    width: '45%',
    paddingVertical: 12,
    marginBottom: 10,
    borderRadius: 8,
    minHeight: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },

  selectedStageButton: { // <-- AÑADE ESTE ESTILO
    borderWidth: 3,
    borderColor: '#FFFFFF', // Borde blanco para contraste
    opacity: 0.8, // Ligeramente transparente para diferenciar

  },
  stageButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default UploadScreen;