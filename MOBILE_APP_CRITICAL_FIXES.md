# 🚨 PLAN DE FIXES CRÍTICOS - APP MÓVIL WORKTRACKERAPP

**Fecha:** 22 de Noviembre, 2025  
**Estado:** CRÍTICO - Cliente Disconforme  
**Prioridad:** MÁXIMA

---

## 📋 RESUMEN EJECUTIVO

La aplicación móvil presenta problemas críticos que afectan severamente la experiencia del usuario, especialmente para el rol **Worker** (fundamental para operaciones en campo):

### Problemas Identificados:
1. ✅ **Imágenes causan lentitud y crashes** - Problemas de memoria y caché
2. ✅ **Gastos pierden decimales** - Conversión incorrecta de números
3. ✅ **Funcionalidad Worker deficiente** - Rol crítico no funciona correctamente
4. ✅ **Sin capacidad offline** - No funciona en áreas sin señal (ej: Lehigh)
5. ⚠️ **Desincronización Backend-Frontend** - Inconsistencias en datos

---

## 🔴 PROBLEMA #1: RENDIMIENTO Y MANEJO DE IMÁGENES

### Diagnóstico Actual:

**UploadScreen.jsx** - Problemas encontrados:
- ❌ Carga imágenes Base64 completas en memoria (puede ser 4x más grande)
- ❌ No implementa caché efectivo de imágenes
- ❌ Redimensiona a 800px pero comprime solo a 0.7 (70%)
- ❌ Permite cargar hasta 12 imágenes por etapa simultáneamente
- ❌ No hay límite de memoria total
- ❌ FlatList renderiza todas las imágenes sin virtualización optimizada

**Código Problemático:**
```javascript
// UploadScreen.jsx - Línea ~600
const resizedImage = await manipulateAsync(
  imageUri,
  [{ resize: { width: 800 } }],
  { compress: 0.7, format: SaveFormat.JPEG } // ❌ 70% es muy alto
);
```

### ✅ SOLUCIONES IMPLEMENTAR:

#### 1.1. Optimización de Compresión de Imágenes
```javascript
// NUEVO: UploadScreen.jsx - Función optimizada
const processAndOptimizeImage = async (imageUri) => {
  try {
    // Obtener info de la imagen primero
    const imageInfo = await FileSystem.getInfoAsync(imageUri);
    console.log('Tamaño original:', imageInfo.size);
    
    // Comprimir más agresivamente
    const resizedImage = await manipulateAsync(
      imageUri,
      [{ resize: { width: 600 } }], // ✅ Reducir de 800 a 600
      { 
        compress: 0.5, // ✅ Aumentar compresión de 0.7 a 0.5
        format: SaveFormat.JPEG 
      }
    );
    
    const optimizedInfo = await FileSystem.getInfoAsync(resizedImage.uri);
    console.log('Tamaño optimizado:', optimizedInfo.size);
    
    // Validar tamaño máximo (2MB por imagen)
    if (optimizedInfo.size > 2 * 1024 * 1024) {
      throw new Error('Imagen demasiado grande después de optimización');
    }
    
    return resizedImage.uri;
  } catch (error) {
    console.error('Error optimizando imagen:', error);
    throw error;
  }
};
```

#### 1.2. Implementar Sistema de Caché con react-native-fast-image
```bash
# Instalar dependencia
npx expo install react-native-fast-image
```

```javascript
// NUEVO: src/components/OptimizedImage.jsx
import React from 'react';
import FastImage from 'react-native-fast-image';

const OptimizedImage = ({ uri, style, onPress }) => {
  return (
    <FastImage
      source={{
        uri: uri,
        priority: FastImage.priority.normal,
        cache: FastImage.cacheControl.immutable, // ✅ Caché permanente
      }}
      style={style}
      resizeMode={FastImage.resizeMode.cover}
      onError={(error) => console.error('Error cargando imagen:', error)}
    />
  );
};

export default OptimizedImage;
```

#### 1.3. Lazy Loading para Grids de Imágenes
```javascript
// MODIFICAR: UploadScreen.jsx - FlatList optimizado
<FlatList
  data={imagesByStage[selectedStage] || []}
  keyExtractor={(item, index) => item.id || index.toString()}
  numColumns={4}
  maxToRenderPerBatch={8} // ✅ Renderizar max 8 a la vez
  windowSize={5} // ✅ Mantener 5 ventanas en memoria
  removeClippedSubviews={true} // ✅ Remover vistas fuera de pantalla
  initialNumToRender={8} // ✅ Renderizar 8 inicialmente
  renderItem={({ item, index }) => {
    const imageUri = imagesWithDataURLs[item.id];
    return (
      <View className="w-20 h-20 m-2 rounded-lg bg-gray-300">
        {imageUri ? (
          <OptimizedImage // ✅ Usar componente optimizado
            uri={imageUri}
            style={{ width: '100%', height: '100%', borderRadius: 8 }}
            onPress={() => handleOpenLargeImage(imageUri)}
          />
        ) : null}
      </View>
    );
  }}
/>
```

#### 1.4. Límite de Memoria Total
```javascript
// NUEVO: UploadScreen.jsx - Validación antes de cargar
const MAX_IMAGES_IN_MEMORY = 20; // Límite global
const MAX_IMAGE_SIZE_MB = 2; // 2MB por imagen

const validateImageMemory = async (newImageUri) => {
  // Contar imágenes totales cargadas
  const totalImages = Object.keys(imagesWithDataURLs).length;
  
  if (totalImages >= MAX_IMAGES_IN_MEMORY) {
    Alert.alert(
      'Límite de Memoria',
      'Demasiadas imágenes en memoria. Por favor, envía las imágenes actuales antes de cargar más.'
    );
    return false;
  }
  
  // Validar tamaño de la nueva imagen
  const imageInfo = await FileSystem.getInfoAsync(newImageUri);
  const sizeMB = imageInfo.size / (1024 * 1024);
  
  if (sizeMB > MAX_IMAGE_SIZE_MB) {
    Alert.alert('Imagen muy grande', `Tamaño: ${sizeMB.toFixed(2)}MB. Máximo: ${MAX_IMAGE_SIZE_MB}MB`);
    return false;
  }
  
  return true;
};
```

#### 1.5. Limpiar Caché Periódicamente
```javascript
// NUEVO: src/utils/imageCacheManager.js
import * as FileSystem from 'expo-file-system';

export const clearImageCache = async () => {
  try {
    const cacheDir = FileSystem.cacheDirectory;
    const files = await FileSystem.readDirectoryAsync(cacheDir);
    
    // Eliminar archivos temporales de imágenes (más de 1 día)
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    
    for (const file of files) {
      const filePath = `${cacheDir}${file}`;
      const info = await FileSystem.getInfoAsync(filePath);
      
      if (info.modificationTime * 1000 < oneDayAgo) {
        await FileSystem.deleteAsync(filePath, { idempotent: true });
        console.log('Eliminado del caché:', file);
      }
    }
    
    console.log('✅ Caché limpiado');
  } catch (error) {
    console.error('Error limpiando caché:', error);
  }
};

// Llamar al iniciar la app
// En App.js useEffect
useEffect(() => {
  clearImageCache();
}, []);
```

---

## 🔴 PROBLEMA #2: PÉRDIDA DE DECIMALES EN GASTOS

### Diagnóstico Actual:

**GeneralExpenseScreen.jsx** - Línea 89:
```javascript
const numericAmount = parseFloat(amount); // ✅ CORRECTO
```

**balanceSlice.js** - Línea 133:
```javascript
amount: parseFloat(amount), // ✅ CORRECTO
```

**Backend - expenseController.js** - Línea 583:
```javascript
amount: parseFloat(amount), // ✅ CORRECTO
```

### ⚠️ PROBLEMA IDENTIFICADO:

El problema NO está en el código de conversión. El problema está en:
1. **Falta de validación visual** - No se muestra correctamente en UI
2. **Backend puede estar truncando** - Revisar modelo de base de datos

### ✅ SOLUCIONES:

#### 2.1. Validar Tipo de Dato en Base de Datos
```sql
-- VERIFICAR: BackZurcher/models/Expense.js
-- El campo 'amount' debe ser DECIMAL(10,2) o FLOAT

-- Migración correctiva si es necesario:
ALTER TABLE Expenses MODIFY COLUMN amount DECIMAL(10,2) NOT NULL;
```

#### 2.2. Formateo Consistente en UI
```javascript
// MODIFICAR: GeneralExpenseScreen.jsx
const [amount, setAmount] = useState('');

// Función de formateo
const formatCurrency = (value) => {
  // Eliminar caracteres no numéricos excepto punto
  const cleaned = value.replace(/[^\d.]/g, '');
  
  // Validar formato correcto (máximo 2 decimales)
  const parts = cleaned.split('.');
  if (parts.length > 2) return amount; // Más de un punto, ignorar
  
  if (parts[1] && parts[1].length > 2) {
    // Truncar a 2 decimales
    return `${parts[0]}.${parts[1].substring(0, 2)}`;
  }
  
  return cleaned;
};

// En el TextInput
<TextInput
  style={styles.input}
  value={amount}
  onChangeText={(text) => setAmount(formatCurrency(text))}
  keyboardType="decimal-pad" // ✅ Cambiar de 'numeric' a 'decimal-pad'
  placeholder="Ej: 50.75"
/>

// Mostrar preview formateado
{amount && (
  <Text style={styles.previewText}>
    Vista Previa: ${parseFloat(amount || 0).toFixed(2)}
  </Text>
)}
```

#### 2.3. Validación Estricta Antes de Enviar
```javascript
// MODIFICAR: GeneralExpenseScreen.jsx - handleSubmit
const handleSubmit = () => {
  const numericAmount = parseFloat(amount);
  
  // Validación mejorada
  if (isNaN(numericAmount) || numericAmount <= 0) {
    Alert.alert('Error', 'Por favor, ingresa un monto válido mayor a $0.00');
    return;
  }
  
  // Validar que tenga máximo 2 decimales
  const decimalPlaces = (amount.split('.')[1] || '').length;
  if (decimalPlaces > 2) {
    Alert.alert('Error', 'El monto no puede tener más de 2 decimales');
    return;
  }
  
  // ✅ Enviar con formato exacto
  const formattedAmount = parseFloat(numericAmount.toFixed(2));
  
  console.log('💰 Enviando monto:', {
    original: amount,
    parsed: numericAmount,
    formatted: formattedAmount,
    string: formattedAmount.toString()
  });
  
  dispatch(createGeneralExpenseWithReceipt({ 
    amount: formattedAmount, // ✅ Usar valor formateado
    notes, 
    image,
    staffId: user?.id 
  }))
  .unwrap()
  .then((response) => {
    console.log('✅ Respuesta del servidor:', response);
    Alert.alert('Éxito', `Gasto de $${formattedAmount.toFixed(2)} guardado correctamente.`);
    // ...resto del código
  })
  .catch((err) => {
    console.error('❌ Error guardando:', err);
    Alert.alert('Error', err.message || 'No se pudo guardar el gasto.');
  });
};
```

#### 2.4. Logging en Backend para Debug
```javascript
// MODIFICAR: BackZurcher/src/controllers/expenseController.js
const createGeneralExpenseWithReceipt = async (req, res) => {
  const { amount, notes, staffId } = req.body;
  
  // ✅ AGREGAR LOGS DETALLADOS
  console.log('📥 Datos recibidos:', {
    amount: amount,
    amountType: typeof amount,
    amountParsed: parseFloat(amount),
    amountFixed: parseFloat(amount).toFixed(2)
  });
  
  try {
    // Validación mejorada
    const parsedAmount = parseFloat(amount);
    
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      console.error('❌ Monto inválido:', amount);
      return res.status(400).json({
        error: true,
        message: `El monto debe ser mayor a 0 (recibido: ${amount})`
      });
    }
    
    // ✅ Formatear a 2 decimales explícitamente
    const formattedAmount = parseFloat(parsedAmount.toFixed(2));
    
    console.log('💾 Guardando en BD:', formattedAmount);
    
    const newExpense = await Expense.create({
      date: localDate,
      amount: formattedAmount, // ✅ Usar valor formateado
      typeExpense: 'Gastos Generales',
      // ...resto
    });
    
    console.log('✅ Gasto creado en BD:', {
      id: newExpense.idExpense,
      amount: newExpense.amount,
      amountType: typeof newExpense.amount
    });
    
    // ...resto del código
  } catch (error) {
    console.error('❌ Error en createGeneralExpenseWithReceipt:', error);
    // ...
  }
};
```

---

## 🔴 PROBLEMA #3: ROL WORKER - FUNCIONALIDAD DEFICIENTE

### Diagnóstico Actual:

El rol Worker es **FUNDAMENTAL** para operaciones en campo, pero presenta limitaciones:

**Problemas Identificados:**
1. ❌ Navegación confusa entre obras asignadas
2. ❌ No puede ver todo su historial de trabajos
3. ❌ Permisos insuficientes para operaciones críticas
4. ⚠️ No hay validación de conectividad antes de acciones
5. ❌ Mensajes de error genéricos, no orientativos

### ✅ SOLUCIONES:

#### 3.1. Mejorar Navegación para Workers
```javascript
// NUEVO: src/screens/WorkerDashboard.jsx
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { fetchAssignedWorks } from '../Redux/Actions/workActions';
import Ionicons from 'react-native-vector-icons/Ionicons';

const WorkerDashboard = ({ navigation }) => {
  const dispatch = useDispatch();
  const { assignedWorks, loading } = useSelector(state => state.work);
  const user = useSelector(state => state.auth?.staff);
  const [refreshing, setRefreshing] = useState(false);
  
  useEffect(() => {
    loadWorks();
  }, []);
  
  const loadWorks = async () => {
    setRefreshing(true);
    await dispatch(fetchAssignedWorks());
    setRefreshing(false);
  };
  
  // Categorizar obras
  const pendingWorks = assignedWorks.filter(w => 
    ['pending', 'inProgress', 'installed'].includes(w.status)
  );
  
  const inspectionWorks = assignedWorks.filter(w => 
    ['rejectedInspection', 'firstInspectionPending'].includes(w.status)
  );
  
  const coveringWorks = assignedWorks.filter(w => 
    ['coverPending', 'covered'].includes(w.status)
  );
  
  const completedWorks = assignedWorks.filter(w => 
    ['finalApproved', 'completed'].includes(w.status)
  );
  
  return (
    <ScrollView 
      className="flex-1 bg-gray-100"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={loadWorks} />
      }
    >
      {/* Header */}
      <View className="bg-blue-600 p-6 pb-8">
        <Text className="text-white text-2xl font-bold">
          👷 Panel de Worker
        </Text>
        <Text className="text-blue-100 text-lg mt-1">
          {user?.name || 'Usuario'}
        </Text>
      </View>
      
      {/* Estadísticas Rápidas */}
      <View className="flex-row justify-around bg-white p-4 shadow-md -mt-4 mx-4 rounded-lg">
        <View className="items-center">
          <Text className="text-3xl font-bold text-blue-600">
            {pendingWorks.length}
          </Text>
          <Text className="text-gray-600 text-xs">En Proceso</Text>
        </View>
        <View className="items-center">
          <Text className="text-3xl font-bold text-orange-600">
            {inspectionWorks.length}
          </Text>
          <Text className="text-gray-600 text-xs">Inspección</Text>
        </View>
        <View className="items-center">
          <Text className="text-3xl font-bold text-green-600">
            {completedWorks.length}
          </Text>
          <Text className="text-gray-600 text-xs">Completados</Text>
        </View>
      </View>
      
      {/* Obras que Requieren Atención */}
      {inspectionWorks.length > 0 && (
        <View className="mx-4 mt-6">
          <Text className="text-red-700 font-bold text-lg mb-3 flex-row items-center">
            🚨 Requieren Atención Urgente
          </Text>
          {inspectionWorks.map(work => (
            <Pressable
              key={work.idWork}
              onPress={() => navigation.navigate('UploadScreen', {
                idWork: work.idWork,
                propertyAddress: work.propertyAddress
              })}
              className="bg-red-50 border border-red-300 p-4 rounded-lg mb-3"
            >
              <Text className="font-bold text-gray-800">
                {work.propertyAddress}
              </Text>
              <Text className="text-red-600 text-sm mt-1">
                {work.status === 'rejectedInspection' 
                  ? '❌ Inspección Rechazada - Corregir' 
                  : '⏳ Esperando Inspección'}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
      
      {/* Obras en Proceso */}
      {pendingWorks.length > 0 && (
        <View className="mx-4 mt-6">
          <Text className="text-gray-700 font-bold text-lg mb-3">
            🔨 Obras en Proceso
          </Text>
          {pendingWorks.map(work => (
            <Pressable
              key={work.idWork}
              onPress={() => navigation.navigate('UploadScreen', {
                idWork: work.idWork,
                propertyAddress: work.propertyAddress
              })}
              className="bg-white border border-gray-300 p-4 rounded-lg mb-3 shadow-sm"
            >
              <Text className="font-bold text-gray-800">
                {work.propertyAddress}
              </Text>
              <Text className="text-gray-600 text-sm mt-1">
                Estado: {work.status}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
      
      {/* Botón para Gastos Generales */}
      <Pressable
        onPress={() => navigation.navigate('GeneralExpenseScreen')}
        className="mx-4 mt-6 mb-6 bg-purple-600 p-4 rounded-lg flex-row items-center justify-center"
      >
        <Ionicons name="receipt-outline" size={24} color="white" />
        <Text className="text-white font-bold text-lg ml-3">
          Registrar Gasto General
        </Text>
      </Pressable>
    </ScrollView>
  );
};

export default WorkerDashboard;
```

#### 3.2. Validación de Conectividad
```javascript
// NUEVO: src/utils/networkChecker.js
import NetInfo from '@react-native-community/netinfo';
import { Alert } from 'react-native';

export const checkConnectivity = async () => {
  const state = await NetInfo.fetch();
  return state.isConnected && state.isInternetReachable;
};

export const requireNetwork = async (actionName = 'esta acción') => {
  const isConnected = await checkConnectivity();
  
  if (!isConnected) {
    Alert.alert(
      'Sin Conexión',
      `No hay conexión a Internet. ${actionName} requiere conexión.`,
      [{ text: 'OK' }]
    );
    return false;
  }
  
  return true;
};

// Usar antes de acciones críticas
// En UploadScreen.jsx
const handlePickImage = async () => {
  // ✅ Validar conectividad primero
  const canProceed = await requireNetwork('Cargar imágenes');
  if (!canProceed) return;
  
  // ...resto del código
};
```

```bash
# Instalar dependencia
npx expo install @react-native-community/netinfo
```

#### 3.3. Mensajes de Error Mejorados
```javascript
// MODIFICAR: src/Redux/Actions/workActions.js
export const addImagesToWork = (workId, formData) => async (dispatch) => {
  try {
    // Verificar conectividad
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      throw new Error('SIN_CONEXION');
    }
    
    const response = await api.post(`/work/${workId}/images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 30000, // ✅ Timeout de 30 segundos
    });
    
    // ...resto
  } catch (error) {
    console.error('Error en addImagesToWork:', error);
    
    // ✅ Mensajes específicos por tipo de error
    let userMessage = 'Error al subir imagen';
    
    if (error.message === 'SIN_CONEXION') {
      userMessage = 'Sin conexión a Internet. Verifica tu señal e intenta nuevamente.';
    } else if (error.code === 'ECONNABORTED') {
      userMessage = 'La conexión tardó demasiado. Verifica tu señal e intenta con una imagen más pequeña.';
    } else if (error.response?.status === 413) {
      userMessage = 'La imagen es demasiado grande. Por favor, toma una foto de menor resolución.';
    } else if (error.response?.status === 500) {
      userMessage = 'Error del servidor. Contacta a soporte si el problema persiste.';
    }
    
    Alert.alert('Error', userMessage);
    return { error: true, message: userMessage };
  }
};
```

---

## 🔴 PROBLEMA #4: CAPACIDAD OFFLINE (CRÍTICO PARA LEHIGH)

### Contexto:
Workers en Lehigh (y otras áreas) **NO TIENEN SEÑAL**. La app actual es **100% inútil sin Internet**.

### ✅ SOLUCIÓN: IMPLEMENTAR MODO OFFLINE

#### 4.1. Arquitectura Offline-First

```bash
# Instalar dependencias necesarias
npx expo install @react-native-async-storage/async-storage
npx expo install expo-sqlite
npx expo install @react-native-community/netinfo
```

#### 4.2. Base de Datos Local con SQLite
```javascript
// NUEVO: src/database/db.js
import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabase('zurcher_offline.db');

export const initDatabase = () => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      // Tabla para obras offline
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS works (
          idWork INTEGER PRIMARY KEY,
          propertyAddress TEXT,
          status TEXT,
          permitNumber TEXT,
          data TEXT,
          syncStatus TEXT DEFAULT 'pending',
          lastSync INTEGER
        );`,
        [],
        () => console.log('✅ Tabla works creada'),
        (_, error) => console.error('Error creando tabla works:', error)
      );
      
      // Tabla para imágenes offline
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS pending_images (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          workId INTEGER,
          stage TEXT,
          imageUri TEXT,
          comment TEXT,
          dateTime TEXT,
          truckCount INTEGER,
          syncStatus TEXT DEFAULT 'pending',
          createdAt INTEGER
        );`,
        [],
        () => console.log('✅ Tabla pending_images creada'),
        (_, error) => console.error('Error creando tabla pending_images:', error)
      );
      
      // Tabla para gastos offline
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS pending_expenses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          amount REAL,
          notes TEXT,
          imageUri TEXT,
          staffId INTEGER,
          syncStatus TEXT DEFAULT 'pending',
          createdAt INTEGER
        );`,
        [],
        () => {
          console.log('✅ Tabla pending_expenses creada');
          resolve();
        },
        (_, error) => {
          console.error('Error creando tabla pending_expenses:', error);
          reject(error);
        }
      );
    });
  });
};

// Guardar obra para acceso offline
export const saveWorkOffline = (work) => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        `INSERT OR REPLACE INTO works (idWork, propertyAddress, status, permitNumber, data, lastSync) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          work.idWork,
          work.propertyAddress,
          work.status,
          work.Permit?.permitNumber || null,
          JSON.stringify(work),
          Date.now()
        ],
        (_, result) => {
          console.log('✅ Obra guardada offline:', work.idWork);
          resolve(result);
        },
        (_, error) => {
          console.error('Error guardando obra offline:', error);
          reject(error);
        }
      );
    });
  });
};

// Obtener obras offline
export const getOfflineWorks = () => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM works',
        [],
        (_, { rows: { _array } }) => {
          const works = _array.map(row => ({
            ...JSON.parse(row.data),
            _offline: true
          }));
          resolve(works);
        },
        (_, error) => reject(error)
      );
    });
  });
};

// Guardar imagen pendiente de sincronización
export const savePendingImage = (workId, imageData) => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        `INSERT INTO pending_images (workId, stage, imageUri, comment, dateTime, truckCount, createdAt) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          workId,
          imageData.stage,
          imageData.imageUri,
          imageData.comment || '',
          imageData.dateTime,
          imageData.truckCount || null,
          Date.now()
        ],
        (_, result) => {
          console.log('✅ Imagen guardada para sincronización:', result.insertId);
          resolve(result.insertId);
        },
        (_, error) => {
          console.error('Error guardando imagen pendiente:', error);
          reject(error);
        }
      );
    });
  });
};

// Obtener imágenes pendientes de sincronización
export const getPendingImages = () => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        "SELECT * FROM pending_images WHERE syncStatus = 'pending'",
        [],
        (_, { rows: { _array } }) => {
          console.log(`📤 ${_array.length} imágenes pendientes de sincronización`);
          resolve(_array);
        },
        (_, error) => reject(error)
      );
    });
  });
};

// Marcar imagen como sincronizada
export const markImageSynced = (id) => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        "UPDATE pending_images SET syncStatus = 'synced' WHERE id = ?",
        [id],
        (_, result) => {
          console.log('✅ Imagen marcada como sincronizada:', id);
          resolve(result);
        },
        (_, error) => reject(error)
      );
    });
  });
};

export default db;
```

#### 4.3. Servicio de Sincronización en Background
```javascript
// NUEVO: src/services/syncService.js
import NetInfo from '@react-native-community/netinfo';
import { getPendingImages, markImageSynced, getOfflineWorks } from '../database/db';
import { addImagesToWork } from '../Redux/Actions/workActions';
import { Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';

class SyncService {
  constructor() {
    this.isSyncing = false;
    this.syncListeners = [];
  }
  
  // Registrar listener para actualizaciones de sincronización
  addSyncListener(callback) {
    this.syncListeners.push(callback);
  }
  
  removeSyncListener(callback) {
    this.syncListeners = this.syncListeners.filter(cb => cb !== callback);
  }
  
  notifyListeners(data) {
    this.syncListeners.forEach(cb => cb(data));
  }
  
  // Sincronizar imágenes pendientes
  async syncPendingImages(dispatch) {
    if (this.isSyncing) {
      console.log('⏳ Sincronización ya en progreso');
      return;
    }
    
    try {
      this.isSyncing = true;
      this.notifyListeners({ status: 'syncing', progress: 0 });
      
      // Verificar conectividad
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected || !netInfo.isInternetReachable) {
        console.log('📴 Sin conexión, sincronización pospuesta');
        this.notifyListeners({ status: 'offline' });
        return;
      }
      
      // Obtener imágenes pendientes
      const pendingImages = await getPendingImages();
      
      if (pendingImages.length === 0) {
        console.log('✅ No hay imágenes pendientes');
        this.notifyListeners({ status: 'completed', total: 0 });
        return;
      }
      
      console.log(`📤 Sincronizando ${pendingImages.length} imágenes pendientes`);
      
      let syncedCount = 0;
      let failedCount = 0;
      
      for (let i = 0; i < pendingImages.length; i++) {
        const img = pendingImages[i];
        
        try {
          // Verificar que el archivo aún existe
          const fileInfo = await FileSystem.getInfoAsync(img.imageUri);
          if (!fileInfo.exists) {
            console.warn(`⚠️ Archivo no encontrado: ${img.imageUri}`);
            await markImageSynced(img.id); // Marcar como sincronizado para evitar reintentos
            failedCount++;
            continue;
          }
          
          // Preparar FormData
          const formData = new FormData();
          formData.append('stage', img.stage);
          formData.append('comment', img.comment || '');
          formData.append('dateTime', img.dateTime);
          if (img.truckCount) {
            formData.append('truckCount', img.truckCount.toString());
          }
          
          const filename = img.imageUri.split('/').pop();
          const match = /\.(\w+)$/.exec(filename);
          const type = match ? `image/${match[1]}` : `image/jpeg`;
          
          formData.append('imageFile', {
            uri: img.imageUri,
            name: filename,
            type: type
          });
          
          // Enviar al servidor
          const result = await dispatch(addImagesToWork(img.workId, formData));
          
          if (!result.error) {
            await markImageSynced(img.id);
            syncedCount++;
            console.log(`✅ Imagen ${i + 1}/${pendingImages.length} sincronizada`);
          } else {
            failedCount++;
            console.error(`❌ Error sincronizando imagen ${img.id}:`, result.message);
          }
          
          // Notificar progreso
          this.notifyListeners({
            status: 'syncing',
            progress: ((i + 1) / pendingImages.length) * 100,
            current: i + 1,
            total: pendingImages.length
          });
          
        } catch (error) {
          failedCount++;
          console.error(`❌ Error procesando imagen ${img.id}:`, error);
        }
      }
      
      console.log(`✅ Sincronización completada: ${syncedCount} exitosas, ${failedCount} fallidas`);
      
      this.notifyListeners({
        status: 'completed',
        synced: syncedCount,
        failed: failedCount,
        total: pendingImages.length
      });
      
      if (syncedCount > 0) {
        Alert.alert(
          'Sincronización Completada',
          `${syncedCount} imagen(es) sincronizada(s) con el servidor.`
        );
      }
      
    } catch (error) {
      console.error('❌ Error en sincronización:', error);
      this.notifyListeners({ status: 'error', error: error.message });
    } finally {
      this.isSyncing = false;
    }
  }
  
  // Auto-sincronización cuando hay conexión
  startAutoSync(dispatch) {
    console.log('🔄 Auto-sincronización activada');
    
    // Sincronizar cada vez que se detecta conexión
    const unsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected && state.isInternetReachable) {
        console.log('📶 Conexión detectada, iniciando sincronización');
        setTimeout(() => {
          this.syncPendingImages(dispatch);
        }, 2000); // Esperar 2 segundos para estabilizar conexión
      }
    });
    
    return unsubscribe; // Retornar función para desuscribirse
  }
}

export default new SyncService();
```

#### 4.4. Modificar UploadScreen para Modo Offline
```javascript
// MODIFICAR: UploadScreen.jsx
import { savePendingImage } from '../database/db';
import { checkConnectivity } from '../utils/networkChecker';
import syncService from '../services/syncService';

const UploadScreen = () => {
  // ... código existente ...
  
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [pendingImagesCount, setPendingImagesCount] = useState(0);
  
  useEffect(() => {
    // Verificar conectividad al montar
    checkNetworkStatus();
    
    // Escuchar cambios de red
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOfflineMode(!state.isConnected || !state.isInternetReachable);
    });
    
    return () => unsubscribe();
  }, []);
  
  const checkNetworkStatus = async () => {
    const isConnected = await checkConnectivity();
    setIsOfflineMode(!isConnected);
  };
  
  const processAndUploadImage = async (imageUri, comment = '', truckCount = null, stageForUpload) => {
    const stageToUse = stageForUpload || selectedStage;
    
    if (!stageToUse) {
      Alert.alert("Error", "No se pudo determinar la etapa para la carga de la imagen.");
      return Promise.reject(new Error("Etapa no definida"));
    }
    
    setIsUploading(true);
    let tempImageId = `temp-${Date.now()}-${Math.random()}`;
    
    try {
      // Redimensionar imagen
      const resizedImage = await manipulateAsync(
        imageUri,
        [{ resize: { width: 600 } }],
        { compress: 0.5, format: SaveFormat.JPEG }
      );
      
      const now = new Date();
      const dateTimeString = now.toLocaleString();
      
      // Preparar payload optimista
      const optimisticImagePayload = {
        id: tempImageId,
        stage: stageToUse,
        imageUrl: resizedImage.uri,
        comment: comment,
        dateTime: dateTimeString,
        truckCount: truckCount,
        _pending: isOfflineMode // ✅ Marcar como pendiente si offline
      };
      
      // Actualización optimista de UI
      setImagesByStage(prev => ({
        ...prev,
        [stageToUse]: [...(prev[stageToUse] || []), optimisticImagePayload]
      }));
      setImagesWithDataURLs(prev => ({
        ...prev,
        [tempImageId]: resizedImage.uri
      }));
      
      // ✅ SI ESTÁ OFFLINE: Guardar localmente
      if (isOfflineMode) {
        console.log('📴 Modo offline: Guardando imagen localmente');
        
        await savePendingImage(idWork, {
          stage: stageToUse,
          imageUri: resizedImage.uri,
          comment: comment,
          dateTime: dateTimeString,
          truckCount: truckCount
        });
        
        Alert.alert(
          '📴 Sin Conexión',
          'La imagen se guardó localmente. Se sincronizará automáticamente cuando haya conexión.',
          [{ text: 'Entendido' }]
        );
        
        // Actualizar contador de pendientes
        setPendingImagesCount(prev => prev + 1);
        
        return Promise.resolve();
      }
      
      // ✅ SI ESTÁ ONLINE: Subir inmediatamente
      const formData = new FormData();
      formData.append('stage', stageToUse);
      formData.append('comment', comment);
      formData.append('dateTime', dateTimeString);
      if (truckCount !== null) {
        formData.append('truckCount', truckCount.toString());
      }
      
      const filename = resizedImage.uri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;
      formData.append('imageFile', { uri: resizedImage.uri, name: filename, type: type });
      
      const resultAction = await dispatch(addImagesToWork(idWork, formData));
      
      if (resultAction && resultAction.error) {
        return Promise.reject(new Error(resultAction.error || resultAction.message));
      }
      
      // Refrescar trabajo
      dispatch(fetchWorkById(idWork));
      
      return Promise.resolve();
      
    } catch (error) {
      console.error(`Error al procesar/cargar ${imageUri}:`, error);
      
      // Revertir optimista si hubo error
      setImagesByStage(prev => ({
        ...prev,
        [stageToUse]: (prev[stageToUse] || []).filter(img => img.id !== tempImageId)
      }));
      setImagesWithDataURLs(prev => {
        const newUrls = { ...prev };
        delete newUrls[tempImageId];
        return newUrls;
      });
      
      return Promise.reject(error);
    } finally {
      setIsUploading(false);
    }
  };
  
  return (
    <>
      <ScrollView className="flex-1 bg-gray-100 p-5">
        {/* ✅ Indicador de Modo Offline */}
        {isOfflineMode && (
          <View className="bg-yellow-100 border border-yellow-400 p-3 rounded-lg mb-3">
            <View className="flex-row items-center">
              <Ionicons name="cloud-offline-outline" size={24} color="#D97706" />
              <View className="ml-3 flex-1">
                <Text className="text-yellow-800 font-bold">Modo Offline</Text>
                <Text className="text-yellow-700 text-xs">
                  Las imágenes se guardarán localmente y se sincronizarán automáticamente cuando haya conexión.
                </Text>
                {pendingImagesCount > 0 && (
                  <Text className="text-yellow-800 font-bold mt-1">
                    📤 {pendingImagesCount} imagen(es) pendiente(s) de sincronización
                  </Text>
                )}
              </View>
            </View>
          </View>
        )}
        
        {/* Resto del contenido existente */}
        {/* ... */}
      </ScrollView>
    </>
  );
};
```

#### 4.5. Indicador de Sincronización Global
```javascript
// NUEVO: src/components/SyncIndicator.jsx
import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import syncService from '../services/syncService';
import { useDispatch } from 'react-redux';

const SyncIndicator = () => {
  const dispatch = useDispatch();
  const [syncStatus, setSyncStatus] = useState({ status: 'idle' });
  
  useEffect(() => {
    // Suscribirse a actualizaciones de sincronización
    const handleSyncUpdate = (data) => {
      setSyncStatus(data);
    };
    
    syncService.addSyncListener(handleSyncUpdate);
    
    // Iniciar auto-sincronización
    const unsubscribeAutoSync = syncService.startAutoSync(dispatch);
    
    return () => {
      syncService.removeSyncListener(handleSyncUpdate);
      unsubscribeAutoSync();
    };
  }, [dispatch]);
  
  const handleManualSync = () => {
    syncService.syncPendingImages(dispatch);
  };
  
  if (syncStatus.status === 'idle' || syncStatus.status === 'completed') {
    return null; // No mostrar si no hay nada que sincronizar
  }
  
  return (
    <View className="bg-blue-600 p-3 flex-row items-center justify-between">
      {syncStatus.status === 'syncing' && (
        <>
          <View className="flex-row items-center flex-1">
            <ActivityIndicator size="small" color="white" />
            <Text className="text-white ml-3">
              Sincronizando... {Math.round(syncStatus.progress || 0)}%
            </Text>
          </View>
          <Text className="text-white text-xs">
            {syncStatus.current || 0}/{syncStatus.total || 0}
          </Text>
        </>
      )}
      
      {syncStatus.status === 'offline' && (
        <View className="flex-row items-center justify-between flex-1">
          <View className="flex-row items-center">
            <Ionicons name="cloud-offline" size={20} color="white" />
            <Text className="text-white ml-2">Sin conexión</Text>
          </View>
          <Pressable onPress={handleManualSync}>
            <Ionicons name="refresh" size={24} color="white" />
          </Pressable>
        </View>
      )}
      
      {syncStatus.status === 'error' && (
        <View className="bg-red-600 p-3">
          <Text className="text-white">❌ Error en sincronización</Text>
        </View>
      )}
    </View>
  );
};

export default SyncIndicator;
```

#### 4.6. Inicializar Base de Datos en App.js
```javascript
// MODIFICAR: App.js
import { initDatabase } from './src/database/db';
import SyncIndicator from './src/components/SyncIndicator';

function App() {
  const [dbReady, setDbReady] = useState(false);
  
  useEffect(() => {
    initDatabase()
      .then(() => {
        console.log('✅ Base de datos inicializada');
        setDbReady(true);
      })
      .catch(error => {
        console.error('❌ Error inicializando base de datos:', error);
        Alert.alert('Error', 'No se pudo inicializar la base de datos local');
      });
  }, []);
  
  if (!dbReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
        <Text>Inicializando...</Text>
      </View>
    );
  }
  
  return (
    <Provider store={store}>
      <NavigationContainer>
        <SyncIndicator /> {/* ✅ Indicador global */}
        <MainNavigator />
      </NavigationContainer>
    </Provider>
  );
}
```

---

## 📊 PLAN DE IMPLEMENTACIÓN PRIORIZADO

### FASE 1: FIXES URGENTES (1-2 días)
**Objetivo:** Resolver problemas críticos que bloquean uso actual

- [ ] **Problema #2: Decimales en Gastos** ⏱️ 4 horas
  - Validar tipo de dato en BD
  - Implementar formateo en UI
  - Agregar logs de debug
  - Testing exhaustivo

- [ ] **Problema #1: Optimización de Imágenes** ⏱️ 6 horas
  - Aumentar compresión (0.5)
  - Reducir dimensiones (600px)
  - Implementar límite de memoria
  - Testing con múltiples imágenes

### FASE 2: MEJORAS DE UX WORKER (2-3 días)
**Objetivo:** Mejorar experiencia para usuarios Worker

- [ ] **Problema #3: Dashboard Worker** ⏱️ 8 horas
  - Crear WorkerDashboard.jsx
  - Categorización de obras
  - Estadísticas visuales
  - Navegación mejorada

- [ ] **Validación de Conectividad** ⏱️ 4 horas
  - Implementar networkChecker
  - Mensajes de error contextuales
  - Feedback visual de estado de red

### FASE 3: CAPACIDAD OFFLINE (4-5 días)
**Objetivo:** Permitir trabajo sin conexión en áreas remotas

- [ ] **Base de Datos Local** ⏱️ 8 horas
  - Implementar SQLite
  - Crear esquema de tablas
  - Funciones CRUD offline

- [ ] **Servicio de Sincronización** ⏱️ 12 horas
  - SyncService completo
  - Auto-sincronización
  - Manejo de errores
  - UI de sincronización

- [ ] **Modificación de Pantallas** ⏱️ 6 horas
  - UploadScreen offline-ready
  - GeneralExpenseScreen offline
  - Indicadores visuales

### FASE 4: OPTIMIZACIONES AVANZADAS (3-4 días)
**Objetivo:** Performance y estabilidad a largo plazo

- [ ] **Sistema de Caché** ⏱️ 6 horas
  - react-native-fast-image
  - OptimizedImage component
  - Limpieza automática de caché

- [ ] **Lazy Loading Avanzado** ⏱️ 4 horas
  - FlatList optimizado
  - Virtualización mejorada
  - Gestión de memoria

---

## 🧪 TESTING CHECKLIST

### Test de Imágenes:
- [ ] Cargar 12 imágenes consecutivas sin crash
- [ ] Verificar compresión efectiva (< 500KB por imagen)
- [ ] Probar en dispositivo de gama baja
- [ ] Validar caché funcionando correctamente

### Test de Decimales:
- [ ] Ingresar $50.75 y verificar se guarda exacto
- [ ] Ingresar $100.99 y verificar
- [ ] Probar con .00, .50, .25, .33
- [ ] Verificar en backend logs

### Test de Worker:
- [ ] Login como worker
- [ ] Navegar obras asignadas
- [ ] Subir imágenes a obra
- [ ] Registrar gasto general
- [ ] Marcar obra instalada

### Test de Offline:
- [ ] Activar modo avión
- [ ] Cargar 3 imágenes (deben guardarse localmente)
- [ ] Verificar indicador de pendientes
- [ ] Desactivar modo avión
- [ ] Verificar auto-sincronización
- [ ] Confirmar imágenes en servidor

---

## 📈 MÉTRICAS DE ÉXITO

### Rendimiento:
- Tiempo de carga de pantalla < 2 segundos
- Carga de imagen individual < 3 segundos
- Uso de memoria < 200MB con 12 imágenes
- Sin crashes después de 20 imágenes cargadas

### Funcionalidad:
- 100% de gastos con decimales correctos
- Worker puede completar flujo completo sin errores
- Modo offline funcional en 100% de casos
- Sincronización automática exitosa > 95%

### UX:
- Mensajes de error claros y accionables
- Indicadores de estado siempre visibles
- Navegación intuitiva para Worker
- Feedback inmediato en todas las acciones

---

## 🚀 COMANDOS RÁPIDOS DE IMPLEMENTACIÓN

```bash
# Instalar todas las dependencias necesarias
cd WorkTrackerApp
npx expo install react-native-fast-image
npx expo install expo-sqlite
npx expo install @react-native-community/netinfo

# Limpiar caché y reinstalar
npm run dev -- --clear

# Testing en dispositivo
npx expo start --android # o --ios
```

---

## 📝 NOTAS IMPORTANTES

### Para el Cliente:
1. **Lehigh y áreas sin señal ahora funcionarán** con modo offline
2. **Los decimales se guardarán correctamente** en todos los gastos
3. **La app será más rápida y estable** con las optimizaciones
4. **Workers tendrán mejor experiencia** con dashboard dedicado

### Para el Equipo de Desarrollo:
1. Implementar en orden de fases (1 → 2 → 3 → 4)
2. Testing exhaustivo después de cada fase
3. Mantener logs detallados para debugging
4. Documentar cambios en código

### Consideraciones Técnicas:
- SQLite tiene límite de ~2GB, más que suficiente para uso offline
- Sincronización consume batería, optimizar frecuencia
- Cloudinary URLs deben tener token de acceso correcto
- Backend debe validar datos sincronizados offline

---

## 🆘 SOPORTE Y TROUBLESHOOTING

### Problema: Sincronización falla continuamente
**Solución:** 
```javascript
// Limpiar tabla de pendientes manualmente
import db from './src/database/db';

db.transaction(tx => {
  tx.executeSql("DELETE FROM pending_images WHERE syncStatus = 'synced'");
});
```

### Problema: Imágenes no cargan después de optimización
**Solución:**
```bash
# Limpiar caché de Expo
npx expo start --clear

# Limpiar caché de Android
adb shell pm clear com.yourcompany.worktrackerapp
```

### Problema: Base de datos corrupta
**Solución:**
```javascript
// Recrear base de datos
import * as SQLite from 'expo-sqlite';

const recreateDB = async () => {
  await SQLite.deleteDatabase('zurcher_offline.db');
  await initDatabase();
};
```

---

## ✅ CHECKLIST DE DEPLOYMENT

Antes de liberar a producción:

- [ ] Todos los tests pasando
- [ ] Logs de producción desactivados (solo errors)
- [ ] Versión incrementada en package.json
- [ ] Changelog actualizado
- [ ] Backend compatible con nuevos endpoints
- [ ] Cloudinary configurado correctamente
- [ ] Base de datos migrada (si aplica)
- [ ] Testing en dispositivos reales (iOS + Android)
- [ ] Capacitación a Workers sobre modo offline
- [ ] Documentación de usuario actualizada

---

**Última actualización:** 22 de Noviembre, 2025  
**Autor:** GitHub Copilot  
**Estado:** LISTO PARA IMPLEMENTAR ✅
