import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  fetchSimpleWorks,
  deleteSimpleWork,
  generateSimpleWorkPdf,
  viewSimpleWorkPdf,
  sendSimpleWorkToClient,
  markSimpleWorkAsCompleted,
  updateSimpleWork,
  clearSimpleWorkError,
  clearSimpleWorkSuccessMessage,
} from '../../Redux/Actions/simpleWorkActions';
import { fetchStaff } from '../../Redux/Actions/adminActions';
import AdvancedCreateSimpleWorkModal from './AdvancedCreateSimpleWorkModal';
import SimpleWorkPdfModal from './SimpleWorkPdfModal';
import { toast } from 'react-toastify';
import {
  WrenchScrewdriverIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  ArrowPathIcon,
  XMarkIcon,
  FunnelIcon,
  ChevronDownIcon,
  UserIcon,
  MapPinIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  ArrowDownTrayIcon,
  PencilSquareIcon,
  TrashIcon,
  BanknotesIcon,
  CurrencyDollarIcon,
  DocumentCheckIcon,
  PaperAirplaneIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import {
  WrenchScrewdriverIcon as WrenchSolid,
} from '@heroicons/react/24/solid';

// ── Config objects ──────────────────────────────────────────────────────
const STATUS_CONFIG = {
  quoted:      { label: 'Cotizado',       badge: 'bg-slate-100 text-slate-700 ring-slate-300',    icon: DocumentTextIcon },
  sent:        { label: 'Enviado',        badge: 'bg-sky-50 text-sky-700 ring-sky-200',           icon: PaperAirplaneIcon },
  invoiced:    { label: 'Facturado',      badge: 'bg-orange-50 text-orange-700 ring-orange-200',  icon: DocumentCheckIcon },
  paid:        { label: 'Pagado',         badge: 'bg-amber-50 text-amber-700 ring-amber-200',     icon: BanknotesIcon },
  completed:   { label: 'Terminado',      badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200', icon: CheckCircleIcon },
  cancelled:   { label: 'Cancelado',      badge: 'bg-red-50 text-red-600 ring-red-200',           icon: XMarkIcon },
  // Legacy
  quote_sent:  { label: 'Cotización Env.',badge: 'bg-sky-50 text-sky-700 ring-sky-200',           icon: PaperAirplaneIcon },
  approved:    { label: 'Aprobado',       badge: 'bg-cyan-50 text-cyan-700 ring-cyan-200',        icon: CheckCircleIcon },
  in_progress: { label: 'En Progreso',    badge: 'bg-violet-50 text-violet-700 ring-violet-200',  icon: WrenchScrewdriverIcon },
};

const TYPE_CONFIG = {
  culvert:       { label: 'Culvert',          color: 'text-blue-700 bg-blue-50' },
  drainfield:    { label: 'Drainfield',       color: 'text-teal-700 bg-teal-50' },
  concrete_work: { label: 'Concreto',         color: 'text-gray-700 bg-gray-100' },
  excavation:    { label: 'Excavación',       color: 'text-amber-700 bg-amber-50' },
  plumbing:      { label: 'Plomería',         color: 'text-cyan-700 bg-cyan-50' },
  electrical:    { label: 'Eléctrico',        color: 'text-yellow-700 bg-yellow-50' },
  landscaping:   { label: 'Paisajismo',       color: 'text-green-700 bg-green-50' },
  repair:        { label: 'Reparación',       color: 'text-orange-700 bg-orange-50' },
  maintenance:   { label: 'Mantenimiento',    color: 'text-purple-700 bg-purple-50' },
  other:         { label: 'Otro',             color: 'text-gray-600 bg-gray-50' },
};

const PAYMENT_STATUS = (work) => {
  const total = parseFloat(work.totalCost || work.finalAmount || work.estimatedAmount || 0);
  const paid  = parseFloat(work.totalPaid || 0);
  if (paid >= total && total > 0) return { label: 'Pagado', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200' };
  if (paid > 0) return { label: 'Parcial', badge: 'bg-amber-50 text-amber-700 ring-amber-200' };
  if (work.status !== 'quoted' && work.status !== 'sent') return { label: 'Sin Pago', badge: 'bg-red-50 text-red-600 ring-red-200' };
  return null;
};

// ── Helpers ──────────────────────────────────────────────────────────────
const getClientName = (work) => {
  if (work.clientData?.firstName) return `${work.clientData.firstName} ${work.clientData.lastName || ''}`.trim();
  if (work.clientData?.name) return work.clientData.name;
  if (work.firstName) return `${work.firstName} ${work.lastName || ''}`.trim();
  return 'Sin nombre';
};

const fmt = (n) => parseFloat(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ═════════════════════════════════════════════════════════════════════════
const SimpleWorkList = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { simpleWorks, loading, error, successMessage } = useSelector(s => s.simpleWork);
  const { staff } = useSelector(s => s.auth);
  const { staffList } = useSelector(s => s.admin);

  // Local state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingWork, setEditingWork] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ status: '', workType: '', search: '' });

  // PDF modal
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [pdfUrlForModal, setPdfUrlForModal] = useState('');
  const [pdfTitleForModal, setPdfTitleForModal] = useState('');

  // Loading states
  const [viewingPdfId, setViewingPdfId] = useState(null);
  const [sendingEmailId, setSendingEmailId] = useState(null);
  const [completingWorkId, setCompletingWorkId] = useState(null);
  const [assigningStaffId, setAssigningStaffId] = useState(null);

  // ── Effects ──
  useEffect(() => {
    dispatch(fetchSimpleWorks());
    dispatch(fetchStaff());
    return () => { if (pdfUrlForModal) URL.revokeObjectURL(pdfUrlForModal); };
  }, [dispatch]);

  useEffect(() => { if (successMessage) { toast.success(successMessage); dispatch(clearSimpleWorkSuccessMessage()); } }, [successMessage, dispatch]);
  useEffect(() => { if (error) { toast.error(error); dispatch(clearSimpleWorkError()); } }, [error, dispatch]);

  // ── Filtering (client-side) ──
  const filteredWorks = useMemo(() => {
    return (simpleWorks || []).filter(work => {
      if (filters.status && work.status !== filters.status) return false;
      if (filters.workType && work.workType !== filters.workType) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const searchable = [
          getClientName(work),
          work.propertyAddress,
          work.workNumber,
          work.workType,
          work.assignedStaff?.name,
        ].filter(Boolean).join(' ').toLowerCase();
        if (!searchable.includes(q)) return false;
      }
      return true;
    });
  }, [simpleWorks, filters]);

  const handleFilterChange = (field, value) => setFilters(prev => ({ ...prev, [field]: value }));
  const clearFilters = () => setFilters({ status: '', workType: '', search: '' });
  const hasActiveFilters = filters.status || filters.workType || filters.search;

  // ── Summary ──
  const summary = useMemo(() => {
    const all = simpleWorks || [];
    const fin = filteredWorks.reduce((a, w) => {
      a.quoted  += parseFloat(w.totalCost || w.finalAmount || w.estimatedAmount || 0);
      a.paid    += parseFloat(w.totalPaid || 0);
      a.expenses += parseFloat(w.totalExpenses || 0);
      return a;
    }, { quoted: 0, paid: 0, expenses: 0 });
    return {
      total: all.length,
      quoted: all.filter(w => w.status === 'quoted' || w.status === 'sent').length,
      inProgress: all.filter(w => ['approved', 'in_progress', 'invoiced', 'paid'].includes(w.status)).length,
      completed: all.filter(w => w.status === 'completed').length,
      cancelled: all.filter(w => w.status === 'cancelled').length,
      unassigned: all.filter(w => !w.assignedStaffId && !['completed', 'cancelled'].includes(w.status)).length,
      ...fin,
      profit: fin.paid - fin.expenses,
    };
  }, [simpleWorks, filteredWorks]);

  // ── Handlers ──
  const handleEditWork = (e, work) => { e.stopPropagation(); setEditingWork(work); setShowCreateModal(true); };

  const handleDeleteWork = async (e, workId) => {
    e.stopPropagation();
    if (window.confirm('¿Eliminar este trabajo? Esta acción no se puede deshacer.')) {
      try { await dispatch(deleteSimpleWork(workId)); } catch (_) {}
    }
  };

  const handleGeneratePdf = (e, workId) => { e.stopPropagation(); dispatch(generateSimpleWorkPdf(workId)); };

  const handleViewPdf = async (e, workId) => {
    e.stopPropagation();
    setViewingPdfId(workId);
    if (pdfUrlForModal) { URL.revokeObjectURL(pdfUrlForModal); setPdfUrlForModal(''); }
    try {
      const pdfUrl = await dispatch(viewSimpleWorkPdf(workId));
      setPdfUrlForModal(pdfUrl);
      setPdfTitleForModal(`Trabajo Simple #${workId}`);
      setIsPdfModalOpen(true);
    } catch { toast.error('Error al cargar PDF'); } finally { setViewingPdfId(null); }
  };

  const handleSendEmail = async (e, work) => {
    e.stopPropagation();
    const email = work.clientData?.email || work.email;
    if (!email) { toast.error('No hay email de cliente'); return; }
    if (!window.confirm(`¿Enviar trabajo #${work.workNumber} a ${email}?`)) return;
    setSendingEmailId(work.id);
    try {
      await dispatch(sendSimpleWorkToClient(work.id));
      toast.success(`Enviado a ${email}`);
      setTimeout(() => dispatch(fetchSimpleWorks()), 1000);
    } catch (err) { toast.error(`Error: ${err.message}`); } finally { setSendingEmailId(null); }
  };

  const handleMarkAsCompleted = async (e, work) => {
    e.stopPropagation();
    if (!window.confirm(`¿Marcar #${work.workNumber} como terminado?`)) return;
    setCompletingWorkId(work.id);
    try {
      await dispatch(markSimpleWorkAsCompleted(work.id));
      toast.success(`#${work.workNumber} marcado como terminado`);
      dispatch(fetchSimpleWorks());
    } catch (err) { toast.error(`Error: ${err.message}`); } finally { setCompletingWorkId(null); }
  };

  const handleAssignStaff = async (e, work, staffId) => {
    e.stopPropagation();
    setAssigningStaffId(work.id);
    try {
      await dispatch(updateSimpleWork(work.id, {
        assignedStaffId: staffId || null,
        ...(staffId ? { assignedDate: new Date().toISOString() } : {}),
      }));
      toast.success(staffId ? 'Staff asignado' : 'Staff desasignado');
      dispatch(fetchSimpleWorks());
    } catch { toast.error('Error asignando staff'); } finally { setAssigningStaffId(null); }
  };

  const handleClosePdfModal = () => {
    if (pdfUrlForModal) { URL.revokeObjectURL(pdfUrlForModal); setPdfUrlForModal(''); }
    setIsPdfModalOpen(false);
    setPdfTitleForModal('');
  };

  const handleCloseModal = () => { setShowCreateModal(false); setEditingWork(null); };

  // ── Loading state ──
  if (loading && (simpleWorks || []).length === 0) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto" />
          <p className="text-sm text-gray-500 mt-4">Cargando trabajos...</p>
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
              <div className="p-2 bg-blue-100 rounded-lg">
                <WrenchSolid className="h-6 w-6 text-blue-600" />
              </div>
              Trabajos Simples
            </h1>
            <p className="text-sm text-gray-500 mt-1 ml-12">
              {summary.total} total &middot; {filteredWorks.length} mostrados
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => dispatch(fetchSimpleWorks())}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition shadow-sm"
              title="Actualizar"
            >
              <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
            <button
              onClick={() => { setEditingWork(null); setShowCreateModal(true); }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition shadow-sm"
            >
              <PlusIcon className="h-4 w-4" />
              Nueva Cotización
            </button>
          </div>
        </div>

        {/* ── Summary Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {[
            { key: 'quoted',      label: 'Cotizados',   count: summary.quoted,      color: 'border-slate-300 bg-white',           textColor: 'text-slate-800', filterStatus: ['quoted', 'sent'] },
            { key: 'inProgress',  label: 'En Progreso', count: summary.inProgress,  color: 'border-violet-300 bg-violet-50/50',   textColor: 'text-violet-800', filterStatus: ['approved', 'in_progress', 'invoiced', 'paid'] },
            { key: 'completed',   label: 'Terminados',  count: summary.completed,   color: 'border-emerald-300 bg-emerald-50/50', textColor: 'text-emerald-800', filterStatus: ['completed'] },
            { key: 'total',       label: 'Total',       count: summary.total,       color: 'border-gray-300 bg-white',            textColor: 'text-gray-800', filterStatus: null },
            { key: 'unassigned',  label: 'Sin Asignar', count: summary.unassigned,  color: 'border-amber-300 bg-amber-50/50',     textColor: 'text-amber-800', filterStatus: null, isSpecial: true },
          ].map(card => (
            <button
              key={card.key}
              onClick={() => {
                if (!card.filterStatus) { clearFilters(); return; }
                if (card.isSpecial) return;
                const firstStatus = card.filterStatus[0];
                handleFilterChange('status', filters.status === firstStatus ? '' : firstStatus);
              }}
              className={`border rounded-xl p-3 text-center transition hover:shadow-md cursor-pointer ${card.color} ${
                card.filterStatus && card.filterStatus.includes(filters.status) ? 'ring-2 ring-blue-400 shadow-md' : ''
              }`}
            >
              <p className={`text-2xl font-bold ${card.textColor}`}>{card.count}</p>
              <p className="text-xs text-gray-500 font-medium mt-0.5">{card.label}</p>
            </button>
          ))}
        </div>

        {/* ── Financial Bar ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Cotizado',   value: summary.quoted,   color: 'text-gray-900', icon: CurrencyDollarIcon, iconBg: 'bg-slate-100', iconColor: 'text-slate-600' },
            { label: 'Cobrado',    value: summary.paid,     color: 'text-emerald-700', icon: BanknotesIcon, iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600' },
            { label: 'Gastos',     value: summary.expenses, color: 'text-red-600', icon: ExclamationCircleIcon, iconBg: 'bg-red-100', iconColor: 'text-red-600' },
            { label: 'Ganancia',   value: summary.profit,   color: summary.profit >= 0 ? 'text-emerald-700' : 'text-red-600', icon: CheckCircleIcon, iconBg: summary.profit >= 0 ? 'bg-emerald-100' : 'bg-red-100', iconColor: summary.profit >= 0 ? 'text-emerald-600' : 'text-red-600' },
          ].map(item => (
            <div key={item.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
              <div className={`p-2.5 rounded-lg ${item.iconBg}`}>
                <item.icon className={`h-5 w-5 ${item.iconColor}`} />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">{item.label}</p>
                <p className={`text-lg font-bold ${item.color}`}>${fmt(item.value)}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Search + Filters ── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="p-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Buscar por cliente, dirección, número, staff..."
                className="w-full pl-10 pr-10 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              />
              {filters.search && (
                <button onClick={() => handleFilterChange('search', '')} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <XMarkIcon className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border rounded-lg transition ${
                hasActiveFilters ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <FunnelIcon className="h-4 w-4" />
              Filtros
              {hasActiveFilters && (
                <span className="ml-1 inline-flex items-center justify-center h-5 w-5 rounded-full bg-blue-600 text-white text-xs font-bold">
                  {[filters.status, filters.workType].filter(Boolean).length}
                </span>
              )}
              <ChevronDownIcon className={`h-3.5 w-3.5 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="inline-flex items-center gap-1 px-3 py-2.5 text-sm text-gray-600 hover:text-blue-600 transition">
                <XMarkIcon className="h-4 w-4" />
                Limpiar
              </button>
            )}
          </div>
          {showFilters && (
            <div className="px-4 pb-4 pt-0 border-t border-gray-100">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Estado</label>
                  <select
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Todos los estados</option>
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Tipo</label>
                  <select
                    value={filters.workType}
                    onChange={(e) => handleFilterChange('workType', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Todos los tipos</option>
                    {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Table ── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {filteredWorks.length === 0 ? (
            <div className="p-16 text-center">
              <MagnifyingGlassIcon className="mx-auto h-12 w-12 text-gray-300" />
              <h3 className="mt-3 text-sm font-semibold text-gray-900">No se encontraron trabajos</h3>
              <p className="mt-1 text-sm text-gray-500">
                {hasActiveFilters ? 'Intenta ajustar los filtros.' : 'Comienza creando una nueva cotización.'}
              </p>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="mt-4 text-sm font-medium text-blue-600 hover:text-blue-700">
                  Limpiar filtros
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr className="bg-gray-50/80">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">#</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Cliente & Dirección</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tipo</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Monto</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Asignado</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredWorks.map((work) => {
                    const statusCfg = STATUS_CONFIG[work.status] || STATUS_CONFIG.quoted;
                    const StatusIcon = statusCfg.icon;
                    const typeCfg = TYPE_CONFIG[work.workType] || TYPE_CONFIG.other;
                    const paymentCfg = PAYMENT_STATUS(work);
                    const totalCost = parseFloat(work.totalCost || work.finalAmount || work.estimatedAmount || 0);
                    const totalPaid = parseFloat(work.totalPaid || 0);

                    return (
                      <tr
                        key={work.id}
                        className="hover:bg-blue-50/40 transition cursor-pointer group"
                        onClick={() => navigate(`/simple-works/${work.id}`)}
                      >
                        {/* Work Number */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className="text-sm font-semibold text-gray-900 font-mono">{work.workNumber || '—'}</span>
                        </td>

                        {/* Client & Address */}
                        <td className="px-4 py-3.5">
                          <div className="max-w-xs">
                            <div className="flex items-center gap-1.5">
                              <UserIcon className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                              <span className="text-sm font-medium text-gray-900 truncate">{getClientName(work)}</span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <MapPinIcon className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" />
                              <span className="text-xs text-gray-500 truncate" title={work.propertyAddress}>
                                {work.propertyAddress || 'Sin dirección'}
                              </span>
                            </div>
                            {(work.clientData?.email || work.email) && (
                              <p className="text-xs text-gray-400 mt-0.5 truncate">{work.clientData?.email || work.email}</p>
                            )}
                          </div>
                        </td>

                        {/* Type */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-md ${typeCfg.color}`}>
                            {typeCfg.label}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="space-y-1">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full ring-1 ${statusCfg.badge}`}>
                              <StatusIcon className="h-3.5 w-3.5" />
                              {statusCfg.label}
                            </span>
                            {paymentCfg && (
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ring-1 ${paymentCfg.badge}`}>
                                <BanknotesIcon className="h-3 w-3" />
                                {paymentCfg.label}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Amount */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">${fmt(totalCost)}</p>
                            {totalPaid > 0 && (
                              <p className="text-xs text-emerald-600 font-medium mt-0.5">
                                Pagado: ${fmt(totalPaid)}
                              </p>
                            )}
                            {totalPaid > 0 && totalPaid < totalCost && (
                              <p className="text-xs text-orange-500 mt-0.5">
                                Falta: ${fmt(totalCost - totalPaid)}
                              </p>
                            )}
                          </div>
                        </td>

                        {/* Assigned Staff */}
                        <td className="px-4 py-3.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <select
                            value={work.assignedStaffId || ''}
                            onChange={(e) => handleAssignStaff(e, work, e.target.value)}
                            disabled={assigningStaffId === work.id}
                            className={`text-sm border rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition w-full max-w-[160px] ${
                              work.assignedStaffId 
                                ? 'border-blue-200 bg-blue-50/50 text-blue-800 font-medium' 
                                : 'border-gray-200 bg-gray-50 text-gray-400 italic'
                            } ${assigningStaffId === work.id ? 'opacity-50' : ''}`}
                          >
                            <option value="">Sin asignar</option>
                            {(staffList || []).map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        </td>

                        {/* Date */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="space-y-0.5">
                            <p className="text-xs text-gray-500">
                              {new Date(work.createdAt).toLocaleDateString()}
                            </p>
                            {work.completedDate && (
                              <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                                <CheckCircleIcon className="h-3 w-3" />
                                {new Date(work.completedDate).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {/* View PDF */}
                            <button
                              onClick={(e) => handleViewPdf(e, work.id)}
                              disabled={viewingPdfId === work.id}
                              className="p-1.5 rounded-md text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition disabled:opacity-50"
                              title="Ver PDF"
                            >
                              {viewingPdfId === work.id
                                ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
                                : <DocumentTextIcon className="h-4 w-4" />
                              }
                            </button>

                            {/* Send Email */}
                            <button
                              onClick={(e) => handleSendEmail(e, work)}
                              disabled={sendingEmailId === work.id}
                              className="p-1.5 rounded-md text-gray-500 hover:text-sky-600 hover:bg-sky-50 transition disabled:opacity-50"
                              title="Enviar Email"
                            >
                              {sendingEmailId === work.id
                                ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-sky-600" />
                                : <EnvelopeIcon className="h-4 w-4" />
                              }
                            </button>

                            {/* Download PDF */}
                            <button
                              onClick={(e) => handleGeneratePdf(e, work.id)}
                              className="p-1.5 rounded-md text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition"
                              title="Descargar PDF"
                            >
                              <ArrowDownTrayIcon className="h-4 w-4" />
                            </button>

                            {/* Complete */}
                            {work.status !== 'completed' && work.status !== 'cancelled' && (
                              <button
                                onClick={(e) => handleMarkAsCompleted(e, work)}
                                disabled={completingWorkId === work.id}
                                className="p-1.5 rounded-md text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 transition disabled:opacity-50"
                                title="Marcar Terminado"
                              >
                                {completingWorkId === work.id
                                  ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-600" />
                                  : <CheckCircleIcon className="h-4 w-4" />
                                }
                              </button>
                            )}

                            {/* Edit */}
                            <button
                              onClick={(e) => handleEditWork(e, work)}
                              className="p-1.5 rounded-md text-gray-500 hover:text-amber-600 hover:bg-amber-50 transition"
                              title="Editar"
                            >
                              <PencilSquareIcon className="h-4 w-4" />
                            </button>

                            {/* Delete */}
                            {(staff?.role === 'admin' || staff?.role === 'manager') && (
                              <button
                                onClick={(e) => handleDeleteWork(e, work.id)}
                                className="p-1.5 rounded-md text-gray-500 hover:text-red-600 hover:bg-red-50 transition"
                                title="Eliminar"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Advanced Create/Edit Modal */}
      {showCreateModal && (
        <AdvancedCreateSimpleWorkModal
          isOpen={showCreateModal}
          onClose={handleCloseModal}
          editingWork={editingWork}
          onWorkCreated={() => dispatch(fetchSimpleWorks())}
        />
      )}

      {/* PDF Modal */}
      <SimpleWorkPdfModal
        isOpen={isPdfModalOpen}
        onClose={handleClosePdfModal}
        pdfUrl={pdfUrlForModal}
        title={pdfTitleForModal}
      />
    </div>
  );
};

export default SimpleWorkList;