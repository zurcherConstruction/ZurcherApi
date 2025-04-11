import { configureStore } from '@reduxjs/toolkit';
import { combineReducers } from 'redux';
import toastMiddleware from '../../utils/toastMiddleware';
import authReducer from '../Reducer/authReducer';
import pdfReducer from '../Reducer/pdfReducer';
import BudgetReducer from '../Reducer/BudgetReducer';
import adminReducer from '../Reducer/adminReducer';
import inspectionReducer from '../Reducer/inspectionReducer';
import materialReducer from '../Reducer/materialReducer';
import permitReducer from '../Reducer/permitReducer';
import workReducer from '../Reducer/workReducer';
import notificationReducer from '../Reducer/notificationReducer';
import receiptReducer from '../Reducer/receiptReducer';
import balanceReducer from '../Reducer/balanceReducer'; // Asegúrate de importar el reducer de balance

const rootReducer = combineReducers({
  auth: authReducer,
  pdf: pdfReducer,
  admin: adminReducer,
  budget: BudgetReducer,
  inspection: inspectionReducer,
  material: materialReducer,
  permit: permitReducer,
  work: workReducer,
  notifications: notificationReducer,
  receipts: receiptReducer,
  balance: balanceReducer, // Asegúrate de importar y agregar el reducer de balance aquí
  // agrega otros reducers aquí
});

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }).concat(toastMiddleware),
});