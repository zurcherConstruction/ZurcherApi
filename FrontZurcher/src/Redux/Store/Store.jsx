import { configureStore } from '@reduxjs/toolkit';
import { combineReducers } from 'redux';
import authReducer from '../Reducer/authReducer';
import pdfReducer from '../Reducer/pdfReducer';

const rootReducer = combineReducers({
  auth: authReducer,
  pdf: pdfReducer,
  // agrega otros reducers aquí
});

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});