import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  updateMaintenanceVisit,
  addMaintenanceMedia,
  deleteMaintenanceMedia,
  fetchMaintenanceVisitsByWork
} from '../../Redux/Actions/maintenanceActions.jsx';
import { fetchStaff } from '../../Redux/Actions/adminActions';
import { resetLoadingStates } from '../../Redux/Reducer/maintenanceReducer';
import { normalizeDateForInput } from '../../utils/dateHelpers';
import MediaUpload from './MediaUpload';
import MediaGallery from './MediaGallery';
import Swal from 'sweetalert2';

const VisitForm = ({ visit, isOpen, onClose }) => {
  const dispatch = useDispatch();
  const { loadingAction, uploadingMedia } = useSelector(state => state.maintenance);
  const { staffList: staff = [] } = useSelector(state => state.admin);

  const [formData, setFormData] = useState({
    scheduledDate: '',
    actualVisitDate: '',
    notes: '',
    status: 'pending_scheduling',
    staffId: null
  });

  const [showMediaUpload, setShowMediaUpload] = useState(false);

  // Resetear estado cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      console.log('🔵 [VISIT FORM] Modal abierto, estado inicial de loadingAction:', loadingAction);
      // Si loadingAction está en true, resetear todos los estados de loading
      if (loadingAction) {
        console.warn('⚠️ [VISIT FORM] loadingAction estaba en true al abrir modal, reseteando...');
        dispatch(resetLoadingStates());
      }
    }
  }, [isOpen, loadingAction, dispatch]);

  useEffect(() => {
    if (visit) {
      setFormData({
        scheduledDate: normalizeDateForInput(visit.scheduledDate),
        actualVisitDate: normalizeDateForInput(visit.actualVisitDate),
        notes: visit.notes || '',
        status: visit.status || 'pending_scheduling',
        staffId: visit.staffId || null
      });
      
      console.log('🔵 [VISIT FORM] Fechas normalizadas:', {
        original_scheduledDate: visit.scheduledDate,
        normalized_scheduledDate: normalizeDateForInput(visit.scheduledDate),
        original_actualVisitDate: visit.actualVisitDate,
        normalized_actualVisitDate: normalizeDateForInput(visit.actualVisitDate)
      });
    }
  }, [visit]);

  useEffect(() => {
    dispatch(fetchStaff());
  }, [dispatch]);

  // Debug logging para staff
  useEffect(() => {
    console.log('VisitForm - Staff state:', staff);
    console.log('VisitForm - Workers filtrados:', staff.filter(member => member.role === 'worker'));
    console.log('VisitForm - Visit prop:', visit);
    if (visit) {
      console.log('VisitForm - Visit ID:', visit.id, 'Type:', typeof visit.id);
    }
  }, [staff, visit]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleStatusChange = (newStatus) => {
    setFormData(prev => ({
      ...prev,
      status: newStatus,
      // Si se marca como completada, poner fecha actual si no tiene
      actualVisitDate: newStatus === 'completed' && !prev.actualVisitDate 
        ? (() => {
            const now = new Date();
            return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
          })()
        : prev.actualVisitDate
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    console.log('🔵 [VISIT FORM] ==================== INICIO handleSubmit ====================');
    console.log('🔵 [VISIT FORM] Timestamp:', new Date().toISOString());
    console.log('🔵 [VISIT FORM] formData:', JSON.stringify(formData, null, 2));
    console.log('🔵 [VISIT FORM] visit completo:', JSON.stringify(visit, null, 2));
    console.log('🔵 [VISIT FORM] visit.id:', visit?.id, 'Type:', typeof visit?.id);
    console.log('🔵 [VISIT FORM] loadingAction actual:', loadingAction);

    // Validaciones
    if (formData.status === 'completed' && !formData.actualVisitDate) {
      console.log('⚠️ [VISIT FORM] Validación fallida: completed sin actualVisitDate');
      Swal.fire({
        icon: 'warning',
        title: 'Fecha requerida',
        text: 'Debe especificar la fecha en que se realizó la visita.',
      });
      return;
    }

    if (formData.status === 'scheduled' && !formData.scheduledDate) {
      console.log('⚠️ [VISIT FORM] Validación fallida: scheduled sin scheduledDate');
      Swal.fire({
        icon: 'warning',
        title: 'Fecha requerida',
        text: 'Debe especificar la fecha programada para la visita.',
      });
      return;
    }

    try {
      // Validar que tenemos un ID válido
      if (!visit || !visit.id) {
        console.error('❌ [VISIT FORM] No se encontró visit.id');
        throw new Error('No se encontró el ID de la visita');
      }

      console.log('✅ [VISIT FORM] Validaciones pasadas, iniciando dispatch');
      console.log('✅ [VISIT FORM] Actualizando visita con ID:', visit.id);
      
      // Preparar datos asegurando que las fechas estén en formato YYYY-MM-DD
      const dataToSend = {
        ...formData,
        scheduledDate: formData.scheduledDate || null,
        actualVisitDate: formData.actualVisitDate || null,
        staffId: formData.staffId || null
      };
      
      console.log('📤 [VISIT FORM] Datos a enviar:', JSON.stringify(dataToSend, null, 2));
      
      const result = await dispatch(updateMaintenanceVisit(visit.id, dataToSend));

      console.log('✅ [VISIT FORM] Visita actualizada exitosamente:', result);
      console.log('🔵 [VISIT FORM] loadingAction después del dispatch:', loadingAction);

      Swal.fire({
        icon: 'success',
        title: 'Visita actualizada',
        text: 'La información de la visita ha sido actualizada correctamente.',
        timer: 2000
      });

      onClose();
    } catch (error) {
      console.error('❌ [VISIT FORM] ==================== ERROR ====================');
      console.error('❌ [VISIT FORM] Error completo:', error);
      console.error('❌ [VISIT FORM] Error.message:', error.message);
      console.error('❌ [VISIT FORM] Error.response:', error.response);
      console.error('❌ [VISIT FORM] Error.response.data:', error.response?.data);
      console.error('❌ [VISIT FORM] Error.response.status:', error.response?.status);
      console.error('❌ [VISIT FORM] Stack trace:', error.stack);
      
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error?.response?.data?.message || error?.message || 'Error al actualizar la visita.',
      });
    } finally {
      console.log('🔵 [VISIT FORM] ==================== FIN handleSubmit ====================');
    }
  };

  const handleMediaUpload = async (files) => {
    console.log('=== INICIO handleMediaUpload ===');
    console.log('VisitForm - handleMediaUpload ejecutándose...');
    try {
      // Validar que tenemos un ID válido
      if (!visit || !visit.id) {
        throw new Error('No se encontró el ID de la visita');
      }

      console.log('VisitForm - Subiendo media para visita ID:', visit.id);
      console.log('VisitForm - Files recibidos:', files);
      
      const result = await dispatch(addMaintenanceMedia(visit.id, files));
      console.log('VisitForm - Resultado de addMaintenanceMedia:', result);

      // Actualizar la visita localmente para mostrar los nuevos archivos
      if (result && result.visit) {
        // Si el resultado incluye la visita actualizada, la podemos usar
        console.log('VisitForm - Visita actualizada recibida:', result.visit);
      }

      Swal.fire({
        icon: 'success',
        title: 'Archivos subidos',
        text: `${files.length} archivo(s) subido(s) correctamente.`,
        timer: 2000
      });

      setShowMediaUpload(false);
      
      // Recargar los datos de la visita para mostrar los archivos subidos
      console.log('VisitForm - Recargando datos de la obra:', visit.workId);
      await dispatch(fetchMaintenanceVisitsByWork(visit.workId));
    } catch (error) {
      console.error('=== ERROR en handleMediaUpload ===');
      console.error('Error completo:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      
      Swal.fire({
        icon: 'error',
        title: 'Error al subir archivos',
        text: error.message || error || 'Error desconocido al subir los archivos.',
      });
    }
  };

  const handleMediaDelete = async (mediaId) => {
    const result = await Swal.fire({
      title: '¿Eliminar archivo?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      try {
        await dispatch(deleteMaintenanceMedia({
          mediaId,
          visitId: visit.id
        }));

        Swal.fire({
          icon: 'success',
          title: 'Archivo eliminado',
          timer: 1500
        });
        
        // Recargar los datos de la visita
        await dispatch(fetchMaintenanceVisitsByWork(visit.workId));
      } catch (error) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error || 'Error al eliminar el archivo.',
        });
      }
    }
  };

  const getStatusOptions = () => [
    { value: 'pending_scheduling', label: 'Pendiente de programar', color: 'text-gray-600' },
    { value: 'scheduled', label: 'Programada', color: 'text-blue-600' },
    { value: 'assigned', label: 'Asignada', color: 'text-yellow-600' },
    { value: 'completed', label: 'Completada', color: 'text-green-600' },
    { value: 'skipped', label: 'Omitida', color: 'text-red-600' }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">
              Gestionar Visita #{visit.visitNumber}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="overflow-y-auto max-h-[calc(95vh-140px)]">
          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Estado de la visita */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Estado de la visita
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {getStatusOptions().map(option => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleStatusChange(option.value)}
                      className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                        formData.status === option.value
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fechas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha programada
                  </label>
                  <input
                    type="date"
                    name="scheduledDate"
                    value={formData.scheduledDate}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha real de visita
                  </label>
                  <input
                    type="date"
                    name="actualVisitDate"
                    value={formData.actualVisitDate}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Asignación de personal */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Asignar a personal (Maintenance o Worker)
                </label>
                <select
                  name="staffId"
                  value={formData.staffId || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Sin asignar</option>
                  {staff
                    .filter(member => member.role === 'worker' || member.role === 'maintenance')
                    .map(member => (
                      <option key={member.id} value={member.id}>
                        {member.name} ({member.role === 'maintenance' ? 'Maintenance' : 'Worker'})
                      </option>
                    ))
                  }
                </select>
                {formData.staffId && (
                  <p className="mt-1 text-xs text-gray-500">
                    Esta persona recibirá la tarea en su app móvil
                  </p>
                )}
              </div>

              {/* Notas */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notas de la visita
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows={4}
                  placeholder="Escriba aquí los detalles de la visita, observaciones, recomendaciones..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Sección de multimedia */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Documentos y fotos
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowMediaUpload(!showMediaUpload)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                  >
                    {showMediaUpload ? 'Cancelar' : 'Subir archivos'}
                  </button>
                </div>

                {/* Upload component */}
                {showMediaUpload && (
                  <div className="mb-6">
                    <MediaUpload
                      onUpload={handleMediaUpload}
                      isUploading={uploadingMedia}
                    />
                  </div>
                )}

                {/* Gallery component */}
                <MediaGallery
                  mediaFiles={visit.mediaFiles || []}
                  onDelete={handleMediaDelete}
                  isDeleting={loadingAction}
                />
              </div>

              {/* Botones de acción */}
              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loadingAction}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {loadingAction ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VisitForm;
