import api from '../../utils/axios';
import {
  fetchMonthlyInstallationsRequest,
  fetchMonthlyInstallationsSuccess,
  fetchMonthlyInstallationsFailure,
  fetchYearlySummaryRequest,
  fetchYearlySummarySuccess,
  fetchYearlySummaryFailure,
  fetchAvailableYearsRequest,
  fetchAvailableYearsSuccess,
  fetchAvailableYearsFailure,
} from '../Reducer/monthlyInstallationsReducer';

/**
 * Obtener instalaciones mensuales (works que pasaron a "covered")
 * @param {number} year - Año a consultar
 * @param {number} month - Mes a consultar (1-12, opcional)
 */
export const fetchMonthlyInstallations = (year, month) => async (dispatch) => {
  dispatch(fetchMonthlyInstallationsRequest());
  try {
    const queryParams = new URLSearchParams();
    if (year) queryParams.append('year', year);
    if (month) queryParams.append('month', month);
    
    console.log(`📊 Fetching monthly installations: year=${year}, month=${month || 'all'}`);
    const response = await api.get(`/monthly-installations?${queryParams.toString()}`);
    
    console.log('📊 Monthly installations response:', {
      totalInstallations: response.data.installations?.length || 0,
      year: response.data.year,
      month: response.data.month || 'all months',
      summary: response.data.summary
    });
    
    dispatch(fetchMonthlyInstallationsSuccess(response.data));
    return response.data;
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || 'Error al obtener las instalaciones mensuales';
    console.error('❌ fetchMonthlyInstallations error:', errorMessage);
    dispatch(fetchMonthlyInstallationsFailure(errorMessage));
    throw error;
  }
};

/**
 * Obtener resumen anual de instalaciones por mes
 * @param {number} year - Año a consultar
 */
export const fetchYearlySummary = (year) => async (dispatch) => {
  dispatch(fetchYearlySummaryRequest());
  try {
    const queryParams = new URLSearchParams();
    if (year) queryParams.append('year', year);
    
    const response = await api.get(`/monthly-installations/summary?${queryParams.toString()}`);
    dispatch(fetchYearlySummarySuccess(response.data));
    return response.data;
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || 'Error al obtener el resumen anual';
    console.error('❌ fetchYearlySummary error:', errorMessage);
    dispatch(fetchYearlySummaryFailure(errorMessage));
    throw error;
  }
};

/**
 * Obtener años disponibles con datos de instalaciones
 */
export const fetchAvailableYears = () => async (dispatch) => {
  dispatch(fetchAvailableYearsRequest());
  try {
    const response = await api.get('/monthly-installations/available-years');
    dispatch(fetchAvailableYearsSuccess(response.data.years));
    return response.data.years;
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || 'Error al obtener años disponibles';
    console.error('❌ fetchAvailableYears error:', errorMessage);
    dispatch(fetchAvailableYearsFailure(errorMessage));
    throw error;
  }
};
