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

const GeneralExpenseScreen = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { loading, error } = useSelector((state) => state.balance); // O el slice correspondiente

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
                        quality: 0.7, // Reducir calidad para tamaño
                    });

                    if (!result.canceled) {
                        const asset = result.assets[0];
                        setImage({ uri: asset.uri, mimeType: asset.mimeType, fileName: asset.fileName });
                    }
                },
            },
            {
                text: "Cámara",
                onPress: async () => {
                     let result = await ImagePicker.launchCameraAsync({
                        allowsEditing: true,
                        aspect: [4, 3],
                        quality: 0.7,
                    });
                     if (!result.canceled) {
                        const asset = result.assets[0];
                        setImage({ uri: asset.uri, mimeType: asset.mimeType, fileName: asset.fileName || `camera_${Date.now()}.jpg` });
                    }
                },
            },
            { text: "Cancelar", style: "cancel" },
        ]
    );
  };

  const handleSubmit = () => {
    // Validación básica
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      Alert.alert('Error', 'Por favor, ingresa un monto válido.');
      return;
    }
    if (!notes.trim() && !image) {
        Alert.alert('Error', 'Por favor, añade una nota o una imagen para el gasto.');
        return;
    }


    dispatch(createGeneralExpenseWithReceipt({ amount: numericAmount, notes, image }))
      .unwrap() // Permite usar .then() y .catch() en el dispatch
      .then(() => {
        Alert.alert('Éxito', 'Gasto general guardado correctamente.');
        // Limpiar formulario y navegar atrás o a otra pantalla
        setAmount('');
        setNotes('');
        setImage(null);
        navigation.goBack(); // O a donde sea apropiado
      })
      .catch((err) => {
        // El error ya se guarda en el estado de Redux, pero mostramos alerta
        Alert.alert('Error al guardar', err || 'No se pudo guardar el gasto.');
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
        keyboardType="numeric"
        placeholder="Ej: 50.75"
      />

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
  }
});

export default GeneralExpenseScreen;