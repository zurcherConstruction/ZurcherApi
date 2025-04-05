import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Image, Alert, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useDispatch } from 'react-redux';
import { addImagesToWork } from '../Redux/Actions/workActions';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

const UploadScreen = () => {
  const { idWork } = useRoute().params;
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

  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert('Permiso denegado', 'Se requieren permisos para acceder a la galería.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri); // Guardar la URI de la imagen seleccionada
    }
  };

  const addDateTimeToImage = async (uri) => {
    try {
      const now = new Date();
      const dateTimeString = now.toLocaleString();

      const manipulatedImage = await manipulateAsync(
        uri,
        [{ text: { value: dateTimeString, position: 'bottom-right', fontSize: 24, color: 'white' } }],
        { compress: 1, format: SaveFormat.JPEG }
      );

      return manipulatedImage.uri;
    } catch (error) {
      console.error('Error adding date/time to image:', error);
      return uri;
    }
  };

  const handleSubmit = async () => {
    if (!imageUri || !comment || !stage) {
      Alert.alert('Campos incompletos', 'Por favor, completa todos los campos.');
      return;
    }

    try {
      // Add date and time to the image
      const processedImageUri = await addDateTimeToImage(imageUri);

      // Convert the image to base64
      const base64Image = await FileSystem.readAsStringAsync(processedImageUri, { encoding: 'base64' });

      // Crear el objeto de datos a enviar al backend
      const imageData = {
        stage: stage,
        image: base64Image, // Send base64 image
      };

      // Despachar la acción addImagesToWork
      await dispatch(addImagesToWork(idWork, imageData));

      Alert.alert('Éxito', 'Datos enviados correctamente.');
      // Limpiar los campos después de enviar
      setImageUri(null);
      setComment('');
      setStage('');
      navigation.goBack(); // Regresa a la pantalla anterior
    } catch (error) {
      console.error('Error al cargar las imágenes:', error);
      // Mostrar un mensaje de error
      Alert.alert('Error al cargar las imágenes');
    }
  };

  return (
    <ScrollView className="flex-1 bg-gray-100 p-5">
      <Text className="text-3xl font-extrabold text-blue-600 mb-5 text-center">
        Cargar Imagen
      </Text>
      <Pressable
        onPress={handlePickImage}
        className="bg-blue-600 py-3 rounded-lg shadow-md mb-5"
      >
        <Text className="text-white text-center text-lg font-semibold">
          Seleccionar Imagen
        </Text>
      </Pressable>
      {imageUri && typeof imageUri === 'string' && (
        <Image source={{ uri: imageUri }} className="w-full h-48 mb-5 rounded-lg" />
      )}
      <Text className="text-lg font-semibold text-gray-700 mb-2">Etapa:</Text>
      <View className="flex-row flex-wrap justify-around mb-5">
        {stages.map((stageOption) => (
          <Pressable
            key={stageOption}
            onPress={() => setStage(stageOption)}
            className={`bg-gray-200 py-2 px-4 rounded-lg mb-2 ${stage === stageOption ? 'bg-green-400' : ''}`}
          >
            <Text className="text-gray-700">{stageOption}</Text>
          </Pressable>
        ))}
      </View>
      <TextInput
        className="border border-gray-300 rounded-lg px-4 py-2 mb-5"
        placeholder="Comentario"
        value={comment}
        onChangeText={setComment}
      />
      <Text className="text-gray-600 mb-5">Fecha: {date || 'Sin fecha'}</Text>
      <Pressable
        onPress={handleSubmit}
        className="bg-green-600 py-3 rounded-lg shadow-md"
      >
        <Text className="text-white text-center text-lg font-semibold">Enviar</Text>
      </Pressable>
    </ScrollView>
  );
};

export default UploadScreen;