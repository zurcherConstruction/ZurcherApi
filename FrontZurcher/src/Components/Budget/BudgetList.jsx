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
} from "@heroicons/react/24/outline"; // Icono para descarga
//import BudgetPDF from "./BudgetPDF";
import { parseISO, format } from "date-fns";
import api from "../../utils/axios";

const PdfModal = ({ isOpen, onClose, pdfUrl, title }) => {
  if (!isOpen || !pdfUrl) return null;

  // Detect if it's a mobile device
  const isMobile = window.innerWidth < 997;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[95vh] sm:h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-3 sm:p-4 border-b">
          <h3 className="text-sm sm:text-lg font-semibold text-gray-700 truncate pr-2">
            {title || "Vista Previa del PDF"}
          </h3>
          <div className="flex items-center gap-2 flex-shrink-0">
            {isMobile && (
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 text-xs sm:text-sm underline"
                title="Abrir en nueva pestaña"
              >
                Nueva pestaña
              </a>
            )}
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 p-1"
              title="Cerrar"
            >
              <XMarkIcon className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
          </div>
        </div>
        <div className="flex-grow overflow-auto">
          {" "}
          {/* Cambiado overflow-hidden a overflow-auto */}
          <iframe
            src={pdfUrl}
            title={title || "PDF Viewer"}
            className="w-full h-full border-none"
            style={{
              minHeight: "100%",
              WebkitOverflowScrolling: "touch", // Improve scrolling on iOS
            }}
          />
        </div>
        {isMobile && (
          <div className="p-2 sm:p-3 bg-gray-50 border-t text-xs sm:text-sm text-gray-600 text-center">
            <p>
              Para mejor navegación en móvil,{" "}
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline"
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

  useEffect(() => {
    dispatch(fetchBudgets(currentPage, pageSize || 10));
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
  // --- FUNCIÓN PARA MOSTRAR PDF DE PERMISO/OPCIONAL EN MODAL ---
  const handleShowPermitPdfInModal = async (budget, pdfType) => {
    
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

    try {
      const response = await api.get(endpoint, { responseType: "blob" });
      const objectUrl = URL.createObjectURL(
        new Blob([response.data], { type: "application/pdf" })
      );
      setPdfUrlForModal(objectUrl);
      setPdfTitleForModal(title);
      setIsModalOpen(true);
     
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
    <div className="w-full min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
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
            <div className="hidden lg:block overflow-x-auto shadow-2xl rounded-2xl mb-8">
              <table className="min-w-full table-auto border-collapse bg-white rounded-2xl overflow-hidden">
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
                              {/* ESTADO: CREATED - Botón Send */}
                              {budget.status === "created" && (
                                <button
                                  onClick={() =>
                                    handleUpdateStatus(
                                      budget.idBudget,
                                      "send",
                                      budget
                                    )
                                  }
                                  className="inline-flex items-center justify-center bg-yellow-500 text-white px-2 py-0.5 rounded text-[10px] hover:bg-yellow-600 w-16 h-6"
                                  title="Send Budget"
                                >
                                  Send
                                </button>
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
                              {/* ESTADO: REJECTED */}
                              {budget.status === "rejected" && (
                                <p className="text-red-700 text-[10px] font-semibold bg-red-100 px-1 py-0.5 rounded text-center w-16 leading-tight">
                                  Rejected
                                </p>
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
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            {/* Vista de cards optimizada para tablet/móvil */}
            <div className="block lg:hidden space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                      budget.Permit && budget.Permit.pdfData
                    );
                    const hasPermitOptionalDocs = !!(
                      budget.Permit && budget.Permit.optionalDocs
                    );
                    const hasBudgetPdfItself = !!budget.pdfPath;

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
                              <div className="w-full text-center text-red-700 text-xs font-semibold p-2 border rounded bg-red-50">
                                Rejected
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
                              (permitId &&
                                (hasPermitPdfData ||
                                  hasPermitOptionalDocs))) && (
                              <div className="grid grid-cols-2 gap-2 pt-2">
                                {hasBudgetPdfItself && (
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
          </>
        )}
      </div>
    </div>
  );
};

export default BudgetList;
