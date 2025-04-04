import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Image, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';

const UploadScreen = () => {
  const [imageUri, setImageUri] = useState(null);
  const [comment, setComment] = useState('');
  const [stage, setStage] = useState('foto previa del lugar'); // Etapa seleccionada
  const [date, setDate] = useState(new Date().toLocaleDateString());

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

  const handleSubmit = () => {
    if (!imageUri || !comment || !stage) {
      Alert.alert('Campos incompletos', 'Por favor, completa todos los campos.');
      return;
    }

    // Aquí puedes enviar los datos al backend
    console.log({
      imageUri,
      comment,
      stage,
      date,
    });

    Alert.alert('Éxito', 'Datos enviados correctamente.');
    // Limpiar los campos después de enviar
    setImageUri(null);
    setComment('');
    setStage('foto previa del lugar');
  };

  return (
    <View className="flex-1 bg-gray-100 p-5">
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
      <View className="border border-gray-300 rounded-lg mb-5">
        <Picker
          selectedValue={stage}
          onValueChange={(itemValue) => setStage(itemValue)}
        >
          {stages.map((stageOption) => (
            <Picker.Item key={stageOption} label={stageOption} value={stageOption} />
          ))}
        </Picker>
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
    </View>
  );
};

export default UploadScreen;