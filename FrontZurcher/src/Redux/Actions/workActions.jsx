import api from '../../utils/axios';
import {
  fetchWorksRequest,
  fetchWorksSuccess,
  fetchWorksFailure,
  fetchWorkByIdRequest,
  fetchWorkByIdSuccess,
  fetchWorkByIdFailure,
  createWorkRequest,
  createWorkSuccess,
  createWorkFailure,
  updateWorkRequest,
  updateWorkSuccess,
  updateWorkFailure,
  addInstallationDetailRequest,
  addInstallationDetailSuccess,
  addInstallationDetailFailure,
  deleteWorkRequest,
  deleteWorkSuccess,
  deleteWorkFailure,
} from '../Reducer/workReducer';

// Obtener todas las obras
export const fetchWorks = () => async (dispatch) => {
  dispatch(fetchWorksRequest());
  try {
    const response = await api.get('/work'); // Ruta del backend
    dispatch(fetchWorksSuccess(response.data));
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || 'Error al obtener las obras';
    dispatch(fetchWorksFailure(errorMessage));
  }
};

// Obtener una obra por ID
export const fetchWorkById = (idWork) => async (dispatch) => {
  dispatch(fetchWorkByIdRequest());
  try {
    const response = await api.get(`/work/${idWork}`, { timeout: 30000 }); // Ruta del backend
    dispatch(fetchWorkByIdSuccess(response.data));
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || 'Error al obtener la obra';
    dispatch(fetchWorkByIdFailure(errorMessage));
  }
};

// Crear una obra
export const createWork = (workData) => async (dispatch) => {
  dispatch(createWorkRequest());
  try {
    const response = await api.post('/work', workData); // Ruta del backend
    dispatch(createWorkSuccess(response.data)); // Actualizar el estado global con el nuevo Work
    return response.data; // Devolver el Work creado
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || 'Error al crear la obra';
    dispatch(createWorkFailure(errorMessage));
    throw error; // Lanzar el error para manejarlo en el componente
  }
};

// Actualizar una obra
export const updateWork = (idWork, workData) => async (dispatch) => {
  dispatch(updateWorkRequest());
  try {
    console.log('Enviando datos al backend:', { idWork, workData });
    
    const response = await api.put(`/work/${idWork}`, workData);
    
    // Verificar si la respuesta es exitosa
    if (response.data) {
      console.log('Trabajo actualizado:', response.data);
      dispatch(updateWorkSuccess(response.data));
      
      if (workData.staffId && workData.startDate) {
        // Verificar el estado actualizado después de un breve delay
        setTimeout(async () => {
          try {
            const verificationResponse = await api.get(`/work/${idWork}`);
            if (verificationResponse.data.staffId === workData.staffId) {
              dispatch(updateWorkSuccess(verificationResponse.data));
            }
          } catch (verifyError) {
            console.log('Verificación silenciosa fallida:', verifyError);
          }
        }, 1000);

        return {
          success: true,
          data: response.data,
          message: 'Trabajo asignado correctamente'
        };
      }
      
      return response.data;
    }
  } catch (error) {
    console.error('Error al actualizar la obra:', error);
    
    // Si es un error de timeout pero la operación podría haber sido exitosa
    if (error.code === 'ECONNABORTED') {
      try {
        // Intentar verificar si la actualización fue exitosa
        const verificationResponse = await api.get(`/work/${idWork}`);
        if (verificationResponse.data.staffId === workData.staffId) {
          dispatch(updateWorkSuccess(verificationResponse.data));
          return {
            success: true,
            data: verificationResponse.data,
            message: 'Trabajo asignado correctamente (verificado)'
          };
        }
      } catch (verifyError) {
        console.log('Error en verificación:', verifyError);
      }
    }
    
    const errorMessage = error.code === 'ECONNABORTED' 
      ? 'La operación tomó más tiempo de lo esperado, pero podría haber sido exitosa. Por favor, verifique.' 
      : error.response?.data?.message || 'Error al actualizar la obra';
    
    dispatch(updateWorkFailure(errorMessage));
    throw new Error(errorMessage);
  }
};

// Eliminar una obra
export const deleteWork = (idWork) => async (dispatch) => {
  dispatch(deleteWorkRequest());
  try {
    await api.delete(`/work/${idWork}`); // Ruta del backend
    dispatch(deleteWorkSuccess(idWork));
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || 'Error al eliminar la obra';
    dispatch(deleteWorkFailure(errorMessage));
  }
};
export const addInstallationDetail = (idWork, installationData) => async (dispatch) => {
  dispatch(addInstallationDetailRequest());
  try {
    const response = await api.post(`/work/${idWork}/installation-details`, installationData);

    dispatch(addInstallationDetailSuccess(response.data)); // Despacha los datos recibidos
    return response.data; // Devuelve los datos para usarlos en el componente
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || "Error al agregar el detalle de instalación";
    dispatch(addInstallationDetailFailure(errorMessage));
    throw error; // Lanza el error para manejarlo en el componente
  }
};
export const attachInvoiceToWork = (idWork, file, totalCost) => async (dispatch) => {
  dispatch(updateWorkRequest()); // Indicar que estamos actualizando
  try {
    // Crear un FormData para enviar el archivo y los datos adicionales
    const formData = new FormData();
    formData.append('invoiceFile', file); // Archivo de la factura
    formData.append('totalCost', totalCost); // Costo total

    console.log('Enviando datos al backend:', { idWork, file, totalCost }); // Log para depuración

    // Enviar la solicitud al backend
    const response = await api.put(`/work/${idWork}/invoice`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data', // Indicar que es un formulario
      },
    });

    console.log('Respuesta del backend:', response.data); // Log para depuración
    dispatch(updateWorkSuccess(response.data)); // Actualizar el estado global con los datos de la obra
    return response.data; // Devolver los datos para usarlos en el componente
  } catch (error) {
    console.error('Error al adjuntar la factura:', error); // Log para depuración
    const errorMessage =
      error.response?.data?.message || 'Error al adjuntar la factura';
    dispatch(updateWorkFailure(errorMessage)); // Despachar el error al estado global
    throw error; // Lanzar el error para manejarlo en el componente
  }
};