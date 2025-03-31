import api from '../../utils/axios';

import {
  fetchStaffRequest,
  fetchStaffSuccess,
  fetchStaffFailure,
  createStaffRequest,
  createStaffSuccess,
  createStaffFailure,
  updateStaffRequest,
  updateStaffSuccess,
  updateStaffFailure,
  deactivateStaffRequest,
  deactivateStaffSuccess,
  deactivateStaffFailure,
  deleteStaffSuccess
} from '../Reducer/adminReducer';

// Obtener todos los staff
export const fetchStaff = () => async (dispatch) => {
  dispatch(fetchStaffRequest());
  try {
    const response = await api.get('/admin/staff/'); // Ruta del backend
    console.log('Respuesta del backend:', response.data); // Log para depuración

    const transformedData = Array.isArray(response.data.data)
      ? response.data.data.map((staff) => ({
          id: staff.id,
          name: staff.name || 'No especificado',
          email: staff.email || 'No especificado',
          phone: staff.phone || 'No especificado',
          role: staff.role || 'No especificado',
          isActive: staff.isActive,
          lastLogin: staff.lastLogin || 'No registrado',
          lastLogout: staff.lastLogout || 'No registrado',
          createdAt: staff.createdAt,
          updatedAt: staff.updatedAt,
        }))
      : [];

    dispatch(fetchStaffSuccess(transformedData));
  } catch (error) {
    const errorMessage =
      error.response?.status === 404
        ? 'No se encontraron registros de staff.'
        : error.response?.data?.message || 'Error al obtener el listado de staff';
    console.error('Error al obtener el staff:', errorMessage); // Log para depuración
    dispatch(fetchStaffFailure(errorMessage));
  }
};
// Crear un nuevo staff
export const createStaff = (staffData) => async (dispatch) => {
  dispatch(createStaffRequest());
  try {
    const response = await api.post('/admin/staff/', staffData); // Ruta del backend
    dispatch(createStaffSuccess(response.data.data));
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || 'Error al crear el staff';
    dispatch(createStaffFailure(errorMessage));
  }
};

// Actualizar un staff
export const updateStaff = (id, staffData) => async (dispatch) => {
  dispatch(updateStaffRequest());
  try {
    const response = await api.put(`/admin/staff/${id}`, staffData); // Ruta del backend
    dispatch(updateStaffSuccess(response.data.data));
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || 'Error al actualizar el staff';
    dispatch(updateStaffFailure(errorMessage));
  }
};

// Desactivar o eliminar un staff
export const deactivateOrDeleteStaff = (id, action) => async (dispatch) => {
  dispatch(deactivateStaffRequest());
  try {
    if (action === "delete") {
      // Usar DELETE para eliminar
      await api.delete(`/admin/staff/${id}`);
      dispatch(deleteStaffSuccess(id)); // Despachar acción específica para eliminar
    } else if (action === "deactivate") {
      // Usar POST para desactivar
      await api.post(`/admin/staff/${id}/deactivate`, { action });
      dispatch(deactivateStaffSuccess(id)); // Actualizar el estado global para desactivación
    }
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || "Error al procesar la solicitud";
    dispatch(deactivateStaffFailure(errorMessage));
  }
};