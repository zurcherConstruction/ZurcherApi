import api from '../../utils/axios';

import {
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
  deleteAttendanceFailure
} from '../Reducer/staffAttendanceReducer';

// Obtener asistencias mensuales
export const fetchMonthlyAttendance = ({ year, month }) => async (dispatch) => {
  dispatch(fetchMonthlyAttendanceRequest());
  try {
    console.log('📡 [fetchMonthlyAttendance] Llamando API:', year, month);
    const response = await api.get(`/staff-attendance/monthly?year=${year}&month=${month}`);
    console.log('✅ [fetchMonthlyAttendance] Respuesta:', response.data);
    dispatch(fetchMonthlyAttendanceSuccess(response.data.data || response.data));
  } catch (error) {
    console.error('Error fetching monthly attendance:', error);
    const errorMessage = error.response?.data?.message || error.message || 'Error al cargar asistencias mensuales';
    dispatch(fetchMonthlyAttendanceFailure(errorMessage));
  }
};

// Obtener resumen anual
export const fetchYearlySummary = ({ year, staffId = null }) => async (dispatch) => {
  dispatch(fetchYearlySummaryRequest());
  try {
    const params = new URLSearchParams({ year });
    if (staffId) {
      params.append('staffId', staffId);
    }
    const response = await api.get(`/staff-attendance/yearly-summary?${params}`);
    dispatch(fetchYearlySummarySuccess(response.data.data || response.data));
  } catch (error) {
    console.error('Error fetching yearly summary:', error);
    const errorMessage = error.response?.data?.message || error.message || 'Error al cargar resumen anual';
    dispatch(fetchYearlySummaryFailure(errorMessage));
  }
};

// Obtener años disponibles
export const fetchAvailableYears = () => async (dispatch) => {
  dispatch(fetchAvailableYearsRequest());
  try {
    console.log('📡 [fetchAvailableYears] Llamando API...');
    const response = await api.get('/staff-attendance/available-years');
    console.log('✅ [fetchAvailableYears] Respuesta:', response.data);
    // La respuesta viene como {success: true, data: {years: [...], count: X}}
    const yearsData = response.data.data?.years || response.data.years || [];
    dispatch(fetchAvailableYearsSuccess(yearsData));
  } catch (error) {
    console.error('Error fetching available years:', error);
    const errorMessage = error.response?.data?.message || error.message || 'Error al cargar años disponibles';
    dispatch(fetchAvailableYearsFailure(errorMessage));
  }
};

// Marcar asistencia
export const markAttendance = (attendanceData) => async (dispatch) => {
  dispatch(markAttendanceRequest());
  try {
    const response = await api.post('/staff-attendance/mark', attendanceData);
    dispatch(markAttendanceSuccess(response.data.data || response.data));
    
    // Refrescar datos mensuales después de marcar asistencia
    const { workDate } = attendanceData;
    const date = new Date(workDate);
    dispatch(fetchMonthlyAttendance({ 
      year: date.getFullYear(), 
      month: date.getMonth() + 1 
    }));
    
    return response.data;
  } catch (error) {
    console.error('Error marking attendance:', error);
    const errorMessage = error.response?.data?.message || error.message || 'Error al marcar asistencia';
    dispatch(markAttendanceFailure(errorMessage));
    throw error;
  }
};

// Eliminar asistencia
export const deleteAttendance = (attendanceId) => async (dispatch) => {
  dispatch(deleteAttendanceRequest());
  try {
    const response = await api.delete(`/staff-attendance/${attendanceId}`);
    dispatch(deleteAttendanceSuccess({ id: attendanceId, message: response.data.message }));
    return response.data;
  } catch (error) {
    console.error('Error deleting attendance:', error);
    const errorMessage = error.response?.data?.message || error.message || 'Error al eliminar asistencia';
    dispatch(deleteAttendanceFailure(errorMessage));
    throw error;
  }
};