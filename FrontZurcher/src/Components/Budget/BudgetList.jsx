import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchBudgets,
  updateBudget,
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
} from "@heroicons/react/24/outline"; // Icono para descarga
//import BudgetPDF from "./BudgetPDF";
import { parseISO, format } from "date-fns";
import api from "../../utils/axios";
import EditClientDataModal from './EditClientDataModal';

const PdfModal = ({ isOpen, onClose, pdfUrl, title }) => {
  console.log('🎭 PdfModal called with:', { isOpen, pdfUrl: !!pdfUrl, title });
  
  if (!isOpen || !pdfUrl) {
    console.log('🚫 PdfModal early return:', { isOpen, hasPdfUrl: !!pdfUrl });
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
  
  // Debug log for iPad Pro detection
  console.log('🖥️ Modal Screen Info:', { 
    screenWidth, 
    screenHeight, 
    isMobile, 
    isTablet, 
    isLarge,
    isIPadPro,
    userAgent: navigator.userAgent.includes('iPad') ? 'iPad' : 'Other'
  });
  
  console.log('✅ PdfModal will render!');

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
            onLoad={() => console.log('📄 PDF iframe loaded successfully')}
            onError={(e) => console.error('❌ PDF iframe error:', e)}
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
  const { budgets, loading, error, total, pageSize } = useSelector(
    (state) => state.budget
  );
  const [currentPage, setCurrentPage] = useState(1);

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

  useEffect(() => {
    // fetchBudgets expects an options object: { page, pageSize, ... }
    dispatch(fetchBudgets({ page: currentPage, pageSize: pageSize || 10 }));
  }, [dispatch, currentPage, pageSize]);

  const totalPages = Math.ceil((total || 0) / (pageSize || 10));

  // Cuando cambias de página:
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
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
      
      // Usar la ruta de preview específica para vista previa
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
      alert(
        "Error al obtener el PDF para visualizar. Verifique que exista y tenga permisos."
      );
    } finally {
      setViewingPdfId(null); // Dejar de indicar carga
    }
  };

  // *** FUNCIÓN para manejar la vista del PDF LEGACY ***
  const handleViewLegacyBudgetPdf = async (budgetId, directUrl = null) => {
    console.log(`🔍 handleViewLegacyBudgetPdf called:`, { budgetId, directUrl });
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
        console.log(`🎯 Using direct Cloudinary URL: ${directUrl}`);
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
      await dispatch(
        updateBudget(editingBudgetId, { generalNotes: currentNote })
      );
      
      handleCancelEditNote(); // Salir del modo edición
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
    try {
      return format(parseISO(dateString), "dd-MM-yyyy");
    } catch (e) {
      console.error("Error formatting date:", dateString, e);
      return "Invalid Date";
    }
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
       
        dispatch(fetchBudgets());
      })
      .catch((error) => {
        console.error("Error al actualizar el estado:", error);
        alert(
          "Error al actualizar el estado: " + (error.message || "Unknown error")
        );
      });
  };
  
  // 🆕 NUEVA FUNCIÓN: Enviar presupuesto para revisión del cliente (sin firma)
  const handleSendForReview = async (budget) => {
    if (!window.confirm(
      `¿Enviar presupuesto #${budget.idBudget} para revisión del cliente?\n\n` +
      `Se enviará un email a ${budget.Permit?.applicantEmail || budget.applicantEmail} ` +
      `con el presupuesto para revisión preliminar (SIN firma digital).`
    )) {
      return;
    }

    try {
      const response = await api.post(`/budget/${budget.idBudget}/send-for-review`);
      
      if (response.data.success) {
        alert(`✅ Presupuesto enviado para revisión a ${budget.Permit?.applicantEmail || budget.applicantEmail}`);
        dispatch(fetchBudgets()); // Recargar lista
      }
    } catch (error) {
      console.error('Error al enviar presupuesto para revisión:', error);
      alert(
        'Error al enviar el presupuesto para revisión: ' + 
        (error.response?.data?.error || error.message)
      );
    }
  };
  
  // 🆕 NUEVA FUNCIÓN: Enviar presupuesto aprobado a SignNow
  const handleSendToSignNow = async (budget) => {
    if (!window.confirm(
      `¿Enviar presupuesto #${budget.idBudget} a SignNow?\n\n` +
      `El cliente ya aprobó este presupuesto. Se enviará para firma digital y pago.`
    )) {
      return;
    }

    try {
      // Usar el endpoint existente de SignNow
      const response = await api.post(`/budget/${budget.idBudget}/send-to-signnow`);
      
      if (response.data.success || response.data.message) {
        alert(`✅ Presupuesto enviado a SignNow para firma digital`);
        dispatch(fetchBudgets()); // Recargar lista
      }
    } catch (error) {
      console.error('Error al enviar a SignNow:', error);
      alert(
        'Error al enviar a SignNow: ' + 
        (error.response?.data?.error || error.message)
      );
    }
  };
  
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
      alert("No se pudo cargar el archivo PDF.");
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
    dispatch(fetchBudgets(currentPage, pageSize));
  };

  useEffect(() => {
    return () => {
      if (pdfUrlForModal) {
        URL.revokeObjectURL(pdfUrlForModal);
      }
    };
  }, [pdfUrlForModal]);

  const getStatusColor = (status) => {
    switch (status) {
      case "created":
      case "pending":
        return "bg-white"; // Blanco para creado/pendiente
      case "send":
        return "bg-blue-200"; // Amarillo claro para enviado
      case "sent_for_signature":
        return "bg-yellow-100"; // Azul claro para enviado a SignNow
      case "approved":
        return "bg-green-100"; // Verde claro para aprobado
      case "signed":
        return "bg-green-200"; // Verde más intenso para firmado
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

                      // 🔍 DEBUGGING: Ver qué datos llegan del backend para presupuesto legacy
                      if (budget.idBudget === 17) {
                        console.log('🔍 DEBUGGING BUDGET 17 (LEGACY):');
                        console.log('- budget.isLegacy:', budget.isLegacy);
                        console.log('- budget.hasLegacySignedPdf:', budget.hasLegacySignedPdf);
                        console.log('- budget.legacySignedPdfUrl:', budget.legacySignedPdfUrl);
                        console.log('- isLegacyBudget:', isLegacyBudget);
                        console.log('- hasLegacyBudgetPdf:', hasLegacyBudgetPdf);
                        console.log('- Full budget object:', budget);
                      }

                     

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

                      return (
                        <tr
                          key={budget.idBudget}
                          className={`hover:bg-gray-100 transition-colors ${getStatusColor(
                            budget.status
                          )}`}
                        >
                          <td className="border border-gray-300 px-4 py-2 text-xs">
                            <div className="flex items-center">
                              <span>{budget.applicantName}</span>
                              {permitExpirationAlertIcon}
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
                                  className="ml-2 p-1 text-blue-600 hover:text-blue-800"
                                  title="Edit Notes"
                                >
                                  <PencilIcon className="h-4 w-4" />
                                </button>
                              </div>
                            )}
                          </td>
                          {/* --- FIN CELDA DE NOTAS --- */}
                          <td className="border border-gray-300 px-2 py-1">
                            <div className="flex flex-row items-center justify-center space-x-1 min-w-[120px]">
                              {" "}
                              {/* Cambio: flex-row y space-x-1 */}
                              {/* ESTADO: CREATED - Botones Send y Send for Review */}
                              {budget.status === "created" && (
                                <div className="flex flex-col gap-1 w-full">
                                  {/* Botón: Enviar para Revisión (NUEVO) */}
                                  <button
                                    onClick={() => handleSendForReview(budget)}
                                    className="inline-flex items-center justify-center bg-blue-500 text-white px-2 py-0.5 rounded text-[10px] hover:bg-blue-600 w-full h-6"
                                    title="Send for Client Review (No Signature)"
                                  >
                                    📧 Review
                                  </button>
                                  
                                  {/* Botón: Send (Original) */}
                                  <button
                                    onClick={() =>
                                      handleUpdateStatus(
                                        budget.idBudget,
                                        "send",
                                        budget
                                      )
                                    }
                                    className="inline-flex items-center justify-center bg-yellow-500 text-white px-2 py-0.5 rounded text-[10px] hover:bg-yellow-600 w-full h-6"
                                    title="Send Budget"
                                  >
                                    Send
                                  </button>
                                </div>
                              )}
                              
                              {/* 🆕 ESTADO: PENDING_REVIEW - Esperando aprobación del cliente */}
                              {budget.status === "pending_review" && (
                                <div className="text-center">
                                  <p className="text-blue-700 text-[10px] font-semibold bg-blue-100 px-1 py-0.5 rounded leading-tight">
                                    📧 In Review
                                  </p>
                                  <p className="text-gray-600 text-[8px] mt-0.5">
                                    Awaiting client
                                  </p>
                                </div>
                              )}
                              
                              {/* 🆕 ESTADO: CLIENT_APPROVED - Cliente aprobó, listo para firma */}
                              {budget.status === "client_approved" && (
                                <div className="flex flex-col gap-1 w-full">
                                  <p className="text-green-700 text-[10px] font-semibold bg-green-100 px-1 py-0.5 rounded leading-tight text-center">
                                    ✅ Approved
                                  </p>
                                  {/* Botón: Send to SignNow */}
                                  <button
                                    onClick={() => handleSendToSignNow(budget)}
                                    className="inline-flex items-center justify-center bg-purple-500 text-white px-2 py-0.5 rounded text-[10px] hover:bg-purple-600 w-full h-6"
                                    title="Send to SignNow for Signature & Payment"
                                  >
                                    📝 SignNow
                                  </button>
                                </div>
                              )}
                              
                              {/* ESTADO: SEND - Estado + botón reject horizontalmente */}
                              {budget.status === "send" && (
                                <>
                                  <div className="text-center">
                                    <p className="text-yellow-700 text-[10px] font-semibold bg-yellow-100 px-1 py-0.5 rounded leading-tight">
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
                                  <button
                                    onClick={() =>
                                      handleUpdateStatus(
                                        budget.idBudget,
                                        "rejected",
                                        budget
                                      )
                                    }
                                    className="inline-flex items-center justify-center bg-red-500 text-white px-1.5 py-0.5 rounded text-[10px] hover:bg-red-600 w-14 h-6"
                                    title="Reject Budget"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                              {/* ESTADO: SENT_FOR_SIGNATURE - Estado + botón reject horizontalmente */}
                              {budget.status === "sent_for_signature" && (
                                <>
                                  <p className="text-blue-700 text-[10px] font-semibold bg-blue-100 px-1 py-0.5 rounded text-center leading-tight">
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
                                    className="inline-flex items-center justify-center bg-red-500 text-white px-1.5 py-0.5 rounded text-[10px] hover:bg-red-600 w-14 h-6"
                                    title="Reject Budget"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                              {/* ESTADO: APPROVED */}
                              {budget.status === "approved" && (
                                <p className="text-green-700 text-[10px] font-semibold bg-green-100 px-1 py-0.5 rounded text-center w-16 leading-tight">
                                  Approved
                                </p>
                              )}
                              {/* ESTADO: SIGNED */}
                              {budget.status === "signed" && (
                                <p className="text-green-800 text-[10px] font-semibold bg-green-200 px-1 py-0.5 rounded text-center w-16 leading-tight">
                                  Signed
                                </p>
                              )}
                              {/* ESTADO: REJECTED - Puede reenviarse para revisión */}
                              {budget.status === "rejected" && (
                                <div className="flex flex-col gap-1 w-full">
                                  <p className="text-red-700 text-[10px] font-semibold bg-red-100 px-1 py-0.5 rounded text-center leading-tight">
                                    ❌ Rejected
                                  </p>
                                  {/* Botón: Reenviar para Revisión */}
                                  <button
                                    onClick={() => handleSendForReview(budget)}
                                    className="inline-flex items-center justify-center bg-blue-500 text-white px-2 py-0.5 rounded text-[10px] hover:bg-blue-600 w-full h-6"
                                    title="Resend for Client Review (After Editing)"
                                  >
                                    🔄 Resend
                                  </button>
                                </div>
                              )}
                              {/* ESTADO: NOT RESPONDED - Estado + botón reject horizontalmente */}
                              {budget.status === "notResponded" && (
                                <>
                                  <p className="text-orange-700 text-[10px] font-semibold bg-orange-100 px-1 py-0.5 rounded text-center leading-tight">
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
                                    className="inline-flex items-center justify-center bg-red-500 text-white px-1.5 py-0.5 rounded text-[10px] hover:bg-red-600 w-14 h-6"
                                    title="Reject Budget"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                              {/* Separador visual si hay PDFs */}
                              {hasBudgetPdfItself && (
                                <div className="border-l border-gray-300 h-6 mx-1"></div>
                              )}
                              {/* Botones PDF horizontalmente */}
                              {hasBudgetPdfItself && (
                                <>
                                  <button
                                    onClick={() =>
                                      handleViewPdf(budget.idBudget)
                                    }
                                    disabled={viewingPdfId === budget.idBudget}
                                    className="inline-flex items-center justify-center bg-teal-600 text-white px-1 py-0.5 rounded text-[9px] hover:bg-teal-700 disabled:opacity-50 h-6 w-12"
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
                                    className="inline-flex items-center justify-center bg-blue-600 text-white px-1 py-0.5 rounded text-[9px] hover:bg-blue-700 disabled:opacity-50 h-6 w-12"
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
                                  className="inline-flex items-center justify-center bg-indigo-600 text-white px-1 py-0.5 rounded text-[9px] hover:bg-indigo-700 disabled:opacity-50 h-6 w-12"
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
                                  className="inline-flex items-center justify-center bg-purple-600 text-white px-1 py-0.5 rounded text-[9px] hover:bg-purple-700 disabled:opacity-50 h-6 w-12"
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
                                  className="inline-flex items-center justify-center bg-amber-600 text-white px-1 py-0.5 rounded text-[9px] hover:bg-amber-700 disabled:opacity-50 h-6 w-12"
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
                                className="inline-flex items-center justify-center bg-indigo-600 text-white px-1 py-0.5 rounded text-[9px] hover:bg-indigo-700 h-6 w-12"
                                title="Edit Client Data"
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
                    
                    // Debug para presupuestos legacy
                    if (isLegacyBudget) {
                      console.log(`🏷️ FRONTEND Legacy Budget ${budget.idBudget}:`, {
                        applicantName: budget.applicantName,
                        isLegacy: budget.isLegacy,
                        isLegacyBudget,
                        hasLegacySignedPdf: budget.hasLegacySignedPdf,
                        legacySignedPdfUrl: budget.legacySignedPdfUrl,
                        hasLegacyBudgetPdf,
                        shouldShowBadge: isLegacyBudget,
                        shouldShowPdfButton: hasLegacyBudgetPdf
                      });
                    }

                    return (
                      <div
                        key={budget.idBudget}
                        className={`border border-gray-300 rounded-xl p-4 md:p-6 shadow-lg hover:shadow-xl transition-all duration-200 ${getStatusColor(
                          budget.status
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
                              {console.log(`🎯 RENDERIZANDO BADGE LEGACY para Budget ${budget.idBudget}`)}
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
                                className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
                                title="Edit Notes"
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
                                  className="w-full bg-blue-500 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
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
                                  className="w-full bg-yellow-500 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-yellow-600 transition-colors"
                                >
                                  Send Budget
                                </button>
                              </div>
                            )}
                            
                            {/* 🆕 ESTADO: PENDING_REVIEW */}
                            {budget.status === "pending_review" && (
                              <div className="w-full text-center p-3 border rounded-lg bg-blue-50">
                                <p className="text-sm font-semibold text-blue-700">
                                  📧 In Review
                                </p>
                                <p className="text-xs text-gray-600 mt-1">
                                  Awaiting client approval
                                </p>
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
                                  className="w-full bg-purple-500 text-white py-2 rounded-lg text-sm font-semibold hover:bg-purple-600"
                                >
                                  📝 Send to SignNow
                                </button>
                              </div>
                            )}

                            {/* ESTADO: SEND - Estado + botón reject horizontalmente */}
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
                                <button
                                  onClick={() =>
                                    handleUpdateStatus(
                                      budget.idBudget,
                                      "rejected",
                                      budget
                                    )
                                  }
                                  className="w-full bg-red-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
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
                                  className="w-full bg-red-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
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

                            {budget.status === "signed" && (
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
                                  onClick={() => handleSendForReview(budget)}
                                  className="w-full inline-flex items-center justify-center bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-md"
                                  title="Resend for Client Review (After Editing)"
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
                                  className="w-full bg-red-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
                                >
                                  Reject
                                </button>
                              </div>
                            )}

                            {/* Botones de PDF (usando grid para mejor distribución si hay varios) */}
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
                                      console.log('🖱️ PDF Button clicked:', { budgetId: budget.idBudget, pdfType: 'pdfData' });
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
                              className="w-full flex items-center justify-center bg-indigo-600 text-white px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
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

            {/* Paginación */}
            <div className="flex justify-center mt-10 pb-4">
              <div className="flex flex-wrap justify-center gap-2">
                {Array.from({ length: totalPages }, (_, index) => (
                  <button
                    key={`page-${index + 1}`}
                    onClick={() => handlePageChange(index + 1)}
                    className={`px-4 py-2 text-base rounded-xl font-semibold transition-colors shadow-sm border ${
                      currentPage === index + 1
                        ? "bg-blue-700 text-white shadow-md border-blue-700"
                        : "bg-white text-blue-700 hover:bg-blue-50 border-gray-300"
                    }`}
                  >
                    {index + 1}
                  </button>
                ))}
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
