import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { fetchWorks } from "../../Redux/Actions/workActions";
import { 
  BriefcaseIcon, 
  WrenchScrewdriverIcon,
  ClockIcon,
  CheckCircleIcon,
  PhotoIcon
} from "@heroicons/react/24/outline";

const WorkerDashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { works, loading, error } = useSelector((state) => state.work);
  const { user, currentStaff } = useSelector((state) => state.auth);
  const authStaff = currentStaff || user;

  const [activeTab, setActiveTab] = useState('assigned'); // assigned, inProgress, completed

  useEffect(() => {
    dispatch(fetchWorks());
  }, [dispatch]);

  // Obtener el ID del staff (puede ser 'id' o 'idStaff' dependiendo de la estructura)
  const staffId = authStaff?.idStaff || authStaff?.id;

  // Filtrar trabajos asignados al worker actual
  const myWorks = works.filter(work => work.staffId === staffId);

  // Separar por estado
  const assignedWorks = myWorks.filter(w => w.status === 'assigned');
  const inProgressWorks = myWorks.filter(w => w.status === 'inProgress');
  const completedWorks = myWorks.filter(w => 
    ['installed', 'coverPending', 'covered', 'invoiceFinal', 'paymentReceived', 'maintenance'].includes(w.status)
  );

  const getWorksByTab = () => {
    switch(activeTab) {
      case 'assigned': return assignedWorks;
      case 'inProgress': return inProgressWorks;
      case 'completed': return completedWorks;
      default: return assignedWorks;
    }
  };

  const getStatusDisplay = (status) => {
    const statusMap = {
      assigned: { label: 'Asignado', color: 'bg-blue-100 text-blue-800' },
      inProgress: { label: 'En Progreso', color: 'bg-yellow-100 text-yellow-800' },
      installed: { label: 'Instalado', color: 'bg-green-100 text-green-800' },
      coverPending: { label: 'Pendiente Cobertura', color: 'bg-orange-100 text-orange-800' },
      covered: { label: 'Cubierto', color: 'bg-green-100 text-green-800' },
      maintenance: { label: 'Mantenimiento', color: 'bg-purple-100 text-purple-800' },
    };
    return statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-800' };
  };

  const handleWorkClick = (workId) => {
    navigate(`/worker/work/${workId}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Error: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-6 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold mb-2">Mis Trabajos</h1>
              <p className="text-green-100">Bienvenido, {authStaff?.name}</p>
            </div>
            {/* Botón de Mantenimientos */}
            <button
              onClick={() => navigate('/worker/maintenance')}
              className="flex items-center gap-2 bg-white bg-opacity-20 hover:bg-opacity-30 backdrop-blur-sm px-4 py-2 rounded-lg transition-colors"
            >
              <WrenchScrewdriverIcon className="h-5 w-5" />
              <span className="font-semibold">Mantenimientos</span>
            </button>
          </div>
          
          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-4 text-center">
              <div className="text-3xl font-bold">{assignedWorks.length}</div>
              <div className="text-sm text-green-100">Asignados</div>
            </div>
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-4 text-center">
              <div className="text-3xl font-bold">{inProgressWorks.length}</div>
              <div className="text-sm text-green-100">En Progreso</div>
            </div>
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-4 text-center">
              <div className="text-3xl font-bold">{completedWorks.length}</div>
              <div className="text-sm text-green-100">Completados</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex space-x-1 border-b">
            <button
              onClick={() => setActiveTab('assigned')}
              className={`flex-1 py-4 px-4 text-center font-medium transition-colors ${
                activeTab === 'assigned'
                  ? 'border-b-2 border-green-600 text-green-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <BriefcaseIcon className="h-5 w-5 inline-block mr-2" />
              Asignados ({assignedWorks.length})
            </button>
            <button
              onClick={() => setActiveTab('inProgress')}
              className={`flex-1 py-4 px-4 text-center font-medium transition-colors ${
                activeTab === 'inProgress'
                  ? 'border-b-2 border-green-600 text-green-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <ClockIcon className="h-5 w-5 inline-block mr-2" />
              En Progreso ({inProgressWorks.length})
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`flex-1 py-4 px-4 text-center font-medium transition-colors ${
                activeTab === 'completed'
                  ? 'border-b-2 border-green-600 text-green-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <CheckCircleIcon className="h-5 w-5 inline-block mr-2" />
              Completados ({completedWorks.length})
            </button>
          </div>
        </div>
      </div>

      {/* Work List */}
      <div className="max-w-7xl mx-auto p-4">
        {getWorksByTab().length === 0 ? (
          <div className="text-center py-12">
            <BriefcaseIcon className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg">
              No tienes trabajos en esta categoría
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {getWorksByTab().map((work) => {
              const statusInfo = getStatusDisplay(work.status);
              return (
                <div
                  key={work.idWork}
                  onClick={() => handleWorkClick(work.idWork)}
                  className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer overflow-hidden"
                >
                  <div className="p-5">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="font-bold text-lg text-gray-800 mb-1">
                          {work.propertyAddress || 'Sin dirección'}
                        </h3>
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </div>
                    </div>

                    {/* Client Info */}
                    {work.Permit && (
                      <div className="bg-gray-50 rounded-lg p-3 mb-3">
                        <p className="text-sm text-gray-600">
                          <span className="font-semibold">Cliente:</span> {work.Permit.applicantName || 'N/A'}
                        </p>
                        {work.Permit.applicantEmail && (
                          <p className="text-sm text-gray-600">
                            <span className="font-semibold">Email:</span> {work.Permit.applicantEmail}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Dates */}
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <div className="flex items-center">
                        <ClockIcon className="h-4 w-4 mr-1" />
                        {work.startDate 
                          ? new Date(work.startDate).toLocaleDateString('es-ES')
                          : 'Sin fecha de inicio'
                        }
                      </div>
                      {work.images && work.images.length > 0 && (
                        <div className="flex items-center text-green-600">
                          <PhotoIcon className="h-4 w-4 mr-1" />
                          {work.images.length} foto{work.images.length !== 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer - Quick Actions */}
                  <div className="bg-gray-50 px-5 py-3 border-t border-gray-100">
                    <div className="flex justify-end">
                      <button className="text-green-600 hover:text-green-700 font-medium text-sm">
                        Ver detalles →
                      </button>
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

export default WorkerDashboard;
