import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  // Datos principales
  monthlyData: {
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    days: {},
    staffSummaries: [],
    uniqueStaff: [],
    totalRecords: 0
  },
  
  // Resumen anual
  yearlyData: {
    year: new Date().getFullYear(),
    monthlyBreakdown: {},
    totalRecords: 0
  },
  
  // Años disponibles
  availableYears: [],
  
  // Estados de carga
  loading: {
    monthly: false,
    yearly: false,
    marking: false,
    years: false,
    deleting: false
  },
  
  // Errores
  error: null,
  successMessage: null,
  
  // UI state
  selectedDate: null,
  selectedStaff: null,
  showMarkingModal: false,
  
  // Filtros
  filters: {
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    staffId: null
  }
};

const staffAttendanceSlice = createSlice({
  name: 'staffAttendance',
  initialState,
  reducers: {
    // Fetch monthly attendance
    fetchMonthlyAttendanceRequest: (state) => {
      state.loading.monthly = true;
      state.error = null;
    },
    fetchMonthlyAttendanceSuccess: (state, action) => {
      state.loading.monthly = false;
      state.monthlyData = action.payload;
      state.error = null;
    },
    fetchMonthlyAttendanceFailure: (state, action) => {
      state.loading.monthly = false;
      state.error = action.payload;
    },

    // Fetch yearly summary
    fetchYearlySummaryRequest: (state) => {
      state.loading.yearly = true;
      state.error = null;
    },
    fetchYearlySummarySuccess: (state, action) => {
      state.loading.yearly = false;
      state.yearlyData = action.payload;
      state.error = null;
    },
    fetchYearlySummaryFailure: (state, action) => {
      state.loading.yearly = false;
      state.error = action.payload;
    },

    // Fetch available years
    fetchAvailableYearsRequest: (state) => {
      state.loading.years = true;
      state.error = null;
    },
    fetchAvailableYearsSuccess: (state, action) => {
      state.loading.years = false;
      state.availableYears = action.payload;
      state.error = null;
    },
    fetchAvailableYearsFailure: (state, action) => {
      state.loading.years = false;
      state.error = action.payload;
    },

    // Mark attendance
    markAttendanceRequest: (state) => {
      state.loading.marking = true;
      state.error = null;
    },
    markAttendanceSuccess: (state, action) => {
      state.loading.marking = false;
      // La respuesta viene como { success: true, data: attendanceWithStaff, message: "..." }
      const attendanceData = action.payload;
      
      if (attendanceData?.workDate && attendanceData?.Staff) {
        const workDate = attendanceData.workDate;
        if (state.monthlyData.days[workDate]) {
          // Actualizar o agregar la asistencia en los datos locales
          const existingIndex = state.monthlyData.days[workDate].findIndex(
            att => att.Staff?.id === attendanceData.Staff.id
          );
          if (existingIndex >= 0) {
            state.monthlyData.days[workDate][existingIndex] = attendanceData;
          } else {
            state.monthlyData.days[workDate].push(attendanceData);
          }
        } else {
          state.monthlyData.days[workDate] = [attendanceData];
        }
      }
      
      state.successMessage = 'Asistencia marcada correctamente';
      state.error = null;
    },
    markAttendanceFailure: (state, action) => {
      state.loading.marking = false;
      state.error = action.payload;
      state.successMessage = null;
    },

    // Delete attendance
    deleteAttendanceRequest: (state) => {
      state.loading.deleting = true;
      state.error = null;
    },
    deleteAttendanceSuccess: (state, action) => {
      state.loading.deleting = false;
      // Remover la asistencia de los datos locales
      const { id } = action.payload;
      Object.keys(state.monthlyData.days).forEach(date => {
        state.monthlyData.days[date] = state.monthlyData.days[date].filter(
          att => att.id !== id
        );
      });
      state.successMessage = 'Asistencia eliminada correctamente';
      state.error = null;
    },
    deleteAttendanceFailure: (state, action) => {
      state.loading.deleting = false;
      state.error = action.payload;
      state.successMessage = null;
    },

    // UI actions
    setSelectedDate: (state, action) => {
      state.selectedDate = action.payload;
    },
    
    setSelectedStaff: (state, action) => {
      state.selectedStaff = action.payload;
    },
    
    setShowMarkingModal: (state, action) => {
      state.showMarkingModal = action.payload;
    },
    
    // Filter actions
    updateFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    
    // Error handling
    clearError: (state) => {
      state.error = null;
      state.successMessage = null;
    },
    
    // Reset state
    resetState: () => initialState
  }
});

export const {
  fetchMonthlyAttendanceRequest,
  fetchMonthlyAttendanceSuccess,
  fetchMonthlyAttendanceFailure,
  fetchYearlySummaryRequest,
  fetchYearlySummarySuccess,
  fetchYearlySummaryFailure,
  fetchAvailableYearsRequest,
  fetchAvailableYearsSuccess,
  fetchAvailableYearsFailure,
  markAttendanceRequest,
  markAttendanceSuccess,
  markAttendanceFailure,
  deleteAttendanceRequest,
  deleteAttendanceSuccess,
  deleteAttendanceFailure,
  setSelectedDate,
  setSelectedStaff,
  setShowMarkingModal,
  updateFilters,
  clearError,
  resetState
} = staffAttendanceSlice.actions;

export default staffAttendanceSlice.reducer;