import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom'; // ✅ AGREGAR
import {
  fetchBudgets,
  fetchBudgetById,
  deleteBudget,
  updateBudget,
  downloadSignedBudget
} from '../../Redux/Actions/budgetActions';
import {
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  FunnelIcon,
  CalendarDaysIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import { Worker, Viewer } from '@react-pdf-viewer/core';
import api from '../../utils/axios';
import '@react-pdf-viewer/core/lib/styles/index.css';

const GestionBudgets = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate(); // ✅ AGREGAR
  const {
    budgets,
    loading,
    error,
    currentBudget,  // Agregar este selector
    total: totalRecords,     // ✅ Total de registros del backend (renombrado para evitar conflicto)
    page: currentPage,           // ✅ Página actual del backend
    pageSize: currentPageSize,   // ✅ Tamaño de página del backend
    stats: statsFromBackend      // 🆕 Estadísticas desde el backend
  } = useSelector(state => state.budget);

  // ✅ Estados para paginación local
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Estados para filtros y búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(''); // ✅ Debounced search
  const [statusFilter, setStatusFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState(null);
  const [showSignedPdfModal, setShowSignedPdfModal] = useState(false);
  const [signedPdfUrl, setSignedPdfUrl] = useState(null);
  const [downloadingSignedPdf, setDownloadingSignedPdf] = useState(false);
  
  // Estados para reemplazar PDFs del Permit
  const [showReplacePermitPdfModal, setShowReplacePermitPdfModal] = useState(false);
  const [showReplaceOptionalDocsModal, setShowReplaceOptionalDocsModal] = useState(false);
  const [newPermitPdfFile, setNewPermitPdfFile] = useState(null);
  const [newOptionalDocsFile, setNewOptionalDocsFile] = useState(null);
  const [uploadingPermitPdf, setUploadingPermitPdf] = useState(false);
  const [uploadingOptionalDocs, setUploadingOptionalDocs] = useState(false);

  // ✅ useEffect para debounce del searchTerm (esperar 500ms después de que el usuario deje de escribir)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setPage(1); // Resetear a primera página al buscar
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  // ✅ useEffect para resetear a página 1 cuando cambien los filtros
  useEffect(() => {
    setPage(1);
  }, [statusFilter, monthFilter, yearFilter]);

  // ✅ useEffect para cargar budgets con paginación y filtros
  useEffect(() => {
    dispatch(fetchBudgets({
      page,
      pageSize,
      search: debouncedSearchTerm,
      status: statusFilter,
      month: monthFilter,
      year: yearFilter
    }));
  }, [dispatch, page, pageSize, debouncedSearchTerm, statusFilter, monthFilter, yearFilter]);

  // Obtener años únicos de los budgets
  const availableYears = useMemo(() => {
    if (!budgets?.length) return [];
    const years = [...new Set(budgets.map(budget => new Date(budget.date).getFullYear()))];
    return years.sort((a, b) => b - a);
  }, [budgets]);

  // ✅ Los budgets ya vienen filtrados del backend, no necesitamos filtrado local
  const filteredBudgets = budgets || [];

  // 🆕 Usar estadísticas del backend si están disponibles, sino calcular localmente (fallback)
  const budgetStats = useMemo(() => {
    // Si tenemos stats del backend, usarlas directamente
    if (statsFromBackend) {
      return statsFromBackend;
    }
    
    // Fallback: calcular localmente (solo mostrará stats de la página actual)
    if (!budgets) return { total: 0 };

    return {
      total: totalRecords || budgets.length,
      draft: budgets.filter(b => b.status === 'draft').length,
      pending_review: budgets.filter(b => b.status === 'pending_review').length,
      client_approved: budgets.filter(b => b.status === 'client_approved').length,
      created: budgets.filter(b => b.status === 'created').length,
      send: budgets.filter(b => b.status === 'send').length,
      sent_for_signature: budgets.filter(b => b.status === 'sent_for_signature').length,
      signed: budgets.filter(b => b.status === 'signed').length,
      approved: budgets.filter(b => b.status === 'approved').length,
      rejected: budgets.filter(b => b.status === 'rejected').length,
      notResponded: budgets.filter(b => b.status === 'notResponded').length
    };
  }, [budgets, totalRecords, statsFromBackend]);

  // ✅ NUEVO: Función para filtrar por estado al hacer click en las tarjetas
  const handleStatCardClick = (status) => {
    if (status === 'all') {
      setStatusFilter('all');
    } else {
      setStatusFilter(status);
    }
    setPage(1); // Resetear a primera página
  };

  // ✅ Redirige a EditBudget para edición completa

  
  // ✅ Redirige a EditBudget para edición completa
  const handleEdit = (budget) => {
    navigate(`/budgets/edit/${budget.idBudget}`);
  };

  const handleDelete = async (budgetId) => {
    const budget = budgets.find(b => b.idBudget === budgetId);
    if (!budget) return;
    
    const confirmMessage = `⚠️ ADVERTENCIA: Eliminación de Presupuesto\n\n` +
      `Se eliminará el presupuesto #${budgetId}:\n\n` +
      `📋 Presupuesto: ${budget.propertyAddress}\n` +
      `📄 Permit asociado y sus documentos\n` +
      `📝 Todos los items del presupuesto (BudgetLineItems)\n\n` +
      `⚠️ NOTA: Si este presupuesto tiene Works (proyectos) asociados,\n` +
      `NO se podrá eliminar. Primero debes eliminar los Works.\n\n` +
      `Esta acción NO se puede deshacer.\n\n` +
      `¿Estás seguro de que deseas continuar?`;
    
    if (window.confirm(confirmMessage)) {
      try {
        await dispatch(deleteBudget(budgetId));
        alert('✅ Presupuesto y todos sus datos asociados eliminados exitosamente');
        refreshBudgets(); // ✅ Refrescar la lista con parámetros actuales
      } catch (error) {
        console.error('Error al eliminar budget:', error);
        
        // Manejar error específico de Works asociados
        if (error.response?.data?.workCount) {
          const works = error.response.data.works || [];
          let worksList = works.map((w, i) => `  ${i + 1}. Work #${w.idWork}: ${w.address} (${w.status})`).join('\n');
          
          alert(
            `❌ No se puede eliminar el presupuesto\n\n` +
            `${error.response.data.message}\n\n` +
            `Works asociados (${error.response.data.workCount}):\n${worksList}\n\n` +
            `💡 Solución: Elimina primero los Works asociados, luego podrás eliminar el presupuesto.`
          );
        } else {
          alert(`❌ Error al eliminar: ${error.response?.data?.error || error.message || 'Error desconocido'}`);
        }
      }
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'draft': { bg: 'bg-slate-100', text: 'text-slate-800', label: 'Borrador' },
      'pending_review': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'En Revisión' },
      'client_approved': { bg: 'bg-teal-100', text: 'text-teal-800', label: 'Pre-Aprobado' },
      'created': { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Creado' },
      'send': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Enviado' },
      'sent_for_signature': { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Para Firma' },
      'signed': { bg: 'bg-indigo-100', text: 'text-indigo-800', label: 'Firmado' },
      'approved': { bg: 'bg-green-100', text: 'text-green-800', label: 'Aprobado' },
      'rejected': { bg: 'bg-red-100', text: 'text-red-800', label: 'Rechazado' },
      'notResponded': { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Sin Respuesta' }
    };

    const config = statusConfig[status] || statusConfig['created'];
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const canEdit = (budget) => {
    return !['approved', 'signed'].includes(budget.status);
  };
  
  // 🧪 TESTING MODE: Permitir eliminar cualquier estado para pruebas
  const canDelete = (budget) => {
    return true; // ⚠️ TODO: Restaurar a !['approved', 'signed'].includes(budget.status) en producción
  };

  // Nueva función para mostrar detalles
  const handleViewDetails = (budget) => {
    setSelectedBudget(budget);
    setShowDetailModal(true);
  };


  // Handler para ver PDF firmado (usando Vite env)
  const handleViewSignedPdf = async (budget) => {
    // Usar el mismo cliente axios para obtener la URL blob
    try {
      const response = await api.get(`/budget/${budget.idBudget}/download-signed`, {
        responseType: 'blob',
        withCredentials: true,
      });
      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      setSignedPdfUrl(url);
      setShowSignedPdfModal(true);
    } catch (error) {
      alert('No se pudo cargar el PDF firmado.');
    }
  };

  // Handler para descargar el PDF firmado
  const handleDownloadSignedPdf = async () => {
    if (!selectedBudget) return;
    setDownloadingSignedPdf(true);
    try {
      await dispatch(downloadSignedBudget(selectedBudget.idBudget));
    } catch (e) {
      alert('No se pudo descargar el PDF firmado.');
    }
    setDownloadingSignedPdf(false);
  };

  // Handler para reemplazar PDF del Permit
  const handleReplacePermitPdf = async () => {
    if (!newPermitPdfFile || !selectedBudget?.PermitIdPermit) {
      alert('Por favor selecciona un archivo PDF');
      return;
    }

    setUploadingPermitPdf(true);
    try {
      const formData = new FormData();
      formData.append('pdfData', newPermitPdfFile);

      await api.put(`/permit/${selectedBudget.PermitIdPermit}/replace-pdf`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      alert('PDF del Permit reemplazado exitosamente');
      setShowReplacePermitPdfModal(false);
      setNewPermitPdfFile(null);
      
      // Refrescar datos del budget
      dispatch(fetchBudgetById(selectedBudget.idBudget));
      refreshBudgets(); // ✅ Refrescar con parámetros actuales
    } catch (err) {
      console.error('Error al reemplazar PDF del Permit:', err);
      alert(err.response?.data?.error || 'Error al reemplazar el PDF del Permit');
    } finally {
      setUploadingPermitPdf(false);
    }
  };

  // Handler para reemplazar Optional Docs del Permit
  const handleReplaceOptionalDocs = async () => {
    if (!newOptionalDocsFile || !selectedBudget?.PermitIdPermit) {
      alert('Por favor selecciona un archivo PDF');
      return;
    }

    setUploadingOptionalDocs(true);
    try {
      const formData = new FormData();
      formData.append('optionalDocs', newOptionalDocsFile);

      await api.put(`/permit/${selectedBudget.PermitIdPermit}/replace-optional-docs`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      alert('Optional Docs del Permit reemplazados exitosamente');
      setShowReplaceOptionalDocsModal(false);
      setNewOptionalDocsFile(null);
      
      // Refrescar datos del budget
      dispatch(fetchBudgetById(selectedBudget.idBudget));
      refreshBudgets(); // ✅ Refrescar con parámetros actuales
    } catch (err) {
      console.error('Error al reemplazar Optional Docs del Permit:', err);
      alert(err.response?.data?.error || 'Error al reemplazar los Optional Docs del Permit');
    } finally {
      setUploadingOptionalDocs(false);
    }
  };

  // ✅ Funciones de paginación
  const handlePageChange = (newPage) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePageSizeChange = (e) => {
    setPageSize(Number(e.target.value));
    setPage(1); // Resetear a primera página al cambiar tamaño
  };

  // ✅ Función helper para refrescar con parámetros actuales
  const refreshBudgets = () => {
    dispatch(fetchBudgets({
      page,
      pageSize,
      search: debouncedSearchTerm,
      status: statusFilter,
      month: monthFilter,
      year: yearFilter
    }));
  };

  // Calcular total de páginas
  const totalPages = totalRecords ? Math.ceil(totalRecords / pageSize) : 1;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestión de Presupuestos</h1>
        <p className="text-gray-600">Administra todos los presupuestos del sistema</p>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {/* Total - Clickeable para mostrar todos */}
        <div 
          onClick={() => handleStatCardClick('all')}
          className={`bg-white p-4 rounded-lg shadow cursor-pointer transition-all hover:shadow-lg hover:scale-105 ${
            statusFilter === 'all' ? 'ring-2 ring-gray-900' : ''
          }`}
        >
          <div className="text-2xl font-bold text-gray-900">{budgetStats.total}</div>
          <div className="text-sm text-gray-600">Total</div>
        </div>

        {/* Draft - Borradores */}
        <div 
          onClick={() => handleStatCardClick('draft')}
          className={`bg-white p-4 rounded-lg shadow cursor-pointer transition-all hover:shadow-lg hover:scale-105 ${
            statusFilter === 'draft' ? 'ring-2 ring-slate-600' : ''
          }`}
        >
          <div className="text-2xl font-bold text-slate-600">{budgetStats.draft}</div>
          <div className="text-sm text-gray-600">Borradores</div>
        </div>

        {/* Pending Review - En Revisión */}
        <div 
          onClick={() => handleStatCardClick('pending_review')}
          className={`bg-white p-4 rounded-lg shadow cursor-pointer transition-all hover:shadow-lg hover:scale-105 ${
            statusFilter === 'pending_review' ? 'ring-2 ring-yellow-600' : ''
          }`}
        >
          <div className="text-2xl font-bold text-yellow-600">{budgetStats.pending_review}</div>
          <div className="text-sm text-gray-600">En Revisión</div>
        </div>

        {/* Client Approved - Aprobado por Cliente */}
        <div 
          onClick={() => handleStatCardClick('client_approved')}
          className={`bg-white p-4 rounded-lg shadow cursor-pointer transition-all hover:shadow-lg hover:scale-105 ${
            statusFilter === 'client_approved' ? 'ring-2 ring-teal-600' : ''
          }`}
        >
          <div className="text-2xl font-bold text-teal-600">{budgetStats.client_approved}</div>
          <div className="text-sm text-gray-600">Pre-Aprobado</div>
        </div>

        {/* Created - Creados */}
        <div 
          onClick={() => handleStatCardClick('created')}
          className={`bg-white p-4 rounded-lg shadow cursor-pointer transition-all hover:shadow-lg hover:scale-105 ${
            statusFilter === 'created' ? 'ring-2 ring-gray-600' : ''
          }`}
        >
          <div className="text-2xl font-bold text-gray-600">{budgetStats.created}</div>
          <div className="text-sm text-gray-600">Creados</div>
        </div>

        {/* Send - Enviados */}
        <div 
          onClick={() => handleStatCardClick('send')}
          className={`bg-white p-4 rounded-lg shadow cursor-pointer transition-all hover:shadow-lg hover:scale-105 ${
            statusFilter === 'send' ? 'ring-2 ring-blue-600' : ''
          }`}
        >
          <div className="text-2xl font-bold text-blue-600">{budgetStats.send}</div>
          <div className="text-sm text-gray-600">Enviados</div>
        </div>

        {/* Sent for Signature - Para Firma */}
        <div 
          onClick={() => handleStatCardClick('sent_for_signature')}
          className={`bg-white p-4 rounded-lg shadow cursor-pointer transition-all hover:shadow-lg hover:scale-105 ${
            statusFilter === 'sent_for_signature' ? 'ring-2 ring-purple-600' : ''
          }`}
        >
          <div className="text-2xl font-bold text-purple-600">{budgetStats.sent_for_signature}</div>
          <div className="text-sm text-gray-600">Para Firma</div>
        </div>

        {/* Signed - Firmados */}
        <div 
          onClick={() => handleStatCardClick('signed')}
          className={`bg-white p-4 rounded-lg shadow cursor-pointer transition-all hover:shadow-lg hover:scale-105 ${
            statusFilter === 'signed' ? 'ring-2 ring-indigo-600' : ''
          }`}
        >
          <div className="text-2xl font-bold text-indigo-600">{budgetStats.signed}</div>
          <div className="text-sm text-gray-600">Firmados</div>
        </div>

        {/* Approved - Aprobados */}
        <div 
          onClick={() => handleStatCardClick('approved')}
          className={`bg-white p-4 rounded-lg shadow cursor-pointer transition-all hover:shadow-lg hover:scale-105 ${
            statusFilter === 'approved' ? 'ring-2 ring-green-600' : ''
          }`}
        >
          <div className="text-2xl font-bold text-green-600">{budgetStats.approved}</div>
          <div className="text-sm text-gray-600">Aprobados</div>
        </div>

        {/* Rejected - Rechazados */}
        <div 
          onClick={() => handleStatCardClick('rejected')}
          className={`bg-white p-4 rounded-lg shadow cursor-pointer transition-all hover:shadow-lg hover:scale-105 ${
            statusFilter === 'rejected' ? 'ring-2 ring-red-600' : ''
          }`}
        >
          <div className="text-2xl font-bold text-red-600">{budgetStats.rejected}</div>
          <div className="text-sm text-gray-600">Rechazados</div>
        </div>

        {/* Not Responded - Sin Respuesta */}
        <div 
          onClick={() => handleStatCardClick('notResponded')}
          className={`bg-white p-4 rounded-lg shadow cursor-pointer transition-all hover:shadow-lg hover:scale-105 ${
            statusFilter === 'notResponded' ? 'ring-2 ring-orange-600' : ''
          }`}
        >
          <div className="text-2xl font-bold text-orange-600">{budgetStats.notResponded}</div>
          <div className="text-sm text-gray-600">Sin Respuesta</div>
        </div>
      </div>

      {/* Filtros y Búsqueda */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Búsqueda */}
          <div className="relative lg:col-span-2">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por dirección o cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filtro por Estado */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Todos los estados</option>
            <option value="draft">Borrador</option>
            <option value="pending_review">En Revisión</option>
            <option value="client_approved">Pre-Aprobado</option>
            <option value="created">Creado</option>
            <option value="send">Enviado</option>
            <option value="sent_for_signature">Para Firma</option>
            <option value="signed">Firmado</option>
            <option value="approved">Aprobado</option>
            <option value="rejected">Rechazado</option>
            <option value="notResponded">Sin Respuesta</option>
          </select>

          {/* Filtro por Mes */}
          <select
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Todos los meses</option>
            <option value="0">Enero</option>
            <option value="1">Febrero</option>
            <option value="2">Marzo</option>
            <option value="3">Abril</option>
            <option value="4">Mayo</option>
            <option value="5">Junio</option>
            <option value="6">Julio</option>
            <option value="7">Agosto</option>
            <option value="8">Septiembre</option>
            <option value="9">Octubre</option>
            <option value="10">Noviembre</option>
            <option value="11">Diciembre</option>
          </select>

          {/* Filtro por Año */}
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Todos los años</option>
            {availableYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Lista de Budgets */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dirección
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredBudgets.map((budget) => (
                <tr key={budget.idBudget} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    #{budget.idBudget}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {budget.applicantName}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                    {budget.propertyAddress}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(budget.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    ${Number(budget.totalPrice || 0).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(budget.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleViewDetails(budget)}
                        className="text-green-600 hover:text-green-900 p-1 rounded"
                        title="Ver Detalles"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      {canEdit(budget) && (
                        <button
                          onClick={() => handleEdit(budget)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded"
                          title="Editar"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                      )}
                      {canDelete(budget) && (
                        <button
                          onClick={() => handleDelete(budget.idBudget)}
                          className="text-red-600 hover:text-red-900 p-1 rounded"
                          title="Eliminar"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      )}
                      {!canDelete(budget) && (
                        <button
                          disabled
                          className="text-gray-400 p-1 rounded cursor-not-allowed"
                          title="No se puede eliminar (Aprobado/Firmado)"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      )}
                      {(budget.status === 'signed' || budget.status === 'approved') && (
                        <button
                          onClick={() => handleViewSignedPdf(budget)}
                          className="text-indigo-600 hover:text-indigo-900 p-1 rounded"
                          title="Ver PDF Firmado"
                        >
                          <DocumentTextIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredBudgets.length === 0 && (
          <div className="text-center py-12">
            <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay presupuestos</h3>
            <p className="mt-1 text-sm text-gray-500">
              No se encontraron presupuestos con los filtros aplicados.
            </p>
          </div>
        )}

        {/* ✅ Paginación */}
        {filteredBudgets.length > 0 && totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 mt-4 rounded-b-lg">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Siguiente
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div className="flex items-center space-x-4">
                <p className="text-sm text-gray-700">
                  Mostrando <span className="font-medium">{((page - 1) * pageSize) + 1}</span> a{' '}
                  <span className="font-medium">{Math.min(page * pageSize, totalRecords)}</span> de{' '}
                  <span className="font-medium">{totalRecords}</span> resultados
                </p>
                <div className="flex items-center space-x-2">
                  <label htmlFor="pageSize" className="text-sm text-gray-700">
                    Por página:
                  </label>
                  <select
                    id="pageSize"
                    value={pageSize}
                    onChange={handlePageSizeChange}
                    className="border border-gray-300 rounded-md text-sm py-1 px-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="5">5</option>
                    <option value="10">10</option>
                    <option value="20">20</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                  </select>
                </div>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Anterior</span>
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                  
                  {/* Números de página */}
                  {[...Array(Math.min(totalPages, 7))].map((_, idx) => {
                    let pageNumber;
                    
                    if (totalPages <= 7) {
                      pageNumber = idx + 1;
                    } else if (page <= 4) {
                      pageNumber = idx + 1;
                    } else if (page >= totalPages - 3) {
                      pageNumber = totalPages - 6 + idx;
                    } else {
                      pageNumber = page - 3 + idx;
                    }

                    return (
                      <button
                        key={pageNumber}
                        onClick={() => handlePageChange(pageNumber)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          page === pageNumber
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {pageNumber}
                      </button>
                    );
                  })}
                  
                  <button
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Siguiente</span>
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Detalles */}
      {showDetailModal && selectedBudget && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900">
                  Detalles del Presupuesto #{selectedBudget.idBudget}
                </h3>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Información del Cliente */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Información del Cliente</h4>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm font-medium text-gray-600">Nombre:</span>
                      <p className="text-sm text-gray-900">{selectedBudget.applicantName || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Email:</span>
                      <p className="text-sm text-gray-900">
                        {selectedBudget.Permit?.applicantEmail || selectedBudget.applicantEmail || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Teléfono:</span>
                      <p className="text-sm text-gray-900">
                        {selectedBudget.Permit?.applicantPhone || selectedBudget.applicantPhone || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Dirección:</span>
                      <p className="text-sm text-gray-900">{selectedBudget.propertyAddress}</p>
                    </div>
                  </div>
                </div>

                {/* Información del Presupuesto */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Información del Presupuesto</h4>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm font-medium text-gray-600">Estado:</span>
                      <div className="mt-1">{getStatusBadge(selectedBudget.status)}</div>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Fecha de Creación:</span>
                      <p className="text-sm text-gray-900">
                        {new Date(selectedBudget.date).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Fecha de Expiración:</span>
                      <p className="text-sm text-gray-900">
                        {selectedBudget.expirationDate
                          ? new Date(selectedBudget.expirationDate).toLocaleDateString()
                          : 'N/A'
                        }
                      </p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Subtotal:</span>
                      <p className="text-sm text-gray-900">
                        ${Number(selectedBudget.subtotalPrice || 0).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Descuento:</span>
                      <p className="text-sm text-gray-900">
                        ${Number(selectedBudget.discountAmount || 0).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Total:</span>
                      <p className="text-lg font-bold text-gray-900">
                        ${Number(selectedBudget.totalPrice || 0).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Pago Inicial:</span>
                      <p className="text-sm text-gray-900">
                        ${Number(selectedBudget.initialPayment || 0).toLocaleString()}
                        ({selectedBudget.initialPaymentPercentage || 60}%)
                      </p>
                    </div>
                  </div>
                </div>

                {/* Información del Permit */}
                {selectedBudget.Permit && (
                  <div className="bg-gray-50 p-4 rounded-lg md:col-span-2">
                    <h4 className="text-lg font-semibold text-gray-900 mb-3">Información del Permit</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm font-medium text-gray-600">Lote:</span>
                        <p className="text-sm text-gray-900">{selectedBudget.Permit.lot || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-600">Bloque:</span>
                        <p className="text-sm text-gray-900">{selectedBudget.Permit.block || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-600">Tipo de Sistema:</span>
                        <p className="text-sm text-gray-900">{selectedBudget.Permit.systemType || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-600">Capacidad GPD:</span>
                        <p className="text-sm text-gray-900">{selectedBudget.Permit.gpdCapacity || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Notas */}
                {(selectedBudget.generalNotes || selectedBudget.discountDescription) && (
                  <div className="bg-gray-50 p-4 rounded-lg md:col-span-2">
                    <h4 className="text-lg font-semibold text-gray-900 mb-3">Notas</h4>
                    {selectedBudget.discountDescription && (
                      <div className="mb-3">
                        <span className="text-sm font-medium text-gray-600">Descripción del Descuento:</span>
                        <p className="text-sm text-gray-900 mt-1">{selectedBudget.discountDescription}</p>
                      </div>
                    )}
                    {selectedBudget.generalNotes && (
                      <div>
                        <span className="text-sm font-medium text-gray-600">Notas Generales:</span>
                        <p className="text-sm text-gray-900 mt-1">{selectedBudget.generalNotes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal visor PDF firmado */}
      {showSignedPdfModal && (
        <div className="fixed inset-0 bg-gray-700 bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-3xl w-full p-4 relative">
            <button
              onClick={() => setShowSignedPdfModal(false)}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h2 className="text-lg font-bold mb-4 text-center">PDF Firmado</h2>
            <div className="flex justify-end mb-2">
              <button
                onClick={handleDownloadSignedPdf}
                className="px-3 py-1 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
                disabled={downloadingSignedPdf}
              >
                {downloadingSignedPdf ? 'Descargando...' : 'Descargar PDF'}
              </button>
            </div>
            <div className="h-[70vh] overflow-y-auto border rounded shadow-inner bg-gray-50">
              {signedPdfUrl && (
                <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js">
                  <Viewer fileUrl={signedPdfUrl} />
                </Worker>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal para reemplazar PDF del Permit */}
      {showReplacePermitPdfModal && (
        <div className="fixed inset-0 bg-gray-700 bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 relative">
            <button
              onClick={() => {
                setShowReplacePermitPdfModal(false);
                setNewPermitPdfFile(null);
              }}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h2 className="text-lg font-bold mb-4 text-center text-indigo-900">Reemplazar PDF del Permit</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Seleccionar nuevo PDF
                </label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setNewPermitPdfFile(e.target.files[0])}
                  className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none"
                />
                {newPermitPdfFile && (
                  <p className="mt-2 text-sm text-green-600">✓ {newPermitPdfFile.name}</p>
                )}
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                <p className="text-xs text-yellow-800">
                  ⚠️ Este archivo reemplazará el PDF actual del Permit. Esta acción no se puede deshacer.
                </p>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowReplacePermitPdfModal(false);
                    setNewPermitPdfFile(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                  disabled={uploadingPermitPdf}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleReplacePermitPdf}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50"
                  disabled={!newPermitPdfFile || uploadingPermitPdf}
                >
                  {uploadingPermitPdf ? 'Subiendo...' : 'Reemplazar PDF'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para reemplazar Optional Docs del Permit */}
      {showReplaceOptionalDocsModal && (
        <div className="fixed inset-0 bg-gray-700 bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 relative">
            <button
              onClick={() => {
                setShowReplaceOptionalDocsModal(false);
                setNewOptionalDocsFile(null);
              }}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h2 className="text-lg font-bold mb-4 text-center text-green-900">Reemplazar Optional Docs</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Seleccionar nuevo PDF
                </label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setNewOptionalDocsFile(e.target.files[0])}
                  className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none"
                />
                {newOptionalDocsFile && (
                  <p className="mt-2 text-sm text-green-600">✓ {newOptionalDocsFile.name}</p>
                )}
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                <p className="text-xs text-yellow-800">
                  ⚠️ Este archivo reemplazará los Optional Docs actuales. Esta acción no se puede deshacer.
                </p>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowReplaceOptionalDocsModal(false);
                    setNewOptionalDocsFile(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                  disabled={uploadingOptionalDocs}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleReplaceOptionalDocs}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:opacity-50"
                  disabled={!newOptionalDocsFile || uploadingOptionalDocs}
                >
                  {uploadingOptionalDocs ? 'Subiendo...' : 'Reemplazar Docs'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default GestionBudgets;