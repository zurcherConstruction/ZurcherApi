import React, { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { 
  WrenchScrewdriverIcon, 
  ClockIcon, 
  CheckCircleIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  HomeIcon,
  CalendarIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';
import api from '../../utils/axios';

const WorkerMaintenanceDashboard = () => {
  const navigate = useNavigate();
  const { user, currentStaff } = useSelector((state) => state.auth);
  const authStaff = currentStaff || user;
  
  const [maintenances, setMaintenances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending'); // pending, completed

  // ✅ FIX: Usar useMemo para evitar recalcular staffId en cada render
  const staffId = React.useMemo(() => authStaff?.idStaff || authStaff?.id, [authStaff?.idStaff, authStaff?.id]);
  
  // ✅ FIX: Prevenir llamadas duplicadas con useRef
  const isLoadingRef = useRef(false);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    console.log('🔧 MaintenanceDashboard - staffId:', staffId);
    console.log('🔧 MaintenanceDashboard - authStaff:', authStaff);
    
    // ✅ FIX: Solo cargar si no estamos ya cargando y tenemos staffId
    if (staffId && !isLoadingRef.current && !hasLoadedRef.current) {
      loadMaintenances();
    } else if (!staffId) {
      console.error('🔧 No staffId disponible');
      setLoading(false);
    }
  }, [staffId]);

  const loadMaintenances = async () => {
    // ✅ FIX: Prevenir llamadas concurrentes
    if (isLoadingRef.current) {
      console.log('⏸️ Ya hay una carga en progreso, omitiendo...');
      return;
    }

    try {
      isLoadingRef.current = true;
      setLoading(true);
      console.log('🔧 Llamando a /maintenance/assigned con workerId:', staffId);
      const response = await api.get('/maintenance/assigned', {
        params: { workerId: staffId }
      });
      console.log('📋 Mantenimientos cargados:', response.data);
      // El backend devuelve {message, visits, count}
      setMaintenances(response.data?.visits || []);
      hasLoadedRef.current = true; // ✅ Marcar como cargado exitosamente
    } catch (error) {
      console.error('❌ Error loading maintenances:', error);
      console.error('❌ Error response:', error.response?.data);
      toast.error(error.response?.data?.message || 'Error al cargar mantenimientos');
      setMaintenances([]);
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending_scheduling: 'bg-gray-100 text-gray-700 border-gray-300',
      scheduled: 'bg-blue-100 text-blue-700 border-blue-300',
      assigned: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      completed: 'bg-green-100 text-green-700 border-green-300',
      skipped: 'bg-red-100 text-red-700 border-red-300'
    };
    return colors[status] || colors.pending_scheduling;
  };

  const getStatusText = (status) => {
    const texts = {
      pending_scheduling: 'Pendiente',
      scheduled: 'Programada',
      assigned: 'Asignada',
      completed: 'Completada',
      skipped: 'Omitida'
    };
    return texts[status] || status;
  };

  const getStatusIcon = (status) => {
    const icons = {
      pending_scheduling: '⏳',
      scheduled: '📅',
      assigned: '👤',
      completed: '✅',
      skipped: '⏭️'
    };
    return icons[status] || '📋';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Sin fecha';
    // Parse como DATEONLY sin conversión de timezone
    const date = new Date(dateString + 'T12:00:00');
    return date.toLocaleDateString('es-ES', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const handleVisitClick = (visit) => {
    navigate(`/worker/maintenance/${visit.id}`, {
      state: { 
        workId: visit.workId,
        from: '/worker/maintenance' // ✅ Guardar ruta de origen
      }
    });
  };

  const pendingMaintenances = maintenances.filter(m => m.status !== 'completed' && m.status !== 'skipped');
  const completedMaintenances = maintenances.filter(m => m.status === 'completed' || m.status === 'skipped');

  const getMaintenancesByTab = () => {
    return activeTab === 'pending' ? pendingMaintenances : completedMaintenances;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <button
            onClick={() => navigate('/worker')}
            className="flex items-center text-white hover:text-blue-100 mb-3"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Volver
          </button>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">Mis Mantenimientos</h1>
              <p className="text-blue-100 text-sm mt-1">
                {authStaff?.name || 'Worker'}
              </p>
            </div>
            <WrenchScrewdriverIcon className="h-12 w-12 text-blue-200" />
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-4 text-center">
              <div className="text-3xl font-bold">{pendingMaintenances.length}</div>
              <div className="text-sm text-blue-100">Pendientes</div>
            </div>
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-4 text-center">
              <div className="text-3xl font-bold">{completedMaintenances.length}</div>
              <div className="text-sm text-blue-100">Completadas</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex space-x-1 border-b">
            <button
              onClick={() => setActiveTab('pending')}
              className={`flex-1 py-4 px-4 text-center font-medium transition-colors ${
                activeTab === 'pending'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <ClockIcon className="h-5 w-5 inline-block mr-2" />
              Pendientes ({pendingMaintenances.length})
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`flex-1 py-4 px-4 text-center font-medium transition-colors ${
                activeTab === 'completed'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <CheckCircleIcon className="h-5 w-5 inline-block mr-2" />
              Completadas ({completedMaintenances.length})
            </button>
          </div>
        </div>
      </div>

      {/* Maintenance List */}
      <div className="max-w-7xl mx-auto p-4">
        {getMaintenancesByTab().length === 0 ? (
          <div className="text-center py-12">
            <WrenchScrewdriverIcon className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg">
              {activeTab === 'pending' 
                ? 'No tienes mantenimientos pendientes' 
                : 'No tienes mantenimientos completados'}
            </p>
            <button
              onClick={loadMaintenances}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Actualizar
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {getMaintenancesByTab().map((visit) => {
              const permitData = visit.work?.Permit;
              
              return (
                <div
                  key={visit.id}
                  onClick={() => handleVisitClick(visit)}
                  className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer overflow-hidden border-l-4"
                  style={{ borderLeftColor: getStatusColor(visit.status).includes('gray') ? '#9CA3AF' : 
                                           getStatusColor(visit.status).includes('blue') ? '#3B82F6' :
                                           getStatusColor(visit.status).includes('yellow') ? '#F59E0B' :
                                           getStatusColor(visit.status).includes('green') ? '#10B981' : '#EF4444' }}
                >
                  <div className="p-5">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{getStatusIcon(visit.status)}</span>
                        <h3 className="font-bold text-lg text-gray-800">
                          Visita #{visit.visitNumber}
                        </h3>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(visit.status)}`}>
                        {getStatusText(visit.status)}
                      </span>
                    </div>

                    {/* Property Info */}
                    {permitData && (
                      <div className="bg-gray-50 rounded-lg p-3 mb-3 border-b-2 border-gray-100">
                        <div className="flex items-start gap-3">
                          <HomeIcon className="h-6 w-6 text-gray-600 flex-shrink-0 mt-1" />
                          <div className="flex-1">
                            <p className="text-xs text-gray-500 mb-1">Propiedad:</p>
                            <p className="font-semibold text-gray-800">
                              {permitData.propertyAddress || 'Sin dirección'}
                            </p>
                            {permitData.applicantName && (
                              <p className="text-sm text-gray-600 mt-1">
                                Cliente: {permitData.applicantName}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* System Type */}
                    {permitData?.systemType && (
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs text-gray-600">Sistema:</span>
                        <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-semibold">
                          {permitData.systemType}
                        </span>
                      </div>
                    )}

                    {/* Scheduled Date */}
                    {visit.scheduledDate && (
                      <div className="flex items-center gap-2 mb-3 text-sm text-gray-600">
                        <CalendarIcon className="h-4 w-4" />
                        <div>
                          <span className="text-xs text-gray-500">Fecha programada:</span>
                          <p className="font-semibold text-gray-800">{formatDate(visit.scheduledDate)}</p>
                        </div>
                      </div>
                    )}

                    {/* Notes Preview */}
                    {visit.notes && (
                      <div className="bg-gray-50 rounded-lg p-3 mb-3">
                        <p className="text-xs font-semibold text-gray-600 mb-1">Notas:</p>
                        <p className="text-sm text-gray-700 line-clamp-2">{visit.notes}</p>
                      </div>
                    )}

                    {/* CTA */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <span className="text-sm font-semibold text-blue-600">
                        {visit.status === 'completed' ? 'Ver detalles' : 'Completar inspección'}
                      </span>
                      <ArrowRightIcon className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkerMaintenanceDashboard;
