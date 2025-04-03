import { configureStore } from '@reduxjs/toolkit';
import { combineReducers } from 'redux';
import authReducer from './features/authSlice';
import workReducer from './features/workSlice'; // Importar el reducer del workSlice

// Combinar los reducers
const rootReducer = combineReducers({
  auth: authReducer, // Reducer de autenticación
  work: workReducer, // Reducer de obras
});

// Configurar el store
export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false, // Deshabilitar la verificación de serialización si es necesario
    }),
});