// import React, { useState } from 'react';
// import { View, Text, TextInput, Button, Alert, ScrollView, Pressable, Platform, ActivityIndicator } from 'react-native';
// import { useRoute } from '@react-navigation/native';
// import * as DocumentPicker from 'expo-document-picker';
// import { incomeActions, expenseActions } from '../../FrontZurcher/src/Redux/Actions/balanceActions'; // Ajusta la ruta si es necesario
// import { createReceipt } from '../../FrontZurcher/src/Redux/Actions/receiptActions'; // Ajusta la ruta si es necesario
// import { useDispatch } from 'react-redux'; // Importar useDispatch si usas Redux para manejar estado de carga/errores globalmente

// const BalanceUploadScreen = () => {
//   const route = useRoute();
//   const dispatch = useDispatch(); // Para acciones de Redux si las usas aquí
//   const { idWork, propertyAddress } = route.params; // Recibir idWork y dirección

//   const [uploadType, setUploadType] = useState('expense'); // 'expense' or 'income'
//   const [amount, setAmount] = useState('');
//   const [typeDetail, setTypeDetail] = useState(''); // Ej: 'Factura Luz', 'Pago Inicial Cliente'
//   const [notes, setNotes] = useState('');
//   const [selectedFile, setSelectedFile] = useState(null); // { name: string, uri: string, mimeType: string, size: number }
//   const [loading, setLoading] = useState(false);

//   const handlePickDocument = async () => {
//     try {
//       const result = await DocumentPicker.getDocumentAsync({
//         type: ['application/pdf', 'image/*'], // Permite PDF e imágenes
//         copyToCacheDirectory: true, // Necesario para poder subirlo
//       });

//       console.log('Document Picker Result:', result);

//       // Expo Document Picker cambió la estructura de la respuesta
//       if (!result.canceled && result.assets && result.assets.length > 0) {
//         const asset = result.assets[0];
//         // Validar tamaño si es necesario
//         if (asset.size > 10 * 1024 * 1024) { // Límite de 10MB (ejemplo)
//              Alert.alert('Error', 'El archivo es demasiado grande (máx 10MB).');
//              setSelectedFile(null);
//              return;
//         }
//         setSelectedFile({
//             uri: asset.uri,
//             name: asset.name,
//             mimeType: asset.mimeType,
//             size: asset.size,
//         });
//       } else {
//         setSelectedFile(null); // Limpiar si cancela o no selecciona
//       }
//     } catch (error) {
//       console.error('Error picking document:', error);
//       Alert.alert('Error', 'No se pudo seleccionar el archivo.');
//       setSelectedFile(null);
//     }
//   };

//   const handleUpload = async () => {
//     if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
//       Alert.alert('Error', 'Por favor, ingresa un monto válido.');
//       return;
//     }
//     if (!typeDetail.trim()) {
//       Alert.alert('Error', 'Por favor, ingresa el tipo de ingreso/gasto.');
//       return;
//     }
//     if (!selectedFile) {
//       Alert.alert('Error', 'Por favor, selecciona un archivo como comprobante.');
//       return;
//     }

//     setLoading(true);

//     try {
//       let createdRecordId = null;
//       let relatedModel = '';

//       // --- Paso 1: Crear el registro de Income o Expense ---
//       if (uploadType === 'income') {
//         relatedModel = 'Income';
//         const incomeData = {
//           date: new Date().toISOString(), // O usar un DatePicker
//           amount: parseFloat(amount),
//           typeIncome: typeDetail, // Asegúrate que el backend espera 'typeIncome'
//           notes: notes,
//           workId: idWork,
//         };
//         const incomeResult = await incomeActions.create(incomeData);
//         if (incomeResult.error) throw new Error(incomeResult.message);
//         createdRecordId = incomeResult.id; // Asume que la respuesta tiene 'id'
//         console.log('Income creado:', incomeResult);

//       } else { // 'expense'
//         relatedModel = 'Expense';
//         const expenseData = {
//           date: new Date().toISOString(), // O usar un DatePicker
//           amount: parseFloat(amount),
//           typeExpense: typeDetail, // Asegúrate que el backend espera 'typeExpense'
//           notes: notes,
//           workId: idWork,
//         };
//         const expenseResult = await expenseActions.create(expenseData);
//         if (expenseResult.error) throw new Error(expenseResult.message);
//         createdRecordId = expenseResult.id; // Asume que la respuesta tiene 'id'
//         console.log('Expense creado:', expenseResult);
//       }

//       if (!createdRecordId) {
//           throw new Error(`No se pudo obtener el ID del ${relatedModel} creado.`);
//       }

//       // --- Paso 2: Crear el FormData para el Receipt ---
//       const formData = new FormData();
//       formData.append('relatedModel', relatedModel);
//       formData.append('relatedId', createdRecordId);
//       formData.append('type', `Comprobante ${relatedModel}`); // Tipo de comprobante
//       formData.append('notes', `Comprobante para ${relatedModel} ID: ${createdRecordId}`);

//       // Adjuntar el archivo
//       // El nombre del archivo en FormData debe coincidir con el esperado por Multer en el backend (usualmente 'file' o 'pdfData')
//       // Revisando ReceiptController, parece que espera 'req.file', lo que sugiere que Multer usa 'file' por defecto.
//       formData.append('file', {
//         uri: selectedFile.uri,
//         name: selectedFile.name,
//         type: selectedFile.mimeType,
//       });

//       console.log('FormData para Receipt:', formData);

//       // --- Paso 3: Subir el Receipt (usando la acción de Redux si existe o directamente) ---
//       // Asumiendo que createReceipt es una acción Thunk que maneja la llamada API
//       // Nota: createReceipt debe estar configurada para enviar 'multipart/form-data'
//       // La acción que proporcionaste ya lo hace.
//       await dispatch(createReceipt(formData)); // Usar dispatch si createReceipt es una acción Thunk

//       // Si createReceipt no es una acción Thunk, harías la llamada API aquí:
//       // const receiptResult = await api.post('/receipt', formData, {
//       //   headers: { 'Content-Type': 'multipart/form-data' },
//       // });
//       // if (receiptResult.status !== 201) throw new Error('Error al subir el comprobante');
//       // console.log('Receipt creado:', receiptResult.data);

//       Alert.alert('Éxito', `${relatedModel} y comprobante cargados correctamente.`);
//       // Limpiar formulario
//       setAmount('');
//       setTypeDetail('');
//       setNotes('');
//       setSelectedFile(null);

//     } catch (error) {
//       console.error(`Error al cargar ${uploadType}:`, error);
//       Alert.alert('Error', `No se pudo cargar el ${uploadType}. ${error.message}`);
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <ScrollView className="flex-1 bg-gray-100 p-5">
//       <Text className="text-xl font-medium uppercase text-gray-800 mb-2 text-center">
//         Cargar Ingreso/Gasto
//       </Text>
//       <Text className="text-lg font-normal text-gray-600 mb-5 text-center">
//         {propertyAddress || 'Trabajo sin dirección'} (ID: {idWork})
//       </Text>

//       {/* Selector Income/Expense */}
//       <View className="flex-row justify-center mb-5">
//         <Pressable
//           onPress={() => setUploadType('expense')}
//           className={`py-2 px-6 rounded-l-lg ${uploadType === 'expense' ? 'bg-red-600' : 'bg-gray-400'}`}
//         >
//           <Text className="text-white font-bold">Gasto</Text>
//         </Pressable>
//         <Pressable
//           onPress={() => setUploadType('income')}
//           className={`py-2 px-6 rounded-r-lg ${uploadType === 'income' ? 'bg-green-600' : 'bg-gray-400'}`}
//         >
//           <Text className="text-white font-bold">Ingreso</Text>
//         </Pressable>
//       </View>

//       {/* Formulario */}
//       <View className="mb-4">
//         <Text className="text-gray-700 mb-1">Monto:</Text>
//         <TextInput
//           className="bg-white border border-gray-300 rounded p-3"
//           placeholder="Ej: 150.75"
//           keyboardType="numeric"
//           value={amount}
//           onChangeText={setAmount}
//         />
//       </View>

//       <View className="mb-4">
//         <Text className="text-gray-700 mb-1">
//           Tipo de {uploadType === 'income' ? 'Ingreso' : 'Gasto'}:
//         </Text>
//         <TextInput
//           className="bg-white border border-gray-300 rounded p-3"
//           placeholder={uploadType === 'income' ? "Ej: Pago Cliente" : "Ej: Compra Material"}
//           value={typeDetail}
//           onChangeText={setTypeDetail}
//         />
//       </View>

//       <View className="mb-4">
//         <Text className="text-gray-700 mb-1">Notas (Opcional):</Text>
//         <TextInput
//           className="bg-white border border-gray-300 rounded p-3 h-20"
//           placeholder="Añade detalles adicionales..."
//           multiline
//           value={notes}
//           onChangeText={setNotes}
//         />
//       </View>

//       {/* Selector de Archivo */}
//       <View className="mb-6">
//          <Pressable
//             onPress={handlePickDocument}
//             className="bg-blue-600 py-3 rounded-lg shadow-md mb-2"
//           >
//             <Text className="text-white text-center font-semibold">Seleccionar Comprobante (PDF/Imagen)</Text>
//           </Pressable>
//         {selectedFile && (
//           <Text className="text-gray-600 text-center">Archivo: {selectedFile.name}</Text>
//         )}
//       </View>

//       {/* Botón de Carga */}
//       <Pressable
//         onPress={handleUpload}
//         disabled={loading}
//         className={`py-3 rounded-lg shadow-md ${loading ? 'bg-gray-400' : 'bg-purple-600'}`}
//       >
//         {loading ? (
//           <ActivityIndicator color="#fff" />
//         ) : (
//           <Text className="text-white text-center text-lg font-semibold">
//             Cargar {uploadType === 'income' ? 'Ingreso' : 'Gasto'}
//           </Text>
//         )}
//       </Pressable>

//     </ScrollView>
//   );
// };

// export default BalanceUploadScreen;