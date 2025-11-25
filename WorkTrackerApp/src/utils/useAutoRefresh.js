import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppState } from 'react-native';
import { refreshWorksInBackground } from '../Redux/Actions/workActions';

export const useAutoRefresh = (interval = 60000) => {
  const dispatch = useDispatch();
  const intervalRef = useRef(null);
  const appState = useRef(AppState.currentState);
  const { isAuthenticated, staff } = useSelector((state) => state.auth);

  useEffect(() => {
    // CAMBIO: usar staff?.id en lugar de staff?.idStaff
    if (!isAuthenticated || !staff?.id) {
      if (__DEV__) {
        console.log('⚠️ Auto-refresh: Usuario no autenticado', {
          isAuthenticated,
          staffId: staff?.id
        });
      }
      return;
    }

    if (__DEV__) {
      console.log('🔄 Auto-refresh activado cada', interval / 1000, 'segundos');
    }

    const startPolling = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      intervalRef.current = setInterval(() => {
        if (__DEV__) {
          console.log('⏰ Ejecutando auto-refresh');
        }
        dispatch(refreshWorksInBackground(staff.id));
      }, interval);
    };

    const handleAppStateChange = (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        if (__DEV__) {
          console.log('📱 App volvió al primer plano');
        }
        dispatch(refreshWorksInBackground(staff.id));
        startPolling();
      } else if (nextAppState.match(/inactive|background/)) {
        if (__DEV__) {
          console.log('📱 App en background');
        }
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      }
      appState.current = nextAppState;
    };

    startPolling();
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      subscription?.remove();
    };
  }, [isAuthenticated, staff?.id, dispatch, interval]); // CAMBIO: staff?.id

  const forceRefresh = () => {
    if (isAuthenticated && staff?.id) {
      if (__DEV__) {
        console.log('🔄 Refresh manual ejecutado');
      }
      dispatch(refreshWorksInBackground(staff.id));
    } else if (__DEV__) {
      console.log('❌ No se puede hacer refresh - no autenticado');
    }
  };

  return { forceRefresh };
};