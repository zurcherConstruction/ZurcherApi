import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Pressable, Image, Alert, ScrollView, Modal, FlatList, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useDispatch, useSelector } from 'react-redux';
import { addImagesToWork, markInspectionCorrectedByWorker, updateWork, deleteImagesFromWork, fetchWorkById } from '../Redux/Actions/workActions';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system/legacy'; // ⚡ Usar API legacy
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

  // ⚡ Helper para obtener tamaño de archivo (compatible web y nativo)
  const getFileSize = async (uri) => {
    if (Platform.OS === 'web') {
      // En web, intentar obtener el tamaño del blob
      try {
        const response = await fetch(uri);
        const blob = await response.blob();
        return blob.size;
      } catch (error) {
        console.warn('No se pudo obtener tamaño en web, asumiendo OK');
        return 0; // Asumir que está bien si no podemos verificar
      }
    } else {
      // En nativo, usar FileSystem
      const info = await FileSystem.getInfoAsync(uri);
      return info.size;
    }
  };
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
    'trabajo cubierto'
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

      // � DEBUG: Ver estructura completa del pdfSource
      console.log('🔍 pdfSource tipo:', typeof pdfSource);
      console.log('🔍 pdfSource es Buffer?', Buffer.isBuffer(pdfSource));
      console.log('🔍 pdfSource.data existe?', !!pdfSource?.data);
      console.log('🔍 pdfSource.data es Buffer?', Buffer.isBuffer(pdfSource?.data));
      if (pdfSource?.data) {
        console.log('🔍 pdfSource.data tipo:', typeof pdfSource.data);
        console.log('🔍 pdfSource.data es Array?', Array.isArray(pdfSource.data));
        console.log('🔍 pdfSource.data primeros elementos:', pdfSource.data.slice ? pdfSource.data.slice(0, 10) : 'No tiene slice');
      }

      // �🔄 DETECTAR URL LEGACY: Primero intentar convertir Buffer a string para ver si es URL
      let urlToOpen = null;
      
      // Caso 1: String directo que es URL
      if (typeof pdfSource === 'string' && (pdfSource.startsWith('http://') || pdfSource.startsWith('https://'))) {
        urlToOpen = pdfSource;
      }
      // Caso 2: Buffer que contiene URL (PDFs Legacy)
      else if (pdfSource?.data && Buffer.isBuffer(pdfSource.data)) {
        try {
          const bufferString = pdfSource.data.toString('utf8');
          console.log('🔍 Buffer.data contenido (primeros 100 chars):', bufferString.substring(0, 100));
          if (bufferString.startsWith('http://') || bufferString.startsWith('https://')) {
            urlToOpen = bufferString;
            console.log('🔄 PDF Legacy detectado en Buffer:', urlToOpen);
          }
        } catch (error) {
          console.log('No es una URL en Buffer, es PDF binario tradicional');
        }
      }
      // Caso 2b: Array de bytes que contiene URL (PDFs Legacy formato Sequelize)
      else if (pdfSource?.data && Array.isArray(pdfSource.data)) {
        try {
          // Convertir array de bytes a Buffer y luego a string
          const buffer = Buffer.from(pdfSource.data);
          const bufferString = buffer.toString('utf8');

          if (bufferString.startsWith('http://') || bufferString.startsWith('https://')) {
            urlToOpen = bufferString;

          }
        } catch (error) {
          console.log('No es una URL en Array, es PDF binario tradicional');
        }
      }
      // Caso 3: Buffer directo que puede contener URL (sin .data wrapper)
      else if (Buffer.isBuffer(pdfSource)) {
        try {
          const bufferString = pdfSource.toString('utf8');
          if (bufferString.startsWith('http://') || bufferString.startsWith('https://')) {
            urlToOpen = bufferString;
          }
        } catch (error) {
          // No es una URL en Buffer directo, continuar con lógica normal
        }
      }

      // Si encontramos una URL, procesarla
      if (urlToOpen) {

        
        // 🌐 PARA WEB: Abrir directamente en nueva ventana
        if (Platform.OS === 'web') {

          window.open(urlToOpen, '_blank');
          return;
        }
        
        // 📱 PARA iOS/ANDROID: Descargar y mostrar en visor interno
        const tempFileName = `temp_legacy_${Date.now()}.pdf`;
        fileUri = `${FileSystem.cacheDirectory}${tempFileName}`;
        
        const downloadResult = await FileSystem.downloadAsync(urlToOpen, fileUri);
        
        if (downloadResult.status !== 200) {
          throw new Error(`Error al descargar PDF legacy (status ${downloadResult.status}).`);
        }
        isDownloadedTempFile = true;
      } else {

        // 🌐 PARA WEB: Crear URL blob y abrir
        if (Platform.OS === 'web') {
          const base64Pdf =
            pdfSource?.data
              ? Buffer.from(pdfSource.data).toString("base64")
              : typeof pdfSource === 'string' && pdfSource.startsWith("data:application/pdf;base64,")
                ? pdfSource.split(",")[1]
                : typeof pdfSource === 'string'
                  ? pdfSource
                  : null;

          if (!base64Pdf) {
            throw new Error("El PDF no está en un formato válido para web.");
          }

          // Convertir base64 a Blob y crear URL
          const byteCharacters = atob(base64Pdf);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: 'application/pdf' });
          const blobUrl = URL.createObjectURL(blob);
          
          window.open(blobUrl, '_blank');
          
          // Limpiar la URL del blob después de un tiempo
          setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
          return;
        }

        // 📱 PARA MÓVIL: Lógica existente para base64
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

      // Solo para móvil: usar el visor interno
      if (Platform.OS !== 'web') {
        setSelectedPdfUri(fileUri);
        setPdfViewerVisible(true);
      }
      // No eliminamos el archivo aquí, PdfViewer lo hará en su onClose

    } catch (error) {
      console.error("Error en handleOpenPdf:", error);
      Alert.alert("Error al abrir PDF", `${error.message}. Asegúrate de que la URL sea accesible y el archivo sea un PDF válido.`);
      // Limpiar archivo temporal si hubo error en móvil
      if (fileUri && isDownloadedTempFile && Platform.OS !== 'web') {
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
      quality: 0.3, // ✅ OPTIMIZACIÓN iPhone: Calidad al 30% desde el picker
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
        
        // Calcular el total actual de camiones
        const currentTotal = imagesByStage[selectedStage]?.length > 0 
          ? Math.max(...imagesByStage[selectedStage].map(img => img.truckCount || 0))
          : 0;
        const promptMessage = currentTotal > 0 
          ? `Total actual: ${currentTotal} camiones.\n\n¿Cuántos camiones hay en total hasta el momento?`
          : '¿Cuántos camiones hay en total hasta el momento?';
        
        if (Platform.OS === 'ios') {
          Alert.prompt('Cantidad Total de Camiones', promptMessage, [
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
        } else if (Platform.OS === 'web') {
          // Para web, usar window.prompt
          const truckCountInput = window.prompt(promptMessage, currentTotal > 0 ? currentTotal.toString() : '');
          if (truckCountInput !== null) { // El usuario no canceló
            const count = parseInt(truckCountInput, 10);
            if (isNaN(count) || count < 0) {
              Alert.alert('Error', 'Por favor, ingresa un número válido de camiones.');
              return;
            }
            await processAndUploadImage(assetToProcess.uri, '', count, selectedStage);
          }
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
      quality: 0.3, // ✅ OPTIMIZACIÓN iPhone: Calidad al 30% desde la cámara
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const imageUri = result.assets[0].uri;
      const isTruckStage = selectedStage === 'camiones de arena' || selectedStage === 'camiones de tierra'; // Usar selectedStage
      if (Platform.OS === 'ios') {
        if (isTruckStage) {
          // Calcular el total actual de camiones
          const currentTotal = imagesByStage[selectedStage]?.length > 0 
            ? Math.max(...imagesByStage[selectedStage].map(img => img.truckCount || 0))
            : 0;
          const promptMessage = currentTotal > 0 
            ? `Total actual: ${currentTotal} camiones.\n\n¿Cuántos camiones hay en total hasta el momento?`
            : '¿Cuántos camiones hay en total hasta el momento?';
          // Directamente pedir cantidad de camiones, sin comentario
          Alert.prompt(
            'Cantidad Total de Camiones',
            promptMessage,
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
      } else if (Platform.OS === 'web') {
        if (isTruckStage) {
          // Calcular el total actual de camiones
          const currentTotal = imagesByStage[selectedStage]?.length > 0 
            ? Math.max(...imagesByStage[selectedStage].map(img => img.truckCount || 0))
            : 0;
          const promptMessage = currentTotal > 0 
            ? `Total actual: ${currentTotal} camiones.\n\n¿Cuántos camiones hay en total hasta el momento?`
            : '¿Cuántos camiones hay en total hasta el momento?';
          const truckCountInput = window.prompt(promptMessage, currentTotal > 0 ? currentTotal.toString() : '');
          if (truckCountInput !== null) {
            const count = parseInt(truckCountInput, 10);
            if (isNaN(count) || count < 0) {
              Alert.alert('Error', 'Por favor, ingresa un número válido de camiones.');
              return;
            }
            processAndUploadImage(imageUri, '', count, selectedStage);
          }
        } else {
          const commentText = window.prompt('Añadir Comentario (opcional):', '');
          if (commentText !== null) {
            processAndUploadImage(imageUri, commentText || '', null, selectedStage);
          }
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
      // ✅ OPTIMIZACIÓN AGRESIVA para iPhone: 
      // Las fotos de iPhone pueden pesar 3-8MB, las reducimos a ~100-300KB
      const resizedImage = await manipulateAsync(
        imageUri,
        [{ resize: { width: 800 } }], // ✅ 800px es suficiente para ver detalles de instalación
        { compress: 0.3, format: SaveFormat.JPEG } // ✅ Compresión agresiva al 30%
      );
      
      // Validar tamaño de imagen (compatible web y nativo)
      const imageSize = await getFileSize(resizedImage.uri);
      const imageSizeMB = imageSize / (1024 * 1024);
      const imageSizeKB = imageSize / 1024;
      
      console.log(`📸 Imagen procesada: ${imageSizeKB.toFixed(0)}KB (${imageSizeMB.toFixed(2)}MB)`);
      
      // Si aún es muy pesada (más de 3MB), comprimir más
      let finalImage = resizedImage;
      if (imageSizeMB > 3) {
        console.log('⚠️ Imagen aún muy pesada, aplicando compresión extra...');
        finalImage = await manipulateAsync(
          resizedImage.uri,
          [{ resize: { width: 600 } }], // Reducir más
          { compress: 0.2, format: SaveFormat.JPEG } // Compresión extrema
        );
        const finalSize = await getFileSize(finalImage.uri);
        const finalSizeKB = finalSize / 1024;
        console.log(`📸 Imagen re-comprimida: ${finalSizeKB.toFixed(0)}KB`);
      }
      
      // Validación final: rechazar si supera 5MB (caso extremo)
      const finalSize = await getFileSize(finalImage.uri);
      const finalSizeMB = finalSize / (1024 * 1024);
      
      if (finalSizeMB > 5) {
        Alert.alert(
          'Imagen muy grande', 
          `La imagen (${finalSizeMB.toFixed(1)}MB) es demasiado pesada. Por favor, toma la foto con menor resolución en la configuración de la cámara.`
        );
        return Promise.reject(new Error('Imagen demasiado grande'));
      }
      
      const now = new Date();
      const dateTimeString = now.toLocaleString();

      const optimisticImagePayload = {
        id: tempImageId,
        stage: stageToUse, // Usar stageToUse
        imageUrl: finalImage.uri, // ✅ Usar finalImage en lugar de resizedImage
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
        [tempImageId]: finalImage.uri // ✅ Usar finalImage
      }));


      const formData = new FormData();
      formData.append('stage', stageToUse); // Usar stageToUse
      formData.append('comment', comment);
      formData.append('dateTime', dateTimeString);
      if (truckCount !== null) {
        formData.append('truckCount', truckCount.toString());
      }
      const filename = finalImage.uri.split('/').pop(); // ✅ Usar finalImage
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;
      
      // ✅ OPTIMIZACIÓN iOS: FormData simplificado para iOS
      if (Platform.OS === 'ios') {
        formData.append('imageFile', { 
          uri: finalImage.uri,  // ✅ Usar finalImage
          name: filename, 
          type: type 
        });
      } else {
        // Para otros OS si alguna vez se usa
        formData.append('imageFile', { 
          uri: finalImage.uri,  // ✅ Usar finalImage
          name: filename, 
          type: type 
        });
      }

      console.log(`📤 Subiendo imagen: ${filename} (${(finalSize / 1024).toFixed(0)}KB)`);

      const resultAction = await dispatch(addImagesToWork(idWork, formData));
      
      // ✅ SOLUCIÓN SIMPLIFICADA: Solo verificar si NO hay error
      if (resultAction && resultAction.error) {
        console.error("Error al subir imagen:", resultAction.error || resultAction.message);
        return Promise.reject(new Error(resultAction.error || resultAction.message || `No se pudo cargar la imagen ${filename}.`));
      }

      // ✅ Si no hay error, consideramos que fue exitoso
      console.log(`✅ Imagen ${filename} subida exitosamente`);
      
      // Refrescar el trabajo para obtener datos actualizados
      dispatch(fetchWorkById(idWork));

      // --- LÓGICA PARA CHANGE ORDER POR EXTRACCIÓN DE PIEDRAS ---
      if (stageToUse === 'extracción de piedras' && (!currentWork || currentWork.stoneExtractionCONeeded === false) && !notifiedForStoneCO) {
        Alert.alert(
          "Extracción de Piedras Registrada",
          "Se ha subido una imagen para 'extracción de piedras'. Se notificará a la oficina para generar una Orden de Cambio."
        );
        
        try {
          const updateResult = await dispatch(updateWork(idWork, { stoneExtractionCONeeded: true }));
          if (!updateResult || !updateResult.error) {
            setNotifiedForStoneCO(true);
            dispatch(fetchWorkById(idWork));
          }
        } catch (error) {
          console.error("Error al actualizar stoneExtractionCONeeded:", error);
        }
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
              
              // ✅ SOLUCIÓN: Solo mostrar éxito si NO hay error
              if (!resultAction || !resultAction.error) {
                Alert.alert("Éxito", "Imagen eliminada correctamente.");
              }
              // Si hay error, ya se mostró en la acción

            } catch (error) {
              // ✅ Captura errores JS no controlados
              console.error("Error no controlado en handleDeleteImage:", error);
              Alert.alert("Error", "Error inesperado al eliminar la imagen");
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
      const result = await dispatch(updateWork(idWork, { status: 'installed' }));
      
      // ✅ MEJORA: Solo navegar si realmente fue exitoso
      if (!result || !result.error) {
        // Éxito o éxito con refresco
        setIsInstallationSubmitted(true);
        Alert.alert('Éxito', 'El estado del trabajo se actualizó a "installed".');
        if (navigation.canGoBack()) {
          navigation.goBack();
        }
      }
      // Si hubo error, ya se mostró en la acción
      
    } catch (error) {
      // ✅ Captura errores JS no controlados
      console.error('Error no controlado en handleWorkInstalled:', error);
      Alert.alert('Error', 'Error inesperado al cambiar el estado');
    } finally {
      setIsSubmittingWorkInstalled(false);
    }
  };

  const handleMarkCovered = async () => {
    if (isMarkingCovered || !hasFinalCoverImages) {
      if (!hasFinalCoverImages) {
        Alert.alert("Atención", "Debe subir imágenes a 'trabajo cubierto' antes de marcar como cubierto.");
      }
      return;
    }
    setIsMarkingCovered(true);
    try {
      const result = await dispatch(updateWork(idWork, { status: 'covered' }));
      
      // ✅ MEJORA: Solo navegar si realmente fue exitoso
      if (!result || !result.error) {
        // Éxito o éxito con refresco
        Alert.alert('Éxito', 'Trabajo marcado como "Cubierto". La oficina será notificada.');
        if (navigation.canGoBack()) {
          navigation.goBack();
        }
      }
      // Si hubo error, ya se mostró en la acción
      
    } catch (error) {
      // ✅ Captura errores JS no controlados
      console.error('Error no controlado en handleMarkCovered:', error);
      Alert.alert('Error', 'Error inesperado al cambiar el estado');
    } finally {
      setIsMarkingCovered(false);
    }
  };

  const handleRequestFinalInspection = async () => {
    if (isFinalInspectionRequested || isRequestingFinalInspection) return; // Evitar múltiples envíos
    setIsRequestingFinalInspection(true);
    try {
      await dispatch(updateWork(idWork, { status: 'finalInspectionPending' }));
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

    // ✅ Prevenir múltiples clicks - deshabilitar INMEDIATAMENTE
    if (isMarkingCorrected) return;
    
    setIsMarkingCorrected(true);
    
    try {
      // El backend espera el ID de la inspección, no de la obra.
      await dispatch(markInspectionCorrectedByWorker(relevantInitialInspection.idInspection));
      // La acción markInspectionCorrectedByWorker ya debería despachar fetchWorkById,
      // por lo que currentWork y relevantInitialInspection se actualizarán.
      
      // ✅ MOSTRAR FEEDBACK Y NAVEGAR DE VUELTA
      Alert.alert(
        "✅ Correcciones Marcadas", 
        "Las correcciones han sido registradas exitosamente.\n\nLa oficina ha sido notificada y solicitará la reinspección.",
        [
          {
            text: "OK",
            onPress: () => {
              // Navegar de vuelta a la lista de trabajos
              navigation.goBack();
            }
          }
        ]
      );
    } catch (error) {
      // El Alert de error ya se maneja en la acción
      console.error("Error al marcar correcciones:", error);
    } finally {
      setIsMarkingCorrected(false);
    }
  };

  const hasSystemInstalledImages = imagesByStage['sistema instalado']?.length > 0; // Renombrado para claridad, antes era hasFinalInspectionImages
  const hasFinalCoverImages = imagesByStage['trabajo cubierto']?.length > 0; // Renombrado para claridad, antes era hasCoverImages

  const showWorkInstalledButton =
    hasSystemInstalledImages &&
    currentWork &&
    (currentWork.status === 'inProgress' || currentWork.status === 'rejectedInspection');

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
          <View className="my-4 p-4 border rounded-lg" style={{
            borderColor: relevantInitialInspection.workerHasCorrected ? '#16a34a' : '#f87171',
            backgroundColor: relevantInitialInspection.workerHasCorrected ? '#f0fdf4' : '#fef2f2'
          }}>
            {relevantInitialInspection.workerHasCorrected ? (
              // ✅ MENSAJE VERDE PROMINENTE - Sin botones adicionales
              <>
                <View className="flex-row items-center justify-center mb-2">
                  <Ionicons name="checkmark-circle" size={32} color="#16a34a" style={{ marginRight: 8 }} />
                  <Text className="text-xl font-bold text-green-700">¡Correcciones Marcadas!</Text>
                </View>
                <Text className="text-md text-green-700 text-center leading-5">
                  Las correcciones han sido registradas exitosamente.{'\n'}
                  La oficina ha sido notificada y solicitará la reinspección.
                </Text>
              </>
            ) : (
              // ⚠️ SECCIÓN ROJA - Solo cuando NO están marcadas
              <>
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
              Sube las imágenes correspondientes a la etapa <Text className="font-semibold">'Trabajo Cubierto'</Text> si aún no lo has hecho (actualmente {imagesByStage['trabajo cubierto']?.length || 0} imágenes).
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
                    Debes subir imágenes a 'Trabajo Cubierto' para poder marcar como cubierto.
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
            {/* <Text className="text-sm text-green-600 text-center mt-1">
              Si todo está listo, puedes proceder a <Text className="font-semibold">solicitar la inspección final</Text> usando el botón de abajo (si está habilitado).
            </Text> */}
          </View>
        )}
        {/* --- BLOQUE DE BOTONES PDF MODIFICADO --- */}
        <View className="flex-row justify-around items-start mt-2 mb-2">
          {(currentWork.Permit?.permitPdfUrl || currentWork.Permit?.pdfData) && (
            <TouchableOpacity
              onPress={() => handleOpenPdf(currentWork.Permit.permitPdfUrl || currentWork.Permit.pdfData)}
              className="items-center w-20"
            >
              <View className="w-20 h-20 bg-gray-200 border border-gray-300 rounded-md justify-center items-center mb-1 shadow">
                <Ionicons name="document-text-outline" size={40} color="#4B5563" />
              </View>
              <Text className="text-xs text-center font-medium text-gray-600">PDF Permit</Text>
            </TouchableOpacity>
          )}

          {(currentWork.Permit?.optionalDocsUrl || currentWork.Permit?.optionalDocs) && (
            <TouchableOpacity
              onPress={() => handleOpenPdf(currentWork.Permit.optionalDocsUrl || currentWork.Permit.optionalDocs)}
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
                    {isSubmittingWorkInstalled ? 'Enviando...' : 'PEDIR INSPECCIÓN'}
                    </Text>
                </Pressable>
                )}
            
                {/* Botón REQUEST FINAL INSPECTION
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
                        : 'PEDIR INSPECCION FINAL'}
                    </Text>
                </Pressable>
                )} */}
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