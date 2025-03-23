import api from '../../utils/axios';
import {
  fetchInspectionsRequest,
  fetchInspectionsSuccess,
  fetchInspectionsFailure,
  createInspectionRequest,
  createInspectionSuccess,
  createInspectionFailure,
  updateInspectionRequest,
  updateInspectionSuccess,
  updateInspectionFailure,
} from '../Reducer/inspectionReducer';

// Obtener inspecciones por obra
export const fetchInspectionsByWork = (workId) => async (dispatch) => {
  dispatch(fetchInspectionsRequest());
  try {
    const response = await api.get(`/inspections/work/${workId}`); // Ruta del backend
    dispatch(fetchInspectionsSuccess(response.data));
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || 'Error al obtener las inspecciones';
    dispatch(fetchInspectionsFailure(errorMessage));
  }
};

// Crear una inspección
export const createInspection = (inspectionData) => async (dispatch) => {
  dispatch(createInspectionRequest());
  try {
    const response = await api.post('/inspections', inspectionData); // Ruta del backend
    dispatch(createInspectionSuccess(response.data));
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || 'Error al crear la inspección';
    dispatch(createInspectionFailure(errorMessage));
  }
};

// Actualizar una inspección
export const updateInspection = (id, inspectionData) => async (dispatch) => {
  dispatch(updateInspectionRequest());
  try {
    const response = await api.put(`/inspections/${id}`, inspectionData); // Ruta del backend
    dispatch(updateInspectionSuccess(response.data));
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || 'Error al actualizar la inspección';
    dispatch(updateInspectionFailure(errorMessage));
  }
};