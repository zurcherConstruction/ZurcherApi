import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const BiometricService = {
  // Verificar si el dispositivo soporta biometría
  async isAvailable() {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    
    return {
      hasHardware,
      supportedTypes,
      isEnrolled,
      isSupported: hasHardware && isEnrolled
    };
  },

  // Autenticar con biometría
  async authenticate() {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Autentícate para acceder',
        subtitle: 'Usa tu Face ID o huella dactilar',
        fallbackLabel: 'Usar contraseña',
        cancelLabel: 'Cancelar'
      });
      
      return result;
    } catch (error) {
      console.error('Error en autenticación biométrica:', error);
      return { success: false, error: error.message };
    }
  },

  // Guardar credenciales para uso con biometría
  async saveCredentials(email, password) {
    try {
      await AsyncStorage.setItem('biometric_email', email);
      await AsyncStorage.setItem('biometric_password', password);
      await AsyncStorage.setItem('biometric_enabled', 'true');
      return true;
    } catch (error) {
      console.error('Error guardando credenciales:', error);
      return false;
    }
  },

  // Obtener credenciales guardadas
  async getCredentials() {
    try {
      const email = await AsyncStorage.getItem('biometric_email');
      const password = await AsyncStorage.getItem('biometric_password');
      const enabled = await AsyncStorage.getItem('biometric_enabled');
      
      return {
        email,
        password,
        enabled: enabled === 'true'
      };
    } catch (error) {
      console.error('Error obteniendo credenciales:', error);
      return null;
    }
  },

  // Deshabilitar autenticación biométrica
  async disable() {
    try {
      await AsyncStorage.removeItem('biometric_email');
      await AsyncStorage.removeItem('biometric_password');
      await AsyncStorage.removeItem('biometric_enabled');
      return true;
    } catch (error) {
      console.error('Error deshabilitando biometría:', error);
      return false;
    }
  }
};