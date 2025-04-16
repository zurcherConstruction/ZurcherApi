import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, Image, Alert, ScrollView, Modal, FlatList } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useDispatch, useSelector } from 'react-redux';
import { addImagesToWork } from '../Redux/Actions/workActions';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import Ionicons from 'react-native-vector-icons/Ionicons';

const UploadScreen = () => {
  const { idWork, propertyAddress } = useRoute().params;
  const navigation = useNavigation();
  const dispatch = useDispatch();

  const { work } = useSelector((state) => state.work);

  const [selectedStage, setSelectedStage] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [imagesByStage, setImagesByStage] = useState({});
  const [imagesWithDataURLs, setImagesWithDataURLs] = useState({});

  const stages = [
    'foto previa del lugar',
    'foto excavación',
    'foto tanque instalado',
    'fotos de cada camión de arena',
    'foto inspección final',
    'foto de extracción de piedras',
  ];

  const stageColors = [
    '#264653',
    '#2a9d8f',
    '#e9c46a',
    '#f4a261',
    '#e76f51',
    '#d62828',
  ];

  // Load images from the state when the component mounts or when `work` changes
  useEffect(() => {
    if (work && work.images) {
      const groupedImages = work.images.reduce((acc, image) => {
        if (!acc[image.stage]) {
          acc[image.stage] = [];
        }
        acc[image.stage].push(image);
        return acc;
      }, {});
      setImagesByStage(groupedImages);

      const processImages = async () => {
        const dataURLs = {};
        for (const image of work.images) {
          try {
            const dataURL = `data:image/jpeg;base64,${image.imageData}`;
            dataURLs[image.id] = dataURL;
          } catch (error) {
            console.error('Error processing image:', image.id, error);
          }
        }
        setImagesWithDataURLs(dataURLs);
      };
      processImages();
    }
  }, [work]);

  const handlePickImage = async () => {
    if (imagesByStage[selectedStage]?.length >= 12) {
      Alert.alert('Límite alcanzado', 'No puedes cargar más de 12 imágenes para esta etapa.');
      return;
    }

    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert('Permiso denegado', 'Se requieren permisos para acceder a la galería.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.5,
    });

    if (!result.canceled) {
      await processAndUploadImage(result.assets[0].uri);
    }
  };

  const handleTakePhoto = async () => {
    if (imagesByStage[selectedStage]?.length >= 12) {
      Alert.alert('Límite alcanzado', 'No puedes cargar más de 12 imágenes para esta etapa.');
      return;
    }

    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert('Permiso denegado', 'Se requieren permisos para usar la cámara.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.5,
    });

    if (!result.canceled) {
      await processAndUploadImage(result.assets[0].uri);
    }
  };

  const processAndUploadImage = async (imageUri) => {
    try {
      const resizedImage = await manipulateAsync(
        imageUri,
        [{ resize: { width: 800 } }],
        { compress: 0.7, format: SaveFormat.JPEG }
      );

      const base64Image = await FileSystem.readAsStringAsync(resizedImage.uri, { encoding: 'base64' });

      const now = new Date();
      const dateTimeString = now.toLocaleString();
      const imageData = {
        stage: selectedStage,
        image: base64Image,
        comment: '',
        dateTime: dateTimeString,
      };

      // Dispatch the image to the backend
      await dispatch(addImagesToWork(idWork, imageData));

      // Update images by stage locally
      setImagesByStage((prev) => ({
        ...prev,
        [selectedStage]: [...(prev[selectedStage] || []), imageData],
      }));

      Alert.alert('Éxito', 'Imagen cargada correctamente.');
    } catch (error) {
      console.error('Error al cargar la imagen:', error);
      Alert.alert('Error al cargar la imagen');
    }
  };

  const handleStagePress = (stageOption) => {
    setSelectedStage(stageOption);
    setModalVisible(true);
  };

  return (
    <ScrollView className="flex-1 bg-gray-100 p-5">
      <Text className="text-xl font-medium uppercase text-gray-800 mb-5 text-center">
        {propertyAddress || 'Sin dirección'}
      </Text>

      {/* Sección de selección de etapas */}
      <View className="flex-row flex-wrap justify-around mb-5">
        {stages.map((stageOption, index) => (
          <Pressable
            key={stageOption}
            onPress={() => handleStagePress(stageOption)}
            className={`w-[47%] h-24 p-3 mb-3 rounded-lg flex justify-center ${
              selectedStage === stageOption ? 'border-4 border-white opacity-80' : ''
            }`}
            style={{ backgroundColor: stageColors[index % stageColors.length] }}
          >
            <Text className="text-white text-center font-bold text-sm">
              {stageOption.toUpperCase()}
            </Text>
          </Pressable>
        ))}
      </View>

      <Modal visible={modalVisible} transparent={true} animationType="slide">
        <View className="flex-1 bg-black/50 justify-center items-center">
          <View className="w-11/12 bg-white rounded-lg p-4">
            <Text className="text-lg font-bold mb-4 text-center">
              {selectedStage?.toUpperCase() || 'Sin etapa seleccionada'}
            </Text>
            <Text className="text-gray-600 mb-4 text-center">
              Imágenes cargadas: {imagesByStage[selectedStage]?.length || 0}/12
            </Text>
            <FlatList
              data={Array.from({ length: 12 })}
              keyExtractor={(_, index) => index.toString()}
              numColumns={4}
              renderItem={({ index }) => {
                const image = imagesByStage[selectedStage]?.[index];
                return (
                  <View className="w-20 h-20 m-2 rounded-lg bg-gray-300 justify-center items-center">
                    {image && imagesWithDataURLs[image.id] ? (
                      <Image
                        source={{ uri: imagesWithDataURLs[image.id] }}
                        className="w-full h-full rounded-lg"
                      />
                    ) : (
                      <Text className="text-gray-500 text-xs"></Text>
                    )}
                  </View>
                );
              }}
            />
            <View className="flex-row justify-between mt-4">
              <Pressable
                onPress={handlePickImage}
                className="flex-1 bg-blue-600 py-3 rounded-lg shadow-md flex-row justify-center items-center mr-2"
              >
                <Ionicons name="cloud-upload-outline" size={20} color="white" />
                <Text className="text-white text-center text-sm font-semibold ml-2">Galería</Text>
              </Pressable>
              <Pressable
                onPress={handleTakePhoto}
                className="flex-1 bg-green-600 py-3 rounded-lg shadow-md flex-row justify-center items-center ml-2"
              >
                <Ionicons name="camera-outline" size={20} color="white" />
                <Text className="text-white text-center text-sm font-semibold ml-2">Cámara</Text>
              </Pressable>
            </View>
            <Pressable
              onPress={() => setModalVisible(false)}
              className="mt-4 bg-red-500 px-4 py-2 rounded-md"
            >
              <Text className="text-white text-center text-sm">Cerrar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

export default UploadScreen;