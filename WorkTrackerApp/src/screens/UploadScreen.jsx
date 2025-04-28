import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Pressable, Image, Alert, ScrollView, Modal, FlatList, TouchableOpacity, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useDispatch, useSelector } from 'react-redux';
import { addImagesToWork, fetchAssignedWorks, updateWork } from '../Redux/Actions/workActions';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Buffer } from "buffer";
import * as IntentLauncher from "expo-intent-launcher"; // Añadir IntentLauncher
import * as Sharing from "expo-sharing"; // Añadir Sharing

const UploadScreen = () => {
  const { idWork, propertyAddress, images } = useRoute().params;
  const navigation = useNavigation();
  const dispatch = useDispatch();
// Verifica el ID del trabajo
   const { works, loading, error } = useSelector((state) => state.work);
   const currentWork = useMemo(() => works.find(work => work.idWork === idWork), [works, idWork]);
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

  const handleOpenPdf = async (pdfData) => {
      try {
        // Verificar si el pdfData es un objeto con una propiedad `data` o si ya es una cadena base64
        const base64Pdf =
          pdfData?.data
            ? Buffer.from(pdfData.data).toString("base64") // Si es un objeto con `data`, convertirlo a base64
            : pdfData.startsWith("data:application/pdf;base64,")
            ? pdfData.split(",")[1] // Si ya es una cadena base64, extraer la parte después de "base64,"
            : null;
    
        if (!base64Pdf) {
          throw new Error("El PDF no está en un formato válido.");
        }
    
        const fileUri = `${FileSystem.cacheDirectory}temp.pdf`;
    
        // Guardar el PDF en el sistema de archivos
        await FileSystem.writeAsStringAsync(fileUri, base64Pdf, {
          encoding: FileSystem.EncodingType.Base64,
        });
    
        console.log("PDF guardado en:", fileUri);
    
        // Abrir el PDF según la plataforma
        if (Platform.OS === "android") {
          const contentUri = await FileSystem.getContentUriAsync(fileUri);
    
          const intent = {
            action: "android.intent.action.VIEW",
            data: contentUri,
            flags: 1,
            type: "application/pdf",
          };
    
          await IntentLauncher.startActivityAsync(
            "android.intent.action.VIEW",
            intent
          );
        } else if (Platform.OS === "ios") {
          // Verificar si se puede compartir
           if (!(await Sharing.isAvailableAsync())) {
              Alert.alert('Error', 'Compartir no está disponible en este dispositivo.');
              return;
           }
          await Sharing.shareAsync(fileUri, {
            mimeType: "application/pdf",
            dialogTitle: "Abrir PDF", // Título más apropiado
            UTI: "com.adobe.pdf",
          });
        }
      } catch (error) {
        console.error("Error al abrir el PDF:", error);
        Alert.alert('Error', `No se pudo abrir el PDF: ${error.message}`);
      }
    };

    // Load images from the state when the component mounts or when `currentWork` changes
    useEffect(() => {
      if (currentWork && currentWork.images) {
        // Agrupar imágenes por etapa
        const groupedImages = currentWork.images.reduce((acc, image) => {
          if (!acc[image.stage]) {
            acc[image.stage] = [];
          }
          // Asegurarse de que la imagen tenga un ID antes de añadirla
          if (image.id) {
              acc[image.stage].push(image);
          } else {
              console.warn("Imagen encontrada sin ID:", image);
          }
          return acc;
        }, {});
        setImagesByStage(groupedImages);
  
        // Crear Data URLs para mostrar las imágenes
        const dataURLs = {};
        currentWork.images.forEach((image) => {
          // Solo procesar si la imagen tiene ID y datos
          if (image.id && image.imageData) {
            // Asumir que imageData ya es base64
            dataURLs[image.id] = `data:image/jpeg;base64,${image.imageData}`;
          }
        });
        setImagesWithDataURLs(dataURLs); // Actualizar el estado con las Data URLs
  
      } else {
        // Limpiar si no hay currentWork o no tiene imágenes
        setImagesByStage({});
        setImagesWithDataURLs({});
      }
    }, [currentWork]); // Depender de currentWork para re-ejecutar cuando cambie
 
 
    const handlePickImage = async () => {
      if (imagesByStage[selectedStage]?.length >= 12) { /* ... Límite ... */ return; }
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) { /* ... Permiso ... */ return; }
  
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.5,
      });
  
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const imageUri = result.assets[0].uri;
        // --- Solicitar Comentario (iOS) ---
        if (Platform.OS === 'ios') {
          Alert.prompt(
            'Añadir Comentario', // Título
            'Ingresa un comentario para la imagen (opcional):', // Mensaje
            [
              { text: 'Cancelar', style: 'cancel' },
              {
                text: 'Cargar Imagen',
                onPress: (commentText) => processAndUploadImage(imageUri, commentText || ''), // Pasar comentario
              },
            ],
            'plain-text' // Tipo de input
          );
        } else {
          // --- Alternativa para Android (o subir sin comentario) ---
          // Podrías implementar un modal simple aquí o simplemente subir sin comentario
          console.log("Alert.prompt no soportado en Android. Subiendo sin comentario.");
          await processAndUploadImage(imageUri, ''); // Subir sin comentario en Android por ahora
        }
        // --- Fin solicitud comentario ---
      }
    };

    const handleTakePhoto = async () => {
      if (imagesByStage[selectedStage]?.length >= 12) { /* ... Límite ... */ return; }
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) { /* ... Permiso ... */ return; }
  
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.5,
      });
  
      if (!result.canceled && result.assets && result.assets.length > 0) {
         const imageUri = result.assets[0].uri;
        // --- Solicitar Comentario (iOS) ---
         if (Platform.OS === 'ios') {
          Alert.prompt(
            'Añadir Comentario',
            'Ingresa un comentario para la imagen (opcional):',
            [
              { text: 'Cancelar', style: 'cancel' },
              {
                text: 'Cargar Imagen',
                onPress: (commentText) => processAndUploadImage(imageUri, commentText || ''),
              },
            ],
            'plain-text'
          );
        } else {
          // --- Alternativa para Android ---
          console.log("Alert.prompt no soportado en Android. Subiendo sin comentario.");
          await processAndUploadImage(imageUri, '');
        }}}

 
  const processAndUploadImage = async (imageUri, comment = '') => { // Añadir parámetro comment
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
      comment: comment,
      dateTime: dateTimeString,
    };

    // Dispatch the image to the backend
    await dispatch(addImagesToWork(idWork, imageData));

    // Fetch the updated assigned works to refresh the images
    await dispatch(fetchAssignedWorks());

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

  const handleWorkInstalled = async () => {
    try {
      await dispatch(updateWork(idWork, { status: 'installed' }));
      Alert.alert('Éxito', 'El estado del trabajo se actualizó a "installed".');
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('AssignedWorksScreen'); // Navegar a una pantalla específica si no hay una previa
      } // Opcional: Regresar a la pantalla anterior
    } catch (error) {
      console.error('Error al actualizar el estado del trabajo:', error);
      Alert.alert('Error', 'No se pudo actualizar el estado del trabajo.');
    }
  };

  const hasFinalInspectionImages = imagesByStage['foto tanque instalado']?.length > 0;

  return (
    <ScrollView className="flex-1 bg-gray-100 p-5">
      <Text className="text-xl font-medium uppercase text-gray-800 mb-5 text-center">
        {propertyAddress || 'Sin dirección'}
      </Text>
     
  {/* --- BLOQUE DE BOTONES PDF MODIFICADO --- */}
  {currentWork?.Permit && (currentWork.Permit.pdfData || currentWork.Permit.optionalDocs) && (
        <View className="my-4 border-y border-gray-300 py-3">
          <Text className="text-sm font-semibold text-gray-700 mb-2 text-center">Documentos del Permiso:</Text>
          {/* Contenedor para alinear botones horizontalmente */}
          <View className="flex-row justify-between items-center">
            {/* Botón PDF Permit */}
            {currentWork.Permit.pdfData && (
              <TouchableOpacity
                onPress={() => handleOpenPdf(currentWork.Permit.pdfData)}
                // Ajustar ancho y añadir margen si ambos botones están presentes
                className={`py-2 px-4 bg-blue-600 rounded shadow ${
                  currentWork.Permit.optionalDocs ? 'w-[48%]' : 'w-full' // Ocupa todo si es el único
                }`}
              >
                <Text className="text-white text-center font-medium">Ver PDF Permit</Text>
              </TouchableOpacity>
            )}

            {/* Botón PDF Flat (Optional Docs) */}
            {currentWork.Permit.optionalDocs && (
              <TouchableOpacity
                onPress={() => handleOpenPdf(currentWork.Permit.optionalDocs)}
                 // Ajustar ancho y añadir margen si ambos botones están presentes
                 className={`py-2 px-4 bg-yellow-500 rounded shadow ${
                  currentWork.Permit.pdfData ? 'w-[48%]' : 'w-full' // Ocupa todo si es el único
                }`}
              >
                <Text className="text-white text-center font-medium">Ver PDF Flat</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
      {/* --- FIN BLOQUE PDF --- */}

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

      {hasFinalInspectionImages && (
        <Pressable
          onPress={handleWorkInstalled}
          className="mt-4 bg-blue-600 py-3 rounded-lg shadow-md"
        >
          <Text className="text-white text-center text-lg font-semibold">WORK INSTALLED</Text>
        </Pressable>
      )}

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