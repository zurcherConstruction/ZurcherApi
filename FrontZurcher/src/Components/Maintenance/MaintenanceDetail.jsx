import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  fetchMaintenanceVisitsByWork,
  scheduleMaintenanceVisits,
  createMaintenanceVisit,
  initializeHistoricalMaintenance
} from '../../Redux/Actions/maintenanceActions.jsx';
import { fetchStaff } from '../../Redux/Actions/adminActions';
import { 
  setCurrentWorkDetail,
  clearCurrentWorkDetail
} from '../../Redux/Reducer/maintenanceReducer';
import VisitCard from './VisitCard';
import VisitForm from './VisitForm';
import LoadingSpinner from '../LoadingSpinner';
import Swal from 'sweetalert2';

const MaintenanceDetail = ({ work, isOpen, onClose }) => {
  const dispatch = useDispatch();
  const { 
    maintenanceVisitsByWorkId, 
    loadingVisits, 
    visitsLoadedForWork 
  } = useSelector(state => state.maintenance);
  
  const { staffList: staff, loading: staffLoading, error: staffError } = useSelector(state => state.admin);
  const { user } = useSelector(state => state.auth); // Usuario actual

  // Debug: Verificar datos del staff (temporal)
  if (staff.length > 0) {
    console.log('MaintenanceDetail - Staff cargado:', { 
      total: staff.length,
      workers: staff.filter(m => m.role === 'worker').length,
      workerNames: staff.filter(m => m.role === 'worker').map(w => w.name)
    });
  }

  const [selectedVisit, setSelectedVisit] = useState(null);
  const [showVisitForm, setShowVisitForm] = useState(false);

  const visits = maintenanceVisitsByWorkId[work.idWork] || [];

  useEffect(() => {
    // Cargar staff siempre (como en PendingWorks)
    dispatch(fetchStaff());
    
    if (work && !visitsLoadedForWork[work.idWork]) {
      dispatch(fetchMaintenanceVisitsByWork(work.idWork));
    }
    dispatch(setCurrentWorkDetail(work));

    return () => {
      dispatch(clearCurrentWorkDetail());
    };
  }, [work, dispatch, visitsLoadedForWork]);

  const handleVisitSelect = (visit) => {
    setSelectedVisit(visit);
    setShowVisitForm(true);
  };

  const handleCloseVisitForm = () => {
    setShowVisitForm(false);
    setSelectedVisit(null);
  };

  const handleScheduleVisits = async () => {
    const hasExistingVisits = visits.length > 0;
    
    const { value: formData } = await Swal.fire({
      title: hasExistingVisits ? 'Reprogramar Visitas de Mantenimiento' : 'Programar Visitas de Mantenimiento',
      html: `
        <div class="text-left">
          ${hasExistingVisits ? 
            '<p class="mb-4 text-orange-600 font-medium">⚠️ Esta obra ya tiene visitas programadas. Al continuar se eliminarán las visitas existentes.</p>' : 
            '<p class="mb-4 text-gray-600">Se programarán 4 visitas de mantenimiento cada 6 meses.</p>'
          }
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Fecha de inicio ${hasExistingVisits ? '(puede ser una fecha pasada)' : '(opcional)'}:
          </label>
          <input 
            type="date" 
            id="startDate" 
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value="${new Date().toISOString().split('T')[0]}"
          />
          <p class="mt-2 text-xs text-gray-500">
            ${hasExistingVisits ? 
              'Puedes programar fechas pasadas para obras que necesitan mantenimiento retroactivo.' :
              'Las visitas se programarán a partir de esta fecha cada 6 meses.'
            }
          </p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: hasExistingVisits ? 'Reprogramar Visitas' : 'Programar Visitas',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: hasExistingVisits ? '#f59e0b' : '#3b82f6',
      preConfirm: () => {
        const startDate = document.getElementById('startDate').value;
        return {
          startDate: startDate || null,
          forceReschedule: hasExistingVisits
        };
      }
    });

    if (formData !== undefined) {
      try {
        await dispatch(scheduleMaintenanceVisits(work.idWork, formData.startDate, formData.forceReschedule));
        
        Swal.fire({
          icon: 'success',
          title: hasExistingVisits ? 'Visitas Reprogramadas' : 'Visitas Programadas',
          text: `Las ${hasExistingVisits ? 'visitas han sido reprogramadas' : '4 visitas de mantenimiento han sido programadas'} correctamente.`,
          timer: 2000
        });
      } catch (error) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error || `Error al ${hasExistingVisits ? 'reprogramar' : 'programar'} las visitas de mantenimiento.`,
        });
      }
    }
  };

  const handleAddSingleVisit = async () => {
    // Debug: Mostrar estado actual del staff
    console.log('handleAddSingleVisit - Estado del staff:', {
      staff,
      staffLoading,
      staffError,
      staffLength: staff?.length
    });

    // Intentar cargar staff si no hay datos
    if (staff.length === 0 && !staffLoading) {
      console.log('Intentando cargar staff...');
      await dispatch(fetchStaff());
    }

    // Función para generar opciones de staff dinámicamente
    const generateStaffOptions = () => {
      const workers = staff.filter(member => member.role === 'worker');
      console.log('Workers filtrados:', workers);
      
      if (workers.length === 0) {
        return '<option value="">No hay trabajadores disponibles</option>';
      }
      
      return workers.map(worker => 
        `<option value="${worker.id}">${worker.name}</option>`
      ).join('');
    };

    const { value: formValues } = await Swal.fire({
      title: 'Agregar Nueva Visita',
      html: `
        <div class="text-left space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Fecha programada (opcional):
            </label>
            <input 
              type="date" 
              id="scheduledDate" 
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Asignar a trabajador (opcional):
            </label>
            ${staffLoading ? 
              '<p class="text-sm text-gray-500">Cargando miembros del staff...</p>' :
              staffError ? 
                `<p class="text-sm text-red-500">Error: ${staffError}</p>` :
                `<select 
                  id="assignedStaffId" 
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Sin asignar - Se asignará al usuario actual</option>
                  ${generateStaffOptions()}
                </select>`
            }
            <p class="text-xs text-gray-500 mt-1">
              Staff total: ${staff.length} | Workers: ${staff.filter(m => m.role === 'worker').length} | Estado: ${staffLoading ? 'Cargando' : staffError ? 'Error' : 'Cargado'}
            </p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Número de visita (opcional):
            </label>
            <input 
              type="number" 
              id="visitNumber" 
              min="1"
              placeholder="Se calculará automáticamente si no se especifica"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Notas (opcional):
            </label>
            <textarea 
              id="notes" 
              rows="3"
              placeholder="Notas adicionales sobre la visita"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            ></textarea>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Crear Visita',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const scheduledDate = document.getElementById('scheduledDate').value;
        const assignedStaffIdElement = document.getElementById('assignedStaffId');
        const assignedStaffId = assignedStaffIdElement ? assignedStaffIdElement.value : '';
        const visitNumber = document.getElementById('visitNumber').value;
        const notes = document.getElementById('notes').value;
        
        return {
          scheduledDate: scheduledDate || null,
          assignedStaffId: assignedStaffId || null, // null significa que usará el usuario actual
          visitNumber: visitNumber ? parseInt(visitNumber) : null,
          notes: notes || null
        };
      }
    });

    if (formValues) {
      try {
        const result = await dispatch(createMaintenanceVisit(work.idWork, formValues));
        
        const assignmentMessage = !formValues.assignedStaffId 
          ? ` Se asignó automáticamente a ${user?.name || 'tu usuario'}.`
          : '';
        
        Swal.fire({
          icon: 'success',
          title: 'Visita Creada',
          text: `La visita de mantenimiento ha sido creada correctamente.${assignmentMessage}`,
          timer: 3000
        });
      } catch (error) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error || 'Error al crear la visita de mantenimiento.',
        });
      }
    }
  };

  const handleInitializeHistoricalMaintenance = async () => {
    const { value: formData } = await Swal.fire({
      title: 'Inicializar Mantenimiento Histórico',
      html: `
        <div class="text-left space-y-4">
          <p class="mb-4 text-blue-600 font-medium">
            🏗️ Esta función es para obras completadas en el pasado que necesitan un plan de mantenimiento.
          </p>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Fecha de finalización de la obra: <span class="text-red-500">*</span>
            </label>
            <input 
              type="date" 
              id="completionDate" 
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div class="flex items-center space-x-2">
            <input 
              type="checkbox" 
              id="generatePastVisits" 
              checked
              class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label for="generatePastVisits" class="text-sm text-gray-700">
              Generar visitas vencidas para fechas pasadas
            </label>
          </div>
          <p class="text-xs text-gray-500">
            Se calcularán automáticamente las visitas que deberían haber ocurrido y las futuras pendientes.
            Las visitas vencidas se marcarán como "overdue" para seguimiento.
          </p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Inicializar Mantenimiento',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#059669',
      preConfirm: () => {
        const completionDate = document.getElementById('completionDate').value;
        const generatePastVisits = document.getElementById('generatePastVisits').checked;
        
        if (!completionDate) {
          Swal.showValidationMessage('La fecha de finalización es requerida');
          return false;
        }
        
        return {
          completionDate,
          generatePastVisits
        };
      }
    });

    if (formData) {
      try {
        const result = await dispatch(initializeHistoricalMaintenance(
          work.idWork, 
          formData.completionDate, 
          formData.generatePastVisits
        ));
        
        Swal.fire({
          icon: 'success',
          title: 'Mantenimiento Histórico Inicializado',
          html: `
            <div class="text-left">
              <p class="mb-2">✅ Mantenimiento inicializado correctamente.</p>
              <p class="text-sm text-gray-600">
                • Visitas vencidas: ${result.overdueVisits || 0}<br>
                • Visitas futuras: ${4 - (result.overdueVisits || 0)}<br>
                • Total de visitas creadas: ${result.visits.length}
              </p>
            </div>
          `,
          timer: 4000
        });
      } catch (error) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error || 'Error al inicializar el mantenimiento histórico.',
        });
      }
    }
  };

  const getVisitStatusSummary = () => {
    const completed = visits.filter(v => v.status === 'completed').length;
    const pending = visits.filter(v => v.status === 'pending_scheduling').length;
    const scheduled = visits.filter(v => v.status === 'scheduled').length;
    
    return { completed, pending, scheduled, total: visits.length };
  };

  const statusSummary = getVisitStatusSummary();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Mantenimiento - {work.propertyAddress}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Cliente: {work.budget?.applicantName || 'Sin nombre'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Resumen rápido */}
          <div className="mt-4 grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{statusSummary.completed}</div>
              <div className="text-xs text-gray-600">Completadas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{statusSummary.scheduled}</div>
              <div className="text-xs text-gray-600">Programadas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{statusSummary.pending}</div>
              <div className="text-xs text-gray-600">Pendientes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">{statusSummary.total}</div>
              <div className="text-xs text-gray-600">Total</div>
            </div>
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-6">
          {loadingVisits ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : visits.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-4">
                <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No hay visitas programadas
              </h3>
              <p className="text-gray-600 mb-6">
                Las visitas de mantenimiento deben ser programadas para esta obra.
              </p>
              <button
                onClick={handleScheduleVisits}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
              >
                <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Programar Visitas de Mantenimiento
              </button>
              
              <button
                onClick={handleAddSingleVisit}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors"
              >
                <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Agregar Visita Individual
              </button>
              
              <button
                onClick={handleInitializeHistoricalMaintenance}
                className="inline-flex items-center px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700 transition-colors"
              >
                <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.042A9.02 9.02 0 0 1 12 12a9.02 9.02 0 0 1 0 5.958c-.55.025-1.096.042-1.65.042C5.05 18 1 13.95 1 8.5S5.05-.5 10.35-.5c.554 0 1.1.017 1.65.042Z" />
                </svg>
                Mantenimiento Histórico
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {visits.map((visit) => (
                <VisitCard
                  key={visit.id}
                  visit={visit}
                  onClick={() => handleVisitSelect(visit)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between flex-shrink-0">
          <div className="flex space-x-3">
            {visits.length > 0 && (
              <>
                <button
                  onClick={handleScheduleVisits}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                >
                  + Reprogramar Visitas
                </button>
                <button
                  onClick={handleAddSingleVisit}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
                >
                  + Agregar Visita
                </button>
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>

      {/* Modal de formulario de visita */}
      {showVisitForm && selectedVisit && (
        <VisitForm
          visit={selectedVisit}
          isOpen={showVisitForm}
          onClose={handleCloseVisitForm}
        />
      )}
    </div>
  );
};

export default MaintenanceDetail;
