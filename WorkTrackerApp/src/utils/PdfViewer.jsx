import React from 'react';
import { Modal, View, Pressable, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import Ionicons from 'react-native-vector-icons/Ionicons'; // O el ícono que prefieras

// --- ACEPTAR fileUri ---
const PdfViewer = ({ visible, onClose, fileUri }) => {

  // Mostrar un indicador de carga si la URI no está lista o es inválida
  const sourceUri = fileUri ? { uri: fileUri } : null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose} // Para el botón atrás de Android
    >
      <View style={styles.container}>
        {/* Botón de cerrar */}
        <Pressable onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close-circle" size={30} color="#333" />
        </Pressable>

        {/* WebView para mostrar el PDF */}
        {sourceUri ? (
          <WebView
            originWhitelist={['*']} // Permite cargar desde file://
            source={sourceUri} // --- USAR LA URI DEL ARCHIVO ---
            style={styles.webview}
            startInLoadingState={true}
            renderLoading={() => (
              <ActivityIndicator size="large" style={styles.loading} />
            )}
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.warn('WebView error: ', nativeEvent);
              // Opcional: Mostrar un mensaje de error al usuario
            }}
          />
        ) : (
          // Mostrar mensaje o loader si no hay URI
          <View style={styles.centered}>
            <Text>Cargando PDF...</Text>
            <ActivityIndicator size="large" />
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: Platform.OS === 'ios' ? 50 : 20, // Ajustar para barra de estado/notch
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 15,
    zIndex: 10, // Asegurar que esté encima del WebView
    padding: 5,
  },
  webview: {
    flex: 1,
  },
  loading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  }
});

export default PdfViewer;