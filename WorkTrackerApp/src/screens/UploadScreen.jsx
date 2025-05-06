import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Pressable, Image, Alert, ScrollView, Modal, FlatList, TouchableOpacity, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useDispatch, useSelector } from 'react-redux';
import { addImagesToWork, fetchAssignedWorks, updateWork, deleteImagesFromWork} from '../Redux/Actions/workActions';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Buffer } from "buffer";
//import * as IntentLauncher from "expo-intent-launcher"; // Añadir IntentLauncher
import * as Sharing from "expo-sharing"; // Añadir Sharing
import PdfViewer from '../utils/PdfViewer'; // Asegúrate de que la ruta sea correcta
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
  const [isInstallationSubmitted, setIsInstallationSubmitted] = useState(false);
  const [isFinalInspectionRequested, setIsFinalInspectionRequested] = useState(false);
  // --- ---
  const [pdfViewerVisible, setPdfViewerVisible] = useState(false);
  const [selectedPdfBase64, setSelectedPdfBase64] = useState('');
  // filepath: c:\Users\yaniz\Documents\ZurcherApi\WorkTrackerApp\src\screens\UploadScreen.jsx
// ...
const [selectedPdfUri, setSelectedPdfUri] = useState(null);
// ...


  const stages = [
    'foto previa del lugar',
    'materiales',
    'foto excavación',
    'camiones de arena',
    'sistema instalado',
    'extracción de piedras',
    'camiones de tierra',
    'inspeccion final'
  ];

  const stageColors = [
    '#264653',
    '#2a9d8f',
    '#e9c46a',
    '#f4a261',
    '#e76f51',
    '#e9c46a',
    '#f4a261',
    
  ];

  const handleOpenPdf = async (pdfData) => {
    try {
      const base64Pdf =
        pdfData?.data
          ? Buffer.from(pdfData.data).toString("base64")
          : typeof pdfData === 'string' && pdfData.startsWith("data:application/pdf;base64,")
          ? pdfData.split(",")[1]
          : typeof pdfData === 'string'
          ? pdfData
          : null;

      if (!base64Pdf) {
        throw new Error("El PDF no está en un formato válido o no se encontró.");
      }

      // --- GUARDAR PDF EN ARCHIVO TEMPORAL ---
      const fileUri = `${FileSystem.cacheDirectory}temp_${Date.now()}.pdf`;
      await FileSystem.writeAsStringAsync(fileUri, base64Pdf, {
        encoding: FileSystem.EncodingType.Base64,
      });
      console.log("PDF temporal guardado en:", fileUri); // Log para verificar

      // --- Guardar la URI del archivo y mostrar el modal ---
      setSelectedPdfUri(fileUri); // Guardar la URI del archivo
      setPdfViewerVisible(true);

    } catch (error) {
      console.error("Error al abrir/guardar PDF:", error);
      Alert.alert("Error", `No se pudo abrir el PDF: ${error.message}`);
    }
  };
  
        useEffect(() => {
          // Considerar estados posteriores a 'installed' también
          const installedOrLater = [
        'installed',
        'rejectedInspection',
       ]; 
          if (currentWork && installedOrLater.includes(currentWork.status)) {
            setIsInstallationSubmitted(true);
          } else {
            setIsInstallationSubmitted(false);
          }
        }, [currentWork]);
      
        // --- NUEVO useEffect para 'isFinalInspectionRequested' ---
        useEffect(() => {
          // Si el trabajo ya está en 'coverPending' o un estado posterior, marcar como solicitado
          const requestedOrLater = [
        'coverPending', 
        'finalInspectionPending', 
        'finalApproved',
        'finalRejected',
        'maintenance']; // Añadir estados relevantes
          if (currentWork && requestedOrLater.includes(currentWork.status)) {
            setIsFinalInspectionRequested(true);
          } else {
            setIsFinalInspectionRequested(false);
          }
        }, [currentWork]);
        // --- ---

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
 
 
  // filepath: c:\Users\yaniz\Documents\ZurcherApi\WorkTrackerApp\src\screens\UploadScreen.jsx
const handlePickImage = async () => {
      if (imagesByStage[selectedStage]?.length >= 12) {  return; }
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {  return; }
  
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
      if (imagesByStage[selectedStage]?.length >= 12) {  return; }
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {  return; }

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
              'Ingresa un comentario (opcional):',
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
    if (isInstallationSubmitted) return;
    try {
      await dispatch(updateWork(idWork, { status: 'installed' }));
      await dispatch(fetchAssignedWorks());
      setIsInstallationSubmitted(true);
      Alert.alert('Éxito', 'El estado del trabajo se actualizó a "installed".');
      if (navigation.canGoBack()) {

        navigation.goBack();
      } else {
        navigation.navigate('UploadScreen'); // Navegar a una pantalla específica si no hay una previa
      } // Opcional: Regresar a la pantalla anterior
    } catch (error) {
      console.error('Error al actualizar el estado del trabajo:', error);
      Alert.alert('Error', 'No se pudo actualizar el estado del trabajo.');
    }
  };

 // --- NUEVA FUNCIÓN HANDLER ---
 const handleRequestFinalInspection = async () => {
  // No hacer nada si ya se solicitó
  if (isFinalInspectionRequested) return;

  try {
    // Actualizar el estado del trabajo a 'coverPending'
    await dispatch(updateWork(idWork, { status: 'coverPending' }));
    // Refrescar los datos
    await dispatch(fetchAssignedWorks());
    // Marcar como solicitado
    setIsFinalInspectionRequested(true);
    Alert.alert('Éxito', 'Se solicitó la inspección final. El estado del trabajo se actualizó a "coverPending".');

    // Navegar atrás o a la lista
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('MyAssignedWorks');
    }
  } catch (error) {
    console.error('Error al solicitar la inspección final:', error);
    Alert.alert('Error', 'No se pudo solicitar la inspección final.');
  }
};

  const hasFinalInspectionImages = imagesByStage['sistema instalado']?.length > 0;
  const hasCoverImages = imagesByStage['inspeccion final']?.length > 0;

   const handleDeleteImage = (imageIdToDelete) => {
      Alert.alert(
        "Confirmar Eliminación",
        "¿Estás seguro?",
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Eliminar",
            onPress: async () => {
              try {
                console.log(`Intentando eliminar imagen ID: ${imageIdToDelete} del trabajo ID: ${idWork}`);
              // Despachar la acción de eliminación
              await dispatch(deleteImagesFromWork(idWork, imageIdToDelete));
              // fetchAssignedWorks() ya se llama dentro de deleteImageFromWork si se implementa así
              Alert.alert("Éxito", "Imagen eliminada correctamente.");
                await dispatch(fetchAssignedWorks());
              // El modal se actualizará solo al refrescar el estado
              } catch (error) {
                console.error("Error al eliminar la imagen:", error);
              Alert.alert("Error", "No se pudo eliminar la imagen.");
              }
            },
            style: "destructive",
          },
        ]
      );
    };


  return (
    <ScrollView className="flex-1  bg-gray-100 p-5">
      <Text className="text-xl font-medium uppercase text-gray-800 mb-2 text-center">
        {propertyAddress || 'Sin dirección'}
      </Text>
     
  {/* --- BLOQUE DE BOTONES PDF MODIFICADO --- */}
  <View className="flex-row justify-around items-start mt-2 mb-2">
  {currentWork.Permit.pdfData && (
    <TouchableOpacity
      onPress={() => handleOpenPdf(currentWork.Permit.pdfData)}
      className="items-center w-20"
    >
      <View className="w-20 h-20 bg-gray-200 border border-gray-300 rounded-md justify-center items-center mb-1 shadow">
        <Ionicons name="document-text-outline" size={40} color="#4B5563" />
      </View>
      <Text className="text-xs text-center font-medium text-gray-600">PDF Permit</Text>
    </TouchableOpacity>
  )}

  {currentWork.Permit.optionalDocs && (
    <TouchableOpacity
      onPress={() => handleOpenPdf(currentWork.Permit.optionalDocs)}
      className="items-center w-20"
    >
      <View className="w-20 h-20 bg-gray-200 border border-gray-300 rounded-md justify-center items-center mb-1 shadow">
        <Ionicons name="document-attach-outline" size={40} color="#4B5563" />
      </View>
      <Text className="text-xs text-center font-medium text-gray-600">PDF Site Plan</Text>
    </TouchableOpacity>
  )}

<PdfViewer
        visible={pdfViewerVisible}
        // Pasar la URI del archivo
        fileUri={selectedPdfUri}
        onClose={() => {
          setPdfViewerVisible(false);
          // Opcional: Limpiar el estado de la URI al cerrar
          setSelectedPdfUri(null);
          // Opcional pero recomendado: Eliminar el archivo temporal
          if (selectedPdfUri) {
            FileSystem.deleteAsync(selectedPdfUri, { idempotent: true })
              .catch(err => console.error("Error al eliminar PDF temporal:", err));
          }
        }}
      />
</View>


      {/* --- FIN BLOQUE PDF --- */}

      {/* Sección de selección de etapas */}
      <View className="flex-row flex-wrap justify-around mb-4">
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
     


      {/* --- MODIFICAR RENDERIZADO DEL BOTÓN --- */}
      {/* Mostrar el botón o el texto de espera solo si hay imágenes de inspección final */}
      {hasFinalInspectionImages && (
        <Pressable
          onPress={handleWorkInstalled}
          // Deshabilitar si ya se envió
          disabled={isInstallationSubmitted}
          // Cambiar estilo si está deshabilitado
          className={` py-3 rounded-lg shadow-md ${
            isInstallationSubmitted
              ? 'bg-gray-400' // Color deshabilitado
              : 'bg-blue-600' // Color normal
          }`}
        >
          <Text className="text-white text-center text-lg font-semibold">
            {isInstallationSubmitted
              ? 'Esperando Aprobación de Inspección'
              : 'WORK INSTALLED'}
          </Text>
        </Pressable>
      )}
      {/* --- FIN MODIFICACIÓN BOTÓN --- */}
       {/* --- NUEVO BOTÓN REQUEST FINAL INSPECTION --- */}
      {/* Mostrar solo si hay imágenes en 'inspeccion final' */}
      {hasCoverImages && (
        <Pressable
          onPress={handleRequestFinalInspection}
          // Deshabilitar si ya se solicitó
          disabled={isFinalInspectionRequested}
          // Cambiar estilo si está deshabilitado
          className={`mt-2 py-3 rounded-lg shadow-md ${
            isFinalInspectionRequested
              ? 'bg-gray-400' // Color deshabilitado
              : 'bg-green-600' // Color normal (ej. verde)
          }`}
        >
          <Text className="text-white text-center text-lg font-semibold">
            {isFinalInspectionRequested
              ? 'Esperando Inspección Final' // Texto cuando está deshabilitado
              : 'REQUEST FINAL INSPECTION'} {/* Texto normal */}
          </Text>
        </Pressable>
      )}
      {/* --- FIN NUEVO BOTÓN --- */}


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
                      <>
                        <Image
                          source={{ uri: imagesWithDataURLs[image.id] }}
                          className="w-full h-full rounded-lg"
                        />
                        {/* --- BOTÓN ELIMINAR --- */}
                        <Pressable
                          onPress={() => handleDeleteImage(image.id)}
                          className="absolute top-0 right-0 bg-red-600/80 rounded-full p-1" // Estilo del botón
                          style={{ transform: [{ translateX: 5 }, { translateY: -5 }] }} // Ajustar posición
                        >
                          <Ionicons name="close-circle" size={20} color="white" />
                        </Pressable>
                        {/* --- FIN BOTÓN ELIMINAR --- */}
                      </>
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