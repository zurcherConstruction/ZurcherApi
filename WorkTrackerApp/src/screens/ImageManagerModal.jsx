import React, { useState, useEffect } from 'react';
import { Modal, View, Text, Image, Pressable, FlatList, Alert } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy'; // ⚡ Usar API legacy

const ImageManagerModal = ({ visible, onClose, images, onAddImage, maxImages = 12, work }) => {
  const [imagesWithDataURLs, setImagesWithDataURLs] = useState({});

  useEffect(() => {
    if (work && work.images) {
      const processImages = async () => {
        const dataURLs = {};
        for (const image of work.images) {
          try {
            const dataURL = `data:image/jpeg;base64,${image.imageData}`;
            dataURLs[image.id] = dataURL;
          } catch (error) {
            console.error('Error processing image:', image.id, error);
            dataURLs[image.id] = `data:image/jpeg;base64,${image.imageData}`; // Fallback
          }
        }
        setImagesWithDataURLs(dataURLs);
      };
      processImages();
    }
  }, [work]);

  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert('Permiso denegado', 'Se requieren permisos para acceder a la galería.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.5,
    });

    if (!result.canceled) {
      const resizedImage = await manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 800 } }],
        { compress: 0.7, format: SaveFormat.JPEG }
      );

      const base64Image = await FileSystem.readAsStringAsync(resizedImage.uri, { encoding: 'base64' });
      onAddImage(base64Image);
    }
  };

  const handleOpenCamera = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert('Permiso denegado', 'Se requieren permisos para acceder a la cámara.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.5,
    });

    if (!result.canceled) {
      const resizedImage = await manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 800 } }],
        { compress: 0.7, format: SaveFormat.JPEG }
      );

      const base64Image = await FileSystem.readAsStringAsync(resizedImage.uri, { encoding: 'base64' });
      onAddImage(base64Image);
    }
  };

  return (
    <Modal visible={visible} transparent={true} animationType="slide">
      <View className="flex-1 bg-black/50 justify-center items-center">
        <View className="w-11/12 bg-white rounded-lg p-5">
          <Text className="text-lg font-bold mb-4 text-center">Gestión de Imágenes</Text>

          {/* Mostrar imágenes cargadas */}
          <FlatList
            data={Object.values(imagesWithDataURLs)}
            keyExtractor={(item, index) => index.toString()}
            numColumns={3}
            renderItem={({ item }) => (
              <Image source={{ uri: item }} className="w-20 h-20 m-1 rounded-md" />
            )}
            ListEmptyComponent={
              <Text className="text-sm text-gray-500 text-center mt-4">No hay imágenes cargadas.</Text>
            }
          />

          {/* Botones para agregar imágenes y abrir cámara */}
          <View className="flex-row justify-center space-x-2 mt-4">
            <Pressable
              onPress={handlePickImage}
              className="flex-row items-center bg-teal-600 px-3 py-1 rounded-md"
            >
              <Ionicons name="cloud-upload-outline" size={16} color="white" />
              <Text className="text-white text-xs ml-1">Agregar Imagen</Text>
            </Pressable>
            <Pressable
              onPress={handleOpenCamera}
              className="flex-row items-center bg-blue-600 px-3 py-1 rounded-md"
            >
              <Ionicons name="camera-outline" size={16} color="white" />
              <Text className="text-white text-xs ml-1">Abrir Cámara</Text>
            </Pressable>
          </View>

          {/* Botón para cerrar */}
          <Pressable
            onPress={onClose}
            className="mt-4 bg-red-500 px-4 py-2 rounded-md"
          >
            <Text className="text-white text-center text-sm">Cerrar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

export default ImageManagerModal;