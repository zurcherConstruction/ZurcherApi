import api from '../../utils/axios';
import {
  fetchMaterialsRequest,
  fetchMaterialsSuccess,
  fetchMaterialsFailure,
  createMaterialRequest,
  createMaterialSuccess,
  createMaterialFailure,
  updateMaterialRequest,
  updateMaterialSuccess,
  updateMaterialFailure,
} from '../Reducer/materialReducer';

// Obtener materiales por obra
export const fetchMaterialsByWork = (workId) => async (dispatch) => {
  dispatch(fetchMaterialsRequest());
  try {
    const response = await api.get(`/materials/work/${workId}`); // Ruta del backend
    dispatch(fetchMaterialsSuccess(response.data));
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || 'Error al obtener los materiales';
    dispatch(fetchMaterialsFailure(errorMessage));
  }
};

// Crear un material
export const createMaterial = (materialData) => async (dispatch) => {
  dispatch(createMaterialRequest());
  try {
    const response = await api.post('/materials', materialData); // Ruta del backend
    dispatch(createMaterialSuccess(response.data));
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || 'Error al crear el material';
    dispatch(createMaterialFailure(errorMessage));
  }
};

// Actualizar un material
export const updateMaterial = (id, materialData) => async (dispatch) => {
  dispatch(updateMaterialRequest());
  try {
    const response = await api.put(`/materials/${id}`, materialData); // Ruta del backend
    dispatch(updateMaterialSuccess(response.data));
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || 'Error al actualizar el material';
    dispatch(updateMaterialFailure(errorMessage));
  }
};