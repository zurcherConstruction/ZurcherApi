import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Platform,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import * as ImagePicker from 'expo-image-picker';
import { createGeneralExpenseWithReceipt } from '../Redux/features/balanceSlice'; // Ajusta la ruta
import { useNavigation } from '@react-navigation/native';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy'; // ⚡ Usar API legacy

const GeneralExpenseScreen = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { loading, error } = useSelector((state) => state.balance); // O el slice correspondiente
  
  // Obtener usuario autenticado desde Redux
  const user = useSelector((state) => state.auth?.staff); // Cambiar user por staff

  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [image, setImage] = useState(null); // Guardará { uri, mimeType, fileName }

  // Solicitar permisos al montar (si es necesario)
  useState(() => {
    (async () => {
      if (Platform.OS !== 'web') {
        const libraryStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (libraryStatus.status !== 'granted') {
          Alert.alert('Permiso necesario', 'Se necesita acceso a la galería para seleccionar imágenes.');
        }
        const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
        if (cameraStatus.status !== 'granted') {
           Alert.alert('Permiso necesario', 'Se necesita acceso a la cámara para tomar fotos.');
        }
      }
    })();
  }, []);

  // ✅ Función para optimizar imágenes de comprobantes
  const optimizeReceiptImage = async (imageUri) => {
    try {
      console.log('🧾 Optimizando comprobante...');
      
      // Reducir a 1024px de ancho (suficiente para leer texto/números)
      const resizedImage = await manipulateAsync(
        imageUri,
        [{ resize: { width: 1024 } }],
        { compress: 0.3, format: SaveFormat.JPEG } // 30% de calidad
      );
      
      // ⚡ Compatible con web y nativo
      let sizeKB = 0;
      if (Platform.OS === 'web') {
        try {
          const response = await fetch(resizedImage.uri);
          const blob = await response.blob();
          sizeKB = blob.size / 1024;
        } catch (error) {
          console.warn('No se pudo verificar tamaño en web');
        }
      } else {
        const imageInfo = await FileSystem.getInfoAsync(resizedImage.uri);
        sizeKB = imageInfo.size / 1024;
      }
      
      console.log(`🧾 Comprobante optimizado: ${sizeKB.toFixed(0)}KB`);
      
      // Si aún es muy pesado (>2MB), comprimir más
      if (sizeKB > 2048) {
        console.log('⚠️ Comprobante muy pesado, comprimiendo más...');
        const extraCompressed = await manipulateAsync(
          resizedImage.uri,
          [{ resize: { width: 800 } }],
          { compress: 0.2, format: SaveFormat.JPEG }
        );
        return extraCompressed.uri;
      }
      
      return resizedImage.uri;
    } catch (error) {
      console.error('Error optimizando comprobante:', error);
      // Si falla la optimización, usar imagen original
      return imageUri;
    }
  };

  const handlePickImage = async () => {
    Alert.alert(
        "Seleccionar Imagen",
        "Elige una opción",
        [
            {
                text: "Galería",
                onPress: async () => {
                    let result = await ImagePicker.launchImageLibraryAsync({
                        mediaTypes: ImagePicker.MediaTypeOptions.Images,
                        allowsEditing: true,
                        aspect: [4, 3],
                        quality: 0.3, // ✅ OPTIMIZACIÓN: Comprobantes no necesitan alta calidad
                    });

                    if (!result.canceled) {
                        const asset = result.assets[0];
                        // ✅ Optimizar imagen antes de guardarla
                        const optimizedUri = await optimizeReceiptImage(asset.uri);
                        setImage({ uri: optimizedUri, mimeType: 'image/jpeg', fileName: asset.fileName || `receipt_${Date.now()}.jpg` });
                    }
                },
            },
            {
                text: "Cámara",
                onPress: async () => {
                     let result = await ImagePicker.launchCameraAsync({
                        allowsEditing: true,
                        aspect: [4, 3],
                        quality: 0.3, // ✅ OPTIMIZACIÓN: Comprobantes no necesitan alta calidad
                    });
                     if (!result.canceled) {
                        const asset = result.assets[0];
                        // ✅ Optimizar imagen antes de guardarla
                        const optimizedUri = await optimizeReceiptImage(asset.uri);
                        setImage({ uri: optimizedUri, mimeType: 'image/jpeg', fileName: asset.fileName || `receipt_${Date.now()}.jpg` });
                    }
                },
            },
            { text: "Cancelar", style: "cancel" },
        ]
    );
  };

  const handleSubmit = () => {
    // ✅ Normalizar el monto: reemplazar coma por punto
    const normalizedAmount = amount.replace(',', '.');
    const numericAmount = parseFloat(normalizedAmount);
    
    if (__DEV__) {
      console.log('💰 GASTO GENERAL - Validando monto:', {
        original: amount,
        normalized: normalizedAmount,
        parsed: numericAmount,
        type: typeof numericAmount
      });
    }
    
    if (isNaN(numericAmount) || numericAmount <= 0) {
      Alert.alert('Error', 'Por favor, ingresa un monto válido mayor a $0.00');
      return;
    }
    
    if (!notes.trim() && !image) {
        Alert.alert('Error', 'Por favor, añade una nota o una imagen para el gasto.');
        return;
    }

    // ✅ Formatear a exactamente 2 decimales
    const formattedAmount = parseFloat(numericAmount.toFixed(2));
    
    if (__DEV__) {
      console.log('💰 GASTO GENERAL - Enviando:', {
        formatted: formattedAmount,
        asString: formattedAmount.toString(),
        staffId: user?.id
      });
    }

    dispatch(createGeneralExpenseWithReceipt({ 
      amount: formattedAmount, // ✅ Usar valor formateado
      notes, 
      image,
      staffId: user?.id
    }))
      .unwrap() // Permite usar .then() y .catch() en el dispatch
      .then((response) => {
        console.log('✅ GASTO GENERAL - Respuesta exitosa:', response);
        Alert.alert('Éxito', `Gasto de $${formattedAmount.toFixed(2)} guardado correctamente.`);
        // Limpiar formulario y navegar atrás o a otra pantalla
        setAmount('');
        setNotes('');
        setImage(null);
        navigation.goBack();
      })
      .catch((err) => {
        console.error('❌ GASTO GENERAL - Error:', err);
        Alert.alert('Error al guardar', err?.message || err || 'No se pudo guardar el gasto.');
      });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>Registrar Gasto General</Text>

      {error && <Text style={styles.errorText}>Error: {error}</Text>}

      <Text style={styles.label}>Monto ($)</Text>
      <TextInput
        style={styles.input}
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad" // ✅ CAMBIO: decimal-pad en lugar de numeric para iOS
        placeholder="Ej: 50.75 o 50,75"
      />
      {/* Vista previa del monto */}
      {amount && amount.length > 0 && (
        <Text style={styles.previewAmount}>
          Vista previa: ${parseFloat(amount.replace(',', '.') || 0).toFixed(2)}
        </Text>
      )}

      <Text style={styles.label}>Notas / Descripción</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={notes}
        onChangeText={setNotes}
        multiline
        placeholder="Describe el gasto (opcional si subes imagen)"
      />

      <TouchableOpacity style={styles.imagePickerButton} onPress={handlePickImage}>
        <Text style={styles.imagePickerButtonText}>
          {image ? 'Cambiar Imagen' : 'Seleccionar Imagen (Opcional)'}
        </Text>
      </TouchableOpacity>

      {image && (
        <Image source={{ uri: image.uri }} style={styles.previewImage} />
      )}

      <TouchableOpacity
        style={[styles.submitButton, loading && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.submitButtonText}>Guardar Gasto</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

// --- ESTILOS --- (Puedes adaptarlos a tu diseño)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6', // gray-100
  },
  contentContainer: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937', // gray-800
    marginBottom: 20,
    textAlign: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151', // gray-700
    marginBottom: 5,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db', // gray-300
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 15,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top', // Para Android
  },
  imagePickerButton: {
    backgroundColor: '#3b82f6', // blue-500
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  imagePickerButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 20,
    resizeMode: 'contain', // o 'cover'
  },
  submitButton: {
    backgroundColor: '#16a34a', // green-600
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#9ca3af', // gray-400
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  errorText: {
      color: '#dc2626', // red-600
      textAlign: 'center',
      marginBottom: 10,
  },
  previewAmount: {
    fontSize: 14,
    color: '#059669', // green-600
    marginTop: -10,
    marginBottom: 10,
    fontWeight: '600',
  }
});

export default GeneralExpenseScreen;