import React, { useState } from 'react';
import { View, Text, TextInput, Alert, ScrollView, Pressable, Platform, ActivityIndicator, StyleSheet } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
// *** Importar los Thunks desde balanceSlice.js ***
import { createIncome, createExpense, createReceipt } from '../Redux/features/balanceSlice';
import { useDispatch, useSelector } from 'react-redux';
import { Picker } from '@react-native-picker/picker';

// ✅ Tipos sincronizados con el backend
const incomeTypes = [
  'Factura Pago Inicial Budget',
  'Factura Pago Final Budget',
  'DiseñoDif',
  'Comprobante Ingreso',
];

const expenseTypes = [
  'Materiales',
  'Diseño',
  'Workers',
  'Imprevistos',
  'Comprobante Gasto',
  'Gastos Generales',
  'Materiales Iniciales',
  'Inspección Inicial',
  'Inspección Final',
  'Comisión Vendedor',
  'Gasto Fijo',
];

// ✅ Métodos de pago sincronizados con el backend
const paymentMethods = [
  'Cap Trabajos Septic',
  'Capital Proyectos Septic',
  'Chase Bank',
  'AMEX',
  'Chase Credit Card',
  'Cheque',
  'Transferencia Bancaria',
  'Efectivo',
  'Zelle',
  'Tarjeta Débito',
  'PayPal',
  'Stripe',
  'Otro',
];

const BalanceUploadScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { idWork, propertyAddress } = route.params; // Recibir idWork y dirección

  // Obtener usuario autenticado desde Redux
  const user = useSelector((state) => state.auth?.staff); // Cambiar user por staff
  
  // Estado local del formulario
  const [uploadType, setUploadType] = useState('expense'); // 'expense' or 'income'
  const [amount, setAmount] = useState('');
  const [typeDetail, setTypeDetail] = useState(''); // Ej: 'Factura Luz', 'Pago Inicial Cliente'
  const [paymentMethod, setPaymentMethod] = useState(''); // 🆕 Método de pago
  const [notes, setNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState(null); // { name: string, uri: string, mimeType: string, size: number }

  // Obtener estado de carga/error de Redux (opcional, pero útil para feedback)
  const { loading: balanceLoading, error: balanceError } = useSelector((state) => state.balance);

  React.useEffect(() => {
    if (uploadType === 'income') {
      setTypeDetail(incomeTypes[0]);
    } else {
      setTypeDetail(expenseTypes[0]);
    }
    // Inicializar con el primer método de pago
    if (!paymentMethod) {
      setPaymentMethod(paymentMethods[0]);
    }
  }, [uploadType]);


  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'], // Permite PDF e imágenes
        copyToCacheDirectory: true, // Necesario para poder subirlo
      });

      console.log('Document Picker Result:', result);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (asset.size > 15 * 1024 * 1024) { // Límite de 15MB (ejemplo)
             Alert.alert('Error', 'El archivo es demasiado grande (máx 15MB).');
             setSelectedFile(null);
             return;
        }
        setSelectedFile({
            uri: asset.uri,
            name: asset.name,
            mimeType: asset.mimeType,
            size: asset.size,
        });
      } else {
        setSelectedFile(null);
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'No se pudo seleccionar el archivo.');
      setSelectedFile(null);
    }
  };

  const handleUpload = async () => {
    // Validaciones
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      Alert.alert('Error de Validación', 'Por favor, ingresa un monto válido.');
      return;
    }
    if (!typeDetail.trim()) {
      Alert.alert('Error de Validación', 'Por favor, ingresa el tipo de ingreso/gasto.');
      return;
    }
    if (!paymentMethod) {
      Alert.alert('Error de Validación', 'Por favor, selecciona un método de pago.');
      return;
    }
    // El archivo es opcional ahora, se puede cargar solo el ingreso/gasto
    if (!selectedFile) {
      Alert.alert('Error de Validación', 'Por favor, selecciona un archivo como comprobante.');
      return;
    }

     // Para guardar el resultado de createIncome/createExpense

    try {
      let createdRecord;
      // --- Paso 1: Crear el registro de Income o Expense usando Thunks ---
      if (uploadType === 'income') {
        const incomeData = {
          date: new Date().toISOString(),
          amount: parseFloat(amount),
          typeIncome: typeDetail,
          notes: notes,
          workId: idWork,
          staffId: user?.id, // Agregar staffId del usuario autenticado
          paymentMethod: paymentMethod, // 🆕 Método de pago
        };
        // Despachar y esperar el resultado usando unwrap()
        createdRecord = await dispatch(createIncome(incomeData)).unwrap();
        console.log('Income creado:', createdRecord);

      } else { // 'expense'
        const expenseData = {
          date: new Date().toISOString(),
          amount: parseFloat(amount),
          typeExpense: typeDetail,
          notes: notes,
          workId: idWork,
          staffId: user?.id, // Agregar staffId del usuario autenticado
          paymentMethod: paymentMethod, // 🆕 Método de pago
        };
        // Despachar y esperar el resultado usando unwrap()
        createdRecord = await dispatch(createExpense(expenseData)).unwrap();
        console.log('Expense creado:', createdRecord);
        console.log('archivo seleccionado:', selectedFile);
      }
      console.log('Verificando condición para subir Receipt:', {
        isFileSelected: !!selectedFile,
        isRecordCreated: !!createdRecord,
        recordId: createdRecord?.idExpense || createdRecord?.idIncome
    });

    const recordId = createdRecord?.idExpense || createdRecord?.idIncome; // Obtén el ID correcto
      // --- Paso 2: Si hay archivo seleccionado y el registro se creó, subir el Receipt ---
      if (selectedFile && createdRecord && recordId) {
        console.log('Preparando FormData para Receipt...');
        const relatedModel = uploadType === 'income' ? 'Income' : 'Expense';
        const formData = new FormData();

        // Adjuntar el archivo con manejo específico para web
        if (Platform.OS === 'web') {
          // En web, convertir URI a Blob
          const response = await fetch(selectedFile.uri);
          const blob = await response.blob();
          formData.append('file', blob, selectedFile.name);
        } else {
          // En móvil nativo, usar el formato estándar
          formData.append('file', {
            uri: selectedFile.uri,
            name: selectedFile.name,
            type: selectedFile.mimeType,
          });
        }
       
        // Adjuntar otros datos necesarios para el Receipt
        formData.append('relatedModel', relatedModel);
        formData.append('relatedId', recordId); // ID del registro recién creado
        formData.append('type', typeDetail); // Tipo descriptivo
        formData.append('notes', `Comprobante para ${relatedModel} - ${typeDetail}`);

        console.log('FormData para Receipt (solo campos, no archivo):', {
          relatedModel: formData.get('relatedModel'),
          relatedId: formData.get('relatedId'),
          type: formData.get('type'),
          notes: formData.get('notes'),
      });

        // Despachar el Thunk para crear el Receipt
        await dispatch(createReceipt(formData)).unwrap();
        console.log('Receipt creado y asociado.');
      }

      Alert.alert('Éxito', `${uploadType === 'income' ? 'Ingreso' : 'Gasto'} ${selectedFile ? 'y comprobante cargados' : 'cargado'} correctamente.`);
      // Limpiar formulario
      setAmount('');
      setTypeDetail('');
      setPaymentMethod(paymentMethods[0]); // Resetear al primer método
      setNotes('');
      setSelectedFile(null);
      // Opcional: Navegar hacia atrás o a otra pantalla
       navigation.goBack();

    } catch (error) {
      // unwrap() rechaza con el valor de rejectWithValue o un error serializado
      console.error(`Error al cargar ${uploadType}:`, error);
      Alert.alert(
        'Error',
        `No se pudo cargar el ${uploadType}. ${error?.message || error || 'Error desconocido'}`
      );
    }
    // El estado de carga es manejado por Redux (balanceLoading)
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>
        Cargar Ingreso/Gasto
      </Text>
      <Text style={styles.subtitle}>
        {propertyAddress || 'Trabajo sin dirección'} (ID: {idWork})
      </Text>

      {/* Selector Income/Expense */}
      <View style={styles.typeSelectorContainer}>
        <Pressable
          onPress={() => setUploadType('expense')}
          style={[styles.typeButton, styles.typeButtonLeft, uploadType === 'expense' ? styles.typeButtonActiveExpense : styles.typeButtonInactive]}
        >
          <Text style={styles.typeButtonText}>Gasto</Text>
        </Pressable>
        <Pressable
          onPress={() => setUploadType('income')}
          style={[styles.typeButton, styles.typeButtonRight, uploadType === 'income' ? styles.typeButtonActiveIncome : styles.typeButtonInactive]}
        >
          <Text style={styles.typeButtonText}>Ingreso</Text>
        </Pressable>
      </View>

      {/* Formulario */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Monto:</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: 150.75"
          keyboardType="numeric"
          value={amount}
          onChangeText={setAmount}
        />
      </View>

      <View style={styles.pickerContainer}>
           <Picker
             selectedValue={typeDetail}
             onValueChange={(itemValue, itemIndex) => setTypeDetail(itemValue)}
             style={styles.picker}
             dropdownIconColor="#6b7280" // Color del icono de flecha
           >
             {(uploadType === 'income' ? incomeTypes : expenseTypes).map((type) => (
               <Picker.Item key={type} label={type} value={type} />
             ))}
           </Picker>
        </View>

      {/* 🆕 Selector de Método de Pago */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Método de Pago:</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={paymentMethod}
            onValueChange={(itemValue) => setPaymentMethod(itemValue)}
            style={styles.picker}
            dropdownIconColor="#6b7280"
          >
            {paymentMethods.map((method) => (
              <Picker.Item key={method} label={method} value={method} />
            ))}
          </Picker>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Notas (Opcional):</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Añade detalles adicionales..."
          multiline
          value={notes}
          onChangeText={setNotes}
        />
      </View>

      {/* Selector de Archivo */}
      <View style={styles.inputGroup}>
         <Pressable
            onPress={handlePickDocument}
            style={[styles.button, styles.selectFileButton]}
          >
            <Text style={styles.buttonText}>Seleccionar Comprobante (PDF/Imagen)</Text>
          </Pressable>
        {selectedFile && (
          <Text style={styles.fileNameText}>Archivo: {selectedFile.name}</Text>
        )}
      </View>

      {/* Botón de Carga */}
      <Pressable
        onPress={handleUpload}
        disabled={balanceLoading} // Usar estado de carga de Redux
        style={[styles.button, styles.uploadButton, balanceLoading ? styles.buttonDisabled : {}]}
      >
        {balanceLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>
            Cargar {uploadType === 'income' ? 'Ingreso' : 'Gasto'}
          </Text>
        )}
      </Pressable>

      {/* Mostrar error de Redux si existe */}
      {balanceError && (
        <Text style={styles.errorText}>Error: {balanceError}</Text>
      )}

    </ScrollView>
  );
};

// Añadir algunos estilos básicos
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6', // gray-100
    padding: 20,
  },
  pickerContainer: {
    backgroundColor: '#ffffff', // bg-white
    borderWidth: 1,
    borderColor: '#d1d5db', // border-gray-300
    borderRadius: 6, // rounded
    // No añadir padding aquí, el Picker maneja su propio espaciado interno
  },
  title: {
    fontSize: 20, // text-xl
    fontWeight: '500', // font-medium
    textTransform: 'uppercase',
    color: '#374151', // gray-800
    marginBottom: 8, // mb-2
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16, // text-lg
    color: '#4b5563', // gray-600
    marginBottom: 20, // mb-5
    textAlign: 'center',
  },
  typeSelectorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20, // mb-5
  },
  typeButton: {
    paddingVertical: 8, // py-2
    paddingHorizontal: 24, // px-6
  },
  typeButtonLeft: {
    borderTopLeftRadius: 8, // rounded-l-lg
    borderBottomLeftRadius: 8,
  },
  typeButtonRight: {
    borderTopRightRadius: 8, // rounded-r-lg
    borderBottomRightRadius: 8,
  },
  typeButtonActiveExpense: {
    backgroundColor: '#dc2626', // bg-red-600
  },
  typeButtonActiveIncome: {
    backgroundColor: '#16a34a', // bg-green-600
  },
  typeButtonInactive: {
    backgroundColor: '#9ca3af', // bg-gray-400
  },
  typeButtonText: {
    color: '#ffffff', // text-white
    fontWeight: 'bold',
  },
  inputGroup: {
    marginBottom: 16, // mb-4
  },
  label: {
    color: '#374151', // gray-700
    marginBottom: 4, // mb-1
  },
  input: {
    backgroundColor: '#ffffff', // bg-white
    borderWidth: 1,
    borderColor: '#d1d5db', // border-gray-300
    borderRadius: 6, // rounded
    padding: 12, // p-3
    fontSize: 16,
  },
  textArea: {
    height: 80, // h-20
    textAlignVertical: 'top', // Para que el texto empiece arriba en multiline
  },
  selectFileButton: {
    backgroundColor: '#2563eb', // bg-blue-600
    marginBottom: 8, // mb-2
  },
  fileNameText: {
    color: '#4b5563', // gray-600
    textAlign: 'center',
    marginTop: 4,
  },
  button: {
    paddingVertical: 12, // py-3
    borderRadius: 8, // rounded-lg
    alignItems: 'center',
    justifyContent: 'center',
    // Sombra (aproximada, ajustar para iOS/Android)
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2, },
    shadowOpacity: 0.23,
    shadowRadius: 2.62,
    elevation: 4,
  },
  uploadButton: {
    backgroundColor: '#7c3aed', // bg-purple-600
    marginTop: 10, // Añadir espacio arriba
  },
  buttonText: {
    color: '#ffffff', // text-white
    textAlign: 'center',
    fontWeight: '600', // font-semibold
    fontSize: 16, // text-lg (ajustado)
  },
  buttonDisabled: {
    backgroundColor: '#9ca3af', // bg-gray-400
  },
  errorText: {
      color: '#dc2626', // text-red-600
      marginTop: 10,
      textAlign: 'center',
      fontWeight: 'bold',
  }
});

export default BalanceUploadScreen;