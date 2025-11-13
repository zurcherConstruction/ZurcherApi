import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom'; // ✅ AGREGAR
import {
  fetchBudgets,
  fetchBudgetById,
  deleteBudget,
  updateBudget,
  downloadSignedBudget,
  exportBudgetsToExcel // 🆕 Importar la acción de exportación
} from '../../Redux/Actions/budgetActions';
import {
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  FunnelIcon,
  CalendarDaysIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon, // 🆕 Icono para exportar Excel
  ChatBubbleLeftRightIcon // 📝 Icono para seguimiento
} from '@heroicons/react/24/outline';
import { Worker, Viewer } from '@react-pdf-viewer/core';
import api from '../../utils/axios';
import '@react-pdf-viewer/core/lib/styles/index.css';
import BudgetNotesModal from './BudgetNotesModal';
import NotesAlertBadge from '../Common/NotesAlertBadge'; // 🆕 Badge de alertas

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

  // ✅ Get current user role for delete permissions
  const { user, currentStaff } = useSelector((state) => state.auth);
  const staff = currentStaff || user;
  const userRole = staff?.role || '';

  // ✅ Función para formatear fechas de YYYY-MM-DD a MM-DD-YYYY
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    
    // dateString viene como "YYYY-MM-DD" del backend
    const [year, month, day] = dateString.split('-');
    
    if (!year || !month || !day) {
      console.error("Invalid date format:", dateString);
      return "Invalid Date";
    }
    
    // Retornar en formato MM-DD-YYYY
    return `${month}-${day}-${year}`;
  };

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
  
  // 🆕 Filtro de método de firma
  const [signatureFilter, setSignatureFilter] = useState('all');

  // 🆕 Estado para verificación manual de firmas
  const [verifyingSignatures, setVerifyingSignatures] = useState(false);

  // 📝 Estado para modal de notas de seguimiento
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [budgetForNotes, setBudgetForNotes] = useState(null);

  // 🆕 Estado para alertas de notas (cargadas una sola vez)
  const [budgetAlerts, setBudgetAlerts] = useState({});
  const [loadingAlerts, setLoadingAlerts] = useState(false);

  // 🆕 Función reutilizable para recargar alertas
  const reloadBudgetAlerts = async () => {
    try {
      setLoadingAlerts(true);
      // Agregar timestamp para evitar caché
      const response = await api.get(`/budget-notes/alerts/budgets?_t=${Date.now()}`);
      setBudgetAlerts(response.data.budgetsWithAlerts || {});
    } catch (error) {
      console.error('Error al cargar alertas de budgets:', error);
    } finally {
      setLoadingAlerts(false);
    }
  };

  // 🆕 Cargar alertas de todos los budgets una sola vez
  useEffect(() => {
    reloadBudgetAlerts();
  }, []); // Solo cargar una vez al montar el componente

  // ✅ useEffect para debounce del searchTerm (esperar 800ms después de que el usuario deje de escribir)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setPage(1); // Resetear a primera página al buscar
    }, 800);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  // ✅ useEffect para resetear a página 1 cuando cambien los filtros
  useEffect(() => {
    setPage(1);
  }, [statusFilter, monthFilter, yearFilter, signatureFilter]);

  // ✅ useEffect para cargar budgets con paginación y filtros
  useEffect(() => {
    dispatch(fetchBudgets({
      page,
      pageSize,
      search: debouncedSearchTerm,
      status: statusFilter,
      month: monthFilter,
      year: yearFilter,
      signatureMethod: signatureFilter
    }));
  }, [dispatch, page, pageSize, debouncedSearchTerm, statusFilter, monthFilter, yearFilter, signatureFilter]);

  // Obtener años únicos de los budgets
  const availableYears = useMemo(() => {
    if (!budgets?.length) return [];
    const years = [...new Set(budgets.map(budget => {
      const [year] = budget.date.split('-');
      return parseInt(year);
    }))];
    return years.sort((a, b) => b - a);
  }, [budgets]);

  // ✅ Filtrar budgets legacy_maintenance para que NO se muestren en la lista
  const filteredBudgets = useMemo(() => {
    if (!budgets) return [];
    
    // Excluir budgets con status 'legacy_maintenance' o isLegacy = true
    return budgets.filter(b => 
      b.status !== 'legacy_maintenance' && !b.isLegacy
    );
  }, [budgets]);

  // 🆕 Usar estadísticas del backend si están disponibles, sino calcular localmente (fallback)
  const budgetStats = useMemo(() => {
    // Si tenemos stats del backend, usarlas directamente
    if (statsFromBackend) {
      return statsFromBackend;
    }
    
    // Fallback: calcular localmente (solo mostrará stats de la página actual)
    if (!budgets) return { 
      total: 0, 
      draft: 0, 
      approved: 0, 
      en_revision: 0, 
      signed: 0, 
      legacy: 0,
      rejected: 0 
    };

    // ✅ FILTRAR budgets legacy_maintenance para que NO se contabilicen
    const nonLegacyBudgets = budgets.filter(b => 
      b.status !== 'legacy_maintenance' && !b.isLegacy
    );

    return {
      total: nonLegacyBudgets.length,
      draft: nonLegacyBudgets.filter(b => ['draft', 'created'].includes(b.status)).length,
      en_revision: nonLegacyBudgets.filter(b => 
        ['send', 'pending_review', 'client_approved', 'notResponded', 'sent_for_signature'].includes(b.status)
      ).length,
      signed: nonLegacyBudgets.filter(b => b.status === 'signed').length,
      approved: nonLegacyBudgets.filter(b => b.status === 'approved').length,
      legacy: budgets.filter(b => b.status === 'legacy_maintenance' || b.isLegacy === true).length,
      rejected: nonLegacyBudgets.filter(b => b.status === 'rejected').length,
      
      // 📊 MANTENER ESTADOS LEGACY para compatibilidad (no se muestran en las tarjetas)
      pending_review: nonLegacyBudgets.filter(b => b.status === 'pending_review').length,
      client_approved: nonLegacyBudgets.filter(b => b.status === 'client_approved').length,
      created: nonLegacyBudgets.filter(b => b.status === 'created').length,
      send: nonLegacyBudgets.filter(b => b.status === 'send').length,
      notResponded: nonLegacyBudgets.filter(b => b.status === 'notResponded').length,
      sent_for_signature: nonLegacyBudgets.filter(b => b.status === 'sent_for_signature').length
    };
  }, [budgets, totalRecords, statsFromBackend]);

  // 🆕 Estadísticas de métodos de firma - Priorizar las del backend
  const signatureStats = useMemo(() => {
    // Si tenemos estadísticas del backend, usarlas
    if (statsFromBackend?.signatureStats) {
      return statsFromBackend.signatureStats;
    }
    
    // Si no hay backend stats, calcular localmente
    if (!budgets) return { signnow: 0, docusign: 0, manual: 0, legacy: 0, none: 0 };
    
    // ✅ FILTRAR budgets legacy_maintenance para que NO se contabilicen
    const nonLegacyBudgets = budgets.filter(b => 
      b.status !== 'legacy_maintenance' && !b.isLegacy
    );
    
    return {
      signnow: nonLegacyBudgets.filter(b => b.signatureMethod === 'signnow').length,
      docusign: nonLegacyBudgets.filter(b => b.signatureMethod === 'docusign').length,
      manual: nonLegacyBudgets.filter(b => b.signatureMethod === 'manual').length,
      legacy: budgets.filter(b => b.status === 'legacy_maintenance' || b.isLegacy === true).length,
      none: nonLegacyBudgets.filter(b => !b.signatureMethod || b.signatureMethod === 'none').length
    };
  }, [budgets, statsFromBackend]);

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

  // 🆕 Verificar firmas manualmente
  const handleVerifySignatures = async () => {
    if (verifyingSignatures) return;

    const confirm = window.confirm(
      '¿Verificar ahora todas las firmas pendientes de SignNow?\n\n' +
      'Esto revisará todos los documentos enviados a SignNow y actualizará ' +
      'el estado de los que ya fueron firmados.'
    );

    if (!confirm) return;

    setVerifyingSignatures(true);
    try {
      const response = await api.post('/budget/verify-signatures');
      
      if (response.data.success) {
        const { checked, signed, results } = response.data;
        
        let message = `✅ Verificación completada\n\n`;
        message += `📊 Presupuestos revisados: ${checked}\n`;
        message += `✍️ Firmados encontrados: ${signed}\n\n`;
        
        if (signed > 0) {
          message += `Presupuestos actualizados:\n`;
          results
            .filter(r => r.status === 'signed')
            .forEach((r, i) => {
              message += `${i + 1}. Budget #${r.idBudget} - ${r.propertyAddress}\n`;
            });
        }
        
        alert(message);
        
        // Recargar budgets para ver cambios
        dispatch(fetchBudgets({
          page,
          pageSize,
          search: debouncedSearchTerm,
          status: statusFilter,
          month: monthFilter,
          year: yearFilter
        }));
      }
    } catch (error) {
      console.error('Error verificando firmas:', error);
      alert(`❌ Error al verificar firmas:\n${error.response?.data?.details || error.message}`);
    } finally {
      setVerifyingSignatures(false);
    }
  };

  // 🆕 HANDLER PARA EXPORTAR A EXCEL
  const handleExportToExcel = async () => {
    try {
      await dispatch(exportBudgetsToExcel({
        search: debouncedSearchTerm,
        status: statusFilter,
        signatureMethod: signatureFilter, // 🆕 Agregar filtro de método de firma
        month: monthFilter,
        year: yearFilter
      }));
      // El archivo se descarga automáticamente
    } catch (error) {
      console.error('Error al exportar a Excel:', error);
      alert('Error al exportar los budgets a Excel');
    }
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

  // 🆕 Badge para método de firma
  const getSignatureBadge = (signatureMethod) => {
    const signatureConfig = {
      'signnow': { 
        bg: 'bg-green-100', 
        text: 'text-green-800', 
        label: '✓ SignNow',
        icon: '📝'
      },
      'docusign': { 
        bg: 'bg-indigo-100', 
        text: 'text-indigo-800', 
        label: '✓ DocuSign',
        icon: '📝'
      },
      'manual': { 
        bg: 'bg-blue-100', 
        text: 'text-blue-800', 
        label: '✓ Manual',
        icon: '📄'
      },
      'legacy': { 
        bg: 'bg-gray-100', 
        text: 'text-gray-800', 
        label: 'Legacy',
        icon: '📋'
      },
      'none': { 
        bg: 'bg-yellow-50', 
        text: 'text-yellow-700', 
        label: 'Sin Firmar',
        icon: '⏳'
      }
    };

    const config = signatureConfig[signatureMethod] || signatureConfig['none'];
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${config.bg} ${config.text}`}>
        <span>{config.icon}</span>
        <span>{config.label}</span>
      </span>
    );
  };

  const canEdit = (budget) => {
    // Follow-up no puede editar nunca
    if (userRole === 'follow-up') return false;
    return !['approved', 'signed'].includes(budget.status);
  };
  
  // ✅ Only owner can delete budgets (follow-up cannot delete)
  const canDelete = (budget) => {
    if (userRole === 'follow-up') return false;
    return userRole === 'owner';
  };

  // Nueva función para mostrar detalles
  const handleViewDetails = (budget) => {
    setSelectedBudget(budget);
    setShowDetailModal(true);
  };

  // 📝 Handler para cerrar modal de notas y recargar alertas
  const handleCloseNotesModal = async () => {
    setShowNotesModal(false);
    setBudgetForNotes(null);
    
    // Recargar alertas para reflejar cambios (notas leídas, nuevos recordatorios, etc.)
    await reloadBudgetAlerts();
  };

  // 📝 Handler para abrir modal de notas de seguimiento
  const handleOpenNotes = (budget) => {
    setBudgetForNotes(budget);
    setShowNotesModal(true);
  };


  // Handler para ver PDF firmado (usando Vite env)
  const handleViewSignedPdf = async (budget) => {
    try {
      let pdfUrl = null;
      
      // 🆕 Si es firma manual, usar la URL directa de Cloudinary
      if (budget.signatureMethod === 'manual' && budget.manualSignedPdfPath) {
        pdfUrl = budget.manualSignedPdfPath;
      }
      // 🆕 Si es firma SignNow, descargar desde el backend
      else if (budget.signatureMethod === 'signnow') {
        const response = await api.get(`/budget/${budget.idBudget}/download-signed`, {
          responseType: 'blob',
          withCredentials: true,
        });
        const blob = response.data;
        pdfUrl = window.URL.createObjectURL(blob);
      }
      // 🆕 Si es firma DocuSign, descargar desde el backend
      else if (budget.signatureMethod === 'docusign') {
        const response = await api.get(`/budget/${budget.idBudget}/download-signed`, {
          responseType: 'blob',
          withCredentials: true,
        });
        const blob = response.data;
        pdfUrl = window.URL.createObjectURL(blob);
      }
      // 🆕 Si es legacy, usar la URL del PDF legacy
      else if (budget.signatureMethod === 'legacy' && budget.legacySignedPdfUrl) {
        pdfUrl = budget.legacySignedPdfUrl;
      }
      else {
        // Si no tiene método de firma, mostrar error
        alert('Este presupuesto no tiene un PDF firmado disponible.');
        return;
      }
      
      // Mostrar el PDF en el modal
      setSignedPdfUrl(pdfUrl);
      setShowSignedPdfModal(true);
      
    } catch (error) {
      console.error('Error al cargar PDF firmado:', error);
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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
        {/* FILA 1: VISTA GENERAL Y TRABAJO INTERNO */}
        
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

        {/* Approved - Aprobados (COMPLETOS) */}
        <div 
          onClick={() => handleStatCardClick('approved')}
          className={`bg-white p-4 rounded-lg shadow cursor-pointer transition-all hover:shadow-lg hover:scale-105 ${
            statusFilter === 'approved' ? 'ring-2 ring-green-600' : ''
          }`}
        >
          <div className="text-2xl font-bold text-green-600">{budgetStats.approved}</div>
          <div className="text-sm text-gray-600">Aprobados</div>
          <div className="text-xs text-gray-500 mt-1">Firmados + Pago</div>
        </div>

        {/* FILA 2: SEGUIMIENTO AL CLIENTE */}
        
        {/* En Revisión - Agrupa: send, pending_review, client_approved, notResponded, sent_for_signature */}
        <div 
          onClick={() => handleStatCardClick('en_revision')}
          className={`bg-white p-4 rounded-lg shadow cursor-pointer transition-all hover:shadow-lg hover:scale-105 ${
            statusFilter === 'en_revision' ? 'ring-2 ring-blue-600' : ''
          }`}
        >
          <div className="text-2xl font-bold text-blue-600">{budgetStats.en_revision}</div>
          <div className="text-sm text-gray-600">Enviados</div>
          <div className="text-xs text-gray-500 mt-1">En seguimiento</div>
        </div>

        {/* Firmados Sin Pago - Esperando pago inicial */}
        <div 
          onClick={() => handleStatCardClick('signed')}
          className={`bg-white p-4 rounded-lg shadow cursor-pointer transition-all hover:shadow-lg hover:scale-105 ${
            statusFilter === 'signed' ? 'ring-2 ring-orange-600' : ''
          }`}
        >
          <div className="text-2xl font-bold text-orange-600">{budgetStats.signed}</div>
          <div className="text-sm text-gray-600">Firmados Sin Pago</div>
          <div className="text-xs text-gray-500 mt-1">Gestión cobros</div>
        </div>

        {/* FILA 3: CIERRE */}
        
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
      </div>

      {/* Botón de Verificación de Firmas + Filtros y Búsqueda */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        {/* Botones de Acción */}
        <div className="mb-4 flex flex-wrap justify-end gap-2 sm:gap-3">
          {/* Botón Exportar a Excel */}
          <button
            onClick={handleExportToExcel}
            title="Exporta los budgets según los filtros aplicados"
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all hover:shadow-lg font-medium text-sm"
          >
            <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
            <span className="hidden sm:inline">Exportar Excel</span>
            <span className="sm:hidden">Excel</span>
          </button>

          {/* Botón Verificar Firmas */}
          <button
            onClick={handleVerifySignatures}
            disabled={verifyingSignatures}
            className={`inline-flex items-center px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              verifyingSignatures
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-lg'
            }`}
          >
            {verifyingSignatures ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Verificando...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Verificar Firmas Ahora
              </>
            )}
          </button>
        </div>

        {/* Filtros */}
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
            {/* Indicador de búsqueda activa */}
            {searchTerm && searchTerm !== debouncedSearchTerm && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
              </div>
            )}
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

          {/* 🆕 Filtro por Método de Firma */}
          <select
            value={signatureFilter}
            onChange={(e) => setSignatureFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          >
            <option value="all">Todas las firmas ({budgets?.length || 0})</option>
            <option value="signnow">✓ SignNow ({signatureStats.signnow})</option>
            <option value="docusign">✓ DocuSign ({signatureStats.docusign})</option>
            <option value="manual">📄 Manual ({signatureStats.manual})</option>
            <option value="legacy">📋 Legacy ({signatureStats.legacy})</option>
            <option value="none">✗ Sin Firmar ({signatureStats.none})</option>
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
                  Firma
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
                    {formatDate(budget.date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    ${Number(budget.totalPrice || 0).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(budget.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getSignatureBadge(budget.signatureMethod || 'none')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleOpenNotes(budget)}
                        className="text-purple-600 hover:text-purple-900 p-1 rounded"
                        title="Seguimiento"
                      >
                        <NotesAlertBadge 
                          budgetId={budget.idBudget} 
                          alertData={budgetAlerts[budget.idBudget]}
                          onClick={() => handleOpenNotes(budget)}
                        />
                      </button>
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
                        {formatDate(selectedBudget.date)}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Fecha de Expiración:</span>
                      <p className="text-sm text-gray-900">
                        {selectedBudget.expirationDate
                          ? formatDate(selectedBudget.expirationDate)
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

      {/* 📝 Modal de Notas de Seguimiento */}
      {showNotesModal && budgetForNotes && (
        <BudgetNotesModal
          budget={budgetForNotes}
          onClose={handleCloseNotesModal}
          onAlertsChange={reloadBudgetAlerts}
        />
      )}

    </div>
  );
};

export default GestionBudgets;