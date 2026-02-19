import { configureStore } from '@reduxjs/toolkit';
import { combineReducers } from 'redux';
import authReducer from './features/authSlice';
import workReducer from './features/workSlice'; // Importar el reducer del workSlice
import balanceReducer from './features/balanceSlice'; // Importar el reducer del balanceSlice
import staffReducer from './features/staffSlice'; // Importar el reducer del staffSlice
import maintenanceReducer from './features/maintenanceSlice'; // Importar el reducer del maintenanceSlice
import simpleWorkReducer from './features/simpleWorkSlice'; // 🆕 Reducer de trabajos varios
import claimReducer from './features/claimSlice'; // 🆕 Reducer de reclamos
// Combinar los reducers
const rootReducer = combineReducers({
  auth: authReducer, // Reducer de autenticación
  work: workReducer, // Reducer de obras
  balance: balanceReducer, // Reducer de balance
  staff: staffReducer, // Reducer de personal
  maintenance: maintenanceReducer,
  simpleWork: simpleWorkReducer, // 🆕 Reducer de trabajos varios
  claim: claimReducer, // 🆕 Reducer de reclamos
});

// Configurar el store
export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false, // Deshabilitar la verificación de serialización si es necesario
    }),
});