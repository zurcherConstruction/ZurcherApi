import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  // Datos de instalaciones del mes seleccionado
  installations: [],
  summary: {
    totalWorks: 0,
    byStaff: []
  },
  
  // Filtros actuales
  selectedYear: new Date().getFullYear(),
  selectedMonth: new Date().getMonth() + 1, // 1-12
  
  // Resumen anual
  yearlySummary: {
    year: null,
    monthlyData: [],
    totalYear: 0
  },
  
  // Años disponibles
  availableYears: [],
  
  // Estados de carga
  loading: false,
  loadingYearlySummary: false,
  loadingAvailableYears: false,
  
  // Errores
  error: null,
  errorYearlySummary: null,
  errorAvailableYears: null
};

const monthlyInstallationsSlice = createSlice({
  name: 'monthlyInstallations',
  initialState,
  reducers: {
    // === Fetch Monthly Installations ===
    fetchMonthlyInstallationsRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchMonthlyInstallationsSuccess: (state, action) => {
      state.loading = false;
      state.installations = action.payload.installations || [];
      state.summary = action.payload.summary || { totalWorks: 0, byStaff: [] };
      state.selectedYear = action.payload.year;
      if (action.payload.month) {
        state.selectedMonth = action.payload.month;
      }
      state.error = null;
    },
    fetchMonthlyInstallationsFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
    
    // === Fetch Yearly Summary ===
    fetchYearlySummaryRequest: (state) => {
      state.loadingYearlySummary = true;
      state.errorYearlySummary = null;
    },
    fetchYearlySummarySuccess: (state, action) => {
      state.loadingYearlySummary = false;
      state.yearlySummary = action.payload;
      state.errorYearlySummary = null;
    },
    fetchYearlySummaryFailure: (state, action) => {
      state.loadingYearlySummary = false;
      state.errorYearlySummary = action.payload;
    },
    
    // === Fetch Available Years ===
    fetchAvailableYearsRequest: (state) => {
      state.loadingAvailableYears = true;
      state.errorAvailableYears = null;
    },
    fetchAvailableYearsSuccess: (state, action) => {
      state.loadingAvailableYears = false;
      state.availableYears = action.payload;
      state.errorAvailableYears = null;
    },
    fetchAvailableYearsFailure: (state, action) => {
      state.loadingAvailableYears = false;
      state.errorAvailableYears = action.payload;
    },
    
    // === Setters para filtros ===
    setSelectedYear: (state, action) => {
      state.selectedYear = action.payload;
    },
    setSelectedMonth: (state, action) => {
      state.selectedMonth = action.payload;
    },
    
    // === Clear state ===
    clearMonthlyInstallations: (state) => {
      state.installations = [];
      state.summary = { totalWorks: 0, byStaff: [] };
      state.error = null;
    }
  }
});

export const {
  fetchMonthlyInstallationsRequest,
  fetchMonthlyInstallationsSuccess,
  fetchMonthlyInstallationsFailure,
  fetchYearlySummaryRequest,
  fetchYearlySummarySuccess,
  fetchYearlySummaryFailure,
  fetchAvailableYearsRequest,
  fetchAvailableYearsSuccess,
  fetchAvailableYearsFailure,
  setSelectedYear,
  setSelectedMonth,
  clearMonthlyInstallations
} = monthlyInstallationsSlice.actions;

export default monthlyInstallationsSlice.reducer;
