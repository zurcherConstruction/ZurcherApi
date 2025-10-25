import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { 
  fetchWorksInMaintenance
} from '../../Redux/Actions/maintenanceActions.jsx';
import { 
  setMaintenanceFilters,
  clearMaintenanceError 
} from '../../Redux/Reducer/maintenanceReducer';
import MaintenanceWorkCard from './MaintenanceWorkCard';
import MaintenanceDetail from './MaintenanceDetail';
import LoadingSpinner from '../LoadingSpinner';
import Swal from 'sweetalert2';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

const MaintenanceList = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { 
    worksInMaintenance, 
    loading, 
    error, 
    filters,
    currentWorkDetail 
  } = useSelector(state => state.maintenance);

  const [selectedWork, setSelectedWork] = useState(null);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    dispatch(fetchWorksInMaintenance());
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error,
      });
      dispatch(clearMaintenanceError());
    }
  }, [error, dispatch]);

  const handleSearchChange = (e) => {
    dispatch(setMaintenanceFilters({ search: e.target.value }));
  };

  const handleStatusFilterChange = (e) => {
    dispatch(setMaintenanceFilters({ status: e.target.value }));
  };

  const handleWorkSelect = (work) => {
    setSelectedWork(work);
    setShowDetail(true);
  };

  const handleCloseDetail = () => {
    setShowDetail(false);
    setSelectedWork(null);
  };

  // Filtrar obras según los filtros aplicados
  const filteredWorks = worksInMaintenance.filter(work => {
    const matchesSearch = !filters.search || 
      work.propertyAddress?.toLowerCase().includes(filters.search.toLowerCase()) ||
      work.budget?.applicantName?.toLowerCase().includes(filters.search.toLowerCase());
    
    const matchesStatus = filters.status === 'all' || work.status === filters.status;
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/maintenance')}
          className="flex items-center text-blue-600 hover:text-blue-800 mb-3 font-medium"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          Volver a Visitas Completadas
        </button>
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Gestión de Obras en Mantenimiento
        </h1>
        <p className="text-gray-600">
          Administra las obras y programa las visitas de mantenimiento
        </p>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Búsqueda */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Buscar obra
            </label>
            <input
              type="text"
              value={filters.search}
              onChange={handleSearchChange}
              placeholder="Dirección o nombre del cliente..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filtro de estado */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estado
            </label>
            <select
              value={filters.status}
              onChange={handleStatusFilterChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos los estados</option>
              <option value="maintenance">En mantenimiento</option>
              <option value="maintenance_completed">Mantenimiento completado</option>
            </select>
          </div>

          {/* Estadísticas rápidas */}
          <div className="flex flex-col justify-center">
            <div className="text-sm text-gray-600">
              <span className="font-semibold">{filteredWorks.length}</span> obras encontradas
            </div>
            <div className="text-sm text-gray-600">
              <span className="font-semibold">{worksInMaintenance.length}</span> total en mantenimiento
            </div>
          </div>
        </div>
      </div>

      {/* Lista de obras */}
      {filteredWorks.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No hay obras en mantenimiento
          </h3>
          <p className="text-gray-600">
            {filters.search || filters.status !== 'all' 
              ? 'No se encontraron obras que coincidan con los filtros aplicados.'
              : 'Aún no hay obras que requieran mantenimiento.'
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredWorks.map((work) => (
            <MaintenanceWorkCard
              key={work.idWork}
              work={work}
              onSelect={() => handleWorkSelect(work)}
            />
          ))}
        </div>
      )}

      {/* Modal de detalle */}
      {showDetail && selectedWork && (
        <MaintenanceDetail
          work={selectedWork}
          isOpen={showDetail}
          onClose={handleCloseDetail}
        />
      )}
    </div>
  );
};

export default MaintenanceList;
