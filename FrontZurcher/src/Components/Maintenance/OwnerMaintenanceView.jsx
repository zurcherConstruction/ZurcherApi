import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  WrenchScrewdriverIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  DocumentTextIcon,
  UserIcon,
  HomeIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';
import api from '../../utils/axios';

const OwnerMaintenanceView = () => {
  const navigate = useNavigate();
  
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadingPdfId, setDownloadingPdfId] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    status: 'completed',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    loadCompletedVisits();
  }, [filters.status, filters.startDate, filters.endDate]);

  const loadCompletedVisits = async () => {
    try {
      setLoading(true);
      const params = {};
      
      if (filters.status) params.status = filters.status;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      const response = await api.get('/maintenance/completed', { params });
      console.log('📋 Visitas cargadas:', response.data);
      setVisits(response.data?.visits || []);
    } catch (error) {
      console.error('❌ Error loading visits:', error);
      toast.error(error.response?.data?.message || 'Error al cargar visitas');
      setVisits([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Sin fecha';
    // Parse como DATEONLY sin conversión de timezone
    const date = new Date(dateString + 'T12:00:00');
    return date.toLocaleDateString('es-ES', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getStatusBadge = (status) => {
    const badges = {
      completed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Completada' },
      assigned: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'En Proceso' },
      scheduled: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Programada' },
      pending_scheduling: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Pendiente' }
    };
    const badge = badges[status] || badges.pending_scheduling;
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  const handleViewVisit = (visit) => {
    // Navegar al detalle del mantenimiento (modo solo lectura para owner)
    navigate(`/maintenance/${visit.id}`, { 
      state: { 
        workId: visit.workId,
        readOnly: true // Para que el owner no pueda editar
      } 
    });
  };

  const handleDownloadPDF = async (visit) => {
    try {
      setDownloadingPdfId(visit.id);
      toast.info('Generando PDF...');

      const response = await api.get(`/maintenance/${visit.id}/download-pdf`, {
        responseType: 'blob' // Importante para recibir el archivo binario
      });

      // Crear un Blob a partir de la respuesta
      const blob = new Blob([response.data], { type: 'application/pdf' });
      
      // Crear un enlace temporal para descargar el archivo
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `mantenimiento_visita_${visit.visit_number || visit.id}.pdf`;
      
      // Simular clic en el enlace para iniciar la descarga
      document.body.appendChild(link);
      link.click();
      
      // Limpiar
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('PDF descargado correctamente');
    } catch (error) {
      console.error('❌ Error al descargar PDF:', error);
      toast.error(error.response?.data?.message || 'Error al descargar el PDF');
    } finally {
      setDownloadingPdfId(null);
    }
  };

  // Filtrar visitas localmente por búsqueda
  const filteredVisits = visits.filter(visit => {
    if (!filters.search) return true;
    
    const searchLower = filters.search.toLowerCase();
    return (
      visit.work?.propertyAddress?.toLowerCase().includes(searchLower) ||
      visit.work?.Permit?.applicantName?.toLowerCase().includes(searchLower) ||
      visit.work?.Permit?.systemType?.toLowerCase().includes(searchLower) ||
      visit.assignedStaff?.name?.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <WrenchScrewdriverIcon className="h-10 w-10 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Mantenimientos</h1>
              <p className="text-gray-600">Vista administrativa de todas las visitas</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/maintenance/calendar')}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 font-medium"
            >
              <CalendarIcon className="h-5 w-5" />
              Ver Calendario
            </button>
            <button
              onClick={() => navigate('/maintenance/works')}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2 font-medium"
            >
              <HomeIcon className="h-5 w-5" />
              Gestionar Obras
            </button>
            <div className="text-right">
              <p className="text-sm text-gray-500">Total de visitas</p>
              <p className="text-3xl font-bold text-blue-600">{filteredVisits.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Búsqueda */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <MagnifyingGlassIcon className="h-4 w-4 inline mr-1" />
              Buscar
            </label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              placeholder="Dirección, cliente, sistema, worker..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Fecha inicio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Desde
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Fecha fin */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hasta
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Lista de visitas */}
      {filteredVisits.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <WrenchScrewdriverIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No se encontraron visitas</p>
          <p className="text-gray-400 text-sm mt-2">Ajusta los filtros para ver más resultados</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredVisits.map((visit) => (
            <div 
              key={visit.id} 
              className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-5 border border-gray-200"
            >
              <div className="flex items-start justify-between">
                {/* Info principal */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-sm font-bold text-gray-500">Visita #{visit.visitNumber}</span>
                    {getStatusBadge(visit.status)}
                    {visit.work?.Permit?.isPBTS && (
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-purple-100 text-purple-800">
                        PBTS/ATU
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Dirección */}
                    <div className="flex items-start gap-2">
                      <HomeIcon className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">Propiedad</p>
                        <p className="text-sm font-semibold text-gray-800">
                          {visit.work?.propertyAddress || 'N/A'}
                        </p>
                      </div>
                    </div>

                    {/* Cliente */}
                    <div className="flex items-start gap-2">
                      <UserIcon className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">Cliente</p>
                        <p className="text-sm font-semibold text-gray-800">
                          {visit.work?.Permit?.applicantName || 'N/A'}
                        </p>
                      </div>
                    </div>

                    {/* Sistema */}
                    <div className="flex items-start gap-2">
                      <DocumentTextIcon className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">Sistema</p>
                        <p className="text-sm font-semibold text-gray-800">
                          {visit.work?.Permit?.systemType || 'N/A'}
                        </p>
                      </div>
                    </div>

                    {/* Fecha completada */}
                    <div className="flex items-start gap-2">
                      <CalendarIcon className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">Completada</p>
                        <p className="text-sm font-semibold text-gray-800">
                          {formatDate(visit.actualVisitDate)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Worker asignado */}
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-xs text-gray-500">Realizada por:</span>
                    <span className="text-sm font-medium text-blue-600">
                      {visit.assignedStaff?.name || visit.completedByStaff?.name || 'N/A'}
                    </span>
                    {visit.mediaFiles?.length > 0 && (
                      <span className="text-xs text-gray-500 ml-4">
                        📎 {visit.mediaFiles.length} archivo(s) adjunto(s)
                      </span>
                    )}
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex flex-col gap-2 ml-4">
                  <button
                    onClick={() => handleViewVisit(visit)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm font-medium"
                  >
                    <DocumentTextIcon className="h-4 w-4" />
                    Ver Detalle
                  </button>
                  <button
                    onClick={() => handleDownloadPDF(visit)}
                    disabled={downloadingPdfId === visit.id}
                    className={`px-4 py-2 ${
                      downloadingPdfId === visit.id 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-gray-600 hover:bg-gray-700'
                    } text-white rounded-lg transition-colors flex items-center gap-2 text-sm font-medium`}
                  >
                    {downloadingPdfId === visit.id ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        Generando...
                      </>
                    ) : (
                      <>
                        <ArrowDownTrayIcon className="h-4 w-4" />
                        Descargar PDF
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OwnerMaintenanceView;
