import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchWorks, deleteWork } from "../../Redux/Actions/workActions"; // Acción para obtener y eliminar works
import { useNavigate } from "react-router-dom";
import { 
  BuildingOfficeIcon, 
  MapPinIcon, 
  EyeIcon,
  ClockIcon,
  TrashIcon
} from '@heroicons/react/24/outline';

const Works = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  // Obtener works desde el estado de Redux
  const { works, loading, error } = useSelector((state) => state.work);

  // Cargar works al montar el componente
  useEffect(() => {
    dispatch(fetchWorks()); // Cargar los works desde el backend
  }, [dispatch]);

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return '✅';
      case 'in_progress': return '🔄';
      case 'pending': return '⏳';
      case 'cancelled': return '❌';
      default: return '📋';
    }
  };

  const handleDeleteWork = async (work) => {
    const confirmMessage = `⚠️ ADVERTENCIA: Eliminación en Cascada\n\n` +
      `Se eliminará el trabajo "${work.propertyAddress}" y TODOS los registros asociados:\n\n` +
      `🏗️ Work ID: ${work.idWork}\n` +
      `📋 Budget asociado (si existe)\n` +
      `📄 Permit asociado y sus documentos\n` +
      `🧱 Todos los materiales y sets de materiales\n` +
      `🔍 Todas las inspecciones\n` +
      `📸 Todas las imágenes\n` +
      `💰 Todos los ingresos y gastos\n` +
      `📎 Todos los comprobantes (Receipts)\n` +
      `📝 Change Orders y Final Invoice\n` +
      `🔧 Visitas de mantenimiento\n` +
      `📊 Detalles de instalación\n\n` +
      `Esta acción NO se puede deshacer.\n\n` +
      `¿Estás seguro de que deseas continuar?`;
    
    if (window.confirm(confirmMessage)) {
      try {
        const result = await dispatch(deleteWork(work.idWork));
        
        // Construir mensaje de éxito con el resumen de eliminación
        if (result && result.deleted) {
          const { deleted } = result;
          let successMessage = `✅ Trabajo "${work.propertyAddress}" eliminado exitosamente\n\n📊 Resumen de eliminación:\n\n`;
          
          if (deleted.images > 0) successMessage += `📸 Imágenes: ${deleted.images}\n`;
          if (deleted.receipts > 0) successMessage += `🧾 Receipts: ${deleted.receipts}\n`;
          if (deleted.materials > 0) successMessage += `🔨 Materiales: ${deleted.materials}\n`;
          if (deleted.inspections > 0) successMessage += `🔍 Inspecciones: ${deleted.inspections}\n`;
          if (deleted.incomes > 0) successMessage += `💰 Ingresos: ${deleted.incomes}\n`;
          if (deleted.expenses > 0) successMessage += `💸 Gastos: ${deleted.expenses}\n`;
          if (deleted.materialSets > 0) successMessage += `📦 Material Sets: ${deleted.materialSets}\n`;
          if (deleted.changeOrders > 0) successMessage += `📝 Change Orders: ${deleted.changeOrders}\n`;
          if (deleted.maintenanceVisits > 0) successMessage += `🔧 Visitas de Mantenimiento: ${deleted.maintenanceVisits}\n`;
          
          alert(successMessage);
        } else {
          alert('✅ Trabajo y todos sus datos asociados eliminados exitosamente');
        }
        
        dispatch(fetchWorks()); // Recargar la lista
      } catch (error) {
        console.error('Error al eliminar work:', error);
        alert(`❌ Error al eliminar: ${error.message || 'Error desconocido'}`);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
        <div className="flex items-center gap-4">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
            <BuildingOfficeIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Construction Works</h1>
            <p className="text-gray-600">Manage and monitor all active projects</p>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-4 text-lg text-gray-600">Loading projects...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
          <div className="flex items-center">
            <div className="text-red-500 text-xl mr-3">❌</div>
            <div>
              <h3 className="text-red-800 font-semibold">Error Loading Projects</h3>
              <p className="text-red-600">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Works Content */}
      {!loading && !error && (
        <>
          {works.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
              <BuildingOfficeIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">No Projects Found</h3>
              <p className="text-gray-500">No construction projects available at the moment.</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden lg:block bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                          <div className="flex items-center gap-2">
                            <MapPinIcon className="w-4 h-4" />
                            Property Address
                          </div>
                        </th>
                        <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider">
                          <div className="flex items-center justify-center gap-2">
                            <ClockIcon className="w-4 h-4" />
                            Status
                          </div>
                        </th>
                        <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {works.map((work, index) => (
                        <tr 
                          key={work.idWork} 
                          className={`hover:bg-gray-50 transition-colors duration-200 ${
                            index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                          }`}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-md">
                                <BuildingOfficeIcon className="w-5 h-5 text-white" />
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{work.propertyAddress}</p>
                                <p className="text-sm text-gray-500">Project ID: {work.idWork}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(work.status)}`}>
                              <span>{getStatusIcon(work.status)}</span>
                              {work.status || 'Unknown'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => navigate(`/work/${work.idWork}`)}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300 font-medium shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                              >
                                <EyeIcon className="w-4 h-4" />
                                View Details
                              </button>
                              <button
                                onClick={() => handleDeleteWork(work)}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-300 font-medium shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                                title="Eliminar trabajo y todos sus datos"
                              >
                                <TrashIcon className="w-4 h-4" />
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile Cards */}
              <div className="block lg:hidden space-y-4">
                {works.map((work) => (
                  <div
                    key={work.idWork}
                    className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                  >
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md">
                        <BuildingOfficeIcon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate mb-1">
                          {work.propertyAddress}
                        </h3>
                        <p className="text-sm text-gray-500 mb-2">Project ID: {work.idWork}</p>
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(work.status)}`}>
                          <span>{getStatusIcon(work.status)}</span>
                          {work.status || 'Unknown'}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate(`/work/${work.idWork}`)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-300 font-medium shadow-md hover:shadow-lg"
                      >
                        <EyeIcon className="w-4 h-4" />
                        View Details
                      </button>
                      <button
                        onClick={() => handleDeleteWork(work)}
                        className="px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-300 font-medium shadow-md hover:shadow-lg"
                        title="Eliminar trabajo"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default Works;