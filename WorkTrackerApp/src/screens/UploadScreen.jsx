import React, { useState, useRef } from 'react';
import { View, Text, TextInput, Pressable, Image, Alert, ScrollView, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useDispatch } from 'react-redux';
import { addImagesToWork } from '../Redux/Actions/workActions';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system';
import Canvas, { Image as CanvasImage } from 'react-native-canvas'; // Import Canvas

const UploadScreen = () => {
  const { idWork } = useRoute().params;
  const navigation = useNavigation();
  const [imageUri, setImageUri] = useState(null);
  const [comment, setComment] = useState('');
  const [stage, setStage] = useState(''); // Etapa seleccionada
  const [date, setDate] = useState(new Date().toLocaleDateString());
  const dispatch = useDispatch();
  const canvasRef = useRef(null);

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
      quality: 1,
    });

    if (!result.canceled) {
      const fileUri = result.assets[0].uri;
      try {
        // Convert the file URI to a Base64 data URI
        const base64 = await FileSystem.readAsStringAsync(fileUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const dataUri = `data:image/jpeg;base64,${base64}`;
        setImageUri(dataUri); // Guardar la Base64 URI de la imagen seleccionada
      } catch (error) {
        console.error("Error converting image to Base64:", error);
        Alert.alert("Error", "Failed to convert image to Base64.");
        return;
      }
    }
  };

  const addDateTimeToImage = async (uri) => {
    return new Promise((resolve, reject) => {
      const img = new CanvasImage(canvasRef.current);
      img.src = uri;
      img.addEventListener('load', () => {
        const now = new Date();
        const dateTimeString = now.toLocaleString();

        canvasRef.current.width = img.width;
        canvasRef.current.height = img.height;
        const ctx = canvasRef.current.getContext('2d');
        ctx.drawImage(img, 0, 0, img.width, img.height);

        ctx.font = '24px Arial';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'right';
        ctx.fillText(dateTimeString, img.width - 10, img.height - 20);

        canvasRef.current.toDataURL('image/jpeg').then(resolve);
      });
      img.addEventListener('error', (error) => {
        console.error('Error loading image:', error);
        reject(uri);
      });
    });
  };

  const handleSubmit = async () => {
    if (!imageUri || !comment || !stage) {
      Alert.alert('Campos incompletos', 'Por favor, completa todos los campos.');
      return;
    }
  
    try {
      // Add date and time to the image
      const processedImageUri = await addDateTimeToImage(imageUri);
  
      // No need to convert to base64 again, it's already a base64 string
      // const base64Image = await FileSystem.readAsStringAsync(processedImageUri, { encoding: 'base64' });
      const base64Image = processedImageUri.replace(/^data:image\/jpeg;base64,/, ''); // Remove the data URI prefix
  
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
      <Canvas ref={canvasRef} style={{ display: 'none' }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  stagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around', // Distribute items evenly
    marginBottom: 10,
  },
  stageButton: {
    width: '45%', // Two buttons per row with some space
    paddingVertical: 12, // Slightly larger padding
    marginBottom: 10,
    borderRadius: 0, // Square buttons
    minHeight: 100, // Minimum height for each button
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedStageButton: {
    opacity: 0.7, // Slightly darken the selected button
  },
  stageButtonText: {
    color: 'white',
    fontSize: 16, // Slightly larger font size
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default UploadScreen;