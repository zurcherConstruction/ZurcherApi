import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Switch,
  Image,
  Platform,
  Modal,
} from 'react-native';
import { Video } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import PdfViewer from '../utils/PdfViewer';
import axios from 'axios';

// Componente CheckboxField SIN opción de adjuntar foto
const CheckboxFieldNoMedia = ({ label, value, notes, notesValue, onCheckChange, onNotesChange }) => {
  return (
    <View style={styles.checkboxContainer}>
      <View style={styles.checkboxHeader}>
        <Switch
          value={value}
          onValueChange={onCheckChange}
          trackColor={{ false: '#ccc', true: '#4CAF50' }}
          thumbColor={value ? '#fff' : '#f4f3f4'}
        />
        <Text style={styles.checkboxLabel}>{label}</Text>
      </View>
      
      {value && (
        <View style={styles.checkboxDetails}>
          <Text style={styles.inputLabel}>Observaciones</Text>
          <TextInput
            style={styles.textArea}
            value={notesValue}
            onChangeText={onNotesChange}
            placeholder="Agregue observaciones..."
            multiline
            numberOfLines={2}
          />
        </View>
      )}
    </View>
  );
};

// Componente CheckboxField reutilizable
const CheckboxField = ({ label, value, notes, notesValue, onCheckChange, onNotesChange, onMediaAdd, mediaCount = 0, mediaFiles = [] }) => {
  return (
    <View style={styles.checkboxContainer}>
      <View style={styles.checkboxHeader}>
        <Switch
          value={value}
          onValueChange={onCheckChange}
          trackColor={{ false: '#ccc', true: '#4CAF50' }}
          thumbColor={value ? '#fff' : '#f4f3f4'}
        />
        <Text style={styles.checkboxLabel}>{label}</Text>
      </View>
      
      {value && (
        <View style={styles.checkboxDetails}>
          <Text style={styles.inputLabel}>Observaciones</Text>
          <TextInput
            style={styles.textArea}
            value={notesValue}
            onChangeText={onNotesChange}
            placeholder="Agregue observaciones..."
            multiline
            numberOfLines={2}
          />
          
          <TouchableOpacity 
            style={styles.mediaButton}
            onPress={onMediaAdd}
          >
            <Text style={styles.mediaButtonText}>
              📷 Adjuntar Foto {mediaCount > 0 && `(${mediaCount})`}
            </Text>
          </TouchableOpacity>

          {/* Miniaturas de fotos */}
          {mediaFiles.length > 0 && (
            <View style={styles.thumbnailContainer}>
              <Text style={styles.thumbnailTitle}>Fotos adjuntas:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbnailScroll}>
                {mediaFiles.map((file, index) => (
                  <View key={index} style={styles.thumbnailWrapper}>
                    <Image 
                      source={{ uri: file.uri }} 
                      style={styles.thumbnail}
                      resizeMode="cover"
                    />
                    <Text style={styles.thumbnailIndex}>{index + 1}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const MaintenanceFormScreen = ({ route, navigation }) => {
  const { visit } = route.params;
  
  if (__DEV__) {
    console.log('🏗️ MaintenanceFormScreen iniciado - visit:', visit?.id);
  }
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [visitData, setVisitData] = useState(null);
  const [permitData, setPermitData] = useState(null);
  
  // Form state - EXACTAMENTE igual que WorkerMaintenanceDetail.jsx
  const [formData, setFormData] = useState({
    // Fecha de inspección
    actualVisitDate: new Date().toISOString().split('T')[0],
    
    // Niveles (igual que frontend web)
    tank_inlet_level: '',
    tank_inlet_notes: '',
    tank_outlet_level: '',
    tank_outlet_notes: '',
    
    // Inspección General
    strong_odors: false,
    strong_odors_notes: '',
    water_level_ok: false,
    water_level_notes: '',
    visible_leaks: false,
    visible_leaks_notes: '',
    area_around_dry: false,
    area_around_notes: '',
    needs_pumping: false,
    needs_pumping_notes: '',
    
    // Sistema ATU
    blower_working: false,
    blower_working_notes: '',
    blower_filter_clean: false,
    blower_filter_notes: '',
    diffusers_bubbling: false,
    diffusers_bubbling_notes: '',
    clarified_water_outlet: false,
    clarified_water_notes: '',
    discharge_pump_ok: false,
    discharge_pump_notes: '',
    cap_green_inspected: false,
    cap_green_notes: '',
    
    // Lift Station - OPCIONALES
    has_lift_station: false, // Control de visibilidad
    alarm_working: false,
    alarm_working_notes: '',
    pump_running: false,
    pump_running_notes: '',
    float_switches: false,
    float_switches_notes: '',
    pump_condition: false, // Existe en formData del frontend
    pump_condition_notes: '',
    
    // PBTS - OPCIONALES
    has_pbts: false, // Control de visibilidad
    well_points_quantity: '',
    well_sample_1_url: '',
    well_sample_1_observations: '',
    well_sample_1_notes: '',
    well_sample_2_url: '',
    well_sample_2_observations: '',
    well_sample_2_notes: '',
    well_sample_3_url: '',
    well_sample_3_observations: '',
    well_sample_3_notes: '',
    
    // VIDEO
    system_video_url: '',
    
    // Generales
    general_notes: '',
  });

  // Media files storage (campo -> array de archivos) - igual que el frontend web
  const [files, setFiles] = useState({});
  const [generalMedia, setGeneralMedia] = useState([]);
  const [systemVideo, setSystemVideo] = useState(null);
  const [wellSampleFiles, setWellSampleFiles] = useState({
    sample1: null,
    sample2: null,
    sample3: null
  });
  
  // Estados para el visor de PDF
  const [pdfViewerVisible, setPdfViewerVisible] = useState(false);
  const [selectedPdfUri, setSelectedPdfUri] = useState(null);

  useEffect(() => {
    const processVisitData = (visitObj) => {
      console.log('📸 visit.mediaFiles?:', visitObj.mediaFiles ? `${visitObj.mediaFiles.length} archivos` : 'NO EXISTE');
      if (visitObj.mediaFiles && visitObj.mediaFiles.length > 0) {
        console.log('📸 Primer archivo:', JSON.stringify(visitObj.mediaFiles[0], null, 2));
      }
      
      setVisitData(visitObj);
      
      // Acceder a permit igual que el frontend web (minúscula)
      console.log('📄 visitObj.work:', visitObj.work ? 'EXISTE' : 'NULL');
      console.log('📄 visitObj.work.permit:', visitObj.work?.permit ? 'EXISTE' : 'NULL');
      console.log('📄 visitObj.work.Permit:', visitObj.work?.Permit ? 'EXISTE' : 'NULL');
      
      if (visitObj.work?.permit || visitObj.work?.Permit) {
        const permit = visitObj.work.permit || visitObj.work.Permit;
        console.log('📄 Permit encontrado:', {
          propertyAddress: permit.propertyAddress,
          permitNumber: permit.permitNumber,
          systemType: permit.systemType,
          hasPdfData: !!permit.pdfData,
          hasOptionalDocs: !!permit.optionalDocs,
          pdfDataType: permit.pdfData ? typeof permit.pdfData : 'undefined',
          optionalDocsType: permit.optionalDocs ? typeof permit.optionalDocs : 'undefined'
        });
        setPermitData(permit);
      } else {
        console.log('⚠️ No se encontró permit en work object');
      }
      
      // Cargar imágenes existentes de mediaFiles organizadas por fieldName
      if (visitObj.mediaFiles && visitObj.mediaFiles.length > 0) {
        console.log('📸 Cargando imágenes existentes:', visitObj.mediaFiles.length);
        const imagesByField = {};
        visitObj.mediaFiles.forEach(media => {
          const fieldName = media.fieldName || 'general';
          if (!imagesByField[fieldName]) {
            imagesByField[fieldName] = [];
          }
          imagesByField[fieldName].push({
            uri: media.mediaUrl,
            name: media.originalName || 'image',
            isExisting: true, // Marcar como existente
            id: media.id
          });
        });
        console.log('📸 Imágenes organizadas por campo:', Object.keys(imagesByField));
        console.log('📸 Detalle por campo:', JSON.stringify(
          Object.keys(imagesByField).map(key => ({ field: key, count: imagesByField[key].length })),
          null, 2
        ));
        setFiles(imagesByField);
      } else {
        console.log('⚠️ No hay mediaFiles en visit object');
      }
      
      // Cargar imágenes de PBTS (well_sample URLs)
      if (visitObj.well_sample_1_url || visitObj.well_sample_2_url || visitObj.well_sample_3_url) {
        console.log('📸 Cargando imágenes de PBTS desde URLs');
        setWellSampleFiles({
          sample1: visitObj.well_sample_1_url ? { uri: visitObj.well_sample_1_url, isExisting: true } : null,
          sample2: visitObj.well_sample_2_url ? { uri: visitObj.well_sample_2_url, isExisting: true } : null,
          sample3: visitObj.well_sample_3_url ? { uri: visitObj.well_sample_3_url, isExisting: true } : null,
        });
      }
      
      // Cargar video del sistema
      console.log('🎬 visit.system_video_url:', visitObj.system_video_url);
      if (visitObj.system_video_url) {
        console.log('🎬 Cargando video del sistema desde URL');
        setSystemVideo({ uri: visitObj.system_video_url, isExisting: true });
      } else {
        console.log('⚠️ No hay system_video_url en visit object');
      }
      
      // Cargar datos existentes del formulario si la visita ya tiene datos
      if (visitObj.actualVisitDate || visitObj.tank_inlet_level) {
        console.log('📋 Cargando datos existentes del formulario');
        console.log('📋 actualVisitDate:', visitObj.actualVisitDate);
        console.log('📋 tank_inlet_level:', visitObj.tank_inlet_level);
        console.log('📋 has_pbts (raw):', visitObj.has_pbts, 'tipo:', typeof visitObj.has_pbts);
        console.log('📋 has_lift_station (raw):', visitObj.has_lift_station, 'tipo:', typeof visitObj.has_lift_station);
        console.log('📋 well_sample_1_observations:', visitObj.well_sample_1_observations);
        console.log('📋 well_points_quantity:', visitObj.well_points_quantity);
        
        setFormData({
          actualVisitDate: visitObj.actualVisitDate || new Date().toISOString().split('T')[0],
          tank_inlet_level: visitObj.tank_inlet_level ? String(visitObj.tank_inlet_level) : '',
          tank_inlet_notes: visitObj.tank_inlet_notes || '',
          tank_outlet_level: visitObj.tank_outlet_level ? String(visitObj.tank_outlet_level) : '',
          tank_outlet_notes: visitObj.tank_outlet_notes || '',
          strong_odors: visitObj.strong_odors || false,
          strong_odors_notes: visitObj.strong_odors_notes || '',
          water_level_ok: visitObj.water_level_ok || false,
          water_level_notes: visitObj.water_level_notes || '',
          visible_leaks: visitObj.visible_leaks || false,
          visible_leaks_notes: visitObj.visible_leaks_notes || '',
          area_around_dry: visitObj.area_around_dry || false,
          area_around_notes: visitObj.area_around_notes || '',
          cap_green_inspected: visitObj.cap_green_inspected || false,
          cap_green_notes: visitObj.cap_green_notes || '',
          needs_pumping: visitObj.needs_pumping || false,
          needs_pumping_notes: visitObj.needs_pumping_notes || '',
          blower_working: visitObj.blower_working || false,
          blower_working_notes: visitObj.blower_working_notes || '',
          blower_filter_clean: visitObj.blower_filter_clean || false,
          blower_filter_notes: visitObj.blower_filter_notes || '',
          diffusers_bubbling: visitObj.diffusers_bubbling || false,
          diffusers_bubbling_notes: visitObj.diffusers_bubbling_notes || '',
          clarified_water_outlet: visitObj.clarified_water_outlet || false,
          clarified_water_notes: visitObj.clarified_water_notes || '',
          discharge_pump_ok: visitObj.discharge_pump_ok || false,
          discharge_pump_notes: visitObj.discharge_pump_notes || '',
          has_lift_station: visitObj.has_lift_station ?? false, // Usar ?? para preservar false
          alarm_working: visitObj.alarm_working || false,
          alarm_working_notes: visitObj.alarm_working_notes || '',
          pump_running: visitObj.pump_running || false,
          pump_running_notes: visitObj.pump_running_notes || '',
          float_switches: visitObj.float_switches || false,
          float_switches_notes: visitObj.float_switches_notes || '',
          pump_condition: visitObj.pump_condition || false,
          pump_condition_notes: visitObj.pump_condition_notes || '',
          has_pbts: visitObj.has_pbts ?? false, // Usar ?? para preservar false
          well_points_quantity: visitObj.well_points_quantity ? String(visitObj.well_points_quantity) : '', // Convertir a string
          well_sample_1_observations: visitObj.well_sample_1_observations || '',
          well_sample_1_notes: visitObj.well_sample_1_notes || '',
          well_sample_2_observations: visitObj.well_sample_2_observations || '',
          well_sample_2_notes: visitObj.well_sample_2_notes || '',
          well_sample_3_observations: visitObj.well_sample_3_observations || '',
          well_sample_3_notes: visitObj.well_sample_3_notes || '',
          general_notes: visitObj.general_notes || '',
        });
        console.log('✅ FormData cargado desde visit object');
      } else {
        console.log('⚠️ No hay datos guardados en visit (actualVisitDate o tank_inlet_level vacíos)');
      }
      
      setLoading(false);
    };
    
    if (visit) {
      console.log('✅ useEffect - visit object received');
      processVisitData(visit);
    } else {
      console.log('⚠️ useEffect - visit object is null/undefined');
      setLoading(false);
    }
    
    requestMediaPermissions();
  }, [visit]);

  const requestMediaPermissions = async () => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (cameraStatus !== 'granted' || mediaStatus !== 'granted') {
      Alert.alert('Permisos necesarios', 'Se necesitan permisos de cámara y galería para subir fotos.');
    }
  };

  const handleOpenPdf = async (pdfSource) => {
    try {
      let fileUri;

      console.log('📄 handleOpenPdf - pdfSource tipo:', typeof pdfSource);
      
      // Verificar si es un objeto Buffer de Sequelize
      if (pdfSource?.type === 'Buffer' && Array.isArray(pdfSource.data)) {
        console.log('Procesando PDF desde Buffer (array de bytes)');
        
        // Convertir array de bytes a base64
        const uint8Array = new Uint8Array(pdfSource.data);
        let binary = '';
        const chunkSize = 8192; // Procesar en chunks para evitar stack overflow
        
        for (let i = 0; i < uint8Array.length; i += chunkSize) {
          const chunk = uint8Array.slice(i, i + chunkSize);
          binary += String.fromCharCode.apply(null, chunk);
        }
        
        const base64String = btoa(binary);
        
        const tempFileName = `permit_${Date.now()}.pdf`;
        fileUri = `${FileSystem.cacheDirectory}${tempFileName}`;
        
        await FileSystem.writeAsStringAsync(fileUri, base64String, {
          encoding: 'base64', // Usar string en lugar de EncodingType
        });
        
        console.log('✅ PDF convertido desde Buffer y guardado en:', fileUri);
      } else if (typeof pdfSource === 'string' && (pdfSource.startsWith('http://') || pdfSource.startsWith('https://'))) {
        // Es una URL
        const tempFileName = `permit_${Date.now()}.pdf`;
        fileUri = `${FileSystem.cacheDirectory}${tempFileName}`;
        console.log(`Descargando PDF desde: ${pdfSource}`);
        
        const downloadResult = await FileSystem.downloadAsync(pdfSource, fileUri);
        
        if (downloadResult.status !== 200) {
          throw new Error(`Error al descargar PDF (status ${downloadResult.status})`);
        }
        console.log('✅ PDF descargado:', downloadResult.uri);
        fileUri = downloadResult.uri;
      } else if (typeof pdfSource === 'string') {
        // String base64
        let base64Pdf = pdfSource;
        
        // Remover prefijo si existe
        if (pdfSource.startsWith("data:application/pdf;base64,")) {
          base64Pdf = pdfSource.split(",")[1];
        }
        
        const tempFileName = `permit_${Date.now()}.pdf`;
        fileUri = `${FileSystem.cacheDirectory}${tempFileName}`;
        await FileSystem.writeAsStringAsync(fileUri, base64Pdf, {
          encoding: 'base64',
        });
      } else {
        throw new Error("Formato de PDF no reconocido");
      }

      // Abrir en el visor de PDF
      console.log('📤 Abriendo PDF en visor:', fileUri);
      setSelectedPdfUri(fileUri);
      setPdfViewerVisible(true);

    } catch (error) {
      console.error("❌ Error en handleOpenPdf:", error);
      Alert.alert("Error al abrir PDF", error.message);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (fieldName, newFiles) => {
    setFiles(prev => ({ ...prev, [fieldName]: newFiles }));
  };

  const handleMediaAdd = async (fieldName) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: false,
        quality: 0.3,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const imageUri = result.assets[0].uri;
        
        // Optimizar imagen
        const optimizedImage = await manipulateAsync(
          imageUri,
          [{ resize: { width: 600 } }],
          { compress: 0.3, format: SaveFormat.JPEG }
        );

        // Crear objeto File-like para compatibilidad con el backend
        const filename = optimizedImage.uri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';

        const fileObject = {
          uri: optimizedImage.uri,
          name: filename,
          type: type,
        };

        // Guardar igual que el frontend web
        setFiles(prev => ({
          ...prev,
          [fieldName]: [...(prev[fieldName] || []), fileObject]
        }));

        Alert.alert('Éxito', 'Foto agregada correctamente');
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'No se pudo agregar la foto');
    }
  };

  const handleWellSampleFile = async (sampleNumber) => {
    try {
      // Preguntar si quiere cámara o galería
      Alert.alert(
        'Seleccionar foto',
        '¿Cómo deseas agregar la foto?',
        [
          {
            text: 'Cámara',
            onPress: async () => {
              const result = await ImagePicker.launchCameraAsync({
                quality: 0.3,
                allowsEditing: true,
                aspect: [4, 3],
              });
              await processWellSampleImage(result, sampleNumber);
            }
          },
          {
            text: 'Galería',
            onPress: async () => {
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 0.3,
                allowsEditing: true,
                aspect: [4, 3],
              });
              await processWellSampleImage(result, sampleNumber);
            }
          },
          {
            text: 'Cancelar',
            style: 'cancel'
          }
        ]
      );
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'No se pudo agregar la foto');
    }
  };

  const processWellSampleImage = async (result, sampleNumber) => {
    try {
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const imageUri = result.assets[0].uri;
        
        const optimizedImage = await manipulateAsync(
          imageUri,
          [{ resize: { width: 600 } }],
          { compress: 0.3, format: SaveFormat.JPEG }
        );

        const filename = optimizedImage.uri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';

        const fileObject = {
          uri: optimizedImage.uri,
          name: filename,
          type: type,
        };

        // Guardar archivo igual que el frontend web - archivos separados
        setWellSampleFiles(prev => ({
          ...prev,
          [`sample${sampleNumber}`]: fileObject
        }));

        Alert.alert('Éxito', `Foto de Muestra ${sampleNumber} agregada`);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'No se pudo tomar la foto');
    }
  };

  const handleSystemVideo = async () => {
    try {
      // Preguntar si quiere cámara o galería
      Alert.alert(
        'Seleccionar video',
        '¿Cómo deseas agregar el video?',
        [
          {
            text: 'Grabar video',
            onPress: async () => {
              const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Videos,
                videoMaxDuration: 60,
                quality: 0.5,
              });
              await processSystemVideo(result);
            }
          },
          {
            text: 'Galería',
            onPress: async () => {
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Videos,
                videoMaxDuration: 60,
                quality: 0.5,
              });
              await processSystemVideo(result);
            }
          },
          {
            text: 'Cancelar',
            style: 'cancel'
          }
        ]
      );
    } catch (error) {
      console.error('Error picking video:', error);
      Alert.alert('Error', 'No se pudo agregar el video');
    }
  };

  const processSystemVideo = async (result) => {
    try {
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const videoUri = result.assets[0].uri;
        const filename = videoUri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `video/${match[1]}` : 'video/mp4';

        const videoObject = {
          uri: videoUri,
          name: filename,
          type: type,
          isExisting: false, // Marcar como nuevo para que se suba
        };

        setSystemVideo(videoObject);
        Alert.alert('Éxito', 'Video del sistema agregado');
      }
    } catch (error) {
      console.error('Error processing video:', error);
      Alert.alert('Error', 'No se pudo procesar el video');
    }
  };

  const handleSubmit = async (markAsCompleted = false) => {
    try {
      if (__DEV__) {
        console.log('🚀 handleSubmit - markAsCompleted:', markAsCompleted);
      }
      
      if (!visit?.id) {
        Alert.alert('Error', 'ID de visita no válido');
        if (__DEV__) console.error('❌ Visit ID no válido');
        return;
      }

      // Validación básica - solo para marcar como completado
      if (markAsCompleted && !formData.actualVisitDate) {
        Alert.alert('Formulario incompleto', 'La fecha de inspección es requerida para completar');
        return;
      }

      setSubmitting(true);
      const token = await AsyncStorage.getItem('token');
      
      // Usar la misma lógica que axios.js para determinar el API_URL
      const API_URL = __DEV__ 
        ? 'http://192.168.1.8:3001' 
        : 'https://zurcherapi.up.railway.app';
      
      if (__DEV__) {
        console.log('📤 Enviando a:', `${API_URL}/maintenance/${visit.id}/complete`);
      }
      
      const formDataToSend = new FormData();
      
      // Indicar si se debe marcar como completado
      formDataToSend.append('markAsCompleted', markAsCompleted.toString());
      
      // Agregar campos del formulario - EXACTAMENTE igual que el frontend web
      Object.keys(formData).forEach(key => {
        if (typeof formData[key] === 'boolean') {
          formDataToSend.append(key, formData[key].toString());
        } else if (formData[key]) {
          formDataToSend.append(key, formData[key]);
        }
      });
      
      // Log de valores críticos
      if (__DEV__) {
        console.log('📋 Valores críticos en formData:');
        console.log('  has_pbts:', formData.has_pbts);
        console.log('  has_lift_station:', formData.has_lift_station);
        console.log('  well_points_quantity:', formData.well_points_quantity);
        console.log('  well_sample_1_observations:', formData.well_sample_1_observations);
      }

      // Crear mapeo de archivos a campos - igual que el frontend web
      const fileFieldMapping = {};
      
      // Agregar archivos asociados a campos específicos
      if (__DEV__) {
        console.log('📸 Procesando archivos:', Object.keys(files).length, 'campos');
        console.log('📸 Estado de files:', JSON.stringify(Object.keys(files).map(key => ({
          field: key,
          count: files[key]?.length || 0
        })), null, 2));
      }
      Object.keys(files).forEach(fieldName => {
        const fieldFiles = files[fieldName];
        if (fieldFiles && fieldFiles.length > 0) {
          fieldFiles.forEach((file, index) => {
            // NO volver a subir archivos que ya existen en Cloudinary (isExisting: true)
            if (file.isExisting) {
              console.log(`⏭️ Saltando archivo existente: ${file.name} (campo: ${fieldName})`);
              return; // Skip archivos ya guardados
            }
            
            // Solo subir archivos nuevos
            const fileToAppend = {
              uri: file.uri,
              type: file.type || 'image/jpeg',
              name: file.name || `photo_${fieldName}_${index}.jpg`,
            };
            formDataToSend.append('maintenanceFiles', fileToAppend);
            fileFieldMapping[fileToAppend.name] = fieldName;
            console.log(`📸 Agregando archivo: ${fileToAppend.name} -> campo: ${fieldName}`);
          });
        }
      });
      
      console.log('📸 fileFieldMapping final:', JSON.stringify(fileFieldMapping, null, 2));

      // Agregar archivos generales
      if (generalMedia && generalMedia.length > 0) {
        if (__DEV__) {
          console.log('📸 Archivos generales:', generalMedia.length);
        }
        generalMedia.forEach((file, index) => {
          const fileToAppend = {
            uri: file.uri,
            type: file.type || 'image/jpeg',
            name: file.name || `photo_general_${index}.jpg`,
          };
          formDataToSend.append('maintenanceFiles', fileToAppend);
          fileFieldMapping[fileToAppend.name] = 'general';
        });
      }

      // Agregar imágenes de muestras PBTS/ATU - igual que el frontend web
      if (wellSampleFiles.sample1 && !wellSampleFiles.sample1.isExisting) {
        const sample1File = {
          uri: wellSampleFiles.sample1.uri,
          type: wellSampleFiles.sample1.type || 'image/jpeg',
          name: wellSampleFiles.sample1.name || 'wellSample1.jpg',
        };
        formDataToSend.append('wellSample1', sample1File);
      }
      if (wellSampleFiles.sample2 && !wellSampleFiles.sample2.isExisting) {
        const sample2File = {
          uri: wellSampleFiles.sample2.uri,
          type: wellSampleFiles.sample2.type || 'image/jpeg',
          name: wellSampleFiles.sample2.name || 'wellSample2.jpg',
        };
        formDataToSend.append('wellSample2', sample2File);
      }
      if (wellSampleFiles.sample3 && !wellSampleFiles.sample3.isExisting) {
        const sample3File = {
          uri: wellSampleFiles.sample3.uri,
          type: wellSampleFiles.sample3.type || 'image/jpeg',
          name: wellSampleFiles.sample3.name || 'wellSample3.jpg',
        };
        formDataToSend.append('wellSample3', sample3File);
      }

      // Agregar video del sistema
      console.log('🎬 Estado de systemVideo:', systemVideo ? 'EXISTE' : 'NULL');
      if (systemVideo) {
        console.log('🎬 systemVideo.isExisting:', systemVideo.isExisting);
        console.log('🎬 systemVideo.uri:', systemVideo.uri?.substring(0, 50) + '...');
      }
      
      if (systemVideo && !systemVideo.isExisting) {
        console.log('🎬 Agregando video del sistema al FormData');
        const videoFile = {
          uri: systemVideo.uri,
          type: systemVideo.type || 'video/mp4',
          name: systemVideo.name || 'systemVideo.mp4',
        };
        formDataToSend.append('systemVideo', videoFile);
        console.log('✅ Video agregado:', videoFile.name);
      } else if (systemVideo && systemVideo.isExisting) {
        console.log('⏭️ Video ya existe, no se re-sube');
      } else {
        console.log('⚠️ No hay video para subir');
      }

      // Agregar mapeo de archivos
      formDataToSend.append('fileFieldMapping', JSON.stringify(fileFieldMapping));

      if (__DEV__) {
        console.log('📤 Enviando formulario con', Array.from(formDataToSend.keys()).length, 'campos');
      }
      
      // Enviar formulario - igual que el frontend web
      const response = await axios.post(
        `${API_URL}/maintenance/${visit.id}/complete`,
        formDataToSend,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (__DEV__) {
        console.log('✅ Formulario enviado exitosamente');
        console.log('📋 Respuesta del servidor:', response.data.message);
        console.log('📸 Archivos subidos:', response.data.uploadedFiles);
      }
      
      // Actualizar el objeto visit con los datos más recientes del servidor
      if (response.data.visit) {
        console.log('🔄 Actualizando visit object con datos del servidor');
        console.log('📸 mediaFiles en respuesta:', response.data.visit.mediaFiles?.length || 0);
        
        // Actualizar el estado local con la visita completa del servidor
        setVisitData(response.data.visit);
        
        // Recargar las imágenes existentes
        if (response.data.visit.mediaFiles && response.data.visit.mediaFiles.length > 0) {
          const imagesByField = {};
          response.data.visit.mediaFiles.forEach(media => {
            const fieldName = media.fieldName || 'general';
            if (!imagesByField[fieldName]) {
              imagesByField[fieldName] = [];
            }
            imagesByField[fieldName].push({
              uri: media.mediaUrl,
              name: media.originalName || 'image',
              isExisting: true,
              id: media.id
            });
          });
          
          // Mergear con archivos nuevos que aún no se han subido
          setFiles(prevFiles => {
            const merged = { ...prevFiles };
            Object.keys(imagesByField).forEach(fieldName => {
              // Reemplazar completamente con los del servidor para ese campo
              merged[fieldName] = imagesByField[fieldName];
            });
            console.log('🔄 Files actualizados después de guardar');
            return merged;
          });
        }
        
        // Actualizar imágenes de PBTS
        if (response.data.visit.well_sample_1_url || response.data.visit.well_sample_2_url || response.data.visit.well_sample_3_url) {
          console.log('📸 Actualizando imágenes de PBTS');
          setWellSampleFiles({
            sample1: response.data.visit.well_sample_1_url ? { uri: response.data.visit.well_sample_1_url, isExisting: true } : null,
            sample2: response.data.visit.well_sample_2_url ? { uri: response.data.visit.well_sample_2_url, isExisting: true } : null,
            sample3: response.data.visit.well_sample_3_url ? { uri: response.data.visit.well_sample_3_url, isExisting: true } : null,
          });
        }
        
        // Actualizar video del sistema
        if (response.data.visit.system_video_url) {
          console.log('🎬 Actualizando video del sistema');
          setSystemVideo({ uri: response.data.visit.system_video_url, isExisting: true });
        }
        
        // IMPORTANTE: Actualizar formData con los datos del servidor
        console.log('📋 Actualizando formData con datos del servidor');
        const updatedVisit = response.data.visit;
        setFormData({
          actualVisitDate: updatedVisit.actualVisitDate || new Date().toISOString().split('T')[0],
          tank_inlet_level: updatedVisit.tank_inlet_level ? String(updatedVisit.tank_inlet_level) : '',
          tank_inlet_notes: updatedVisit.tank_inlet_notes || '',
          tank_outlet_level: updatedVisit.tank_outlet_level ? String(updatedVisit.tank_outlet_level) : '',
          tank_outlet_notes: updatedVisit.tank_outlet_notes || '',
          strong_odors: updatedVisit.strong_odors || false,
          strong_odors_notes: updatedVisit.strong_odors_notes || '',
          water_level_ok: updatedVisit.water_level_ok || false,
          water_level_notes: updatedVisit.water_level_notes || '',
          visible_leaks: updatedVisit.visible_leaks || false,
          visible_leaks_notes: updatedVisit.visible_leaks_notes || '',
          area_around_dry: updatedVisit.area_around_dry || false,
          area_around_notes: updatedVisit.area_around_notes || '',
          cap_green_inspected: updatedVisit.cap_green_inspected || false,
          cap_green_notes: updatedVisit.cap_green_notes || '',
          needs_pumping: updatedVisit.needs_pumping || false,
          needs_pumping_notes: updatedVisit.needs_pumping_notes || '',
          blower_working: updatedVisit.blower_working || false,
          blower_working_notes: updatedVisit.blower_working_notes || '',
          blower_filter_clean: updatedVisit.blower_filter_clean || false,
          blower_filter_notes: updatedVisit.blower_filter_notes || '',
          diffusers_bubbling: updatedVisit.diffusers_bubbling || false,
          diffusers_bubbling_notes: updatedVisit.diffusers_bubbling_notes || '',
          clarified_water_outlet: updatedVisit.clarified_water_outlet || false,
          clarified_water_notes: updatedVisit.clarified_water_notes || '',
          discharge_pump_ok: updatedVisit.discharge_pump_ok || false,
          discharge_pump_notes: updatedVisit.discharge_pump_notes || '',
          has_lift_station: updatedVisit.has_lift_station ?? false,
          alarm_working: updatedVisit.alarm_working || false,
          alarm_working_notes: updatedVisit.alarm_working_notes || '',
          pump_running: updatedVisit.pump_running || false,
          pump_running_notes: updatedVisit.pump_running_notes || '',
          float_switches: updatedVisit.float_switches || false,
          float_switches_notes: updatedVisit.float_switches_notes || '',
          pump_condition: updatedVisit.pump_condition || false,
          pump_condition_notes: updatedVisit.pump_condition_notes || '',
          has_pbts: updatedVisit.has_pbts ?? false,
          well_points_quantity: updatedVisit.well_points_quantity ? String(updatedVisit.well_points_quantity) : '',
          well_sample_1_observations: updatedVisit.well_sample_1_observations || '',
          well_sample_1_notes: updatedVisit.well_sample_1_notes || '',
          well_sample_2_observations: updatedVisit.well_sample_2_observations || '',
          well_sample_2_notes: updatedVisit.well_sample_2_notes || '',
          well_sample_3_observations: updatedVisit.well_sample_3_observations || '',
          well_sample_3_notes: updatedVisit.well_sample_3_notes || '',
          general_notes: updatedVisit.general_notes || '',
        });
        console.log('✅ FormData actualizado - has_lift_station:', updatedVisit.has_lift_station, 'has_pbts:', updatedVisit.has_pbts);
        
        // CRÍTICO: Actualizar el visit object en route.params para que al volver a entrar tenga datos frescos
        navigation.setParams({ visit: response.data.visit });
        console.log('✅ Route params actualizados con datos del servidor');
      }
      
      if (markAsCompleted) {
        Alert.alert(
          'Éxito',
          'Mantenimiento completado exitosamente',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack()
            }
          ]
        );
      } else {
        Alert.alert('Éxito', 'Progreso guardado exitosamente');
        // NO navegamos de vuelta, permitimos seguir editando
      }
    } catch (error) {
      console.error('❌ Error submitting form:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      console.error('❌ Error full:', error);
      Alert.alert('Error', 'Error al enviar el formulario: ' + (error.response?.data?.message || error.message));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1976d2" />
        <Text style={styles.loadingText}>Cargando datos de mantenimiento...</Text>
      </View>
    );
  }

  if (!visitData) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No se pudo cargar la información de la visita</Text>
      </View>
    );
  }

  const systemType = permitData?.systemType || '';
  const showATU = systemType.includes('ATU');
  // PBTS y Lift Station ahora SIEMPRE se muestran, el usuario decide con Switch si aplica
  const showPBTS = true;
  const showLiftStation = true;

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Formulario de Mantenimiento</Text>
        
        {permitData && (
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Información del Proyecto</Text>
            <Text style={styles.infoText}>📍 {permitData.propertyAddress}</Text>
            <Text style={styles.infoText}>👤 {permitData.applicantName}</Text>
            <Text style={styles.infoText}>🔧 {permitData.systemType}</Text>
            <Text style={styles.infoText}>🎫 {permitData.permitNumber}</Text>
          </View>
        )}

        <View style={styles.visitInfo}>
          <Text style={styles.infoText}>
            📅 Fecha: {visitData.scheduledDate ? new Date(visitData.scheduledDate + 'T12:00:00').toLocaleDateString('es-ES') : 'N/A'}
          </Text>
          <Text style={styles.infoText}>
            🔢 Visita #{visitData.visitNumber}
          </Text>
        </View>

        {/* Botones de PDFs */}
        {(permitData?.pdfData || permitData?.optionalDocs) && (
          <View style={styles.pdfButtonsContainer}>
            {permitData?.pdfData && (
              <TouchableOpacity
                onPress={() => handleOpenPdf(permitData.pdfData)}
                style={styles.pdfButton}
              >
                <View style={styles.pdfIconContainer}>
                  <Ionicons name="document-text-outline" size={40} color="#4B5563" />
                </View>
                <Text style={styles.pdfButtonText}>PDF Permit</Text>
              </TouchableOpacity>
            )}

            {permitData?.optionalDocs && (
              <TouchableOpacity
                onPress={() => handleOpenPdf(permitData.optionalDocs)}
                style={styles.pdfButton}
              >
                <View style={styles.pdfIconContainer}>
                  <Ionicons name="document-attach-outline" size={40} color="#4B5563" />
                </View>
                <Text style={styles.pdfButtonText}>PDF Site Plan</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Aviso sobre guardar progreso */}
      <View style={styles.infoBox}>
        <Text style={styles.infoBoxTitle}>ℹ️ Puedes trabajar en el formulario cuando quieras</Text>
        <Text style={styles.infoBoxText}>• <Text style={{ fontWeight: 'bold' }}>Guardar Progreso:</Text> Guarda tus cambios sin finalizar la visita</Text>
        <Text style={styles.infoBoxText}>• <Text style={{ fontWeight: 'bold' }}>Marcar como Completado:</Text> Finaliza la visita y la marca como completada</Text>
        <Text style={styles.infoBoxText}>• Puedes volver a abrir y editar hasta que la marques como completada</Text>
      </View>

      {/* Fecha de Inspección */}
      <View style={styles.section}>
        <View style={[styles.dateSection, { backgroundColor: '#EBF5FF', padding: 16, borderRadius: 8, borderWidth: 2, borderColor: '#3B82F6' }]}>
          <Text style={[styles.sectionTitle, { color: '#1E40AF', marginBottom: 8 }]}>
            Fecha de Inspección *
          </Text>
          <TextInput
            style={[styles.input, { borderWidth: 2, borderColor: '#3B82F6', fontWeight: 'bold' }]}
            value={formData.actualVisitDate}
            onChangeText={(value) => handleInputChange('actualVisitDate', value)}
            placeholder="YYYY-MM-DD"
          />
          <Text style={{ fontSize: 12, color: '#1E40AF', marginTop: 4 }}>
            Formato: Año-Mes-Día (Ej: 2025-11-22)
          </Text>
        </View>
      </View>

      {/* Niveles del Tanque */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Niveles del Tanque</Text>
        
        <View style={styles.fieldCard}>
          <Text style={styles.inputLabel}>Nivel entrada tanque (FOTO)</Text>
          <TextInput
            style={styles.input}
            value={formData.tank_inlet_level}
            onChangeText={(value) => handleInputChange('tank_inlet_level', value)}
            placeholder="Ej: 12 pulgadas"
          />
          
          <Text style={styles.inputLabel}>Observaciones nivel entrada</Text>
          <TextInput
            style={styles.textArea}
            value={formData.tank_inlet_notes}
            onChangeText={(value) => handleInputChange('tank_inlet_notes', value)}
            placeholder="Agregar observaciones..."
            multiline
            numberOfLines={2}
          />
          
          <TouchableOpacity 
            style={styles.mediaButton}
            onPress={() => handleMediaAdd('tank_inlet_level')}
          >
            <Text style={styles.mediaButtonText}>
              📷 Adjuntar Foto {files.tank_inlet_level?.length > 0 && `(${files.tank_inlet_level.length})`}
            </Text>
          </TouchableOpacity>

          {/* Miniaturas de fotos */}
          {files.tank_inlet_level?.length > 0 && (
            <View style={styles.thumbnailContainer}>
              <Text style={styles.thumbnailTitle}>Fotos adjuntas:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbnailScroll}>
                {files.tank_inlet_level.map((file, index) => (
                  <View key={index} style={styles.thumbnailWrapper}>
                    <Image 
                      source={{ uri: file.uri }} 
                      style={styles.thumbnail}
                      resizeMode="cover"
                    />
                    <Text style={styles.thumbnailIndex}>{index + 1}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        <View style={styles.fieldCard}>
          <Text style={styles.inputLabel}>Nivel salida tanque (FOTO)</Text>
          <TextInput
            style={styles.input}
            value={formData.tank_outlet_level}
            onChangeText={(value) => handleInputChange('tank_outlet_level', value)}
            placeholder="Ej: 8 pulgadas"
          />
          
          <Text style={styles.inputLabel}>Observaciones nivel salida</Text>
          <TextInput
            style={styles.textArea}
            value={formData.tank_outlet_notes}
            onChangeText={(value) => handleInputChange('tank_outlet_notes', value)}
            placeholder="Agregar observaciones..."
            multiline
            numberOfLines={2}
          />
          
          <TouchableOpacity 
            style={styles.mediaButton}
            onPress={() => handleMediaAdd('tank_outlet_level')}
          >
            <Text style={styles.mediaButtonText}>
              📷 Adjuntar Foto {files.tank_outlet_level?.length > 0 && `(${files.tank_outlet_level.length})`}
            </Text>
          </TouchableOpacity>

          {/* Miniaturas de fotos */}
          {files.tank_outlet_level?.length > 0 && (
            <View style={styles.thumbnailContainer}>
              <Text style={styles.thumbnailTitle}>Fotos adjuntas:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbnailScroll}>
                {files.tank_outlet_level.map((file, index) => (
                  <View key={index} style={styles.thumbnailWrapper}>
                    <Image 
                      source={{ uri: file.uri }} 
                      style={styles.thumbnail}
                      resizeMode="cover"
                    />
                    <Text style={styles.thumbnailIndex}>{index + 1}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      </View>

      {/* Inspección General */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Inspección General</Text>
        
        <CheckboxFieldNoMedia
          label="¿Olores fuertes?"
          value={formData.strong_odors}
          notesValue={formData.strong_odors_notes}
          onCheckChange={(val) => handleInputChange('strong_odors', val)}
          onNotesChange={(val) => handleInputChange('strong_odors_notes', val)}
        />

        <CheckboxFieldNoMedia
          label="¿Nivel de agua correcto?"
          value={formData.water_level_ok}
          notesValue={formData.water_level_notes}
          onCheckChange={(val) => handleInputChange('water_level_ok', val)}
          onNotesChange={(val) => handleInputChange('water_level_notes', val)}
        />

        <CheckboxField
          label="¿Fugas visibles?"
          value={formData.visible_leaks}
          notesValue={formData.visible_leaks_notes}
          onCheckChange={(val) => handleInputChange('visible_leaks', val)}
          onNotesChange={(val) => handleInputChange('visible_leaks_notes', val)}
          onMediaAdd={() => handleMediaAdd('visible_leaks')}
          mediaCount={files.visible_leaks?.length || 0}
          mediaFiles={files.visible_leaks || []}
        />

        <CheckboxField
          label="¿Área alrededor seca?"
          value={formData.area_around_dry}
          notesValue={formData.area_around_notes}
          onCheckChange={(val) => handleInputChange('area_around_dry', val)}
          onNotesChange={(val) => handleInputChange('area_around_notes', val)}
          onMediaAdd={() => handleMediaAdd('area_around_dry')}
          mediaCount={files.area_around_dry?.length || 0}
          mediaFiles={files.area_around_dry || []}
        />

        <CheckboxField
          label="¿T de inspección cap verde?"
          value={formData.cap_green_inspected}
          notesValue={formData.cap_green_notes}
          onCheckChange={(val) => handleInputChange('cap_green_inspected', val)}
          onNotesChange={(val) => handleInputChange('cap_green_notes', val)}
          onMediaAdd={() => handleMediaAdd('cap_green_inspected')}
          mediaCount={files.cap_green_inspected?.length || 0}
          mediaFiles={files.cap_green_inspected || []}
        />

        <CheckboxField
          label="¿Necesita bombeo?"
          value={formData.needs_pumping}
          notesValue={formData.needs_pumping_notes}
          onCheckChange={(val) => handleInputChange('needs_pumping', val)}
          onNotesChange={(val) => handleInputChange('needs_pumping_notes', val)}
          onMediaAdd={() => handleMediaAdd('needs_pumping')}
          mediaCount={files.needs_pumping?.length || 0}
          mediaFiles={files.needs_pumping || []}
        />
      </View>

      {/* Sistema ATU */}
      {showATU && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sistema ATU</Text>
          
          <CheckboxField
            label="¿Blower funcionando?"
            value={formData.blower_working}
            notesValue={formData.blower_working_notes}
            onCheckChange={(val) => handleInputChange('blower_working', val)}
            onNotesChange={(val) => handleInputChange('blower_working_notes', val)}
            onMediaAdd={() => handleMediaAdd('blower_working')}
            mediaCount={files.blower_working?.length || 0}
            mediaFiles={files.blower_working || []}
          />

          <CheckboxField
            label="¿Filtro del blower limpio?"
            value={formData.blower_filter_clean}
            notesValue={formData.blower_filter_notes}
            onCheckChange={(val) => handleInputChange('blower_filter_clean', val)}
            onNotesChange={(val) => handleInputChange('blower_filter_notes', val)}
            onMediaAdd={() => handleMediaAdd('blower_filter_clean')}
            mediaCount={files.blower_filter_clean?.length || 0}
            mediaFiles={files.blower_filter_clean || []}
          />

          <CheckboxField
            label="¿Difusores burbujeando?"
            value={formData.diffusers_bubbling}
            notesValue={formData.diffusers_bubbling_notes}
            onCheckChange={(val) => handleInputChange('diffusers_bubbling', val)}
            onNotesChange={(val) => handleInputChange('diffusers_bubbling_notes', val)}
            onMediaAdd={() => handleMediaAdd('diffusers_bubbling')}
            mediaCount={files.diffusers_bubbling?.length || 0}
            mediaFiles={files.diffusers_bubbling || []}
          />

          <CheckboxField
            label="¿Agua clarificada salida tanque?"
            value={formData.clarified_water_outlet}
            notesValue={formData.clarified_water_notes}
            onCheckChange={(val) => handleInputChange('clarified_water_outlet', val)}
            onNotesChange={(val) => handleInputChange('clarified_water_notes', val)}
            onMediaAdd={() => handleMediaAdd('clarified_water_outlet')}
            mediaCount={files.clarified_water_outlet?.length || 0}
            mediaFiles={files.clarified_water_outlet || []}
          />

          <CheckboxField
            label="¿Bomba de descarga OK?"
            value={formData.discharge_pump_ok}
            notesValue={formData.discharge_pump_notes}
            onCheckChange={(val) => handleInputChange('discharge_pump_ok', val)}
            onNotesChange={(val) => handleInputChange('discharge_pump_notes', val)}
            onMediaAdd={() => handleMediaAdd('discharge_pump_ok')}
            mediaCount={files.discharge_pump_ok?.length || 0}
            mediaFiles={files.discharge_pump_ok || []}
          />
        </View>
      )}

      {/* Lift Station - CONDICIONAL */}
      {showLiftStation && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔌 Lift Station</Text>
          
          {/* Control de visibilidad */}
          <View style={styles.checkboxContainer}>
            <View style={styles.checkboxHeader}>
              <Switch
                value={formData.has_lift_station}
                onValueChange={(val) => handleInputChange('has_lift_station', val)}
                trackColor={{ false: '#ccc', true: '#4CAF50' }}
                thumbColor={formData.has_lift_station ? '#fff' : '#f4f3f4'}
              />
              <Text style={styles.checkboxLabel}>¿Tiene Lift Station?</Text>
            </View>
          </View>

          {/* Campos solo si tiene Lift Station */}
          {formData.has_lift_station && (
            <>
              <CheckboxField
                label="¿Panel alarma funcionando? (FOTO)"
                value={formData.alarm_working}
                notesValue={formData.alarm_working_notes}
                onCheckChange={(val) => handleInputChange('alarm_working', val)}
                onNotesChange={(val) => handleInputChange('alarm_working_notes', val)}
                onMediaAdd={() => handleMediaAdd('alarm_working')}
                mediaCount={files.alarm_working?.length || 0}
                mediaFiles={files.alarm_working || []}
              />

              <CheckboxField
                label="¿Bomba funcionando?"
                value={formData.pump_running}
                notesValue={formData.pump_running_notes}
                onCheckChange={(val) => handleInputChange('pump_running', val)}
                onNotesChange={(val) => handleInputChange('pump_running_notes', val)}
                onMediaAdd={() => handleMediaAdd('pump_running')}
                mediaCount={files.pump_running?.length || 0}
                mediaFiles={files.pump_running || []}
              />

              <CheckboxField
                label="¿Flotante en buena condición?"
                value={formData.float_switches}
                notesValue={formData.float_switches_notes}
                onCheckChange={(val) => handleInputChange('float_switches', val)}
                onNotesChange={(val) => handleInputChange('float_switches_notes', val)}
                onMediaAdd={() => handleMediaAdd('float_switches')}
                mediaCount={files.float_switches?.length || 0}
                mediaFiles={files.float_switches || []}
              />
            </>
          )}
        </View>
      )}

      {/* PBTS - CONDICIONAL */}
      {showPBTS && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PBTS - Muestras de Well Points (FOTO)</Text>
          
          {/* Control de visibilidad */}
          <View style={styles.checkboxContainer}>
            <View style={styles.checkboxHeader}>
              <Switch
                value={formData.has_pbts}
                onValueChange={(val) => handleInputChange('has_pbts', val)}
                trackColor={{ false: '#ccc', true: '#4CAF50' }}
                thumbColor={formData.has_pbts ? '#fff' : '#f4f3f4'}
              />
              <Text style={styles.checkboxLabel}>¿Tiene PBTS (Pozos)?</Text>
            </View>
          </View>

          {/* Campos solo si tiene PBTS */}
          {formData.has_pbts && (
            <>
              <Text style={styles.inputLabel}>Cantidad de Well Points Encontrados</Text>
              <TextInput
                style={styles.input}
                value={formData.well_points_quantity}
                onChangeText={(value) => handleInputChange('well_points_quantity', value)}
                placeholder="Ingrese la cantidad"
                keyboardType="number-pad"
              />

              {/* Muestra 1 */}
              <View style={styles.wellSampleCard}>
                <Text style={styles.wellSampleTitle}>📸 Muestra 1 (FOTO)</Text>
                
                <Text style={styles.inputLabel}>Observaciones</Text>
                <TextInput
                  style={styles.textArea}
                  value={formData.well_sample_1_observations}
                  onChangeText={(value) => handleInputChange('well_sample_1_observations', value)}
                  placeholder="Observaciones de la muestra..."
                  multiline
                  numberOfLines={3}
                />
                
                <TouchableOpacity
                  style={styles.photoButton}
                  onPress={() => handleWellSampleFile(1)}
                >
                  <Text style={styles.photoButtonText}>
                    {wellSampleFiles.sample1 ? '✅ Foto agregada' : '📸 Agregar foto'}
                  </Text>
                </TouchableOpacity>
                
                {wellSampleFiles.sample1 && (
                  <Image
                    source={{ uri: wellSampleFiles.sample1.uri }}
                    style={styles.previewImage}
                  />
                )}
              </View>

              {/* Muestra 2 */}
              <View style={styles.wellSampleCard}>
                <Text style={styles.wellSampleTitle}>📸 Muestra 2 (FOTO)</Text>
                
                <Text style={styles.inputLabel}>Observaciones</Text>
                <TextInput
                  style={styles.textArea}
                  value={formData.well_sample_2_observations}
                  onChangeText={(value) => handleInputChange('well_sample_2_observations', value)}
                  placeholder="Observaciones de la muestra..."
                  multiline
                  numberOfLines={3}
                />
                
                <TouchableOpacity
                  style={styles.photoButton}
                  onPress={() => handleWellSampleFile(2)}
                >
                  <Text style={styles.photoButtonText}>
                    {wellSampleFiles.sample2 ? '✅ Foto agregada' : '📸 Agregar foto'}
                  </Text>
                </TouchableOpacity>
                
                {wellSampleFiles.sample2 && (
                  <Image
                    source={{ uri: wellSampleFiles.sample2.uri }}
                    style={styles.previewImage}
                  />
                )}
              </View>

              {/* Muestra 3 */}
              <View style={styles.wellSampleCard}>
                <Text style={styles.wellSampleTitle}>📸 Muestra 3 (FOTO)</Text>
                
                <Text style={styles.inputLabel}>Observaciones</Text>
                <TextInput
                  style={styles.textArea}
                  value={formData.well_sample_3_observations}
                  onChangeText={(value) => handleInputChange('well_sample_3_observations', value)}
                  placeholder="Observaciones de la muestra..."
                  multiline
                  numberOfLines={3}
                />
                
                <TouchableOpacity
                  style={styles.photoButton}
                  onPress={() => handleWellSampleFile(3)}
                >
                  <Text style={styles.photoButtonText}>
                    {wellSampleFiles.sample3 ? '✅ Foto agregada' : '📸 Agregar foto'}
                  </Text>
                </TouchableOpacity>
                
                {wellSampleFiles.sample3 && (
                  <Image
                    source={{ uri: wellSampleFiles.sample3.uri }}
                    style={styles.previewImage}
                  />
                )}
              </View>
            </>
          )}
        </View>
      )}

      {/* Observaciones Generales */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Observaciones Generales</Text>
        
        <Text style={styles.inputLabel}>Notas Generales</Text>
        <TextInput
          style={[styles.textArea, { height: 100 }]}
          value={formData.general_notes}
          onChangeText={(value) => handleInputChange('general_notes', value)}
          placeholder="Agregue observaciones generales aquí..."
          multiline
          numberOfLines={4}
        />

        <TouchableOpacity
          style={styles.videoButton}
          onPress={handleSystemVideo}
        >
          <Text style={styles.videoButtonText}>
            🎬 {systemVideo ? '✅ Video grabado' : 'Grabar video del sistema'}
          </Text>
        </TouchableOpacity>
        
        {/* Mostrar video si existe */}
        {systemVideo && (
          <View style={styles.videoPreviewContainer}>
            <Text style={styles.videoPreviewLabel}>Vista previa del video:</Text>
            <Video
              source={{ uri: systemVideo.uri }}
              style={styles.videoPreview}
              useNativeControls
              resizeMode="contain"
              isLooping={false}
            />
            <TouchableOpacity
              style={styles.removeVideoButton}
              onPress={() => {
                Alert.alert(
                  'Eliminar video',
                  '¿Estás seguro de que quieres eliminar este video?',
                  [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                      text: 'Eliminar',
                      style: 'destructive',
                      onPress: () => setSystemVideo(null)
                    }
                  ]
                );
              }}
            >
              <Text style={styles.removeVideoButtonText}>🗑️ Eliminar Video</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Botones de acción */}
      <View style={styles.actionButtons}>
        {/* Botón DEBUG INFO */}
        <TouchableOpacity
          style={[styles.debugButton]}
          onPress={async () => {
            const token = await AsyncStorage.getItem('token');
            const API_URL = __DEV__ 
              ? 'http://192.168.1.8:3001' 
              : 'https://zurcherapi.up.railway.app';
            Alert.alert(
              '🔍 DEBUG INFO',
              `Visit ID: ${visit?.id}\n` +
              `Visit Number: ${visit?.visitNumber}\n` +
              `Fecha: ${formData.actualVisitDate}\n` +
              `Token: ${token ? 'Existe ✅' : 'NO EXISTE ❌'}\n` +
              `API_URL: ${API_URL}\n` +
              `URL completa: ${API_URL}/maintenance/${visit?.id}/complete\n` +
              `Submitting: ${submitting}`,
              [{ text: 'OK' }]
            );
          }}
        >
          <Text style={styles.debugButtonText}>🔍 Ver Info Debug</Text>
        </TouchableOpacity>

        {/* Botón Guardar Progreso */}
        <TouchableOpacity
          style={[styles.saveProgressButton, submitting && styles.buttonDisabled]}
          onPress={() => {
            if (__DEV__) console.log('🔵 Guardar progreso');
            handleSubmit(false);
          }}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Text style={styles.saveProgressButtonText}>💾 Guardar Progreso</Text>
              <Text style={styles.buttonSubtext}>Continuar después</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Botón Marcar como Completado */}
        <TouchableOpacity
          style={[styles.completeButton, submitting && styles.buttonDisabled]}
          onPress={() => {
            if (__DEV__) console.log('🟢 Completar visita');
            handleSubmit(true);
          }}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Text style={styles.completeButtonText}>✅ Marcar como Completado</Text>
              <Text style={styles.buttonSubtext}>Finalizar visita</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />

      {/* Visor de PDF */}
      <PdfViewer
        visible={pdfViewerVisible}
        fileUri={selectedPdfUri}
        onClose={() => {
          setPdfViewerVisible(false);
          setSelectedPdfUri(null);
          if (selectedPdfUri) {
            FileSystem.deleteAsync(selectedPdfUri, { idempotent: true })
              .catch(err => console.error("Error al eliminar PDF temporal:", err));
          }
        }}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  errorText: {
    fontSize: 16,
    color: '#d32f2f',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 16,
  },
  infoCard: {
    backgroundColor: '#f0f8ff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#1976d2',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
  },
  visitInfo: {
    backgroundColor: '#fff9e6',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ffa000',
  },
  pdfButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    gap: 24,
  },
  pdfButton: {
    alignItems: 'center',
  },
  pdfIconContainer: {
    width: 80,
    height: 80,
    backgroundColor: '#e5e7eb',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  pdfButtonText: {
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
    color: '#4B5563',
  },
  infoBox: {
    backgroundColor: '#E3F2FD',
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 8,
  },
  infoBoxTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1565C0',
    marginBottom: 8,
  },
  infoBoxText: {
    fontSize: 13,
    color: '#1976D2',
    marginBottom: 4,
    lineHeight: 20,
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 12,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 8,
  },
  textArea: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    textAlignVertical: 'top',
    marginBottom: 8,
  },
  checkboxContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  fieldCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  checkboxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
    flex: 1,
  },
  checkboxDetails: {
    marginTop: 12,
    paddingLeft: 12,
  },
  mediaButton: {
    backgroundColor: '#1976d2',
    padding: 10,
    borderRadius: 6,
    marginTop: 8,
    alignItems: 'center',
  },
  mediaButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  wellSampleCard: {
    backgroundColor: '#f0f8ff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#90caf9',
  },
  wellSampleTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 8,
  },
  photoButton: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  photoButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginTop: 8,
    resizeMode: 'cover',
  },
  videoButton: {
    backgroundColor: '#9c27b0',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  videoButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  videoPreviewContainer: {
    marginTop: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    borderWidth: 2,
    borderColor: '#9c27b0',
  },
  videoPreviewLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  videoPreview: {
    width: '100%',
    height: 200,
    backgroundColor: '#000',
    borderRadius: 8,
  },
  removeVideoButton: {
    backgroundColor: '#f44336',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  removeVideoButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  actionButtons: {
    flexDirection: 'column',
    padding: 16,
    gap: 12,
  },
  debugButton: {
    backgroundColor: '#FF9800',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F57C00',
  },
  debugButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  saveProgressButton: {
    backgroundColor: '#757575',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveProgressButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  completeButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonSubtext: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
    opacity: 0.9,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  submitButton: {
    flex: 2,
    backgroundColor: '#1976d2',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#90caf9',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  thumbnailContainer: {
    marginTop: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 8,
  },
  thumbnailTitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    fontWeight: '600',
  },
  thumbnailScroll: {
    flexDirection: 'row',
  },
  thumbnailWrapper: {
    marginRight: 8,
    position: 'relative',
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  thumbnailIndex: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
});

export default MaintenanceFormScreen;
