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
  const [isMarkingCovered, setIsMarkingCovered] = useState(false);
 const [notifiedForStoneCO, setNotifiedForStoneCO] = useState(false); // Para controlar la notificación/actualización

  // --- EFECTO PARA BUSCAR DETALLES DEL TRABAJO ---
  useEffect(() => {
    if (idWork) {
     
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
         if (currentWork.stoneExtractionCONeeded === false) {
        setNotifiedForStoneCO(false);
      }
        if (currentWork.inspections) { // <--- CAMBIO AQUÍ
           
        } else {
          console.warn("currentWork no tiene inspecciones:", currentWork);
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

 const handleOpenPdf = async (pdfSource) => {
    try {
      let fileUri;
      let isDownloadedTempFile = false;

      // Verificar si pdfSource es una URL
      if (typeof pdfSource === 'string' && (pdfSource.startsWith('http://') || pdfSource.startsWith('https://'))) {
        const tempFileName = `temp_download_${Date.now()}.pdf`; // Asegurar extensión .pdf
        fileUri = `${FileSystem.cacheDirectory}${tempFileName}`;
        console.log(`Intentando descargar PDF desde: ${pdfSource} a ${fileUri}`);
        
        const downloadResult = await FileSystem.downloadAsync(pdfSource, fileUri);
        
        if (downloadResult.status !== 200) {
          throw new Error(`Error al descargar PDF (status ${downloadResult.status}).`);
        }
        console.log('PDF descargado exitosamente:', downloadResult.uri);
        isDownloadedTempFile = true; 
        // fileUri ya es la URI del archivo descargado
      } else {
        // Lógica existente para base64
        const base64Pdf =
          pdfSource?.data // Si viene de currentWork.Permit.pdfData (objeto con Buffer)
            ? Buffer.from(pdfSource.data).toString("base64")
            : typeof pdfSource === 'string' && pdfSource.startsWith("data:application/pdf;base64,")
              ? pdfSource.split(",")[1]
              : typeof pdfSource === 'string' // Asumir que es base64 puro si no es URL y es string
                ? pdfSource 
                : null;

        if (!base64Pdf) {
          throw new Error("El PDF no está en un formato válido (base64) o no se encontró.");
        }
        const tempFileNameBase64 = `temp_base64_${Date.now()}.pdf`;
        fileUri = `${FileSystem.cacheDirectory}${tempFileNameBase64}`;
        await FileSystem.writeAsStringAsync(fileUri, base64Pdf, {
          encoding: FileSystem.EncodingType.Base64,
        });
        isDownloadedTempFile = true; // También es un archivo temporal
      }

      setSelectedPdfUri(fileUri);
      setPdfViewerVisible(true);
      // No eliminamos el archivo aquí, PdfViewer lo hará en su onClose

    } catch (error) {
      console.error("Error en handleOpenPdf:", error);
      Alert.alert("Error al abrir PDF", `${error.message}. Asegúrate de que la URL sea accesible y el archivo sea un PDF válido.`);
      // Si hubo un error y se descargó un archivo, intentar limpiarlo
      if (fileUri && isDownloadedTempFile) {
        FileSystem.deleteAsync(fileUri, { idempotent: true }).catch(delError => console.error("Error al limpiar archivo temporal tras fallo en handleOpenPdf:", delError));
      }
    }
  };

  // Función para identificar URLs de imágenes comunes (puedes mejorarla)
  const isCommonImageUrl = (url) => {
    if (!url || typeof url !== 'string') return false;
    // Intenta ser un poco más flexible con las URLs de Cloudinary que pueden no tener extensión
    if (url.includes('cloudinary.com')) return true; 
    return /\.(jpeg|jpg|gif|png)(\?|$)/i.test(url);
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


  const handlePickImage = async () => { // Sin stageOverride
    // const stageToUse = selectedStage; // Ya no es necesario, selectedStage es la fuente

    if (!selectedStage) { // Usar selectedStage directamente
      Alert.alert("Error", "Por favor, selecciona una etapa primero.");
      return;
    }

    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) { return; }

    const isTruckStage = selectedStage === 'camiones de arena' || selectedStage === 'camiones de tierra'; // Usar selectedStage
    const allowMultiple = !isTruckStage; 

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.5,
      allowsMultipleSelection: allowMultiple, 
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const selectedAssets = result.assets;
     
      if (isTruckStage) {
        const assetToProcess = selectedAssets[0];
        if (imagesByStage[selectedStage]?.length >= 12) { // Usar selectedStage
            Alert.alert('Límite Alcanzado', `Ya has alcanzado el límite de 12 imágenes para ${selectedStage}.`);
            return;
        }
        if (Platform.OS === 'ios') {
     Alert.prompt('Cantidad de Camiones', 'Ingresa la cantidad de camiones:', [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Cargar Imagen', onPress: async (truckCountInput) => {
                const count = parseInt(truckCountInput, 10);
                if (isNaN(count) || count < 0) {
                  Alert.alert('Error', 'Por favor, ingresa un número válido de camiones.');
                  return;
                }
                await processAndUploadImage(assetToProcess.uri, '', count, selectedStage); // Pasar comentario vacío
            }},
          ], 'plain-text', '', 'numeric');
        } else { 
          // Para Android, si quieres pedir cantidad, necesitarías un modal personalizado o similar.
          // Actualmente, solo sube la imagen. Si quieres añadir cantidad, se necesitaría un flujo de UI.
          // Por ahora, mantenemos el comportamiento de subir sin comentario ni cantidad explícita aquí.
          await processAndUploadImage(assetToProcess.uri, '', null, selectedStage); // Pasar comentario vacío y null para cantidad
        }
      } else {  
        let commentForLast = '';
        if (Platform.OS === 'ios') {
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
          console.log("Comentario para lote en Android no implementado, se usará vacío.");
        }

        setIsBatchUploading(true);
        for (let i = 0; i < selectedAssets.length; i++) {
          if (imagesByStage[selectedStage]?.length + i >= 12) { // Usar selectedStage
            Alert.alert('Límite Parcialmente Alcanzado', `Se cargarán ${i} imágenes. Se alcanzó el límite de 12 para ${selectedStage}.`);
            break;
          }
          const asset = selectedAssets[i];
          const isLastImage = i === selectedAssets.length - 1;
          const commentToApply = isLastImage ? commentForLast : '';
          
          try {
            await processAndUploadImage(asset.uri, commentToApply, null, selectedStage); // Usar selectedStage
          } catch (uploadError) {
            console.error(`Error al procesar imagen ${i + 1} (${asset.uri}):`, uploadError);
            Alert.alert('Error de Carga', `No se pudo cargar la imagen ${asset.uri.split('/').pop()}: ${uploadError.message}`);
          }
        }
        
        if (selectedAssets.length > 0) {
            const successfulUploads = selectedAssets.length;
            if (successfulUploads > 0) {
                Alert.alert('Carga Completa', `${successfulUploads} imagen(es) procesada(s).`);
            }
        }
        setIsBatchUploading(false);
      }
    } else if (result.canceled) {
        console.log("Selección de imágenes cancelada por el usuario.");
    } else {
        console.log("Resultado de ImagePicker sin assets:", result);
    }
  };


  const handleTakePhoto = async () => { // Sin stageOverride
    // const stageToUse = selectedStage; // Ya no es necesario

    if (!selectedStage) { // Usar selectedStage
      Alert.alert("Error", "Por favor, selecciona una etapa primero.");
      return;
    }
    if (imagesByStage[selectedStage]?.length >= 12) { // Usar selectedStage
        Alert.alert('Límite Alcanzado', `Ya has alcanzado el límite de 12 imágenes para ${selectedStage}.`);
        return; 
    }
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) { return; }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.5,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const imageUri = result.assets[0].uri;
      const isTruckStage = selectedStage === 'camiones de arena' || selectedStage === 'camiones de tierra'; // Usar selectedStage
      if (Platform.OS === 'ios') {
        if (isTruckStage) {
          // Directamente pedir cantidad de camiones, sin comentario
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
                  processAndUploadImage(imageUri, '', count, selectedStage); // Pasar comentario vacío
                },
              },
            ],
            'plain-text',
            '',
            'numeric'
          );
        } else {
          // Pedir comentario para otras etapas
          Alert.prompt(
            'Añadir Comentario',
            'Ingresa un comentario (opcional):',
            [
              { text: 'Cancelar', style: 'cancel' },
              {
                text: 'Cargar Imagen', // Cambiado de 'Siguiente'
                onPress: (commentText) => {
                  const comment = commentText || '';
                  processAndUploadImage(imageUri, comment, null, selectedStage); 
                },
              },
            ],
            'plain-text'
          );
        }
      } else { 
        // Para Android, si quieres pedir cantidad para truckStage, necesitarías un modal personalizado.
        // Actualmente, solo sube la imagen.
        await processAndUploadImage(imageUri, '', null, selectedStage); // Pasar comentario vacío y null para cantidad
      }
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

        // --- LÓGICA PARA CHANGE ORDER POR EXTRACCIÓN DE PIEDRAS ---
        if (stageToUse === 'extracción de piedras' && (!currentWork || currentWork.stoneExtractionCONeeded === false) && !notifiedForStoneCO) {
          Alert.alert(
            "Extracción de Piedras Registrada",
            "Se ha subido una imagen para 'extracción de piedras'. Se notificará a la oficina para generar una Orden de Cambio."
          );
          // Despachar acción para actualizar el work en el backend
          dispatch(updateWork(idWork, { stoneExtractionCONeeded: true }))
            .then(() => {
              setNotifiedForStoneCO(true); // Marcar como notificado para esta sesión/estado
              dispatch(fetchWorkById(idWork)); // Volver a cargar los datos del work para reflejar el cambio
            })
            .catch(err => console.error("Error al marcar stoneExtractionCONeeded:", err));
        }
       
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

  const handleMarkCovered = async () => {
    if (isMarkingCovered || !hasFinalCoverImages) {
      if (!hasFinalCoverImages) {
        Alert.alert("Atención", "Debe subir imágenes a 'inspeccion final' antes de marcar como cubierto.");
      }
      return;
    }
    setIsMarkingCovered(true);
    try {
      await dispatch(updateWork(idWork, { status: 'covered' }));
      // fetchWorkById should be dispatched by the updateWork thunk or a listener,
      // which will update currentWork.status and hide this block.
      Alert.alert('Éxito', 'Trabajo marcado como "Cubierto". La oficina será notificada.');
      // if (navigation.canGoBack()) { // Opcional: navegar atrás si se desea
      //   navigation.goBack();
      // }
    } catch (error) {
      console.error('Error al marcar el trabajo como cubierto:', error);
      Alert.alert('Error', `No se pudo marcar el trabajo como cubierto: ${error.message || 'Error desconocido'}`);
    } finally {
      setIsMarkingCovered(false);
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
    currentWork.status === 'covered'; 

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

            {currentWork && currentWork.stoneExtractionCONeeded === true && (
          <View className="my-4 p-3 border border-yellow-500 bg-yellow-100 rounded-lg items-center">
            <Ionicons name="warning-outline" size={20} color="#D97706" />
            <Text className="text-yellow-700 text-center ml-2">
              Atención: Se requiere una Orden de Cambio por extracción de piedras. La oficina la generará.
            </Text>
          </View>
        )}

       {/* --- BLOQUE DE INSPECCIÓN RECHAZADA MODIFICADO --- */}
       {currentWork.status === 'rejectedInspection' && relevantInitialInspection && relevantInitialInspection.finalStatus === 'rejected' && (
          <View className="my-4 p-4 border border-red-400 bg-red-50 rounded-lg">
            <Text className="text-lg font-bold text-red-700 mb-2 text-center">¡INSPECCIÓN INICIAL RECHAZADA!</Text>
            <Text className="text-sm text-red-600 mb-1">
              <Text className="font-semibold">Notas del Inspector:</Text>
            </Text>
            

            {/* Botón para ver documento/imagen de rechazo */}
            {relevantInitialInspection.resultDocumentUrl && (
              <Pressable
                onPress={() => {
                  const url = relevantInitialInspection.resultDocumentUrl;
                  if (isCommonImageUrl(url)) {
                    // Si es una imagen, la abrimos en el modal grande
                    handleOpenLargeImage(url); 
                  } else {
                    // Si no, intentamos abrirla como PDF
                    handleOpenPdf(url); 
                  }
                }}
                className="bg-red-200 py-2 px-4 rounded-lg shadow-sm mb-3 flex-row justify-center items-center"
              >
                <Ionicons name="document-attach-outline" size={20} color="rgb(185 28 28)" style={{ marginRight: 8 }} />
                <Text className="text-red-700 font-semibold text-center">Ver Documento/Imagen de Rechazo</Text>
              </Pressable>
            )}

            {relevantInitialInspection.workerHasCorrected ? (
              <Text className="text-md font-semibold text-green-700 text-center p-3 bg-green-100 rounded">
                Correcciones marcadas. La oficina solicitará la reinspección.
              </Text>
            ) : (
              <>
                {/* Botones para subir foto de corrección a "Sistema Instalado" */}
                <Text className="text-sm text-gray-700 mb-2 text-center mt-2">
                  Sube una foto de la corrección realizada a "Sistema Instalado":
                </Text>
                <View className="flex-row justify-around mb-3">
                  <Pressable
                    onPress={() => {
                      setSelectedStage('sistema instalado'); // Establecer la etapa
                      setModalVisible(true);                // Abrir el modal de carga
                    }}
                    disabled={isUploading || isBatchUploading}
                    className="bg-yellow-500 py-2 px-2 rounded-lg shadow-sm flex-row items-center"
                  >
                    <Ionicons name="images-outline" size={18} color="white" style={{ marginRight: 4 }}/>
                    <Text className="text-white font-semibold text-xs">Galería (Corrección)</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      setSelectedStage('sistema instalado'); // Establecer la etapa
                      setModalVisible(true);                // Abrir el modal de carga
                    }}
                    disabled={isUploading || isBatchUploading}
                    className="bg-yellow-600 py-2 px-2 rounded-lg shadow-sm flex-row items-center"
                  >
                    <Ionicons name="camera-outline" size={18} color="white" style={{ marginRight: 4 }}/>
                    <Text className="text-white font-semibold text-xs">Cámara (Corrección)</Text>
                  </Pressable>
                </View>
                {/* Botón existente para marcar correcciones */}
                <Pressable
                  onPress={handleMarkCorrected}
                  disabled={isMarkingCorrected}
                  className={`py-3 rounded-lg shadow-md flex-row justify-center items-center mt-1 ${ // Añadido mt-1
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
              </>
            )}
          </View>
        )}

         {/* --- NUEVO BLOQUE PARA COVER PENDING --- */}
         {currentWork.status === 'coverPending' && (
          <View className="my-4 p-4 border border-teal-400 bg-teal-50 rounded-lg shadow-md">
            <Text className="text-lg font-bold text-teal-700 mb-2 text-center">Acción Requerida: Cubrir Instalación</Text>
            <Text className="text-sm text-teal-600 mb-2 text-center">
              Por favor, asegúrate de que la instalación esté completamente cubierta.
            </Text>
            <Text className="text-sm text-teal-600 mb-1">
              Sube las imágenes correspondientes a la etapa <Text className="font-semibold">'inspeccion final'</Text> si aún no lo has hecho (actualmente {imagesByStage['inspeccion final']?.length || 0} imágenes).
            </Text>
            <Text className="text-sm text-teal-600 mb-3">
              Luego, presiona el botón <Text className="font-semibold">"TRABAJO CUBIERTO"</Text> para notificar a la oficina.
            </Text>
            <Pressable
              onPress={handleMarkCovered}
              disabled={isMarkingCovered || !hasFinalCoverImages}
              className={`py-3 rounded-lg shadow-md flex-row justify-center items-center ${
                (isMarkingCovered || !hasFinalCoverImages) ? 'bg-gray-400' : 'bg-teal-500'
              }`}
            >
              {isMarkingCovered ? (
                <ActivityIndicator size="small" color="white" style={{ marginRight: 8 }} />
              ) : (
                <Ionicons name="checkmark-done-circle-outline" size={22} color="white" style={{ marginRight: 8 }} />
              )}
              <Text className="text-white text-center text-lg font-semibold">
                {isMarkingCovered ? 'Enviando...' : 'TRABAJO CUBIERTO'}
              </Text>
            </Pressable>
            {!hasFinalCoverImages && (
                <Text className="text-xs text-red-500 text-center mt-2">
                    Debes subir imágenes a 'inspeccion final' para poder marcar como cubierto.
                </Text>
            )}
          </View>
        )}

         {/* --- NUEVO BLOQUE PARA CUANDO EL TRABAJO ESTÁ 'COVERED' --- */}
         {currentWork.status === 'covered' && (
          <View className="my-4 p-4 border border-green-400 bg-green-50 rounded-lg shadow-md">
            <View className="flex-row items-center justify-center mb-2">
                <Ionicons name="shield-checkmark-outline" size={26} color="rgb(22 163 74)" style={{ marginRight: 8 }} />
                <Text className="text-lg font-bold text-green-700 text-center">¡Trabajo Cubierto!</Text>
            </View>
            <Text className="text-sm text-green-600 text-center">
              Ya se envió el aviso a administración.
            </Text>
            <Text className="text-sm text-green-600 text-center mt-1">
              Si todo está listo, puedes proceder a <Text className="font-semibold">solicitar la inspección final</Text> usando el botón de abajo (si está habilitado).
            </Text>
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