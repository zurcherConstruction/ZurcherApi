import api from '../../utils/axios';
import {
  fetchWorksInMaintenanceRequest,
  fetchWorksInMaintenanceSuccess,
  fetchWorksInMaintenanceFailure,
  fetchMaintenanceVisitsByWorkRequest,
  fetchMaintenanceVisitsByWorkSuccess,
  fetchMaintenanceVisitsByWorkFailure,
  updateMaintenanceVisitRequest,
  updateMaintenanceVisitSuccess,
  updateMaintenanceVisitFailure,
  addMaintenanceMediaRequest,
  addMaintenanceMediaSuccess,
  addMaintenanceMediaFailure,
  deleteMaintenanceMediaRequest,
  deleteMaintenanceMediaSuccess,
  deleteMaintenanceMediaFailure,
} from '../Reducer/maintenanceReducer';

// Obtener todas las obras en mantenimiento
export const fetchWorksInMaintenance = () => async (dispatch) => {
  dispatch(fetchWorksInMaintenanceRequest());
  try {
    const response = await api.get('/work/maintenance');
    dispatch(fetchWorksInMaintenanceSuccess(response.data));
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || 'Error al obtener obras en mantenimiento';
    dispatch(fetchWorksInMaintenanceFailure(errorMessage));
  }
};

// Obtener visitas de mantenimiento para una obra específica
export const fetchMaintenanceVisitsByWork = (workId) => async (dispatch) => {
  dispatch(fetchMaintenanceVisitsByWorkRequest());
  try {
    const response = await api.get(`/maintenance/work/${workId}`);
    dispatch(fetchMaintenanceVisitsByWorkSuccess({ workId, visits: response.data }));
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || 'Error al obtener visitas de mantenimiento';
    dispatch(fetchMaintenanceVisitsByWorkFailure(errorMessage));
  }
};

// Actualizar una visita de mantenimiento
export const updateMaintenanceVisit = (visitId, visitData) => async (dispatch) => {
  dispatch(updateMaintenanceVisitRequest());
  try {
    const response = await api.put(`/maintenance/${visitId}`, visitData);
    dispatch(updateMaintenanceVisitSuccess(response.data.visit));
    return response.data;
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || 'Error al actualizar visita de mantenimiento';
    dispatch(updateMaintenanceVisitFailure(errorMessage));
    throw error;
  }
};

// Agregar archivos multimedia a una visita
export const addMaintenanceMedia = (visitId, files) => async (dispatch) => {
  dispatch(addMaintenanceMediaRequest());
  try {
    console.log('addMaintenanceMedia - visitId:', visitId);
    console.log('addMaintenanceMedia - files:', files);
    console.log('addMaintenanceMedia - files type:', typeof files);
    console.log('addMaintenanceMedia - files length:', files?.length);
    
    const formData = new FormData();
    
    // Convertir FileList a Array si es necesario
    const fileArray = Array.from(files || []);
    console.log('addMaintenanceMedia - fileArray:', fileArray);
    
    fileArray.forEach((file) => {
      console.log('addMaintenanceMedia - Agregando archivo:', file.name);
      formData.append('maintenanceFiles', file);
    });

    const response = await api.post(`/maintenance/${visitId}/media`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    dispatch(addMaintenanceMediaSuccess(response.data.visit));
    return response.data;
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || 'Error al subir archivos';
    dispatch(addMaintenanceMediaFailure(errorMessage));
    throw error;
  }
};

// Programar visitas de mantenimiento manualmente
export const scheduleMaintenanceVisits = (workId, startDate, forceReschedule = false) => async (dispatch) => {
  dispatch(updateMaintenanceVisitRequest()); // Reutilizamos el loading
  try {
    const response = await api.post(`/maintenance/work/${workId}/schedule`, {
      startDate: startDate || null,
      forceReschedule: forceReschedule
    });
    
    // Recargar las visitas después de programarlas
    dispatch(fetchMaintenanceVisitsByWork(workId));
    return response.data;
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || 'Error al programar visitas de mantenimiento';
    dispatch(updateMaintenanceVisitFailure(errorMessage));
    throw error;
  }
};

// Crear una visita individual de mantenimiento
export const createMaintenanceVisit = (workId, visitData) => async (dispatch) => {
  dispatch(updateMaintenanceVisitRequest()); // Reutilizamos el loading
  try {
    const response = await api.post(`/maintenance/work/${workId}/visit`, visitData);
    
    // Recargar las visitas después de crear una nueva
    dispatch(fetchMaintenanceVisitsByWork(workId));
    return response.data;
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || 'Error al crear visita de mantenimiento';
    dispatch(updateMaintenanceVisitFailure(errorMessage));
    throw error;
  }
};

// Inicializar mantenimiento histórico para obras antiguas
export const initializeHistoricalMaintenance = (workId, completionDate, generatePastVisits = true) => async (dispatch) => {
  dispatch(updateMaintenanceVisitRequest()); // Reutilizamos el loading
  try {
    const response = await api.post(`/maintenance/work/${workId}/initialize-historical`, {
      completionDate,
      generatePastVisits
    });
    
    // Recargar las visitas después de inicializar
    dispatch(fetchMaintenanceVisitsByWork(workId));
    return response.data;
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || 'Error al inicializar mantenimiento histórico';
    dispatch(updateMaintenanceVisitFailure(errorMessage));
    throw error;
  }
};

// Eliminar archivo multimedia
export const deleteMaintenanceMedia = (mediaId) => async (dispatch) => {
  dispatch(deleteMaintenanceMediaRequest());
  try {
    await api.delete(`/maintenance/media/${mediaId}`);
    dispatch(deleteMaintenanceMediaSuccess(mediaId));
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || 'Error al eliminar archivo';
    dispatch(deleteMaintenanceMediaFailure(errorMessage));
    throw error;
  }
};
