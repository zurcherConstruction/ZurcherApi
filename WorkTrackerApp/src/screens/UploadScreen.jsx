import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Pressable, Image, Alert, ScrollView, Modal, FlatList, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useDispatch, useSelector } from 'react-redux';
import { addImagesToWork, markInspectionCorrectedByWorker, updateWork, deleteImagesFromWork, fetchWorkById } from '../Redux/Actions/workActions';
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
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmittingWorkInstalled, setIsSubmittingWorkInstalled] = useState(false); // Nuevo estado
  const [isRequestingFinalInspection, setIsRequestingFinalInspection] = useState(false); // Nuevo estado
  const [isBatchUploading, setIsBatchUploading] = useState(false);
  const [isMarkingCorrected, setIsMarkingCorrected] = useState(false); // Nuevo estado para el botón
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
    return { idWork, propertyAddress: routePropertyAddress, images: [], Permit: {}, inspections: [] }; // <--- CAMBIO AQUÍ
  }, [workDetailsFromState, idWork, routePropertyAddress]);

  // --- AÑADIR ESTE LOG ---
  useEffect(() => {
    if (currentWork && currentWork.idWork === idWork) { // Solo loguear cuando currentWork esté poblado con datos del estado
        console.log("UploadScreen - currentWork details:", JSON.stringify(currentWork, null, 2));
        if (currentWork.inspections) { // <--- CAMBIO AQUÍ
            console.log("UploadScreen - currentWork.inspections:", JSON.stringify(currentWork.inspections, null, 2)); // <--- CAMBIO AQUÍ
        } else {
            console.log("UploadScreen - currentWork.inspections is UNDEFINED or NULL"); // <--- CAMBIO AQUÍ
        }
    }
  }, [currentWork, idWork]);

  const relevantInitialInspection = useMemo(() => {
    if (currentWork && currentWork.inspections && currentWork.inspections.length > 0) { // <--- CAMBIO AQUÍ
      // Ordenar por fecha de creación descendente para obtener la más reciente primero
      const sortedInspections = [...currentWork.inspections] // <--- CAMBIO AQUÍ
        .filter(insp => insp.type === 'initial')
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      // Si el trabajo está en 'rejectedInspection', buscamos la última rechazada.
      // Si está en 'firstInspectionPending', buscamos la que no tiene finalStatus (en curso).
      if (currentWork.status === 'rejectedInspection') {
        return sortedInspections.find(insp => insp.finalStatus === 'rejected');
      } else if (currentWork.status === 'firstInspectionPending') {
        return sortedInspections.find(insp => !insp.finalStatus); // La que está activa
      }
      return sortedInspections[0]; // Fallback a la más reciente inicial
    }
    return null;
  }, [currentWork]);

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
    if (!selectedStage) {
      Alert.alert("Error", "Por favor, selecciona una etapa primero.");
      return;
    }

    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) { return; }

    const isTruckStage = selectedStage === 'camiones de arena' || selectedStage === 'camiones de tierra';
    const allowMultiple = !isTruckStage; 

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.5,
      allowsMultipleSelection: allowMultiple, 
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const selectedAssets = result.assets;
      console.log(`Imágenes seleccionadas: ${selectedAssets.length}`);
      //setIsBatchUploading(true); // Iniciar indicador de carga para el lote

      if (isTruckStage) {
        // Para etapas de camiones, procesar una por una como antes (o la primera si se seleccionaron múltiples accidentalmente)
        // La UI de ImagePicker en Android podría no respetar 'allowsMultipleSelection: false' perfectamente.
        const assetToProcess = selectedAssets[0]; // Tomar solo la primera para el flujo de camiones
        if (imagesByStage[selectedStage]?.length >= 12) {
            Alert.alert('Límite Alcanzado', `Ya has alcanzado el límite de 12 imágenes para ${selectedStage}.`);
            //setIsBatchUploading(false);
            return;
        }
        // Flujo existente para camiones (pedir comentario y cantidad)
        if (Platform.OS === 'ios') {
          Alert.prompt('Añadir Comentario', 'Ingresa un comentario (opcional):', [
            { text: 'Cancelar', style: 'cancel', onPress: () => setIsBatchUploading(false) },
            { text: 'Siguiente', onPress: (commentText) => {
                const comment = commentText || '';
                Alert.prompt('Cantidad de Camiones', 'Ingresa la cantidad de camiones:', [
                  { text: 'Cancelar', style: 'cancel', onPress: () => setIsBatchUploading(false) },
                  { text: 'Cargar Imagen', onPress: async (truckCountInput) => {
                      const count = parseInt(truckCountInput, 10);
                      if (isNaN(count) || count < 0) {
                        Alert.alert('Error', 'Por favor, ingresa un número válido de camiones.');
                       // setIsBatchUploading(false); return;
                      }
                      await processAndUploadImage(assetToProcess.uri, comment, count, selectedStage);
                      //setIsBatchUploading(false); // Mover aquí después de procesar la única imagen
                  }},
                ], 'plain-text', '', 'numeric');
            }},
          ], 'plain-text');
        } else { // Android para camiones
          console.log("Subiendo para etapa de camión en Android (una imagen a la vez).");
          // Aquí podrías implementar prompts nativos o una UI modal para comentario/cantidad si es necesario
          await processAndUploadImage(assetToProcess.uri, '', null, selectedStage); // Usar null para truckCount si no se pide
          //setIsBatchUploading(false);
        }
      } else { // Etapas que NO son de camiones (permiten múltiple)
        // Pedir comentario UNA VEZ para la última imagen del lote (opcional)
        let commentForLast = '';
        if (Platform.OS === 'ios') {
          // Usamos una Promise para manejar el Alert.prompt asíncrono
          const askCommentPromise = new Promise((resolve) => {
            Alert.prompt(
              'Añadir Comentario (Opcional)',
              'Este comentario se aplicará a la última imagen del lote:',
              [
                { text: 'Omitir', style: 'cancel', onPress: () => resolve('') },
                { text: 'Aceptar', onPress: (commentText) => resolve(commentText || '') },
              ],
              'plain-text'
            );
          });
          commentForLast = await askCommentPromise;
        } else {
          // En Android, podrías tener un modal simple o decidir no pedir comentario para lotes.
          // Por ahora, lo dejamos vacío para Android en lotes.
          console.log("Comentario para lote en Android no implementado, se usará vacío.");
        }

        setIsBatchUploading(true); // Asegúrate de que esto esté antes del bucle
        for (let i = 0; i < selectedAssets.length; i++) {
          if (imagesByStage[selectedStage]?.length + i >= 12) {
            Alert.alert('Límite Parcialmente Alcanzado', `Se cargarán ${i} imágenes. Se alcanzó el límite de 12 para ${selectedStage}.`);
            break;
          }
          const asset = selectedAssets[i];
          const isLastImage = i === selectedAssets.length - 1;
          const commentToApply = isLastImage ? commentForLast : '';
          
          console.log(`Procesando secuencialmente imagen ${i + 1}/${selectedAssets.length}: ${asset.uri}`);
          try {
            await processAndUploadImage(asset.uri, commentToApply, null, selectedStage);
            console.log(`Imagen ${i + 1} procesada exitosamente.`);
          } catch (uploadError) {
            console.error(`Error al procesar imagen ${i + 1} (${asset.uri}):`, uploadError);
            // Decidir si continuar con las siguientes o detenerse.
            // Por ahora, alertamos y continuamos (o podrías romper el bucle).
            Alert.alert('Error de Carga', `No se pudo cargar la imagen ${asset.uri.split('/').pop()}: ${uploadError.message}`);
            // break; // Descomenta para detener en el primer error
          }
        }
        console.log("Todas las imágenes del lote procesadas secuencialmente.");
    // --- INICIO: Mensaje de éxito opcional para el lote ---
    if (selectedAssets.length > 0) { // Solo si se intentó subir alguna imagen
        const successfulUploads = selectedAssets.filter(asset => {
            // Necesitarías una forma de saber si la subida de este asset fue exitosa.
            // Esto es un poco más complejo de rastrear aquí sin cambiar más la lógica.
            // Por ahora, un mensaje genérico si no hubo errores que detuvieran el proceso.
            return true; // Asumir éxito si no hubo 'break' por error
        }).length;

        if (successfulUploads > 0) {
            Alert.alert('Carga Completa', `${successfulUploads} imagen(es) procesada(s).`);
        }
    }
    // --- FIN: Mensaje de éxito opcional para el lote ---
    setIsBatchUploading(false);
      }
    } else if (result.canceled) {
        console.log("Selección de imágenes cancelada por el usuario.");
    } else {
        console.log("Resultado de ImagePicker sin assets:", result);
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
  const processAndUploadImage = async (imageUri, comment = '', truckCount = null, stageForUpload) => {
    // Si no se pasa stageForUpload, usa el selectedStage global.
    // Esto es para asegurar que la etapa correcta se usa si processAndUploadImage
    // se llama en un bucle donde selectedStage podría haber cambiado (aunque no debería con el flujo actual).
    const stageToUse = stageForUpload || selectedStage;

    if (!stageToUse) {
        console.error("processAndUploadImage: No se pudo determinar la etapa para la carga.");
        Alert.alert("Error Interno", "No se pudo determinar la etapa para la carga de la imagen.");
        return Promise.reject(new Error("Etapa no definida para la carga."));
    }
    
    // Ya no usamos isUploading individual, sino isBatchUploading para el lote
     setIsUploading(true); // Comentado o eliminado

    let tempImageId = `temp-${Date.now()}-${Math.random()}`;
    try {
      const resizedImage = await manipulateAsync(
        imageUri,
        [{ resize: { width: 800 } }],
        { compress: 0.7, format: SaveFormat.JPEG }
      );
      const now = new Date();
      const dateTimeString = now.toLocaleString();

      const optimisticImagePayload = {
        id: tempImageId,
        stage: stageToUse, // Usar stageToUse
        imageUrl: resizedImage.uri,
        comment: comment,
        dateTime: dateTimeString,
        truckCount: truckCount,
      };

      // Actualización optimista de la UI (directamente en imagesByStage y imagesWithDataURLs)
      setImagesByStage(prev => ({
        ...prev,
        [stageToUse]: [...(prev[stageToUse] || []), optimisticImagePayload]
      }));
      setImagesWithDataURLs(prev => ({
        ...prev,
        [tempImageId]: resizedImage.uri
      }));


      const formData = new FormData();
      formData.append('stage', stageToUse); // Usar stageToUse
      formData.append('comment', comment);
      formData.append('dateTime', dateTimeString);
      if (truckCount !== null) {
        formData.append('truckCount', truckCount.toString());
      }
      const filename = resizedImage.uri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image`;
      formData.append('imageFile', { uri: resizedImage.uri, name: filename, type: type });

      const resultAction = await dispatch(addImagesToWork(idWork, formData));
      
      // Primero, verifica si la acción misma devolvió una estructura de error explícita
      if (resultAction && resultAction.error && typeof resultAction.error === 'string') { // o resultAction.message si el error viene del backend
        console.error("Error explícito devuelto por addImagesToWork action:", resultAction.error || resultAction.message);
        // La reversión optimista ya debería estar en el catch de esta función,
        // pero puedes asegurarte aquí o simplemente dejar que el catch lo maneje.
        return Promise.reject(new Error(resultAction.error || resultAction.message || `No se pudo cargar la imagen ${filename}.`));
      }
      if (resultAction && resultAction.createdImage) {
        const uploadedImageFromServer = resultAction.createdImage;
        
        console.log(`Imagen ${filename} procesada. Imagen del servidor:`, uploadedImageFromServer);
        // Reemplazar la imagen temporal con la real del servidor
        setImagesByStage(prev => {
            const stageImages = (prev[stageToUse] || []).map(img => 
                img.id === tempImageId ? { ...uploadedImageFromServer, imageUrl: uploadedImageFromServer.imageUrl || resizedImage.uri } : img
            );
            return { ...prev, [stageToUse]: stageImages };
        });
        setImagesWithDataURLs(prev => {
            const newUrls = { ...prev };
            delete newUrls[tempImageId];
            if (uploadedImageFromServer.id) {
              newUrls[uploadedImageFromServer.id] = uploadedImageFromServer.imageUrl || resizedImage.uri;
            }
            return newUrls;
        });
        console.log(`UI actualizada para imagen con ID temporal ${tempImageId} a ID real ${uploadedImageFromServer.id}`);
        // Alert.alert('Éxito', `Imagen ${filename} cargada.`); // Quizás no alertar por cada una en un lote
      } else {
        // Si llegamos aquí, la respuesta no tuvo 'error' explícito ni 'createdImage'.
        // Esto podría significar que la respuesta del backend fue exitosa (2xx) pero no tuvo la estructura esperada,
        // o que 'addImagesToWork' no devolvió 'createdImage' como se esperaba.
        console.error("Respuesta de addImagesToWork no contiene 'createdImage' ni una estructura de error esperada:", resultAction);
        console.warn("No se pudo encontrar la imagen subida en la respuesta del servidor para actualizar ID temporal:", filename);
        
        // Como fallback, si resultAction.work.images existe, podrías intentar la lógica de find (aunque es frágil)
        // o simplemente recargar. Por ahora, recargamos.
        if (resultAction && resultAction.work && resultAction.work.images) {
            console.log("Respuesta del servidor (resultAction.work.images) en fallback:", resultAction.work.images);
        }
        dispatch(fetchWorkById(idWork)); // Recargar para asegurar consistencia como último recurso
        
        // Considera esto como un error parcial si la actualización optimista es crítica
        // return Promise.reject(new Error(`Respuesta inesperada del servidor para ${filename}. No se pudo actualizar ID.`));
      }
      return Promise.resolve(); // Indicar éxito para esta imagen
    } catch (error) {
      console.error(`Error al procesar/cargar ${imageUri}:`, error);
      // Revertir optimista
      setImagesByStage(prev => ({
        ...prev,
        [stageToUse]: (prev[stageToUse] || []).filter(img => img.id !== tempImageId)
      }));
      setImagesWithDataURLs(prev => {
          const newUrls = { ...prev };
          delete newUrls[tempImageId];
          return newUrls;
      });
      // Alert.alert('Error', `No se pudo cargar una imagen: ${error.message || 'Error desconocido'}`);
      return Promise.reject(error); // Propagar error para Promise.all
    } finally {
      // Ya no se usa setIsUploading individual aquí
       setIsUploading(false);
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
    if (isInstallationSubmitted || isSubmittingWorkInstalled) return;
    setIsSubmittingWorkInstalled(true);  
    try {
      await dispatch(updateWork(idWork, { status: 'installed' }));
      // await dispatch(fetchAssignedWorks());
      
      setIsInstallationSubmitted(true);
      Alert.alert('Éxito', 'El estado del trabajo se actualizó a "installed".');
      if (navigation.canGoBack()) {
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error al actualizar el estado del trabajo a installed:', error);
      Alert.alert('Error', 'No se pudo actualizar el estado del trabajo.');
    } finally {
      setIsSubmittingWorkInstalled(false); // Finalizar carga
    }
  };

  const handleRequestFinalInspection = async () => {
    if (isFinalInspectionRequested || isRequestingFinalInspection) return; // Evitar múltiples envíos
    setIsRequestingFinalInspection(true);
    try {
      await dispatch(updateWork(idWork, { status: 'coverPending' }));
      // await dispatch(fetchAssignedWorks()); // <--- NECESARIO AQUÍ para actualizar la lista
      setIsFinalInspectionRequested(true);
      Alert.alert('Éxito', 'Se solicitó la inspección final.');
      if (navigation.canGoBack()) {
        navigation.goBack(); // Esto te llevará de vuelta a WorksListScreen
      }
    } catch (error) {
      console.error('Error al solicitar la inspección final:', error);
      Alert.alert('Error', 'No se pudo solicitar la inspección final.');
    } finally {
      setIsRequestingFinalInspection(false); // Finalizar carga
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

  const handleMarkCorrected = async () => {
    if (!relevantInitialInspection || relevantInitialInspection.finalStatus !== 'rejected') {
      Alert.alert("Error", "No hay una inspección rechazada activa para marcar.");
      return;
    }
    if (relevantInitialInspection.workerHasCorrected) {
      Alert.alert("Info", "Las correcciones ya fueron marcadas.");
      return;
    }

    setIsMarkingCorrected(true);
    try {
      // El backend espera el ID de la inspección, no de la obra.
      await dispatch(markInspectionCorrectedByWorker(relevantInitialInspection.idInspection));
      // La acción markInspectionCorrectedByWorker ya debería despachar fetchWorkById,
      // por lo que currentWork y relevantInitialInspection se actualizarán.
       Alert.alert("Éxito", "Correcciones marcadas. La oficina será notificada para solicitar la reinspección.");
    } catch (error) {
      // El Alert de error ya se maneja en la acción
      console.error("Error al marcar correcciones:", error);
    } finally {
      setIsMarkingCorrected(false);
    }
  };

  const hasSystemInstalledImages = imagesByStage['sistema instalado']?.length > 0; // Renombrado para claridad, antes era hasFinalInspectionImages
  const hasFinalCoverImages = imagesByStage['inspeccion final']?.length > 0; // Renombrado para claridad, antes era hasCoverImages

  const showWorkInstalledButton =
    hasSystemInstalledImages &&
    currentWork &&
    currentWork.status === 'inProgress';

  // Condición para mostrar el botón de solicitar inspección final
  const showRequestFinalInspectionButton =
    hasFinalCoverImages &&
    currentWork &&
    currentWork.status === 'coverPending'; 

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
        <Text className="text-center text-sm text-gray-500 mb-3">
            Estado Actual: <Text className="font-semibold">{currentWork.status}</Text>
        </Text>

       {/* --- BLOQUE DE INSPECCIÓN RECHAZADA --- */}
       {currentWork.status === 'rejectedInspection' && relevantInitialInspection && relevantInitialInspection.finalStatus === 'rejected' && (
          <View className="my-4 p-4 border border-red-400 bg-red-50 rounded-lg">
            <Text className="text-lg font-bold text-red-700 mb-2 text-center">¡INSPECCIÓN INICIAL RECHAZADA!</Text>
            <Text className="text-sm text-red-600 mb-1">
              <Text className="font-semibold">Notas del Inspector:</Text>
            </Text>
            <Text className="text-sm text-red-600 mb-3 whitespace-pre-wrap bg-red-100 p-2 rounded">
              {relevantInitialInspection.notes || "No hay notas detalladas."}
            </Text>

            {relevantInitialInspection.workerHasCorrected ? (
              <Text className="text-md font-semibold text-green-700 text-center p-3 bg-green-100 rounded">
                Correcciones marcadas. La oficina solicitará la reinspección.
              </Text>
            ) : (
              <Pressable
                onPress={handleMarkCorrected}
                disabled={isMarkingCorrected}
                className={`py-3 rounded-lg shadow-md flex-row justify-center items-center ${
                  isMarkingCorrected ? 'bg-gray-400' : 'bg-orange-500'
                }`}
              >
                {isMarkingCorrected ? (
                  <ActivityIndicator size="small" color="white" style={{ marginRight: 8 }} />
                ) : (
                  <Ionicons name="checkmark-circle-outline" size={22} color="white" style={{ marginRight: 8 }} />
                )}
                <Text className="text-white text-center text-lg font-semibold">
                  {isMarkingCorrected ? 'Marcando...' : 'Marcar Correcciones Realizadas'}
                </Text>
              </Pressable>
            )}
          </View>
        )}
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

    

{!(currentWork.status === 'rejectedInspection' && relevantInitialInspection?.finalStatus === 'rejected' && !relevantInitialInspection?.workerHasCorrected) && (
            <>
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

              {/* Botón WORK INSTALLED */}
              {showWorkInstalledButton && (
                <Pressable
                    onPress={handleWorkInstalled}
                    disabled={isSubmittingWorkInstalled} 
                    className={`py-3 rounded-lg shadow-md flex-row justify-center items-center mb-3 ${ // Añadido mb-3 para separación
                        isSubmittingWorkInstalled ? 'bg-gray-400' : 'bg-blue-600'
                    }`}
                >
                    {isSubmittingWorkInstalled ? (
                    <ActivityIndicator size="small" color="white" style={{ marginRight: 8 }} />
                    ) : null}
                    <Text className="text-white text-center text-lg font-semibold">
                    {isSubmittingWorkInstalled ? 'Enviando...' : 'WORK INSTALLED'}
                    </Text>
                </Pressable>
                )}
            
                {/* Botón REQUEST FINAL INSPECTION */}
                {showRequestFinalInspectionButton && ( // <--- USAR LA NUEVA VARIABLE DE CONDICIÓN
                <Pressable
                    onPress={handleRequestFinalInspection}
                    disabled={isFinalInspectionRequested || isRequestingFinalInspection}
                    className={`mt-2 py-3 rounded-lg shadow-md flex-row justify-center items-center ${
                    isFinalInspectionRequested || isRequestingFinalInspection
                        ? 'bg-gray-400'
                        : 'bg-green-600'
                    }`}
                >
                    {isRequestingFinalInspection ? (
                    <ActivityIndicator size="small" color="white" style={{ marginRight: 8 }} />
                    ) : null}
                    <Text className="text-white text-center text-lg font-semibold">
                    {isRequestingFinalInspection
                        ? 'Solicitando...'
                        : isFinalInspectionRequested 
                        ? 'Inspección Final Solicitada'
                        : 'REQUEST FINAL INSPECTION'}
                    </Text>
                </Pressable>
                )}
            </>
        )}
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
                disabled={isUploading}
                className="flex-1 bg-blue-600 py-3 rounded-lg shadow-md flex-row justify-center items-center mr-2"
              >
                <Ionicons name="cloud-upload-outline" size={20} color="white" />
                <Text className="text-white text-center text-sm font-semibold ml-2">Galería</Text>
              </Pressable>
              <Pressable
                onPress={handleTakePhoto}
                disabled={isUploading}
                className="flex-1 bg-green-600 py-3 rounded-lg shadow-md flex-row justify-center items-center ml-2"
              >
                <Ionicons name="camera-outline" size={20} color="white" />
                <Text className="text-white text-center text-sm font-semibold ml-2">Cámara</Text>
              </Pressable>
            </View>
            <Pressable
              onPress={() => setModalVisible(false)}
              disabled={isUploading}
              className="mt-4 bg-red-500 px-4 py-2 rounded-md"
            >
              <Text className="text-white text-center text-sm">Cerrar</Text>
            </Pressable>
            {isUploading && (
              <View 
                style={{ 
                  position: 'absolute', // Posicionamiento absoluto para superponer
                  top: 0, 
                  left: 0, 
                  right: 0, 
                  bottom: 0, 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  backgroundColor: 'rgba(255, 255, 255, 0.8)', // Fondo semitransparente para oscurecer ligeramente el contenido detrás
                  borderRadius: 8, // Mismo borderRadius que el modal interno
                }}
              >
                <View style={{ padding: 30, backgroundColor: '#4A5568', borderRadius: 10, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5 }}>
                  <ActivityIndicator size="large" color="#E2E8F0" /> 
                  <Text style={{ marginTop: 15, fontSize: 16, color: '#E2E8F0' }}>Cargando imagen...</Text>
                </View>
              </View>
            )}
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