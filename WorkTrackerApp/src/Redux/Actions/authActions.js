import api from '../../utils/axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { loginRequest, loginSuccess, loginFailure, logout, sessionCheckComplete } from '../features/authSlice';

// Acción para iniciar sesión
import { fetchWorks } from './workActions';

export const login = (email, password) => async (dispatch) => {
  dispatch(loginRequest());
  try {
    const response = await api.post('/auth/login', { email, password });
    const { token, staff } = response.data.data;

    // Guardar el token y el staff en AsyncStorage
    await AsyncStorage.setItem('token', token);
    await AsyncStorage.setItem('staff', JSON.stringify(staff));

    dispatch(loginSuccess({ token, staff }));
    
    // Despachar la acción para obtener los trabajos asignados al staff
    dispatch(fetchWorks(staff.id)); // Aquí usamos staff.id como staffId
    
    // ✅ RETORNAR ÉXITO
    return { success: true, staff };
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || error.message || 'Error al iniciar sesión';
    dispatch(loginFailure(errorMessage));
    Alert.alert('Error', errorMessage); // Mostrar error en una alerta
    
    // ✅ RETORNAR ERROR
    return { error: true, message: errorMessage };
  }
};

// Acción para cerrar sesión
export const logoutUser = () => async (dispatch) => {
  try {
    // Eliminar token y usuario de AsyncStorage
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('staff');
    dispatch(logout());
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
  }
};

// Acción mejorada para restaurar sesión
export const restoreSession = () => async (dispatch) => {
  try {
    const token = await AsyncStorage.getItem('token');
    const staffData = await AsyncStorage.getItem('staff');

    if (token && staffData) {
      const staff = JSON.parse(staffData);
      
      // Configurar el token en el header de axios antes de verificar
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      try {
        // Verificar que el token aún sea válido
        const verifyResponse = await api.get('/auth/verify-token');
        
        dispatch(loginSuccess({ token, staff }));
        console.log('✅ Sesión restaurada. Staff ID:', staff.id);
        
        // Cargar trabajos después de restaurar la sesión
        dispatch(fetchWorks(staff.id));
      } catch (tokenError) {
        // Si el token no es válido, limpiar el almacenamiento
        console.log('❌ Token expirado o inválido, limpiando sesión');
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('staff');
        delete api.defaults.headers.common['Authorization'];
        dispatch(sessionCheckComplete());
      }
    } else {
      console.log('ℹ️ No hay sesión guardada');
      dispatch(sessionCheckComplete());
    }
  } catch (error) {
    console.error('❌ Error al restaurar la sesión:', error);
    dispatch(sessionCheckComplete());
  }
};