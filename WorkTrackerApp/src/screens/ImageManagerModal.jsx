import React, { useState, useEffect } from 'react';
import { Modal, View, Text, Image, Pressable, StyleSheet, FlatList, Alert } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { addImagesToWork } from '../Redux/Actions/workActions';
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
  const handleAddImage = async (stage, base64Image) => {
    const now = new Date();
    const dateTimeString = now.toLocaleString();
  
    const imageData = {
      stage,
      image: base64Image,
      dateTime: dateTimeString,
    };
  
    try {
      await dispatch(addImagesToWork(idWork, imageData)); // Enviar al backend
      setStageImages((prev) => ({
        ...prev,
        [stage]: [...(prev[stage] || []), base64Image], // Actualizar estado local
      }));
      Alert.alert('Éxito', 'Imagen cargada correctamente.');
    } catch (error) {
      console.error('Error al cargar la imagen:', error);
      Alert.alert('Error', 'No se pudo cargar la imagen.');
    }
  };

  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
  
    if (!permissionResult.granted) {
      Alert.alert('Permiso denegado', 'Se requieren permisos para acceder a la galería.');
      return;
    }
  
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: [ImagePicker.MediaType.IMAGE], // Correcto
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
      mediaTypes: [ImagePicker.MediaType.IMAGE], // Cambiado a la nueva API
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
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Gestión de Imágenes</Text>

          {/* Mostrar imágenes cargadas */}
          <FlatList
  data={Object.values(imagesWithDataURLs)}
  keyExtractor={(item, index) => index.toString()}
  numColumns={3}
  renderItem={({ item }) => (
    <Image source={{ uri: item }} style={styles.imageThumbnail} />
  )}
  ListEmptyComponent={
    <Text style={styles.emptyText}>No hay imágenes cargadas.</Text>
  }
/>

          {/* Botón para agregar imágenes */}
          {Object.keys(imagesWithDataURLs).length < maxImages && (
            <Pressable
              onPress={handlePickImage}
              style={styles.addButton}
            >
              <Ionicons name="cloud-upload-outline" size={24} color="white" />
              <Text style={styles.addButtonText}>Agregar Imagen</Text>
            </Pressable>
          )}

          {/* Botón para cerrar */}
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>Cerrar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  imageThumbnail: {
    width: 80,
    height: 80,
    margin: 5,
    borderRadius: 5,
  },
  emptyText: {
    fontSize: 14,
    color: 'gray',
    marginVertical: 10,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a9d8f',
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    marginLeft: 5,
  },
  closeButton: {
    marginTop: 15,
    backgroundColor: '#e76f51',
    padding: 10,
    borderRadius: 5,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
  },
});

export default ImageManagerModal;