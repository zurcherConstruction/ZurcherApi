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
      try {
        const staff = JSON.parse(staffData);
        
        // Validar que staff tenga la estructura correcta
        if (!staff || !staff.id) {
          if (__DEV__) {
            console.log('⚠️ Datos de staff inválidos, limpiando sesión');
          }
          await AsyncStorage.removeItem('token');
          await AsyncStorage.removeItem('staff');
          dispatch(sessionCheckComplete());
          return;
        }
        
        dispatch(loginSuccess({ token, staff }));
        if (__DEV__) {
          console.log('✅ Sesión restaurada. Staff ID:', staff.id);
        }
        
        // Cargar trabajos después de restaurar la sesión (esto validará el token)
        try {
          await dispatch(fetchWorks(staff.id));
        } catch (error) {
          if (__DEV__) {
            console.log('⚠️ Error cargando trabajos, token puede estar expirado');
          }
        }
      } catch (parseError) {
        console.error('❌ Error parseando staff data:', parseError);
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('staff');
        dispatch(sessionCheckComplete());
      }
    } else {
      if (__DEV__) {
        console.log('ℹ️ No hay sesión guardada');
      }
      dispatch(sessionCheckComplete());
    }
  } catch (error) {
    console.error('❌ Error al restaurar la sesión:', error);
    dispatch(sessionCheckComplete());
  }
};