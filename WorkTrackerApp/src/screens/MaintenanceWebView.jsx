import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  BackHandler,
  Linking,
  TouchableOpacity
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation, useRoute } from '@react-navigation/native';
import { generateMaintenanceToken, fetchAssignedMaintenances } from '../Redux/features/maintenanceSlice';

// Detectar si estamos en web
const isWeb = Platform.OS === 'web';

const MaintenanceWebView = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const route = useRoute();
  const webViewRef = useRef(null);

  const { visit } = route.params || {};
  const { generatedToken, loadingAction } = useSelector(state => state.maintenance);
  const { staffId } = useSelector(state => state.auth);

  // ✅ TODOS los estados deben declararse al inicio, antes de cualquier lógica condicional
  const [webViewUrl, setWebViewUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [webViewError, setWebViewError] = useState(false);
  const [webFormOpened, setWebFormOpened] = useState(false);

  useEffect(() => {
    if (!visit || !visit.id) {
      Alert.alert('Error', 'No se pudo cargar la información de la visita');
      navigation.goBack();
      return;
    }

    generateTokenAndLoadForm();
  }, [visit]);

  // Manejar botón atrás de Android
  useEffect(() => {
    if (Platform.OS === 'android') {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
      return () => backHandler.remove();
    }
  }, []);

  const generateTokenAndLoadForm = async () => {
    try {
      setLoading(true);
      console.log('🔑 [MaintenanceWebView] Generando token para visit:', visit.id);
      const tokenData = await dispatch(generateMaintenanceToken(visit.id)).unwrap();
      console.log('✅ [MaintenanceWebView] Token recibido:', tokenData.token.substring(0, 20) + '...');
      
      // URL del formulario web
      const baseUrl = __DEV__ 
        ? 'http://localhost:5173' // ✅ Desarrollo local (cambiado para testing en web)
        : 'https://www.zurcherseptic.com'; // Producción
      
      const formUrl = `${baseUrl}/maintenance-form?visitId=${visit.id}&token=${tokenData.token}`;
      
      console.log('📱 [MaintenanceWebView] __DEV__:', __DEV__);
      console.log('📱 [MaintenanceWebView] baseUrl:', baseUrl);
      console.log('📱 [MaintenanceWebView] Cargando URL completa:', formUrl);
      
      setWebViewUrl(formUrl);
    } catch (error) {
      console.error('❌ [MaintenanceWebView] Error generando token:', error);
      Alert.alert(
        'Error',
        error || 'No se pudo generar el token de acceso. Intenta nuevamente.',
        [
          { text: 'Reintentar', onPress: generateTokenAndLoadForm },
          { text: 'Cancelar', onPress: () => navigation.goBack() }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBackPress = () => {
    if (webViewRef.current) {
      // Intentar volver atrás en el WebView
      webViewRef.current.goBack();
      return true; // Previene el comportamiento por defecto
    }
    return false;
  };

  const handleNavigationStateChange = (navState) => {
    console.log('📱 WebView navigation:', navState.url);
    
    // Si el usuario navega fuera del formulario, podrías manejarlo aquí
    // Por ejemplo, si cierra o completa el formulario
  };

  const handleMessage = (event) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      console.log('📱 Mensaje desde WebView:', message);

      if (message.type === 'MAINTENANCE_COMPLETED') {
        // El formulario se completó exitosamente
        Alert.alert(
          'Éxito',
          'Formulario de mantenimiento enviado correctamente',
          [
            {
              text: 'OK',
              onPress: () => {
                // Recargar la lista de mantenimientos
                if (staffId) {
                  dispatch(fetchAssignedMaintenances(staffId));
                }
                navigation.goBack();
              }
            }
          ]
        );
      } else if (message.type === 'FORM_ERROR') {
        Alert.alert('Error', message.error || 'Hubo un error al enviar el formulario');
      }
    } catch (error) {
      console.log('📱 Mensaje no JSON recibido:', event.nativeEvent.data);
    }
  };

  const handleError = (syntheticEvent) => {
    const { nativeEvent } = syntheticEvent;
    console.error('❌ WebView error:', nativeEvent);
    setWebViewError(true);
    
    Alert.alert(
      'Error de conexión',
      'No se pudo cargar el formulario. Verifica tu conexión a internet.',
      [
        { text: 'Reintentar', onPress: () => {
          setWebViewError(false);
          generateTokenAndLoadForm();
        }},
        { text: 'Cancelar', onPress: () => navigation.goBack() }
      ]
    );
  };

  const handleLoadStart = () => {
    setLoading(true);
  };

  const handleLoadEnd = () => {
    setLoading(false);
  };

  if (!webViewUrl) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        {loadingAction && (
          <Text style={styles.loadingText}>Generando acceso seguro...</Text>
        )}
      </View>
    );
  }

  // 🌐 FALLBACK PARA WEB: Abrir en nueva ventana
  useEffect(() => {
    if (isWeb && webViewUrl && !webFormOpened) {
      console.log('🌐 Abriendo formulario en nueva ventana (web):', webViewUrl);
      window.open(webViewUrl, '_blank');
      setWebFormOpened(true);
      
      // Volver atrás después de un breve delay
      setTimeout(() => {
        Alert.alert(
          'Formulario abierto',
          'El formulario se abrió en una nueva ventana. Al completarlo, vuelve aquí y presiona "Actualizar".',
          [
            { 
              text: 'Actualizar', 
              onPress: () => {
                if (staffId) {
                  dispatch(fetchAssignedMaintenances(staffId));
                }
                navigation.goBack();
              }
            },
            { text: 'Volver', onPress: () => navigation.goBack() }
          ]
        );
      }, 1000);
    }
  }, [isWeb, webViewUrl, webFormOpened, staffId]);

  if (isWeb && webViewUrl) {
    return (
      <View style={styles.webFallbackContainer}>
        <Text style={styles.webFallbackTitle}>Formulario de Mantenimiento</Text>
        <Text style={styles.webFallbackText}>
          El formulario se abrió en una nueva ventana del navegador.
        </Text>
        <Text style={styles.webFallbackSubtext}>
          Si no se abrió automáticamente, haz clic en el botón de abajo:
        </Text>
        <TouchableOpacity 
          style={styles.webFallbackButton}
          onPress={() => window.open(webViewUrl, '_blank')}
        >
          <Text style={styles.webFallbackButtonText}>Abrir Formulario</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.webFallbackSecondaryButton}
          onPress={() => {
            if (staffId) {
              dispatch(fetchAssignedMaintenances(staffId));
            }
            navigation.goBack();
          }}
        >
          <Text style={styles.webFallbackSecondaryButtonText}>Actualizar y Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Cargando formulario...</Text>
        </View>
      )}
      
      {!webViewError && webViewUrl && (
        <WebView
          ref={webViewRef}
          source={{ uri: webViewUrl }}
          style={styles.webView}
          onNavigationStateChange={handleNavigationStateChange}
          onMessage={handleMessage}
          onError={handleError}
          onLoadStart={handleLoadStart}
          onLoadEnd={handleLoadEnd}
          // Habilitar JavaScript
          javaScriptEnabled={true}
          // Habilitar DOM Storage (necesario para algunas apps web)
          domStorageEnabled={true}
          // Permitir acceso a la cámara/archivos
          allowFileAccess={true}
          allowUniversalAccessFromFileURLs={true}
          // Para iOS
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          // Zoom
          scalesPageToFit={true}
          // Headers (opcional, si necesitas pasar algo adicional)
          // injectedJavaScript={`
          //   window.ReactNativeWebView.postMessage(JSON.stringify({type: 'WEBVIEW_LOADED'}));
          //   true;
          // `}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    zIndex: 999,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  webView: {
    flex: 1,
  },
  // Estilos para fallback web
  webFallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F3F4F6',
  },
  webFallbackTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  webFallbackText: {
    fontSize: 16,
    color: '#4B5563',
    marginBottom: 8,
    textAlign: 'center',
  },
  webFallbackSubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
    textAlign: 'center',
  },
  webFallbackButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
    minWidth: 200,
    alignItems: 'center',
  },
  webFallbackButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  webFallbackSecondaryButton: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 200,
    alignItems: 'center',
  },
  webFallbackSecondaryButtonText: {
    color: '#1F2937',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default MaintenanceWebView;
