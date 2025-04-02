import { configureStore } from '@reduxjs/toolkit';
import { combineReducers } from 'redux';
import authReducer from './features/authSlice';

const rootReducer = combineReducers({
  auth: authReducer,
  //  otros reducers 
});

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});