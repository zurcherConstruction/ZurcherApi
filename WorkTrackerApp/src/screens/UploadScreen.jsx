import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Pressable, Image, Alert, ScrollView, Modal, FlatList, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useDispatch, useSelector } from 'react-redux';
import { addImagesToWork, fetchAssignedWorks, updateWork, deleteImagesFromWork, fetchWorkById } from '../Redux/Actions/workActions';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Buffer } from "buffer";
import PdfViewer from '../utils/PdfViewer'; // Asegúrate de que la ruta sea correcta


const UploadScreen = () => {
  const { idWork, propertyAddress: routePropertyAddress } = useRoute().params; // Solo idWork y la dirección inicial de la ruta
  const navigation = useNavigation();
  const dispatch = useDispatch();
  // Verifica el ID del trabajo
  const { work: workDetailsFromState, loading: workDetailsLoading, error: workDetailsError } = useSelector((state) => state.work);
  const [selectedStage, setSelectedStage] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [imagesByStage, setImagesByStage] = useState({});
  const [imagesWithDataURLs, setImagesWithDataURLs] = useState({});
  const [isInstallationSubmitted, setIsInstallationSubmitted] = useState(false);
  const [isFinalInspectionRequested, setIsFinalInspectionRequested] = useState(false);
  const [pdfViewerVisible, setPdfViewerVisible] = useState(false);
  const [selectedPdfUri, setSelectedPdfUri] = useState(null);
  const [currentWorkData, setCurrentWorkData] = useState({ /* ... initial state ... */ });
  const [largeImageModalVisible, setLargeImageModalVisible] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState(null);
  const [imageSelectionModalWasOpen, setImageSelectionModalWasOpen] = useState(false); // New state
 
  // --- EFECTO PARA BUSCAR DETALLES DEL TRABAJO ---
  useEffect(() => {
    if (idWork) {
      console.log(`UploadScreen: Despachando fetchWorkById para ${idWork}`);
      dispatch(fetchWorkById(idWork));
    }
  }, [dispatch, idWork]);

  const currentWork = useMemo(() => {
    if (workDetailsFromState && workDetailsFromState.idWork === idWork) {
      return workDetailsFromState;
    }
    // Mientras carga o si hay error, puedes devolver un objeto base o null
    return { idWork, propertyAddress: routePropertyAddress, images: [], Permit: {} };
  }, [workDetailsFromState, idWork, routePropertyAddress]);


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
    '#264653',

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


  useEffect(() => {

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


  useEffect(() => {
    if (currentWork && currentWork.idWork === idWork && currentWork.images) { // Asegúrate que currentWork.images exista
      const grouped = (currentWork.images || []).reduce((acc, img) => {
        const stage = img.stage;
        if (!acc[stage]) acc[stage] = [];
        if (img.id) acc[stage].push(img);
        else console.warn("Imagen sin ID:", img);
        return acc;
      }, {});
      setImagesByStage(grouped);

      const urls = {};
      (currentWork.images || []).forEach(img => {
        if (img.id && img.imageUrl) { // Usar imageUrl en lugar de imageData
          urls[img.id] = img.imageUrl; // Directamente la URL de Cloudinary
        }
      });
      setImagesWithDataURLs(urls); // imagesWithDataURLs ahora contendrá URLs de Cloudinary
    } else {
      setImagesByStage({});
      setImagesWithDataURLs({});
    }
    setIsInstallationSubmitted(currentWork?.status === 'installed');
  }, [currentWork, idWork]);


  const handlePickImage = async () => {
    console.log("handlePickImage - selectedStage:", selectedStage); // <-- LOG
    if (!selectedStage) {
      Alert.alert("Error", "Por favor, selecciona una etapa primero.");
      return;
    }
    if (imagesByStage[selectedStage]?.length >= 12) { return; }
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) { return; }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.5,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const imageUri = result.assets[0].uri;
      const isTruckStage = selectedStage === 'camiones de arena' || selectedStage === 'camiones de tierra';

      if (Platform.OS === 'ios') {
        Alert.prompt(
          'Añadir Comentario',
          'Ingresa un comentario (opcional):',
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Siguiente',
              onPress: (commentText) => {
                const comment = commentText || ''; // Usar string vacío si no hay comentario
                if (isTruckStage) {
                  // Si es etapa de camiones, pedir cantidad
                  Alert.prompt(
                    'Cantidad de Camiones',
                    'Ingresa la cantidad de camiones:',
                    [
                      { text: 'Cancelar', style: 'cancel' },
                      {
                        text: 'Cargar Imagen',
                        onPress: (truckCountInput) => {
                          const count = parseInt(truckCountInput, 10);
                          if (isNaN(count) || count < 0) {
                            Alert.alert('Error', 'Por favor, ingresa un número válido de camiones.');
                            return;
                          }
                          processAndUploadImage(imageUri, comment, count);
                        },
                      },
                    ],
                    'plain-text',
                    '',
                    'numeric'
                  );
                } else {
                  // Si no es etapa de camiones, subir solo con comentario
                  processAndUploadImage(imageUri, comment, null);
                }
              },
            },
          ],
          'plain-text' // Tipo para el comentario
        );
      } else { // Android u otros (sin cambios por ahora)
        let comment = '';
        let truckCount = null;
        console.log("Subiendo sin comentario en Android por ahora.");
        if (isTruckStage) {
          console.warn("Prompt de cantidad no implementado para Android. Usando null.");
        }
        await processAndUploadImage(imageUri, comment, truckCount);
      }
      // --- Fin solicitud ---
    }
  };

  const handleTakePhoto = async () => {
    console.log("handleTakePhoto - selectedStage:", selectedStage); // <-- LOG
    if (!selectedStage) {
      Alert.alert("Error", "Por favor, selecciona una etapa primero.");
      return;
    }
    if (imagesByStage[selectedStage]?.length >= 12) { return; }
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) { return; }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.5,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const imageUri = result.assets[0].uri;
      const isTruckStage = selectedStage === 'camiones de arena' || selectedStage === 'camiones de tierra';
      // --- Solicitar Comentario (iOS) ---
      if (Platform.OS === 'ios') {
        Alert.prompt(
          'Añadir Comentario',
          'Ingresa un comentario (opcional):',
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Siguiente',
              onPress: (commentText) => {
                const comment = commentText || '';
                if (isTruckStage) {
                  Alert.prompt(
                    'Cantidad de Camiones',
                    'Ingresa la cantidad de camiones:',
                    [
                      { text: 'Cancelar', style: 'cancel' },
                      {
                        text: 'Cargar Imagen',
                        onPress: (truckCountInput) => {
                          const count = parseInt(truckCountInput, 10);
                          if (isNaN(count) || count < 0) {
                            Alert.alert('Error', 'Por favor, ingresa un número válido de camiones.');
                            return;
                          }
                          processAndUploadImage(imageUri, comment, count);
                        },
                      },
                    ],
                    'plain-text',
                    '',
                    'numeric'
                  );
                } else {
                  processAndUploadImage(imageUri, comment, null);
                }
              },
            },
          ],
          'plain-text'
        );
      } else { // Android (sin cambios por ahora)
        console.log("Subiendo sin comentario/conteo específico en Android por ahora.");
        let truckCount = null;
        await processAndUploadImage(imageUri, '', truckCount);
      }
      // --- Fin solicitud ---
    }
  };


  // MODIFICAR processAndUploadImage
  const processAndUploadImage = async (imageUri, comment = '', truckCount = null) => {
    let tempImageId = `temp-${Date.now()}-${Math.random()}`;
    try {
      const resizedImage = await manipulateAsync(
        imageUri,
        [{ resize: { width: 800 } }], // O el tamaño que prefieras
        { compress: 0.7, format: SaveFormat.JPEG }
      );

      const now = new Date();
      const dateTimeString = now.toLocaleString();

      // Actualización optimista: usa la URI local para la vista previa
      const optimisticImagePayload = {
        id: tempImageId,
        stage: selectedStage,
        // Para la UI optimista, podrías usar resizedImage.uri directamente si tu componente Image lo soporta
        // o si necesitas base64 para la UI optimista, puedes generarlo aquí solo para eso.
        // Por simplicidad, asumiremos que la UI optimista puede usar la URI local.
        // Si necesitas base64 para la UI optimista, puedes leerlo aquí pero NO enviarlo al backend.
        // Ejemplo: const base64ForOptimisticUI = await FileSystem.readAsStringAsync(resizedImage.uri, { encoding: 'base64' });
        // Y luego en setCurrentWorkData, usarías una propiedad temporal como `optimisticLocalUrl: resizedImage.uri` o `optimisticBase64: base64ForOptimisticUI`
        // Para este ejemplo, vamos a asumir que la UI optimista puede usar la URI local.
        // O, si quieres que la UI optimista muestre un placeholder o nada hasta que la URL de Cloudinary llegue:
        imageUrl: resizedImage.uri, // Usar URI local para la vista previa optimista
        comment: comment,
        dateTime: dateTimeString,
        truckCount: truckCount,
      };

      setCurrentWorkData(prev => ({
        ...prev,
        images: [...(prev.images || []), optimisticImagePayload]
      }));

      // Crear FormData para enviar al backend
      const formData = new FormData();
      formData.append('stage', selectedStage);
      formData.append('comment', comment);
      formData.append('dateTime', dateTimeString);
      if (truckCount !== null) {
        formData.append('truckCount', truckCount.toString());
      }
      // Adjuntar el archivo
      // El nombre del archivo es importante para multer en el backend
      const filename = resizedImage.uri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image`; // ej. image/jpeg, image/png

      formData.append('imageFile', { // 'imageFile' debe coincidir con upload.single('imageFile') en el backend
        uri: resizedImage.uri,
        name: filename,
        type: type,
      });

      // La acción addImagesToWork ahora debe estar preparada para enviar FormData
      // y el backend para recibirlo.
      const resultAction = await dispatch(addImagesToWork(idWork, formData));

      if (resultAction && resultAction.work && resultAction.work.images) {
        Alert.alert('Éxito', 'Imagen cargada correctamente a Cloudinary.');
        // Redux ya debería haber actualizado currentWork con las URLs de Cloudinary.
        // La UI optimista se reemplazará con los datos reales de Redux.
        // Si la UI optimista usó tempImageId, el reducer addImagesSuccess
        // debería reemplazar la imagen temporal con la real del servidor.
      } else {
        console.error("Error en resultAction de addImagesToWork (Cloudinary) o respuesta inesperada:", resultAction);
        Alert.alert('Error', 'No se pudo cargar la imagen a Cloudinary o respuesta inesperada.');
        setCurrentWorkData(prev => ({
          ...prev,
          images: prev.images.filter(img => img.id !== tempImageId) // Revertir optimista
        }));
      }

    } catch (error) {
      console.error('Error al procesar/cargar la imagen (Cloudinary):', error);
      Alert.alert('Error', `No se pudo cargar la imagen: ${error.message || 'Error desconocido'}`);
      setCurrentWorkData(prev => ({
        ...prev,
        images: prev.images.filter(img => img.id !== tempImageId) // Revertir optimista
      }));
    }
  };

  const handleDeleteImage = async (imageIdToDelete) => {
    Alert.alert(
      "Confirmar Eliminación",
      "¿Estás seguro?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          onPress: async () => {
            const originalImages = currentWork?.images ? [...currentWork.images] : [];
            setCurrentWorkData(prev => ({
              ...prev,
              images: prev.images ? prev.images.filter(img => img.id !== imageIdToDelete) : []
            }));

            try {
              const resultAction = await dispatch(deleteImagesFromWork(idWork, imageIdToDelete));


              Alert.alert("Éxito", "Imagen eliminada correctamente.");

            } catch (error) {
              console.error("Error al eliminar la imagen:", error);
              Alert.alert("Error", `No se pudo eliminar la imagen: ${error.message || 'Error desconocido'}`);
              setCurrentWorkData(prev => ({ ...prev, images: originalImages }));
            }
          },
          style: "destructive",
        },
      ]
    );
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
      }
    } catch (error) {
      console.error('Error al actualizar el estado del trabajo:', error);
      Alert.alert('Error', 'No se pudo actualizar el estado del trabajo.');
    }
  };

  const handleRequestFinalInspection = async () => {
    if (isFinalInspectionRequested) return;
    try {
      await dispatch(updateWork(idWork, { status: 'coverPending' }));
      await dispatch(fetchAssignedWorks()); // <--- NECESARIO AQUÍ para actualizar la lista
      setIsFinalInspectionRequested(true);
      Alert.alert('Éxito', 'Se solicitó la inspección final.');
      if (navigation.canGoBack()) {
        navigation.goBack(); // Esto te llevará de vuelta a WorksListScreen
      }
    } catch (error) {
      console.error('Error al solicitar la inspección final:', error);
      Alert.alert('Error', 'No se pudo solicitar la inspección final.');
    }
  };
  const handleOpenLargeImage = (uri) => {
    console.log('handleOpenLargeImage called with URI:', uri);
    setSelectedImageUri(uri);
    if (modalVisible) { // If the image selection modal is currently open
      setImageSelectionModalWasOpen(true); // Remember it was open
      setModalVisible(false); // Hide it
    } else {
      setImageSelectionModalWasOpen(false);
    }
    setLargeImageModalVisible(true); // Show the large image modal
  };

  const handleCloseLargeImage = () => {
    setLargeImageModalVisible(false);
    setSelectedImageUri(null);
    if (imageSelectionModalWasOpen) { // If the image selection modal was open before
      // Re-open the image selection modal. It will use the existing selectedStage.
      setModalVisible(true); 
      setImageSelectionModalWasOpen(false); // Reset the flag
    }
  };


  const hasFinalInspectionImages = imagesByStage['sistema instalado']?.length > 0;
  const hasCoverImages = imagesByStage['inspeccion final']?.length > 0;

  // --- Lógica de renderizado ---
  if (workDetailsLoading && (!workDetailsFromState || workDetailsFromState.idWork !== idWork)) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
        <Text>Cargando detalles del trabajo...</Text>
      </View>
    );
  }

  if (workDetailsError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Error al cargar detalles: {workDetailsError.message || JSON.stringify(workDetailsError)}</Text>
      </View>
    );
  }

  // Si currentWork aún no tiene los datos esperados (ej. después de un error o antes de la carga inicial)
  if (!currentWork || currentWork.idWork !== idWork || !currentWork.Permit) {
   
    console.log("UploadScreen: currentWork no está listo o no coincide con idWork", currentWork);
     return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><Text>Esperando datos del trabajo...</Text></View>;
  }
  return (
    <>
      <ScrollView className="flex-1  bg-gray-100 p-5">
        <Text className="text-xl font-medium uppercase text-gray-800 mb-2 text-center">
          {currentWork.propertyAddress || routePropertyAddress || 'Sin dirección'}
        </Text>

        {/* --- BLOQUE DE BOTONES PDF MODIFICADO --- */}
        <View className="flex-row justify-around items-start mt-2 mb-2">
          {currentWork.Permit?.pdfData && (
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

          {currentWork.Permit?.optionalDocs && (
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
              className={`w-[47%] h-24 p-3 mb-3 rounded-lg flex justify-center ${selectedStage === stageOption ? 'border-4 border-white opacity-80' : ''
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
            className={` py-3 rounded-lg shadow-md ${isInstallationSubmitted
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
      
        {hasCoverImages && (
          <Pressable
            onPress={handleRequestFinalInspection}
            // Deshabilitar si ya se solicitó
            disabled={isFinalInspectionRequested}
            // Cambiar estilo si está deshabilitado
            className={`mt-2 py-3 rounded-lg shadow-md ${isFinalInspectionRequested
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
      </ScrollView>

      {/* Modals are now outside the ScrollView */}
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
                const isTruckStage = selectedStage === 'camiones de arena' || selectedStage === 'camiones de tierra';
                const imageUri = image && imagesWithDataURLs[image.id] ? imagesWithDataURLs[image.id] : null;
                return (
                  <View className="w-20 h-20 m-2 rounded-lg bg-gray-300 justify-center items-center">
                    {imageUri ? (
                      <TouchableOpacity
                        onPress={() => {
                          console.log('Thumbnail tapped. Image URI:', imageUri);
                          if (imageUri) {
                            handleOpenLargeImage(imageUri);
                          } else {
                            console.log('Cannot open large image, URI is null or undefined when tapped.');
                          }
                        }}
                        className="w-full h-full"
                      >
                        <Image
                          source={{ uri: imageUri }}
                          className="w-full h-full rounded-lg"
                        />
                        <Pressable
                          onPress={() => handleDeleteImage(image.id)}
                          className="absolute top-0 right-0 bg-red-600/80 rounded-full p-1"
                          style={{ transform: [{ translateX: 5 }, { translateY: -5 }] }}
                        >
                          <Ionicons name="close-circle" size={20} color="white" />
                        </Pressable>
                        {isTruckStage && image.truckCount !== null && image.truckCount !== undefined && (
                          <View className="absolute bottom-0 left-0 bg-blue-600/80 rounded-full px-1.5 py-0.5 m-1">
                            <Text className="text-white text-xs font-bold">{image.truckCount}</Text>
                          </View>
                        )}
                      </TouchableOpacity>
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

      <Modal
        visible={largeImageModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseLargeImage}
      >
        <View className="flex-1 bg-blue-900/80 justify-center items-center p-4">
          {largeImageModalVisible && console.log('Large image modal rendering. Selected URI:', selectedImageUri)}
          
          <TouchableOpacity className="absolute top-10 right-5 z-10" onPress={handleCloseLargeImage}>
            <Ionicons name="close-circle" size={40} color="white" />
          </TouchableOpacity>

          
          

          {selectedImageUri ? (
            <View style={{ width: '90%', height: '70%', borderColor: 'lime' }}>
              <Image
                key={selectedImageUri}
                source={{ uri: selectedImageUri }}
                style={{ width: '100%', height: '100%' }} // Changed from flex: 1
                resizeMode="contain"
                onError={(e) => console.log('Image load error in large modal:', e.nativeEvent.error)}
                onLoad={() => console.log('Large image successfully loaded (onLoad event).')}
              />
            </View>
          ) : (
            largeImageModalVisible && <Text style={{ color: 'white', fontSize: 16 }}>Modal visible, but no image URI.</Text>
          )}
        </View>
      </Modal>
    </>
  );
};

export default UploadScreen;