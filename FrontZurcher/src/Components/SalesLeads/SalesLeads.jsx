import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  fetchLeads,
  updateLead,
  archiveLead,
  deleteLead
} from '../../Redux/Actions/salesLeadActions';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  PlusIcon,
  UserCircleIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  TagIcon,
  XCircleIcon,
  ArchiveBoxIcon,
  ArrowPathIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  BellIcon,
  PencilSquareIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import LeadNotesModal from './LeadNotesModal';
import EditLeadModal from './EditLeadModal';
import api from '../../utils/axios';

// 🔔 Componente de badge de alertas para leads
const LeadAlertBadge = ({ leadId, alertData, className = "h-5 w-5" }) => {
  if (!alertData) {
    return <ChatBubbleLeftRightIcon className={className} />;
  }

  const { unread, overdue, upcoming, hasOverdue, hasUnread, hasUpcoming, total } = alertData;

  // Determinar color del badge según prioridad
  let badgeColor = 'bg-gray-400';
  let shouldPulse = false;

  if (hasOverdue) {
    badgeColor = 'bg-red-500';
    shouldPulse = true;
  } else if (hasUnread) {
    badgeColor = 'bg-yellow-500';
    shouldPulse = false;
  } else if (hasUpcoming) {
    badgeColor = 'bg-green-500';
    shouldPulse = false;
  }

  const hasAnyAlert = hasUnread || hasOverdue || hasUpcoming;

  return (
    <div className="relative inline-block">
      <ChatBubbleLeftRightIcon className={className} />
      {hasAnyAlert && (
        <span
          className={`absolute -top-2 -right-2 ${badgeColor} text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center ${
            shouldPulse ? 'animate-pulse' : ''
          }`}
          title={
            hasOverdue 
              ? '¡Recordatorio vencido!' 
              : hasUnread 
              ? 'Notas no leídas' 
              : 'Recordatorio próximo'
          }
        >
          {total > 0 ? (total > 9 ? '9+' : total) : '!'}
        </span>
      )}
    </div>
  );
};

const STATUS_LABELS = {
  new: 'Nuevo',
  contacted: 'Contactado',
  interested: 'Interesado',
  quoted: 'Cotizado',
  negotiating: 'Negociando',
  won: 'Ganado',
  lost: 'Perdido',
  archived: 'Archivado'
};

const STATUS_COLORS = {
  new: 'bg-blue-100 text-blue-800',
  contacted: 'bg-cyan-100 text-cyan-800',
  interested: 'bg-green-100 text-green-800',
  quoted: 'bg-purple-100 text-purple-800 ring-2 ring-purple-400 font-bold',
  negotiating: 'bg-orange-100 text-orange-800',
  won: 'bg-emerald-100 text-emerald-800',
  lost: 'bg-red-100 text-red-800',
  archived: 'bg-gray-100 text-gray-800'
};

const PRIORITY_COLORS = {
  low: 'border-l-4 border-gray-300',
  medium: 'border-l-4 border-yellow-400',
  high: 'border-l-4 border-orange-500',
  urgent: 'border-l-4 border-red-600'
};

const SalesLeads = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  // Estados de Redux
  const { leads, loading, stats, total, page: reduxPage, pageSize: reduxPageSize, totalPages } = useSelector((state) => state.salesLeads);
  const { user, currentStaff } = useSelector((state) => state.auth);
  const staff = currentStaff || user;
  const userRole = staff?.role || '';

  // Verificar permisos
  const canAccess = ['admin', 'owner', 'recept', 'sales_rep', 'follow-up'].includes(userRole);

  // Estados locales
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  
  // Estados para modal de notas
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);

  // Estados para modal de edición
  const [showEditModal, setShowEditModal] = useState(false);
  const [leadToEdit, setLeadToEdit] = useState(null);

  // 🔔 Estados para alertas de notas
  const [leadAlerts, setLeadAlerts] = useState({});
  const [loadingAlerts, setLoadingAlerts] = useState(false);

  // Formato de fecha
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  };

  // Formato de fecha relativa (hace X días)
  const getRelativeTime = (dateString) => {
    if (!dateString) return "Nunca";
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Hoy";
    if (diffDays === 1) return "Ayer";
    if (diffDays < 7) return `Hace ${diffDays} días`;
    if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} semanas`;
    return `Hace ${Math.floor(diffDays / 30)} meses`;
  };

  // Debounce para búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Cargar leads cuando cambian filtros
  useEffect(() => {
    if (canAccess) {
      loadLeads();
    }
  }, [page, debouncedSearchTerm, statusFilter, priorityFilter, sourceFilter, canAccess]);

  const loadLeads = async () => {
    try {
      await dispatch(fetchLeads({
        page,
        pageSize,
        search: debouncedSearchTerm,
        status: statusFilter,
        priority: priorityFilter,
        source: sourceFilter
      }));
    } catch (error) {
      console.error('Error al cargar leads:', error);
    }
  };

  // 🔔 Cargar alertas de notas para todos los leads
  const loadLeadAlerts = async () => {
    setLoadingAlerts(true);
    try {
      const response = await api.get('/lead-notes/alerts/leads');
      const alertsMap = {};
      
      if (response.data && Array.isArray(response.data)) {
        response.data.forEach(alertInfo => {
          alertsMap[alertInfo.leadId] = alertInfo;
        });
      }
      
      setLeadAlerts(alertsMap);
    } catch (error) {
      console.error('Error al cargar alertas de leads:', error);
    } finally {
      setLoadingAlerts(false);
    }
  };

  // Cargar alertas al montar y cada 5 minutos
  useEffect(() => {
    if (canAccess) {
      loadLeadAlerts();
      
      const interval = setInterval(() => {
        loadLeadAlerts();
      }, 5 * 60 * 1000); // Cada 5 minutos
      
      return () => clearInterval(interval);
    }
  }, [canAccess]);

  // Handler para cambiar estado rápido
  const handleQuickStatusChange = async (leadId, newStatus) => {
    try {
      await dispatch(updateLead({ id: leadId, updates: { status: newStatus } }));
      loadLeads();
    } catch (error) {
      console.error('Error al actualizar estado:', error);
      alert('Error al actualizar el estado del lead');
    }
  };

  // Handler para archivar
  const handleArchive = async (leadId) => {
    if (!window.confirm('¿Archivar este lead?')) return;
    
    try {
      await dispatch(archiveLead(leadId));
      loadLeads();
    } catch (error) {
      console.error('Error al archivar lead:', error);
      alert('Error al archivar el lead');
    }
  };

  // Handler para eliminar permanentemente (solo admin/owner)
  const handleDelete = async (leadId, leadName) => {
    const confirmMessage = `⚠️ ELIMINAR PERMANENTEMENTE\n\nEsto eliminará "${leadName}" y todas sus notas asociadas.\n\n¿Estás seguro? Esta acción NO se puede deshacer.`;
    
    if (!window.confirm(confirmMessage)) return;
    
    // Doble confirmación
    const finalConfirm = window.confirm('¿Realmente deseas eliminar este lead permanentemente?');
    if (!finalConfirm) return;

    try {
      await dispatch(deleteLead(leadId));
      loadLeads();
      loadLeadAlerts();
    } catch (error) {
      console.error('Error al eliminar lead:', error);
      alert(error.response?.data?.error || 'Error al eliminar el lead');
    }
  };

  // Handler para abrir modal de notas
  const handleOpenNotes = (lead) => {
    setSelectedLead(lead);
    setShowNotesModal(true);
  };

  // Handler para cerrar modal de notas y recargar alertas
  const handleCloseNotesModal = () => {
    setShowNotesModal(false);
    setSelectedLead(null);
    // Recargar lista y alertas
    loadLeads();
    loadLeadAlerts();
  };

  // Handlers para modal de edición
  const handleOpenEdit = (lead) => {
    setLeadToEdit(lead);
    setShowEditModal(true);
  };

  const handleCloseEdit = () => {
    setShowEditModal(false);
    setLeadToEdit(null);
  };

  const handleSaveLead = async (leadId, formData) => {
    console.log('💾 Saving lead:', leadId, formData);
    await dispatch(updateLead({ id: leadId, updates: formData }));
    loadLeads();
    loadLeadAlerts();
  };

  if (!canAccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Acceso Denegado</h2>
          <p className="text-gray-600">No tienes permisos para acceder a esta sección.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
              <UserCircleIcon className="h-8 w-8 text-blue-600" />
              Sales Leads
            </h1>
            <p className="text-gray-600 mt-2">
              Lead management and sales pipeline tracking
            </p>
          </div>
          <button
            onClick={() => navigate('/sales-leads/new')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors shadow-lg hover:shadow-xl"
          >
            <PlusIcon className="h-5 w-5" />
            New Lead
         </button>
        </div>
      </div>

      {/* Estadísticas por Estado - Botones Clickeables */}
      {stats && Object.keys(stats).length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
          {Object.entries(stats).map(([status, count]) => {
            const isActive = statusFilter === status;
            return (
              <button
                key={status}
                onClick={() => { 
                  setStatusFilter(isActive ? 'all' : status); 
                  setPage(1); 
                }}
                className={`p-4 rounded-lg shadow border text-left transition-all cursor-pointer
                  ${isActive
                    ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-400'
                    : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-md'
                  }`}
              >
                <p className={`text-sm uppercase font-semibold ${isActive ? 'text-blue-700' : 'text-gray-600'}`}>
                  {STATUS_LABELS[status] || status}
                </p>
                <p className={`text-2xl font-bold ${isActive ? 'text-blue-600' : 'text-gray-800'}`}>
                  {count}
                </p>
              </button>
            );
          })}
          <button
            onClick={() => { 
              setStatusFilter('all'); 
              setPage(1); 
            }}
            className={`p-4 rounded-lg shadow border text-left transition-all cursor-pointer
              ${statusFilter === 'all'
                ? 'bg-blue-100 border-blue-500 ring-2 ring-blue-500'
                : 'bg-blue-50 border-blue-200 hover:border-blue-400 hover:shadow-md'
              }`}
          >
            <p className="text-sm text-blue-800 uppercase font-semibold">Total</p>
            <p className="text-2xl font-bold text-blue-600">{total || 0}</p>
          </button>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Búsqueda */}
          <div className="md:col-span-2">
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre, email, teléfono, dirección..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Filtro de estado */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos los estados</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {/* Filtro de prioridad */}
          <div>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todas las prioridades</option>
              <option value="low">Baja</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
              <option value="urgent">Urgente</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de Leads - Tabla Desktop */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading leads...</p>
        </div>
      ) : leads.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <UserCircleIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No leads found</h3>
          <p className="text-gray-600">Start by adding your first sales lead</p>
        </div>
      ) : (
        <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contacto</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dirección</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prioridad</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Última Actividad</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{lead.applicantName}</span>
                        {lead.status === 'quoted' && (
                          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-purple-500 text-white flex items-center gap-1 animate-pulse">
                            <DocumentTextIcon className="h-3 w-3" />
                            COTIZADO
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <div className="space-y-1">
                        {lead.applicantEmail && (
                          <div className="flex items-center gap-1">
                            <EnvelopeIcon className="h-3 w-3" />
                            <span className="truncate max-w-xs">{lead.applicantEmail}</span>
                          </div>
                        )}
                        {lead.applicantPhone && (
                          <div className="flex items-center gap-1">
                            <PhoneIcon className="h-3 w-3" />
                            <span>{lead.applicantPhone}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">
                      {lead.propertyAddress || 'N/A'}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={lead.status}
                        onChange={(e) => handleQuickStatusChange(lead.id, e.target.value)}
                        className={`px-2 py-1 text-xs font-medium rounded-full border-0 cursor-pointer focus:ring-2 focus:ring-blue-500 ${STATUS_COLORS[lead.status]}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {Object.entries(STATUS_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        lead.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                        lead.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                        lead.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {lead.priority === 'urgent' && '⚡ '}
                        {lead.priority.charAt(0).toUpperCase() + lead.priority.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {getRelativeTime(lead.lastActivityDate)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenNotes(lead)}
                          className="p-1 rounded hover:bg-blue-100 text-blue-600 transition-colors"
                          title="Ver Notas y Alertas"
                        >
                          <LeadAlertBadge
                            leadId={lead.id}
                            alertData={leadAlerts[lead.id]}
                            className="h-5 w-5"
                          />
                        </button>

                        {lead.status !== 'won' && lead.status !== 'archived' && (
                          <>
                            <button
                              onClick={() => handleOpenEdit(lead)}
                              className="p-1 rounded hover:bg-green-100 text-green-600 transition-colors"
                              title="Editar Lead"
                            >
                              <PencilSquareIcon className="h-5 w-5" />
                            </button>

                            <button
                              onClick={() => handleQuickStatusChange(lead.id, lead.status === 'lost' ? 'contacted' : 'lost')}
                              className="p-1 rounded hover:bg-red-100 text-red-600 transition-colors"
                              title={lead.status === 'lost' ? "Reactivar" : "Marcar como perdido"}
                            >
                              {lead.status === 'lost' ? <ArrowPathIcon className="h-5 w-5" /> : <XCircleIcon className="h-5 w-5" />}
                            </button>

                            <button
                              onClick={() => handleArchive(lead.id)}
                              className="p-1 rounded hover:bg-gray-100 text-gray-600 transition-colors"
                              title="Archivar"
                            >
                              <ArchiveBoxIcon className="h-5 w-5" />
                            </button>

                            {/* Eliminar permanentemente - Solo admin/owner */}
                            {(staff?.role === 'admin' || staff?.role === 'owner') && (
                              <button
                                onClick={() => handleDelete(lead.id, lead.customerName)}
                                className="p-1 rounded hover:bg-red-100 text-red-700 transition-colors"
                                title="Eliminar permanentemente (solo admin/owner)"
                              >
                                <TrashIcon className="h-5 w-5" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Anterior
          </button>
          <span className="px-4 py-2">
            Page {page} of {totalPages} ({total} leads)
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Siguiente
          </button>
        </div>
      )}

      {/* Modal de Notas */}
      {showNotesModal && selectedLead && (
        <LeadNotesModal
          lead={selectedLead}
          onClose={handleCloseNotesModal}
          onNoteRead={loadLeadAlerts}
        />
      )}

      {/* Modal de Edición */}
      {showEditModal && leadToEdit && (
        <EditLeadModal
          lead={leadToEdit}
          onClose={handleCloseEdit}
          onSave={handleSaveLead}
        />
      )}
    </div>
  );
};

export default SalesLeads;
