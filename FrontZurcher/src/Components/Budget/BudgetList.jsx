import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchBudgets,
  updateBudget,
  resendBudgetToClient,
  sendBudgetToSignNow,
  exportBudgetsToExcel, // 🆕 Importar la nueva acción
  // uploadInvoice, // Ya no se usa aquí si se eliminó handleUploadPayment
} from "../../Redux/Actions/budgetActions";
import {
  DocumentArrowDownIcon,
  EyeIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  PaperClipIcon,
  UserIcon,
  DocumentCheckIcon,
  ArrowDownTrayIcon, // 🆕 Icono para exportar Excel
} from "@heroicons/react/24/outline"; // Icono para descarga
//import BudgetPDF from "./BudgetPDF";
import { parseISO, format } from "date-fns";
import api from "../../utils/axios";
import EditClientDataModal from './EditClientDataModal';

const PdfModal = ({ isOpen, onClose, pdfUrl, title }) => {
  if (!isOpen || !pdfUrl) {
    return null;
  }

  // Detect device type with better breakpoints
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;
  const isMobile = screenWidth < 768;
  const isTablet = screenWidth >= 768 && screenWidth < 1024;
  const isLarge = screenWidth >= 1024;
  
  // Específico para iPad Pro detection
  const isIPadPro = (screenWidth === 1024 && screenHeight === 1366) || 
                    (screenWidth === 1366 && screenHeight === 1024) ||
                    navigator.userAgent.includes('iPad');

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[9999] modal-overlay"
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isIPadPro ? '20px' : (isMobile ? '8px' : '16px')
      }}
    >
      <div 
        className="bg-white rounded-lg shadow-2xl flex flex-col overflow-hidden"
        style={{
          width: isIPadPro ? '90vw' : (isLarge ? '85vw' : isTablet ? '85vw' : '95vw'),
          height: isIPadPro ? '85vh' : (isLarge ? '80vh' : isTablet ? '88vh' : '96vh'),
          maxWidth: 'none',
          maxHeight: 'none',
          margin: 'auto'
        }}
      >
        {/* Header con mejor responsive */}
        <div className="flex justify-between items-center p-3 sm:p-4 md:p-5 lg:p-6 border-b border-gray-200 bg-gray-50 flex-shrink-0">
          <h3 className="text-sm sm:text-base md:text-lg lg:text-xl font-semibold text-gray-800 truncate pr-2 max-w-[70%]">
            {title || "Vista Previa del PDF"}
          </h3>
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {(isMobile || isTablet) && (
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 text-xs sm:text-sm md:text-base underline whitespace-nowrap font-medium"
                title="Abrir en nueva pestaña"
              >
                Nueva pestaña
              </a>
            )}
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 hover:bg-gray-200 p-1.5 sm:p-2 rounded-full transition-colors"
              title="Cerrar"
            >
              <XMarkIcon className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7" />
            </button>
          </div>
        </div>
        
        {/* PDF Content area con mejor altura */}
        <div 
          className="flex-grow overflow-hidden relative"
          style={{
            position: 'relative',
            flex: '1 1 auto',
            overflow: 'hidden'
          }}
        >
          <iframe
            src={pdfUrl}
            title={title || "PDF Viewer"}
            className="absolute top-0 left-0 w-full h-full border-none"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              border: 'none',
              WebkitOverflowScrolling: "touch",
              scrollbarWidth: "thin",
              backgroundColor: 'white'
            }}
          />
        </div>
        
        {/* Footer para dispositivos móviles/tablet/iPad */}
        {(isMobile || isTablet || isIPadPro) && (
          <div className="p-3 sm:p-4 bg-gray-50 border-t border-gray-200 text-xs sm:text-sm text-gray-600 text-center flex-shrink-0">
            <p className="leading-relaxed">
              Para mejor navegación,{" "}
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline font-medium hover:text-blue-800"
              >
                abrir en nueva pestaña
              </a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const BudgetList = () => {
  const dispatch = useDispatch();
  const { 
    budgets, 
    loading, 
    error, 
    total: totalRecords,      // ✅ Renombrado para evitar conflictos
    pageSize: currentPageSize  // ✅ Del Redux
  } = useSelector((state) => state.budget);
  
  // ✅ Obtener el rol del usuario autenticado
  const { user, currentStaff } = useSelector((state) => state.auth);
  const staff = currentStaff || user; // Intentar ambos
  const userRole = staff?.role || '';
  
  // ✅ Solo owner y admin pueden editar, el resto solo ve
  const canEdit = userRole === 'owner' || userRole === 'admin';
  const isReadOnly = !canEdit;
  


  
  // ✅ Estados para paginación local
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // ✅ Estados para filtros y búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');

  const [editingBudgetId, setEditingBudgetId] = useState(null); // ID del budget en edición
  const [currentNote, setCurrentNote] = useState(""); // Valor actual de la nota en el editor
  const [isSavingNote, setIsSavingNote] = useState(false); // Para feedback visual al guardar
  // --- FIN NUEVO ESTADO ---

  const [downloadingPdfId, setDownloadingPdfId] = useState(null); // Estado para indicar descarga
  const [viewingPdfId, setViewingPdfId] = useState(null);

  // --- NUEVOS ESTADOS PARA EL MODAL DE PDF ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pdfUrlForModal, setPdfUrlForModal] = useState("");
  const [pdfTitleForModal, setPdfTitleForModal] = useState("");
  const [isLoadingPdfInModal, setIsLoadingPdfInModal] = useState(null);

  // --- ESTADOS PARA EDITAR DATOS DE CLIENTE ---
  const [showClientDataModal, setShowClientDataModal] = useState(false);
  const [selectedBudgetIdForClient, setSelectedBudgetIdForClient] = useState(null);

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

  // ✅ Calcular total de páginas
  const totalPages = totalRecords ? Math.ceil(totalRecords / pageSize) : 1;

  // ✅ Función para cambiar de página
  const handlePageChange = (newPage) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ✅ Función para cambiar tamaño de página
  const handlePageSizeChange = (e) => {
    setPageSize(Number(e.target.value));
    setPage(1);
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

  // Función para manejar la descarga del PDF
  const handleDownloadPdf = async (budgetId, filename) => {
    setDownloadingPdfId(budgetId); // Marcar como descargando
    try {
      // Usa tu instancia de Axios que ya incluye el token
      const response = await api.get(`/budget/${budgetId}/pdf`, {
        responseType: "blob", // Importante: obtener la respuesta como Blob
      });

      // Crear un enlace temporal para iniciar la descarga
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename || `budget_${budgetId}.pdf`); // Usar nombre sugerido o default
      document.body.appendChild(link);
      link.click();

      // Limpiar el enlace temporal
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error al descargar el PDF:", error);
      // Mostrar un mensaje de error al usuario
      alert(
        `Error al descargar el PDF: ${
          error.response?.data?.message || error.message
        }`
      );
    } finally {
      setDownloadingPdfId(null); // Terminar estado de descarga
    }
  };

  // *** FUNCIÓN para manejar la vista previa del PDF en modal ***
  const handleViewPdf = async (budgetId) => {
    setViewingPdfId(budgetId); // Indicar que se está cargando la vista previa

    // Limpiar modal anterior si existe
    if (pdfUrlForModal) {
      console.log("Revocando URL de modal anterior:", pdfUrlForModal);
      URL.revokeObjectURL(pdfUrlForModal);
      setPdfUrlForModal("");
    }

    try {
      // 🔍 Buscar el budget para verificar el método de firma
      const budget = budgets.find(b => b.idBudget === budgetId);
      
      // �📄 CASO 1: Firma Manual - Usar proxy del backend
      if (budget && budget.signatureMethod === 'manual' && budget.manualSignedPdfPath) {
        console.log(`📄 Budget ${budgetId} tiene firma manual, cargando desde backend...`);
        
        // Usar el endpoint del backend que hace de proxy y establece headers inline
        const response = await api.get(`/budget/${budgetId}/view-manual-signed`, {
          responseType: "blob",
          withCredentials: true
        });
        
        // Crear una URL temporal para el Blob
        const objectUrl = window.URL.createObjectURL(response.data);
        
        setPdfUrlForModal(objectUrl);
        setPdfTitleForModal(`📄 Presupuesto Firmado Manual - ${budgetId}`);
        setIsModalOpen(true);
        return; // ✅ El finally limpiará viewingPdfId
      }
      
      // ✍️ CASO 2: Firma SignNow - Usar endpoint de visualización (no descarga)
      if (budget && budget.signatureMethod === 'signnow' && budget.signNowDocumentId) {
        
        try {
          // Usar el endpoint de visualización que envía inline (no attachment)
          const response = await api.get(`/budget/${budgetId}/view-signed`, {
            responseType: "blob",
            withCredentials: true
          });
          
          // Crear una URL temporal para el Blob
          const objectUrl = window.URL.createObjectURL(response.data);
          
          setPdfUrlForModal(objectUrl);
          setPdfTitleForModal(`✍️ Presupuesto Firmado SignNow - ${budgetId}`);
          setIsModalOpen(true);
          return; // ✅ El finally limpiará viewingPdfId
        } catch (signNowError) {
          // Si falla (ej: documento aún no firmado), regenerar PDF sin firma
          console.warn(`⚠️ SignNow PDF no disponible para budget ${budgetId}, regenerando...`, signNowError.response?.data);
          // Continuar al CASO 3 para regenerar
        }
      }
      
      // 🔄 CASO 3: Sin firma o legacy - Regenerar PDF desde backend
      const response = await api.get(`/budget/${budgetId}/preview`, {
        responseType: "blob", // Obtener como Blob
      });

      // Crear una URL temporal para el Blob
      const objectUrl = window.URL.createObjectURL(
        new Blob([response.data], { type: "application/pdf" })
      );
     

      // Configurar el modal
      setPdfUrlForModal(objectUrl);
      setPdfTitleForModal(`Presupuesto - ${budgetId}`);
      setIsModalOpen(true);
    } catch (error) {
      console.error("Error fetching PDF for viewing:", error);
      const errorMsg = error.response?.data?.message || "Error al obtener el PDF para visualizar. Verifique que exista y tenga permisos.";
      alert(errorMsg);
    } finally {
      setViewingPdfId(null); // Dejar de indicar carga
    }
  };

  // *** FUNCIÓN para manejar la vista del PDF LEGACY ***
  const handleViewLegacyBudgetPdf = async (budgetId, directUrl = null) => {
    setViewingPdfId(budgetId); // Indicar que se está cargando la vista previa

    // Limpiar modal anterior si existe
    if (pdfUrlForModal) {
      console.log("Revocando URL de modal anterior:", pdfUrlForModal);
      URL.revokeObjectURL(pdfUrlForModal);
      setPdfUrlForModal("");
    }

    try {
      // Si tenemos URL directa de Cloudinary, usarla directamente
      if (directUrl && directUrl.includes('cloudinary.com')) {
        setPdfUrlForModal(directUrl);
        setPdfTitleForModal(`🏷️ Presupuesto Legacy - ${budgetId}`);
        setIsModalOpen(true);
        setViewingPdfId(null);
        return;
      }

      // Fallback: usar endpoint del backend (debería redirigir)
      console.log(`🔄 Using backend endpoint for budget ${budgetId}`);
      const response = await api.get(`/budget/${budgetId}/legacy-budget-pdf`, {
        responseType: "blob", // Obtener como Blob
      });

      // Crear una URL temporal para el Blob
      const objectUrl = window.URL.createObjectURL(
        new Blob([response.data], { type: "application/pdf" })
      );

      // Configurar el modal
      setPdfUrlForModal(objectUrl);
      setPdfTitleForModal(`🏷️ Presupuesto Legacy - ${budgetId}`);
      setIsModalOpen(true);
    } catch (error) {
      console.error("Error fetching Legacy PDF for viewing:", error);
      alert(
        "Error al obtener el PDF legacy para visualizar. Verifique que exista y tenga permisos."
      );
    } finally {
      setViewingPdfId(null); // Dejar de indicar carga
    }
  };

  // --- NUEVAS FUNCIONES PARA MANEJAR LA EDICIÓN DE NOTAS ---

  const handleEditNoteClick = (budget) => {
    setEditingBudgetId(budget.idBudget);
    setCurrentNote(budget.generalNotes || ""); // Cargar nota actual o string vacío
  };

  const handleNoteChange = (event) => {
    setCurrentNote(event.target.value);
  };

  const handleCancelEditNote = () => {
    setEditingBudgetId(null);
    setCurrentNote("");
    setIsSavingNote(false);
  };

  const handleSaveNote = async () => {
    if (editingBudgetId === null) return;
    setIsSavingNote(true); // Indicar que se está guardando

    try {
      // Despachar la acción para actualizar solo las notas
      const result = await dispatch(
        updateBudget(editingBudgetId, { generalNotes: currentNote })
      );
      
      if (result.type === 'UPDATE_BUDGET_SUCCESS') {
        console.log('✅ Nota guardada exitosamente:', currentNote);
        
        // 🆕 Refrescar la lista para asegurar que se muestren los datos actualizados
        refreshBudgets();
        
        handleCancelEditNote(); // Salir del modo edición
      }
    } catch (error) {
      console.error("Error al guardar las notas:", error);
      alert(
        "Error al guardar las notas: " + (error.message || "Error desconocido")
      );
      // Mantener en modo edición para que el usuario pueda reintentar o cancelar
    } finally {
      setIsSavingNote(false); // Terminar indicación de guardado
    }
  };

  // --- FIN NUEVAS FUNCIONES ---

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

  const handleUpdateStatus = (idBudget, newStatus, budget) => {
    const validTransitions = {
      created: ["send"],
      pending: ["send"],
      pending_review: [], // No se puede cambiar manualmente, solo el cliente
      client_approved: [], // No se cambia con handleUpdateStatus, usa handleSendToSignNow
      send: ["rejected", "notResponded"], // Puede ser rechazado o sin respuesta
      sent_for_signature: ["rejected", "signed"], // Desde SignNow puede ser rechazado o firmado
      approved: [], // No se puede cambiar desde aquí
      signed: [], // No se puede cambiar desde aquí
      rejected: [], // Final
      notResponded: ["rejected"], // Sin respuesta puede ser rechazado
    };

    if (!validTransitions[budget.status]?.includes(newStatus)) {
      alert(
        `No se puede cambiar de "${budget.status}" a "${newStatus}" desde esta vista.`
      );
      return;
    }

    const payload = { status: newStatus };

    dispatch(updateBudget(idBudget, payload))
      .then(() => {
        refreshBudgets(); // ✅ Refrescar con parámetros actuales
      })
      .catch((error) => {
        console.error("Error al actualizar el estado:", error);
        alert(
          "Error al actualizar el estado: " + (error.message || "Unknown error")
        );
      });
  };
  
  // 🆕 FUNCIÓN: Reenviar presupuesto editado al cliente
  const handleResendBudget = async (budget) => {
    const applicantEmail = budget.Permit?.applicantEmail || budget.applicantEmail;
    
    if (!applicantEmail) {
      alert('❌ No hay email de cliente configurado para este presupuesto');
      return;
    }

    if (!window.confirm(
      `¿Reenviar presupuesto editado #${budget.idBudget} al cliente?\n\n` +
      `📧 Destinatario: ${applicantEmail}\n` +
      `📋 Se enviará el presupuesto actualizado para revisión preliminar (SIN firma digital).\n\n` +
      `El cliente recibirá:\n` +
      `- PDF del presupuesto actualizado\n` +
      `- Botones para aprobar o rechazar\n` +
      `- Link para ver el presupuesto en línea`
    )) {
      return;
    }

    try {
      console.log(`📤 Reenviando presupuesto ${budget.idBudget} a ${applicantEmail}...`);
      
      const result = await dispatch(resendBudgetToClient(budget.idBudget));
      
      if (result.type === 'RESEND_BUDGET_SUCCESS') {
        alert(
          `✅ Presupuesto reenviado exitosamente\n\n` +
          `📧 Email enviado a: ${applicantEmail}\n` +
          `📋 Estado: ${result.payload.budget?.status || 'pending_review'}\n\n` +
          `El cliente puede revisar y aprobar/rechazar el presupuesto.`
        );
        refreshBudgets();
      }
    } catch (error) {
      console.error('❌ Error al reenviar presupuesto:', error);
      alert(
        `❌ Error al reenviar el presupuesto\n\n` +
        `${error.message || 'Error desconocido'}\n\n` +
        `Por favor, verifica:\n` +
        `- El presupuesto tiene PDF generado\n` +
        `- El email del cliente es válido\n` +
        `- La conexión con el servidor`
      );
    }
  };
  
  // 🆕 FUNCIÓN: Enviar presupuesto para revisión del cliente (primera vez)
  const handleSendForReview = async (budget) => {
    const applicantEmail = budget.Permit?.applicantEmail || budget.applicantEmail;
    
    if (!applicantEmail) {
      alert('❌ No hay email de cliente configurado');
      return;
    }

    if (!window.confirm(
      `¿Enviar presupuesto #${budget.idBudget} para revisión del cliente?\n\n` +
      `📧 Destinatario: ${applicantEmail}\n` +
      `Se enviará para revisión preliminar (SIN firma digital).`
    )) {
      return;
    }

    try {
      const result = await dispatch(resendBudgetToClient(budget.idBudget));
      
      if (result.type === 'RESEND_BUDGET_SUCCESS') {
        alert(`✅ Presupuesto enviado para revisión a ${applicantEmail}`);
        refreshBudgets();
      }
    } catch (error) {
      console.error('Error al enviar presupuesto:', error);
      alert(`❌ Error: ${error.message}`);
    }
  };
  
  // 🆕 FUNCIÓN: Enviar presupuesto aprobado a SignNow
  const handleSendToSignNow = async (budget) => {
    if (!window.confirm(
      `¿Enviar presupuesto #${budget.idBudget} a SignNow?\n\n` +
      `El cliente ya aprobó este presupuesto.\n` +
      `Se enviará para firma digital y pago.`
    )) {
      return;
    }

    try {
      const result = await dispatch(sendBudgetToSignNow(budget.idBudget));
      
      if (result.type === 'SEND_TO_SIGNNOW_SUCCESS') {
        alert(
          `✅ Presupuesto enviado a SignNow\n\n` +
          `El cliente recibirá un email para firmar digitalmente.`
        );
        refreshBudgets();
      }
    } catch (error) {
      console.error('Error al enviar a SignNow:', error);
      alert(`❌ Error al enviar a SignNow: ${error.message}`);
    }
  };
  
  // 🆕 FUNCIÓN: Convertir Draft a Invoice
  // --- FUNCIÓN PARA MOSTRAR PDF DE PERMISO/OPCIONAL EN MODAL ---
  const handleShowPermitPdfInModal = async (budget, pdfType) => {
    console.log('🔍 Opening PDF Modal:', { budgetId: budget.idBudget, pdfType });
    
    const loadingKey = `${budget.idBudget}-${pdfType}`;
    setIsLoadingPdfInModal(loadingKey);

    if (pdfUrlForModal) {
      console.log("Revocando URL de modal anterior:", pdfUrlForModal);
      URL.revokeObjectURL(pdfUrlForModal);
      setPdfUrlForModal("");
    }

    let endpoint = "";
    let title = "";

    if (pdfType === "pdfData") {
      endpoint = `/budget/${budget.idBudget}/permit-pdf`;
      title = `Permiso Principal - Presupuesto ${budget.idBudget}`;
    } else if (pdfType === "optionalDocs") {
      endpoint = `/budget/${budget.idBudget}/optional-docs`;
      title = `Documentos Opcionales - Presupuesto ${budget.idBudget}`;
    } else {
      alert("Tipo de PDF no soportado");
      setIsLoadingPdfInModal(null);
      return;
    }

    console.log('📡 Making API call to:', endpoint);

    try {
      const response = await api.get(endpoint, { responseType: "blob" });
      const objectUrl = URL.createObjectURL(
        new Blob([response.data], { type: "application/pdf" })
      );
      
      console.log('✅ PDF loaded successfully, setting modal state:', {
        objectUrl,
        title,
        modalWillOpen: true
      });
      
      setPdfUrlForModal(objectUrl);
      setPdfTitleForModal(title);
      setIsModalOpen(true);
      
      console.log('🎯 Modal state updated. Current states:', {
        isModalOpen: true,
        pdfUrlForModal: objectUrl,
        pdfTitleForModal: title
      });
     
    } catch (e) {
      console.error("Error obteniendo el PDF desde el backend:", e);
      
      // Mensaje específico para 404
      if (e.response && e.response.status === 404) {
        alert("Este presupuesto no tiene el archivo solicitado.");
      } else {
        alert("No se pudo cargar el archivo PDF.");
      }
      
      setPdfUrlForModal("");
    }
    setIsLoadingPdfInModal(null);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    if (pdfUrlForModal) {
      URL.revokeObjectURL(pdfUrlForModal);
    }
    setPdfUrlForModal("");
    setPdfTitleForModal("");
  };

  // --- HANDLERS PARA EDITAR DATOS DE CLIENTE ---
  const handleEditClientData = (budgetId) => {
    setSelectedBudgetIdForClient(budgetId);
    setShowClientDataModal(true);
  };

  const handleClientDataUpdated = (updatedData) => {
    // Recargar la lista de presupuestos para mostrar los datos actualizados
    refreshBudgets(); // ✅ Refrescar con parámetros actuales
  };

  // 🆕 HANDLER PARA EXPORTAR A EXCEL
  const handleExportToExcel = async () => {
    try {
      await dispatch(exportBudgetsToExcel({
        search: debouncedSearchTerm,
        status: statusFilter,
        month: monthFilter,
        year: yearFilter
      }));
      // El archivo se descarga automáticamente
    } catch (error) {
      console.error('Error al exportar a Excel:', error);
      alert('Error al exportar los budgets a Excel');
    }
  };

  useEffect(() => {
    return () => {
      if (pdfUrlForModal) {
        URL.revokeObjectURL(pdfUrlForModal);
      }
    };
  }, [pdfUrlForModal]);

  const getStatusColor = (budget) => {
    // ✅ Verificar si tiene firma manual completa (debe tratarse como "signed")
    const isManuallySigned = budget.signatureMethod === 'manual' && budget.manualSignedPdfPath;
    
    if (isManuallySigned || budget.status === "signed") {
      return "bg-green-200"; // Verde más intenso para firmado
    }
    
    switch (budget.status) {
      case "draft":
        return "bg-gray-100"; // 🆕 Gris claro para borrador
      case "created":
      case "pending":
        return "bg-white"; // Blanco para creado/pendiente
      case "pending_review":
        return "bg-blue-50"; // 🆕 Azul muy claro para en revisión
      case "client_approved":
        return "bg-green-50"; // 🆕 Verde muy claro para aprobado por cliente
      case "send":
        return "bg-blue-200"; // Amarillo claro para enviado
      case "sent_for_signature":
        return "bg-yellow-100"; // Azul claro para enviado a SignNow
      case "approved":
        return "bg-green-100"; // Verde claro para aprobado
      case "notResponded":
        return "bg-orange-100"; // Naranja para sin respuesta
      case "rejected":
        return "bg-red-100"; // Rojo claro para rechazado
      default:
        return "bg-gray-50"; // Gris muy claro por defecto
    }
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-2 sm:p-4 md:p-6 lg:p-8 overflow-x-hidden">
      <div className="max-w-full sm:max-w-7xl mx-auto px-2 sm:px-0">
        <h1 className="text-2xl md:text-3xl font-bold mb-8 text-blue-900 flex items-center gap-3">
          <span className="inline-block bg-blue-100 text-blue-700 rounded-full px-3 py-1 text-lg font-semibold">
            Monthly Budgets
          </span>
          <span className="text-base font-normal text-gray-400">
            Overview & Management
          </span>
        </h1>

        {/* Filter Section */}
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search Input */}
            <div className="sm:col-span-2 lg:col-span-1">
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                Search
              </label>
              <div className="relative">
                <input
                  id="search"
                  type="text"
                  placeholder="Search budgets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {/* Indicador de búsqueda activa */}
                {searchTerm && searchTerm !== debouncedSearchTerm && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                  </div>
                )}
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                id="status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="pending_review">Pending Review</option>
                <option value="client_approved">Client Approved</option>
                <option value="created">Created</option>
                <option value="send">Send</option>
                <option value="sent_for_signature">Sent for Signature</option>
                <option value="signed">Signed</option>
                <option value="approved">Approved</option>
                <option value="notResponded">Not Responded</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            {/* Month Filter */}
            <div>
              <label htmlFor="month" className="block text-sm font-medium text-gray-700 mb-2">
                Month
              </label>
              <select
                id="month"
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Months</option>
                <option value="1">January</option>
                <option value="2">February</option>
                <option value="3">March</option>
                <option value="4">April</option>
                <option value="5">May</option>
                <option value="6">June</option>
                <option value="7">July</option>
                <option value="8">August</option>
                <option value="9">September</option>
                <option value="10">October</option>
                <option value="11">November</option>
                <option value="12">December</option>
              </select>
            </div>

            {/* Year Filter */}
            <div>
              <label htmlFor="year" className="block text-sm font-medium text-gray-700 mb-2">
                Year
              </label>
              <select
                id="year"
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Years</option>
                <option value="2024">2024</option>
                <option value="2025">2025</option>
                <option value="2026">2026</option>
              </select>
            </div>
          </div>

          {/* 🆕 BOTÓN EXPORTAR A EXCEL */}
          {!isReadOnly && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleExportToExcel}
                title="Exporta los budgets según los filtros aplicados"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 shadow-md hover:shadow-lg font-medium text-sm"
              >
                <ArrowDownTrayIcon className="h-5 w-5" />
                <span className="hidden sm:inline">Export to Excel</span>
                <span className="sm:hidden">Export</span>
              </button>
            </div>
          )}
        </div>

        {loading && <p className="text-blue-500">Loading Budgets...</p>}
        {error && <p className="text-red-500">Error: {error}</p>}
        {!loading && !error && (
          <>
            {/* Tabla optimizada para tablets/desktop */}
            <div className="hidden md:block overflow-x-auto shadow-2xl rounded-2xl mb-8 max-w-full">
              <div className="min-w-[1200px] lg:min-w-0">
                <table className="w-full table-auto border-collapse bg-white rounded-2xl overflow-hidden">
                <thead>
                  <tr className="bg-blue-50 text-xs lg:text-sm text-blue-800 uppercase tracking-wider">
                    <th className="border border-gray-200 px-4 py-3 text-left">
                      Applicant
                    </th>
                    <th className="border border-gray-200 px-4 py-3 text-left">
                      Date
                    </th>
                    <th className="border border-gray-200 px-4 py-3 text-left">
                      End Date
                    </th>
                    <th className="border border-gray-200 px-4 py-3 text-right">
                      Total Price
                    </th>
                    <th className="border border-gray-200 px-4 py-3 text-right">
                      Pay
                    </th>
                    <th className="border border-gray-200 px-4 py-3 text-center">
                      Status
                    </th>
                    <th className="border border-gray-200 px-4 py-3 text-left">
                      Address
                    </th>
                    <th className="border border-gray-200 px-4 py-3 text-left">
                      System
                    </th>
                    <th className="border border-gray-200 px-4 py-3 text-left">
                      Notes
                    </th>
                    <th className="border border-gray-200 px-4 py-3 text-center">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {budgets &&
                    budgets.map((budget) => {
                      const permitId = budget.Permit?.idPermit;
                      const hasPermitPdfData = !!(
                        budget.Permit && budget.Permit.hasPermitPdfData
                      );
                      const hasPermitOptionalDocs = !!(
                        budget.Permit && budget.Permit.hasOptionalDocs
                      );
                      const hasBudgetPdfItself = !!budget.pdfPath;
                      
                      // Variables for legacy budget detection
                      const isLegacyBudget = budget.isLegacy === true;
                      const hasLegacyBudgetPdf = isLegacyBudget && !!budget.hasLegacySignedPdf;

                      let permitExpirationAlertIcon = null;
                      const permitExpStatus =
                        budget.Permit?.expirationStatus ||
                        budget.permitExpirationStatus;
                      const permitExpMessage =
                        budget.Permit?.expirationMessage ||
                        budget.permitExpirationMessage;

                      if (
                        permitExpStatus === "expired" ||
                        permitExpStatus === "soon_to_expire"
                      ) {
                        const isError = permitExpStatus === "expired";
                        const alertColorClass = isError
                          ? "text-red-500"
                          : "text-yellow-500";
                        const pingColorClass = isError
                          ? "bg-red-400"
                          : "bg-yellow-400";
                        const alertMessage =
                          permitExpMessage ||
                          (isError
                            ? "Permiso Vencido"
                            : "Permiso Próximo a Vencer");

                        permitExpirationAlertIcon = (
                          <span
                            title={alertMessage}
                            className="relative ml-2 cursor-help inline-flex items-center justify-center h-5 w-5" // Explicit size for table icon container
                          >
                            <span
                              className={`absolute inline-flex h-full w-full rounded-full ${pingColorClass} opacity-75 animate-ping`}
                            ></span>
                            <ExclamationTriangleIcon
                              className={`relative z-10 inline-flex h-5 w-5 ${alertColorClass}`}
                            />{" "}
                            {/* z-10 and explicit size */}
                          </span>
                        );
                      }

                      // 🆕 Determinar si es Draft o Invoice
                      const isDraft = !budget.invoiceNumber;
                      const displayNumber = isDraft 
                        ? `BUDGET #${budget.idBudget}`
                        : `INVOICE #${budget.invoiceNumber}`;

                      return (
                        <tr
                          key={budget.idBudget}
                          className={`hover:bg-gray-100 transition-colors ${getStatusColor(
                            budget
                          )}`}
                        >
                          <td className="border border-gray-300 px-4 py-2 text-xs">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{budget.applicantName}</span>
                                {permitExpirationAlertIcon}
                              </div>
                              <div className="flex items-center gap-2">
                                {/* Badge: Draft o Invoice */}
                                {isDraft ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-200 text-gray-700">
                                    <DocumentCheckIcon className="h-3 w-3" />
                                    {displayNumber}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-200 text-green-800">
                                    <DocumentCheckIcon className="h-3 w-3" />
                                    {displayNumber}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="border border-gray-300 px-4 py-2 text-xs">
                            {formatDate(budget.date)}
                          </td>
                          <td className="border border-gray-300 px-4 py-2 text-xs">
                            {budget.expirationDate
                              ? formatDate(budget.expirationDate)
                              : "N/A"}
                          </td>
                          <td className="border border-gray-300 px-4 py-2 text-xs text-right">
                            ${budget.totalPrice}
                          </td>
                          <td className="border border-gray-300 px-4 py-2 text-xs text-right">
                            ${budget.initialPayment}
                          </td>
                          <td className="border border-gray-300 px-4 py-2 text-xs text-center">
                            {budget.status}
                          </td>
                          <td className="border border-gray-300 px-4 py-2 text-xs">
                            {budget.propertyAddress || "N/A"}
                          </td>
                          <td className="border border-gray-300 px-4 py-2 text-xs">
                            {" "}
                            {budget.Permit?.systemType ||
                              budget.systemType ||
                              "N/A"}
                          </td>
                          <td className="border border-gray-300 px-4 py-2 text-xs align-top">
                            {editingBudgetId === budget.idBudget ? (
                              <div className="flex flex-col">
                                <textarea
                                  value={currentNote}
                                  onChange={handleNoteChange}
                                  className="w-full p-1 border rounded text-xs resize-y min-h-[50px]" // textarea en lugar de input
                                  rows={3} // Altura inicial
                                  disabled={isSavingNote} // Deshabilitar mientras guarda
                                />
                                <div className="flex justify-end space-x-1 mt-1">
                                  <button
                                    onClick={handleSaveNote}
                                    disabled={isSavingNote}
                                    className="p-1 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                                    title="Save Notes"
                                  >
                                    {isSavingNote ? (
                                      <svg
                                        className="animate-spin h-4 w-4 text-white" /* ... spinner ... */
                                      ></svg>
                                    ) : (
                                      <CheckIcon className="h-4 w-4" />
                                    )}
                                  </button>
                                  <button
                                    onClick={handleCancelEditNote}
                                    disabled={isSavingNote}
                                    className="p-1 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                                    title="Cancel Edit"
                                  >
                                    <XMarkIcon className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              // Modo Visualización
                              <div className="flex justify-between items-start">
                                <span className="whitespace-pre-wrap break-words max-w-[200px]">
                                  {" "}
                                  {/* Permitir saltos de línea y limitar ancho */}
                                  {budget.generalNotes || (
                                    <span className="text-gray-400 italic">
                                      No notes
                                    </span>
                                  )}
                                </span>
                                <button
                                  onClick={() => handleEditNoteClick(budget)}
                                  disabled={isReadOnly}
                                  className={`ml-2 p-1 ${
                                    isReadOnly 
                                      ? 'text-gray-400 cursor-not-allowed' 
                                      : 'text-blue-600 hover:text-blue-800'
                                  }`}
                                  title={isReadOnly ? "View only - No edit permissions" : "Edit Notes"}
                                >
                                  <PencilIcon className="h-4 w-4" />
                                </button>
                              </div>
                            )}
                          </td>
                          {/* --- FIN CELDA DE NOTAS --- */}
                          <td className="border border-gray-300 px-2 py-2">
                            <div className="flex flex-row items-center justify-center gap-1.5">
                              {" "}
                              {/* Cambio: flex-row y gap-1.5 para mejor separación */}
                              {/* ESTADO: DRAFT - Solo enviar para revisión del cliente */}
                              {budget.status === "draft" && (
                                <div className="flex flex-col gap-1 w-full min-w-[100px]">
                                  {/* Botón: Enviar para Revisión del Cliente */}
                                  <button
                                    onClick={() => handleSendForReview(budget)}
                                    disabled={isReadOnly}
                                    className={`inline-flex items-center justify-center px-3 py-1.5 rounded text-[10px] font-medium w-full shadow-sm ${
                                      isReadOnly 
                                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                                        : 'bg-blue-500 text-white hover:bg-blue-600'
                                    }`}
                                    title={isReadOnly ? "View only - No edit permissions" : "Send for Client Review"}
                                  >
                                    📧 Send Quote
                                  </button>
                                </div>
                              )}
                              
                              {/* ESTADO: CREATED (Invoice convertido después de aprobación) */}
                              {((budget.status === "created" || budget.status === "client_approved") && !isDraft) && (
                                <div className="flex flex-col gap-1 w-full min-w-[100px]">
                                  <p className="text-green-700 text-[10px] font-semibold bg-green-100 px-2 py-1 rounded leading-tight text-center">
                                    ✅ Approved
                                  </p>
                                  {/* Botón: Send to SignNow (para firma y pago) */}
                                  <button
                                    onClick={() => handleSendToSignNow(budget)}
                                    disabled={isReadOnly}
                                    className={`inline-flex items-center justify-center px-3 py-1.5 rounded text-[10px] font-medium w-full shadow-sm ${
                                      isReadOnly 
                                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                                        : 'bg-purple-500 text-white hover:bg-purple-600'
                                    }`}
                                    title={isReadOnly ? "View only - No edit permissions" : "Send to SignNow for Signature & Payment"}
                                  >
                                    📝 Send SignNow
                                  </button>
                                </div>
                              )}
                              
                              {/* 🆕 ESTADO: PENDING_REVIEW - Esperando aprobación del cliente */}
                              {budget.status === "pending_review" && (
                                <div className="flex flex-col gap-1 w-full">
                                  <p className="text-blue-700 text-[10px] font-semibold bg-blue-100 px-1 py-0.5 rounded leading-tight text-center">
                                    📧 In Review
                                  </p>
                                  <p className="text-gray-600 text-[8px] text-center">
                                    Awaiting client
                                  </p>
                                  {/* 🆕 Botón: Reenviar presupuesto editado */}
                                  <button
                                    onClick={() => handleResendBudget(budget)}
                                    disabled={isReadOnly}
                                    className={`inline-flex items-center justify-center px-1 py-0.5 rounded text-[8px] w-16 h-5 ${
                                      isReadOnly 
                                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                                        : 'bg-orange-500 text-white hover:bg-orange-600'
                                    }`}
                                    title={isReadOnly ? "View only - No edit permissions" : "Resend updated budget to client"}
                                  >
                                    🔄 Resend
                                  </button>
                                </div>
                              )}
                              
                              {/* 🆕 ESTADO: CLIENT_APPROVED - Cliente aprobó, ya convertido a Invoice automáticamente */}
                              {budget.status === "client_approved" && (
                                <div className="flex flex-col gap-1 w-full min-w-[100px]">
                                  <p className="text-green-700 text-[10px] font-semibold bg-green-100 px-2 py-1 rounded leading-tight text-center">
                                    ✅ Approved
                                  </p>
                                  
                                  {/* Botón: Send to SignNow (para firma y pago) */}
                                  <button
                                    onClick={() => handleSendToSignNow(budget)}
                                    disabled={isReadOnly}
                                    className={`inline-flex items-center justify-center px-3 py-1.5 rounded text-[10px] font-medium w-full shadow-sm ${
                                      isReadOnly 
                                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                                        : 'bg-purple-500 text-white hover:bg-purple-600'
                                    }`}
                                    title={isReadOnly ? "View only - No edit permissions" : "Send to SignNow for Signature & Payment"}
                                  >
                                    📝 SignNow
                                  </button>
                                </div>
                              )}
                              
                              {/* ESTADO: SEND - Estado + botón reject + resend */}
                              {budget.status === "send" && (
                                <div className="flex flex-col gap-1 w-full min-w-[100px]">
                                  <div className="text-center">
                                    <p className="text-yellow-700 text-[10px] font-semibold bg-yellow-100 px-2 py-1 rounded leading-tight">
                                      Sent
                                    </p>
                                    {budget.paymentInvoice ? (
                                      <p className="text-green-600 text-[8px] font-semibold mt-0.5">
                                        ✓ Invoice
                                      </p>
                                    ) : (
                                      <p className="text-orange-600 text-[8px] font-semibold mt-0.5">
                                        ⚠ Invoice
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex gap-1">
                                    {/* 🆕 Botón: Reenviar */}
                                    <button
                                      onClick={() => handleResendBudget(budget)}
                                      disabled={isReadOnly}
                                      className={`inline-flex items-center justify-center px-2 py-1.5 rounded text-[10px] font-medium flex-1 shadow-sm ${
                                        isReadOnly 
                                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                                          : 'bg-orange-500 text-white hover:bg-orange-600'
                                      }`}
                                      title={isReadOnly ? "View only - No edit permissions" : "Resend updated budget"}
                                    >
                                      🔄 Resend
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleUpdateStatus(
                                          budget.idBudget,
                                          "rejected",
                                          budget
                                        )
                                      }
                                      disabled={isReadOnly}
                                      className={`inline-flex items-center justify-center px-2 py-1.5 rounded text-[10px] font-medium shadow-sm ${
                                        isReadOnly 
                                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                                          : 'bg-red-500 text-white hover:bg-red-600'
                                      }`}
                                      title={isReadOnly ? "View only - No edit permissions" : "Reject Budget"}
                                    >
                                      Reject
                                    </button>
                                  </div>
                                </div>
                              )}
                              {/* ESTADO: SENT_FOR_SIGNATURE - Estado + botón reject horizontalmente */}
                              {budget.status === "sent_for_signature" && (
                                <div className="flex flex-col gap-1 w-full min-w-[100px]">
                                  <p className="text-blue-700 text-[10px] font-semibold bg-blue-100 px-2 py-1 rounded text-center leading-tight">
                                    To Sign
                                  </p>
                                  <button
                                    onClick={() =>
                                      handleUpdateStatus(
                                        budget.idBudget,
                                        "rejected",
                                        budget
                                      )
                                    }
                                    disabled={isReadOnly}
                                    className={`inline-flex items-center justify-center px-3 py-1.5 rounded text-[10px] font-medium w-full shadow-sm ${
                                      isReadOnly 
                                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                                        : 'bg-red-500 text-white hover:bg-red-600'
                                    }`}
                                    title={isReadOnly ? "View only - No edit permissions" : "Reject Budget"}
                                  >
                                    Reject
                                  </button>
                                </div>
                              )}
                              {/* ESTADO: APPROVED */}
                              {budget.status === "approved" && (
                                <div className="w-full min-w-[100px]">
                                  <p className="text-green-700 text-[10px] font-semibold bg-green-100 px-2 py-1.5 rounded text-center leading-tight">
                                    Approved
                                  </p>
                                </div>
                              )}
                              {/* ESTADO: SIGNED (incluye firma manual) */}
                              {(budget.status === "signed" || (budget.signatureMethod === 'manual' && budget.manualSignedPdfPath)) && (
                                <div className="w-full min-w-[100px]">
                                  <p className="text-green-800 text-[10px] font-semibold bg-green-200 px-2 py-1.5 rounded text-center leading-tight">
                                    Signed
                                  </p>
                                </div>
                              )}
                              {/* ESTADO: REJECTED - Puede reenviarse para revisión */}
                              {budget.status === "rejected" && (
                                <div className="flex flex-col gap-1 w-full min-w-[100px]">
                                  <p className="text-red-700 text-[10px] font-semibold bg-red-100 px-2 py-1 rounded text-center leading-tight">
                                    ❌ Rejected
                                  </p>
                                  {/* Botón: Reenviar para Revisión */}
                                  <button
                                    onClick={() => handleResendBudget(budget)}
                                    disabled={isReadOnly}
                                    className={`inline-flex items-center justify-center px-3 py-1.5 rounded text-[10px] font-medium w-full shadow-sm ${
                                      isReadOnly 
                                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                                        : 'bg-blue-500 text-white hover:bg-blue-600'
                                    }`}
                                    title={isReadOnly ? "View only - No edit permissions" : "Resend updated budget for client review"}
                                  >
                                    🔄 Resend
                                  </button>
                                </div>
                              )}
                              {/* ESTADO: NOT RESPONDED - Estado + botón reject horizontalmente */}
                              {budget.status === "notResponded" && (
                                <div className="flex flex-col gap-1 w-full min-w-[100px]">
                                  <p className="text-orange-700 text-[10px] font-semibold bg-orange-100 px-2 py-1 rounded text-center leading-tight">
                                    No Response
                                  </p>
                                  <button
                                    onClick={() =>
                                      handleUpdateStatus(
                                        budget.idBudget,
                                        "rejected",
                                        budget
                                      )
                                    }
                                    disabled={isReadOnly}
                                    className={`inline-flex items-center justify-center px-3 py-1.5 rounded text-[10px] font-medium w-full shadow-sm ${
                                      isReadOnly 
                                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                                        : 'bg-red-500 text-white hover:bg-red-600'
                                    }`}
                                    title={isReadOnly ? "View only - No edit permissions" : "Reject Budget"}
                                  >
                                    Reject
                                  </button>
                                </div>
                              )}
                              {/* Separador visual si hay PDFs */}
                              {hasBudgetPdfItself && (
                                <div className="border-l border-gray-300 h-8 mx-1"></div>
                              )}
                              {/* Botones PDF horizontalmente */}
                              {hasBudgetPdfItself && (
                                <>
                                  <button
                                    onClick={() =>
                                      handleViewPdf(budget.idBudget)
                                    }
                                    disabled={viewingPdfId === budget.idBudget}
                                    className="inline-flex items-center justify-center bg-teal-600 text-white p-1.5 rounded hover:bg-teal-700 disabled:opacity-50 shadow-sm"
                                    title="View Budget PDF"
                                  >
                                    {viewingPdfId === budget.idBudget ? (
                                      <svg
                                        className="animate-spin h-4 w-4"
                                        viewBox="0 0 24 24"
                                      >
                                        <circle
                                          className="opacity-25"
                                          cx="12"
                                          cy="12"
                                          r="10"
                                          stroke="currentColor"
                                          strokeWidth="4"
                                        ></circle>
                                        <path
                                          className="opacity-75"
                                          fill="currentColor"
                                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                        ></path>
                                      </svg>
                                    ) : (
                                      <EyeIcon className="h-4 w-4" />
                                    )}
                                  </button>

                                  <button
                                    onClick={() =>
                                      handleDownloadPdf(
                                        budget.idBudget,
                                        `budget_${budget.idBudget}.pdf`
                                      )
                                    }
                                    disabled={
                                      downloadingPdfId === budget.idBudget
                                    }
                                    className="inline-flex items-center justify-center bg-blue-600 text-white p-1.5 rounded hover:bg-blue-700 disabled:opacity-50 shadow-sm"
                                    title="Download Budget PDF"
                                  >
                                    {downloadingPdfId === budget.idBudget ? (
                                      <svg
                                        className="animate-spin h-4 w-4"
                                        viewBox="0 0 24 24"
                                      >
                                        <circle
                                          className="opacity-25"
                                          cx="12"
                                          cy="12"
                                          r="10"
                                          stroke="currentColor"
                                          strokeWidth="4"
                                        ></circle>
                                        <path
                                          className="opacity-75"
                                          fill="currentColor"
                                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                        ></path>
                                      </svg>
                                    ) : (
                                      <DocumentArrowDownIcon className="h-4 w-4" />
                                    )}
                                  </button>
                                </>
                              )}
                              {/* Botones de PDF de permisos horizontalmente */}
                              {permitId && hasPermitPdfData && (
                                <button
                                  onClick={() =>
                                    handleShowPermitPdfInModal(
                                      budget,
                                      "pdfData"
                                    )
                                  }
                                  disabled={
                                    isLoadingPdfInModal ===
                                    `${budget.idBudget}-pdfData`
                                  }
                                  className="inline-flex items-center justify-center bg-indigo-600 text-white p-1.5 rounded hover:bg-indigo-700 disabled:opacity-50 shadow-sm"
                                  title="View Permit PDF"
                                >
                                  {isLoadingPdfInModal ===
                                  `${budget.idBudget}-pdfData` ? (
                                    <svg
                                      className="animate-spin h-4 w-4"
                                      viewBox="0 0 24 24"
                                    >
                                      <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                      ></circle>
                                      <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                      ></path>
                                    </svg>
                                  ) : (
                                    <PaperClipIcon className="h-4 w-4" />
                                  )}
                                </button>
                              )}
                              {permitId && hasPermitOptionalDocs && (
                                <button
                                  onClick={() =>
                                    handleShowPermitPdfInModal(
                                      budget,
                                      "optionalDocs"
                                    )
                                  }
                                  disabled={
                                    isLoadingPdfInModal ===
                                    `${budget.idBudget}-optionalDocs`
                                  }
                                  className="inline-flex items-center justify-center bg-purple-600 text-white p-1.5 rounded hover:bg-purple-700 disabled:opacity-50 shadow-sm"
                                  title="View Optional Docs"
                                >
                                  {isLoadingPdfInModal ===
                                  `${budget.idBudget}-optionalDocs` ? (
                                    <svg
                                      className="animate-spin h-4 w-4"
                                      viewBox="0 0 24 24"
                                    >
                                      <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                      ></circle>
                                      <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                      ></path>
                                    </svg>
                                  ) : (
                                    <PaperClipIcon className="h-4 w-4" />
                                  )}
                                </button>
                              )}
                              
                              {/* Botón para ver PDF Legacy */}
                              {hasLegacyBudgetPdf && (
                                <button
                                  onClick={() =>
                                    handleViewLegacyBudgetPdf(budget.idBudget, budget.legacySignedPdfUrl)
                                  }
                                  disabled={viewingPdfId === budget.idBudget}
                                  className="inline-flex items-center justify-center bg-amber-600 text-white p-1.5 rounded hover:bg-amber-700 disabled:opacity-50 shadow-sm"
                                  title="Ver PDF Legacy"
                                >
                                  {viewingPdfId === budget.idBudget ? (
                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                  ) : (
                                    <DocumentArrowDownIcon className="h-4 w-4" />
                                  )}
                                </button>
                              )}

                              {/* Botón para editar datos de cliente */}
                              <button
                                onClick={() => handleEditClientData(budget.idBudget)}
                                disabled={isReadOnly}
                                className={`inline-flex items-center justify-center p-1.5 rounded shadow-sm ${
                                  isReadOnly 
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                                }`}
                                title={isReadOnly ? "View only - No edit permissions" : "Edit Client Data"}
                              >
                                <UserIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
              </div>
            </div>

            {/* Vista de cards optimizada para tablet/móvil */}
            <div className="block md:hidden space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                {budgets &&
                  budgets.map((budget) => {
                    let paymentLabel = `Pay ${
                      budget.initialPaymentPercentage || 60
                    }%`;
                    if (
                      budget.initialPaymentPercentage === 100 ||
                      String(budget.initialPaymentPercentage).toLowerCase() ===
                        "total"
                    ) {
                      paymentLabel = `Pay 100%`;
                    }

                    let permitExpirationAlertIconCard = null;
                    const permitExpStatus =
                      budget.Permit?.expirationStatus ||
                      budget.permitExpirationStatus;
                    const permitExpMessage =
                      budget.Permit?.expirationMessage ||
                      budget.permitExpirationMessage;

                    if (
                      permitExpStatus === "expired" ||
                      permitExpStatus === "soon_to_expire"
                    ) {
                      const isError = permitExpStatus === "expired";
                      const alertColorClass = isError
                        ? "text-red-500"
                        : "text-yellow-500";
                      const pingColorClass = isError
                        ? "bg-red-400"
                        : "bg-yellow-400";
                      const alertMessage =
                        permitExpMessage ||
                        (isError
                          ? "Permiso Vencido"
                          : "Permiso Próximo a Vencer");

                      permitExpirationAlertIconCard = (
                        <span
                          title={alertMessage}
                          className="relative ml-2 cursor-help inline-flex items-center justify-center h-6 w-6" // Explicit size for card icon container
                        >
                          <span
                            className={`absolute inline-flex h-full w-full rounded-full ${pingColorClass} opacity-75 animate-ping`}
                          ></span>
                          <ExclamationTriangleIcon
                            className={`relative z-10 inline-flex h-6 w-6 ${alertColorClass}`}
                          />{" "}
                          {/* z-10 and explicit size */}
                        </span>
                      );
                    }
                    // Variables para la lógica de los botones PDF (igual que en la tabla)
                    const permitId = budget.Permit?.idPermit;
                    const hasPermitPdfData = !!(
                      budget.Permit && budget.Permit.hasPermitPdfData
                    );
                    const hasPermitOptionalDocs = !!(
                      budget.Permit && budget.Permit.hasOptionalDocs
                    );
                    const hasBudgetPdfItself = !!budget.pdfPath;
                    const isLegacyBudget = !!budget.isLegacy;
                    const hasLegacyBudgetPdf = isLegacyBudget && !!budget.hasLegacySignedPdf;

                    return (
                      <div
                        key={budget.idBudget}
                        className={`border border-gray-300 rounded-xl p-4 md:p-6 shadow-lg hover:shadow-xl transition-all duration-200 ${getStatusColor(
                          budget
                        )}`}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <p className="text-sm md:text-base font-semibold text-gray-700 flex items-center">
                            {budget.applicantName}
                            {permitExpirationAlertIconCard}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2 md:gap-3 text-xs md:text-sm text-gray-600 mb-4">
                          <p>Date: {formatDate(budget.date)}</p>
                          <p>
                            End:{" "}
                            {budget.expirationDate
                              ? formatDate(budget.expirationDate)
                              : "N/A"}
                          </p>
                          <p>
                            Price:{" "}
                            <span className="font-semibold">
                              ${budget.totalPrice}
                            </span>
                          </p>
                          <p>
                            {paymentLabel}:{" "}
                            <span className="font-semibold">
                              ${budget.initialPayment}
                            </span>
                          </p>
                          <p className="col-span-2">
                            Status:{" "}
                            <span className="font-medium capitalize">
                              {budget.status}
                            </span>
                          </p>
                          <p className="col-span-2 truncate">
                            Address: {budget.propertyAddress || "N/A"}
                          </p>
                          <p className="col-span-2">
                            System:{" "}
                            {budget.Permit?.systemType ||
                              budget.systemType ||
                              "N/A"}
                          </p>
                          
                          {/* Etiqueta Legacy */}
                          {isLegacyBudget && (
                            <div className="col-span-2">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border-2 border-amber-300">
                                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                                🏷️ TRABAJO LEGACY IMPORTADO
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Notes section */}
                        <div className="mb-4 pt-3 border-t border-gray-200">
                          <p className="text-xs md:text-sm font-semibold text-gray-700 mb-2">
                            Notes:
                          </p>
                          {editingBudgetId === budget.idBudget ? (
                            <div className="space-y-2">
                              <textarea
                                value={currentNote}
                                onChange={handleNoteChange}
                                className="w-full p-2 border border-gray-300 rounded-md text-sm resize-y min-h-[60px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                rows={3}
                                disabled={isSavingNote}
                                placeholder="Add notes..."
                              />
                              <div className="flex justify-end space-x-2">
                                <button
                                  onClick={handleSaveNote}
                                  disabled={isSavingNote}
                                  className="px-3 py-1.5 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 text-sm font-medium transition-colors"
                                >
                                  {isSavingNote ? "Saving..." : "Save"}
                                </button>
                                <button
                                  onClick={handleCancelEditNote}
                                  disabled={isSavingNote}
                                  className="px-3 py-1.5 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50 text-sm font-medium transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex justify-between items-start">
                              <span className="text-xs md:text-sm text-gray-600 break-words flex-1 mr-2">
                                {budget.generalNotes || (
                                  <span className="text-gray-400 italic">
                                    No notes
                                  </span>
                                )}
                              </span>
                              <button
                                onClick={() => handleEditNoteClick(budget)}
                                disabled={isReadOnly}
                                className={`p-1.5 rounded-md transition-colors ${
                                  isReadOnly 
                                    ? 'text-gray-400 cursor-not-allowed' 
                                    : 'text-blue-600 hover:text-blue-800 hover:bg-blue-50'
                                }`}
                                title={isReadOnly ? "View only - No edit permissions" : "Edit Notes"}
                              >
                                <PencilIcon className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Actions section optimized for touch */}
                        <div className="border-t border-gray-200 pt-4">
                          <p className="text-sm font-semibold mb-3 text-gray-700">
                            Actions:
                          </p>
                          <div className="space-y-3">
                            {/* Status action buttons */}
                            {budget.status === "created" && (
                              <div className="w-full space-y-2">
                                {/* 🆕 Botón: Enviar para Revisión */}
                                <button
                                  onClick={() => handleSendForReview(budget)}
                                  disabled={isReadOnly}
                                  className={`w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                                    isReadOnly 
                                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                                      : 'bg-blue-500 text-white hover:bg-blue-600'
                                  }`}
                                  title={isReadOnly ? "View only - No edit permissions" : "Send budget for client review"}
                                >
                                  📧 Send for Review
                                </button>
                                
                                {/* Botón Original: Send */}
                                <button
                                  onClick={() =>
                                    handleUpdateStatus(
                                      budget.idBudget,
                                      "send",
                                      budget
                                    )
                                  }
                                  disabled={isReadOnly}
                                  className={`w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                                    isReadOnly 
                                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                                      : 'bg-yellow-500 text-white hover:bg-yellow-600'
                                  }`}
                                  title={isReadOnly ? "View only - No edit permissions" : "Send budget to client"}
                                >
                                  Send Budget
                                </button>
                              </div>
                            )}
                            
                            {/* 🆕 ESTADO: PENDING_REVIEW */}
                            {budget.status === "pending_review" && (
                              <div className="w-full space-y-2">
                                <div className="text-center p-3 border rounded-lg bg-blue-50">
                                  <p className="text-sm font-semibold text-blue-700">
                                    📧 In Review
                                  </p>
                                  <p className="text-xs text-gray-600 mt-1">
                                    Awaiting client approval
                                  </p>
                                </div>
                                {/* 🆕 Botón: Reenviar presupuesto editado */}
                                <button
                                  onClick={() => handleResendBudget(budget)}
                                  disabled={isReadOnly}
                                  className={`w-full py-2 rounded-lg text-sm font-semibold ${
                                    isReadOnly 
                                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                                      : 'bg-orange-500 text-white hover:bg-orange-600'
                                  }`}
                                  title={isReadOnly ? "View only - No edit permissions" : "Resend updated budget"}
                                >
                                  🔄 Resend Updated Budget
                                </button>
                              </div>
                            )}
                            
                            {/* 🆕 ESTADO: CLIENT_APPROVED */}
                            {budget.status === "client_approved" && (
                              <div className="w-full space-y-2">
                                <div className="text-center p-3 border rounded-lg bg-green-50">
                                  <p className="text-sm font-semibold text-green-700">
                                    ✅ Approved by Client
                                  </p>
                                  <p className="text-xs text-gray-600 mt-1">
                                    Ready to send for signature
                                  </p>
                                </div>
                                {/* Botón: Send to SignNow */}
                                <button
                                  onClick={() => handleSendToSignNow(budget)}
                                  disabled={isReadOnly}
                                  className={`w-full py-2 rounded-lg text-sm font-semibold ${
                                    isReadOnly 
                                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                                      : 'bg-purple-500 text-white hover:bg-purple-600'
                                  }`}
                                  title={isReadOnly ? "View only - No edit permissions" : "Send to SignNow for signature"}
                                >
                                  📝 Send to SignNow
                                </button>
                              </div>
                            )}

                            {/* ESTADO: SEND - Estado + botones resend y reject */}
                            {budget.status === "send" && (
                              <div className="w-full space-y-2">
                                <div className="text-center p-2 border rounded bg-yellow-50">
                                  <p className="text-xs font-semibold text-yellow-700">
                                    Sent
                                  </p>
                                  {budget.paymentInvoice ? (
                                    <p className="text-green-600 text-[10px] font-semibold">
                                      ✓ Invoice OK
                                    </p>
                                  ) : (
                                    <p className="text-orange-600 text-[10px] font-semibold">
                                      ⚠ Need Invoice
                                    </p>
                                  )}
                                </div>
                                {/* 🆕 Botón: Reenviar */}
                                <button
                                  onClick={() => handleResendBudget(budget)}
                                  disabled={isReadOnly}
                                  className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    isReadOnly 
                                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                                      : 'bg-orange-500 text-white hover:bg-orange-600'
                                  }`}
                                  title={isReadOnly ? "View only - No edit permissions" : "Resend updated budget"}
                                >
                                  🔄 Resend Updated Budget
                                </button>
                                <button
                                  onClick={() =>
                                    handleUpdateStatus(
                                      budget.idBudget,
                                      "rejected",
                                      budget
                                    )
                                  }
                                  disabled={isReadOnly}
                                  className={`w-full px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                    isReadOnly 
                                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                                      : 'bg-red-500 text-white hover:bg-red-600'
                                  }`}
                                  title={isReadOnly ? "View only - No edit permissions" : "Reject budget"}
                                >
                                  Reject
                                </button>
                              </div>
                            )}

                            {/* ESTADO: SENT_FOR_SIGNATURE - Estado + botón reject horizontalmente */}
                            {budget.status === "sent_for_signature" && (
                              <div className="w-full space-y-2">
                                <div className="text-center p-2 border rounded bg-blue-50">
                                  <p className="text-xs font-semibold text-blue-700">
                                    Sent to Sign
                                  </p>
                                </div>
                                <button
                                  onClick={() =>
                                    handleUpdateStatus(
                                      budget.idBudget,
                                      "rejected",
                                      budget
                                    )
                                  }
                                  disabled={isReadOnly}
                                  className={`w-full px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                    isReadOnly 
                                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                                      : 'bg-red-500 text-white hover:bg-red-600'
                                  }`}
                                  title={isReadOnly ? "View only - No edit permissions" : "Reject budget"}
                                >
                                  Reject
                                </button>
                              </div>
                            )}

                            {budget.status === "approved" && (
                              <div className="w-full text-center text-green-700 text-xs font-semibold p-2 border rounded bg-green-50">
                                Approved
                              </div>
                            )}

                            {(budget.status === "signed" || (budget.signatureMethod === 'manual' && budget.manualSignedPdfPath)) && (
                              <div className="w-full text-center text-green-800 text-xs font-semibold p-2 border rounded bg-green-100">
                                Signed
                              </div>
                            )}

                            {budget.status === "rejected" && (
                              <div className="w-full space-y-2">
                                <div className="text-center p-2 border rounded bg-red-50">
                                  <p className="text-xs font-semibold text-red-700">
                                    ❌ Rejected
                                  </p>
                                </div>
                                {/* Botón: Reenviar para Revisión */}
                                <button
                                  onClick={() => handleResendBudget(budget)}
                                  disabled={isReadOnly}
                                  className={`w-full inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-md ${
                                    isReadOnly 
                                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                                      : 'bg-blue-600 text-white hover:bg-blue-700'
                                  }`}
                                  title={isReadOnly ? "View only - No edit permissions" : "Resend updated budget for client review"}
                                >
                                  🔄 Resend for Review
                                </button>
                              </div>
                            )}

                            {budget.status === "notResponded" && (
                              <div className="w-full space-y-2">
                                <div className="text-center p-2 border rounded bg-orange-50">
                                  <p className="text-xs font-semibold text-orange-700">
                                    No Response
                                  </p>
                                </div>
                                <button
                                  onClick={() =>
                                    handleUpdateStatus(
                                      budget.idBudget,
                                      "rejected",
                                      budget
                                    )
                                  }
                                  disabled={isReadOnly}
                                  className={`w-full px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                    isReadOnly 
                                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                                      : 'bg-red-500 text-white hover:bg-red-600'
                                  }`}
                                  title={isReadOnly ? "View only - No edit permissions" : "Reject budget"}
                                >
                                  Reject
                                </button>
                              </div>
                            )}

                            /* Botones de PDF (usando grid para mejor distribución si hay varios) */
                            {(hasBudgetPdfItself ||
                              hasLegacyBudgetPdf ||
                              (permitId &&
                                (hasPermitPdfData ||
                                  hasPermitOptionalDocs))) && (
                              <div className="grid grid-cols-2 gap-2 pt-2">
                                {/* Botón para presupuesto normal */}
                                {hasBudgetPdfItself && !isLegacyBudget && (
                                  <>
                                    <button
                                      onClick={() =>
                                        handleViewPdf(budget.idBudget)
                                      }
                                      disabled={
                                        viewingPdfId === budget.idBudget
                                      }
                                      className="flex items-center justify-center bg-teal-600 text-white px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors"
                                    >
                                      {viewingPdfId === budget.idBudget ? (
                                        <svg
                                          className="animate-spin h-4 w-4 mr-1"
                                          viewBox="0 0 24 24"
                                        >
                                          <circle
                                            className="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                          ></circle>
                                          <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                          ></path>
                                        </svg>
                                      ) : (
                                        <EyeIcon className="h-4 w-4 mr-1" />
                                      )}
                                      View
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleDownloadPdf(
                                          budget.idBudget,
                                          `budget_${budget.idBudget}.pdf`
                                        )
                                      }
                                      disabled={
                                        downloadingPdfId === budget.idBudget
                                      }
                                      className="flex items-center justify-center bg-blue-600 text-white px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                    >
                                      {downloadingPdfId === budget.idBudget ? (
                                        <svg
                                          className="animate-spin h-4 w-4 mr-1"
                                          viewBox="0 0 24 24"
                                        >
                                          <circle
                                            className="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                          ></circle>
                                          <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                          ></path>
                                        </svg>
                                      ) : (
                                        <DocumentArrowDownIcon className="h-4 w-4 mr-1" />
                                      )}
                                      Download
                                    </button>
                                  </>
                                )}
                                
                                {/* Botón para presupuesto LEGACY */}
                                {hasLegacyBudgetPdf && (
                                  <button
                                    onClick={() =>
                                      handleViewLegacyBudgetPdf(budget.idBudget, budget.legacySignedPdfUrl)
                                    }
                                    disabled={
                                      viewingPdfId === budget.idBudget
                                    }
                                    className="flex items-center justify-center bg-amber-600 text-white px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50 transition-colors"
                                  >
                                    {viewingPdfId === budget.idBudget ? (
                                      <svg
                                        className="animate-spin h-4 w-4 mr-1"
                                        viewBox="0 0 24 24"
                                      >
                                        <circle
                                          className="opacity-25"
                                          cx="12"
                                          cy="12"
                                          r="10"
                                          stroke="currentColor"
                                          strokeWidth="4"
                                        ></circle>
                                        <path
                                          className="opacity-75"
                                          fill="currentColor"
                                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                        ></path>
                                      </svg>
                                    ) : (
                                      <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                                      </svg>
                                    )}
                                    Legacy PDF
                                  </button>
                                )}
                                
                                {permitId && hasPermitPdfData && (
                                  <button
                                    onClick={() => {
                                      handleShowPermitPdfInModal(
                                        budget,
                                        "pdfData"
                                      );
                                    }}
                                    disabled={
                                      isLoadingPdfInModal ===
                                      `${budget.idBudget}-pdfData`
                                    }
                                    className="inline-flex items-center justify-center bg-indigo-600 text-white px-2 py-1.5 rounded text-xs hover:bg-indigo-700 disabled:opacity-50"
                                  >
                                    {isLoadingPdfInModal ===
                                    `${budget.idBudget}-pdfData` ? (
                                      <svg
                                        className="animate-spin h-3 w-3 mr-1"
                                        viewBox="0 0 24 24"
                                      >
                                        <circle
                                          className="opacity-25"
                                          cx="12"
                                          cy="12"
                                          r="10"
                                          stroke="currentColor"
                                          strokeWidth="4"
                                        ></circle>
                                        <path
                                          className="opacity-75"
                                          fill="currentColor"
                                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                        ></path>
                                      </svg>
                                    ) : (
                                      <PaperClipIcon className="h-3 w-3 mr-1" />
                                    )}{" "}
                                    Permit
                                  </button>
                                )}
                                {permitId && hasPermitOptionalDocs && (
                                  <button
                                    onClick={() =>
                                      handleShowPermitPdfInModal(
                                        budget,
                                        "optionalDocs"
                                      )
                                    }
                                    disabled={
                                      isLoadingPdfInModal ===
                                      `${budget.idBudget}-optionalDocs`
                                    }
                                    className="inline-flex items-center justify-center bg-purple-600 text-white px-2 py-1.5 rounded text-xs hover:bg-purple-700 disabled:opacity-50"
                                  >
                                    {isLoadingPdfInModal ===
                                    `${budget.idBudget}-optionalDocs` ? (
                                      <svg
                                        className="animate-spin h-3 w-3 mr-1"
                                        viewBox="0 0 24 24"
                                      >
                                        <circle
                                          className="opacity-25"
                                          cx="12"
                                          cy="12"
                                          r="10"
                                          stroke="currentColor"
                                          strokeWidth="4"
                                        ></circle>
                                        <path
                                          className="opacity-75"
                                          fill="currentColor"
                                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                        ></path>
                                      </svg>
                                    ) : (
                                      <PaperClipIcon className="h-3 w-3 mr-1" />
                                    )}{" "}
                                    Optional
                                  </button>
                                )}
                              </div>
                            )}

                            {/* Botón para ver PDF Legacy */}
                            {hasLegacyBudgetPdf && (
                              <button
                                onClick={() =>
                                  handleViewLegacyBudgetPdf(budget.idBudget, budget.legacySignedPdfUrl)
                                }
                                disabled={viewingPdfId === budget.idBudget}
                                className="w-full flex items-center justify-center bg-amber-600 text-white px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50 transition-colors"
                              >
                                {viewingPdfId === budget.idBudget ? (
                                  <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                ) : (
                                  <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                                )}
                                🏷️ Ver PDF Legacy
                              </button>
                            )}

                            {/* Botón para editar datos de cliente */}
                            <button
                              onClick={() => handleEditClientData(budget.idBudget)}
                              disabled={isReadOnly}
                              className={`w-full flex items-center justify-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                                isReadOnly 
                                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
                              }`}
                            >
                              <UserIcon className="h-4 w-4 mr-2" />
                              Edit Client Data
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Paginación - Mobile */}
            <div className="md:hidden mt-6 pb-4">
              <div className="flex items-center justify-between px-4">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-700">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page === totalPages}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>

            {/* Paginación - Desktop */}
            <div className="hidden md:flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pb-4 px-4">
              {/* Info de resultados */}
              <div className="text-sm text-gray-700">
                Showing{" "}
                <span className="font-medium">
                  {totalRecords === 0 ? 0 : (page - 1) * pageSize + 1}
                </span>{" "}
                to{" "}
                <span className="font-medium">
                  {Math.min(page * pageSize, totalRecords || 0)}
                </span>{" "}
                of <span className="font-medium">{totalRecords || 0}</span> results
              </div>

              {/* Controles de paginación */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1}
                  className="px-3 py-1 bg-white border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                >
                  Previous
                </button>

                {/* Números de página con lógica de ellipsis */}
                {(() => {
                  const pageNumbers = [];
                  const maxButtons = 7;
                  
                  if (totalPages <= maxButtons) {
                    // Mostrar todos los números si son pocos
                    for (let i = 1; i <= totalPages; i++) {
                      pageNumbers.push(i);
                    }
                  } else {
                    // Lógica de ellipsis para muchas páginas
                    if (page <= 4) {
                      // Cerca del inicio
                      for (let i = 1; i <= 5; i++) pageNumbers.push(i);
                      pageNumbers.push('...');
                      pageNumbers.push(totalPages);
                    } else if (page >= totalPages - 3) {
                      // Cerca del final
                      pageNumbers.push(1);
                      pageNumbers.push('...');
                      for (let i = totalPages - 4; i <= totalPages; i++) pageNumbers.push(i);
                    } else {
                      // En el medio
                      pageNumbers.push(1);
                      pageNumbers.push('...');
                      for (let i = page - 1; i <= page + 1; i++) pageNumbers.push(i);
                      pageNumbers.push('...');
                      pageNumbers.push(totalPages);
                    }
                  }

                  return pageNumbers.map((num, idx) => {
                    if (num === '...') {
                      return (
                        <span key={`ellipsis-${idx}`} className="px-2 text-gray-500">
                          ...
                        </span>
                      );
                    }
                    return (
                      <button
                        key={`page-${num}`}
                        onClick={() => handlePageChange(num)}
                        className={`px-3 py-1 rounded-lg transition-colors ${
                          page === num
                            ? 'bg-blue-600 text-white'
                            : 'bg-white border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {num}
                      </button>
                    );
                  });
                })()}

                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page === totalPages}
                  className="px-3 py-1 bg-white border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                >
                  Next
                </button>
              </div>

              {/* Selector de tamaño de página */}
              <div className="flex items-center gap-2">
                <label htmlFor="pageSize" className="text-sm text-gray-700">
                  Show:
                </label>
                <select
                  id="pageSize"
                  value={pageSize}
                  onChange={handlePageSizeChange}
                  className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            {/* Modal PDF */}
            <PdfModal
              isOpen={isModalOpen}
              onClose={closeModal}
              pdfUrl={pdfUrlForModal}
              title={pdfTitleForModal}
            />

            {/* Modal para editar datos de cliente */}
            {showClientDataModal && (
              <EditClientDataModal
                isOpen={showClientDataModal}
                onClose={() => setShowClientDataModal(false)}
                budgetId={selectedBudgetIdForClient}
                onDataUpdated={handleClientDataUpdated}
              />
            )}
          </>
        )}
      </div>
      
      {/* CSS adicional para mejorar responsividad en tablets - SIN jsx */}
      <style>{`
        @media (min-width: 768px) and (max-width: 1023px) {
          .tablet-scroll {
            -webkit-overflow-scrolling: touch;
            scrollbar-width: thin;
          }
        }
        
        @media (min-width: 1024px) and (max-width: 1366px) {
          .modal-content {
            max-width: 85vw !important;
            max-height: 90vh !important;
          }
        }
        
        .modal-overlay {
          z-index: 9999 !important;
        }
        
        /* Específico para iPad Pro Portrait */
        @media screen and (width: 1024px) and (height: 1366px) {
          .modal-overlay {
            padding: 20px !important;
          }
          .modal-overlay > div {
            width: 90vw !important;
            height: 85vh !important;
            max-width: none !important;
            max-height: none !important;
          }
          .modal-overlay iframe {
            width: 100% !important;
            height: 100% !important;
            border: none !important;
            background-color: white !important;
          }
        }
        
        /* Específico para iPad Pro Landscape */
        @media screen and (width: 1366px) and (height: 1024px) {
          .modal-overlay {
            padding: 15px !important;
          }
          .modal-overlay > div {
            width: 92vw !important;
            height: 88vh !important;
            max-width: none !important;
            max-height: none !important;
          }
          .modal-overlay iframe {
            width: 100% !important;
            height: 100% !important;
            border: none !important;
            background-color: white !important;
          }
        }
        
        /* Fallback para cualquier iPad */
        @media screen and (-webkit-min-device-pixel-ratio: 1) and (orientation: portrait) {
          .modal-overlay iframe {
            -webkit-transform: translateZ(0) !important;
            transform: translateZ(0) !important;
          }
        }
        
        /* Asegurar que el modal overlay esté visible */
        .modal-overlay {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }
      `}</style>
    </div>
  );
};

export default BudgetList;


