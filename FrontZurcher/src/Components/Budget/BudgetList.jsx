import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchBudgets,
  updateBudget,
  // uploadInvoice, // Ya no se usa aquí si se eliminó handleUploadPayment
} from "../../Redux/Actions/budgetActions";
import { DocumentArrowDownIcon, EyeIcon, PencilIcon, CheckIcon, XMarkIcon, ExclamationTriangleIcon, PaperClipIcon } from '@heroicons/react/24/outline'; // Icono para descarga
//import BudgetPDF from "./BudgetPDF";
import { parseISO, format } from "date-fns";
import api from "../../utils/axios";

const PdfModal = ({ isOpen, onClose, pdfUrl, title }) => {
  if (!isOpen || !pdfUrl) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-700">{title || "Vista Previa del PDF"}</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            title="Cerrar"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        <div className="flex-grow p-1">
          <iframe
            src={pdfUrl}
            title={title || "PDF Viewer"}
            className="w-full h-full border-none"
          />
        </div>
      </div>
    </div>
  );
};

const BudgetList = () => {
  const dispatch = useDispatch();
  const { budgets, loading, error } = useSelector((state) => state.budget);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  console.log("Presupuestos:", budgets); // Verifica si los presupuestos se están obteniendo correctamente
  // --- NUEVO ESTADO PARA EDICIÓN DE NOTAS ---
  const [editingBudgetId, setEditingBudgetId] = useState(null); // ID del budget en edición
  const [currentNote, setCurrentNote] = useState(''); // Valor actual de la nota en el editor
  const [isSavingNote, setIsSavingNote] = useState(false); // Para feedback visual al guardar
  // --- FIN NUEVO ESTADO ---

  const [downloadingPdfId, setDownloadingPdfId] = useState(null); // Estado para indicar descarga
  const [viewingPdfId, setViewingPdfId] = useState(null);

  // --- NUEVOS ESTADOS PARA EL MODAL DE PDF ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pdfUrlForModal, setPdfUrlForModal] = useState('');
  const [pdfTitleForModal, setPdfTitleForModal] = useState('');
  const [isLoadingPdfInModal, setIsLoadingPdfInModal] = useState(null);

  useEffect(() => {
    dispatch(fetchBudgets());
  }, [dispatch]);

  const sortedBudgets = budgets ? budgets
    .slice() // Crear una copia superficial para no mutar el estado original
    .sort((a, b) => {
      try {
        // Parsear las fechas de creación
        const dateA = parseISO(a.createdAt);
        const dateB = parseISO(b.createdAt);
        // Orden descendente (más reciente primero)
        return dateB - dateA;
      } catch (e) {
        console.error("Error parsing createdAt date for sorting:", a.createdAt, b.createdAt, e);
        return 0; // Mantener orden original si hay error de parseo
      }
    }) : [];
  // --- 3. APLICAR PAGINACIÓN A LA LISTA COMPLETA Y ORDENADA ---
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  // Usar sortedBudgets (que ahora contiene todos los presupuestos ordenados)
  const currentBudgetsForDisplay = sortedBudgets.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  // Función para manejar la descarga del PDF
  const handleDownloadPdf = async (budgetId, filename) => {
    setDownloadingPdfId(budgetId); // Marcar como descargando
    try {
      // Usa tu instancia de Axios que ya incluye el token
      const response = await api.get(`/budget/${budgetId}/pdf`, {
        responseType: 'blob', // Importante: obtener la respuesta como Blob
      });


      // Crear un enlace temporal para iniciar la descarga
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename || `budget_${budgetId}.pdf`); // Usar nombre sugerido o default
      document.body.appendChild(link);
      link.click();

      // Limpiar el enlace temporal
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error("Error al descargar el PDF:", error);
      // Mostrar un mensaje de error al usuario
      alert(`Error al descargar el PDF: ${error.response?.data?.message || error.message}`);
    } finally {
      setDownloadingPdfId(null); // Terminar estado de descarga
    }
  };

  // *** NUEVA FUNCIÓN para manejar la vista previa del PDF ***
  const handleViewPdf = async (budgetId) => {
    setViewingPdfId(budgetId); // Indicar que se está cargando la vista previa
    let objectUrl = null; // Variable para guardar la URL temporal

    try {
      console.log(`Intentando obtener PDF para vista previa: /budget/${budgetId}/pdf`);
      // Usa la misma ruta que la descarga, ya que Axios enviará el token
      const response = await api.get(`/budget/${budgetId}/pdf`, {
        responseType: 'blob', // Obtener como Blob
      });

      // Crear una URL temporal para el Blob
      objectUrl = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      console.log("Object URL creada:", objectUrl);

      // Abrir la URL temporal en una nueva pestaña
      const pdfWindow = window.open(objectUrl, '_blank', 'noopener,noreferrer');

      // Opcional: Revocar la URL después de un tiempo o cuando la ventana se cierre
      // Esto es más complejo de manejar de forma fiable, pero ayuda a liberar memoria.
      // Una forma simple es revocarla después de un tiempo razonable.
      if (pdfWindow) {
        setTimeout(() => {
          if (objectUrl) {
            console.log("Revocando Object URL (timeout):", objectUrl);
            window.URL.revokeObjectURL(objectUrl);
          }
        }, 60000); // Revocar después de 1 minuto
      } else {
        // Si window.open fue bloqueado por el navegador
        alert("No se pudo abrir la ventana de vista previa. Revisa si tu navegador bloqueó las ventanas emergentes.");
        if (objectUrl) window.URL.revokeObjectURL(objectUrl); // Limpiar si no se abrió
      }


    } catch (error) {
      console.error('Error fetching PDF for viewing:', error);
      alert('Error al obtener el PDF para visualizar. Verifique que exista y tenga permisos.');
      if (objectUrl) {
        // Asegurarse de revocar si hubo error después de crear la URL
        window.URL.revokeObjectURL(objectUrl);
      }
    } finally {
      setViewingPdfId(null); // Dejar de indicar carga
    }
  };

  // --- NUEVAS FUNCIONES PARA MANEJAR LA EDICIÓN DE NOTAS ---

  const handleEditNoteClick = (budget) => {
    setEditingBudgetId(budget.idBudget);
    setCurrentNote(budget.generalNotes || ''); // Cargar nota actual o string vacío
  };

  const handleNoteChange = (event) => {
    setCurrentNote(event.target.value);
  };

  const handleCancelEditNote = () => {
    setEditingBudgetId(null);
    setCurrentNote('');
    setIsSavingNote(false);
  };

  const handleSaveNote = async () => {
    if (editingBudgetId === null) return;
    setIsSavingNote(true); // Indicar que se está guardando

    try {
      // Despachar la acción para actualizar solo las notas
      await dispatch(updateBudget(editingBudgetId, { generalNotes: currentNote }));
      console.log(`Notas actualizadas para Budget ID: ${editingBudgetId}`);
      // Opcional: Refrescar la lista completa o confiar en que el estado se actualice
      // dispatch(fetchBudgets()); // Descomentar si es necesario forzar refresco
      handleCancelEditNote(); // Salir del modo edición
    } catch (error) {
      console.error("Error al guardar las notas:", error);
      alert("Error al guardar las notas: " + (error.message || "Error desconocido"));
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
      alert(`No se puede cambiar de "${budget.status}" a "${newStatus}" desde esta vista.`);
      return;
    }

    const payload = { status: newStatus };

    dispatch(updateBudget(idBudget, payload))
      .then(() => {
        console.log(`Estado actualizado a: ${newStatus}`);
        dispatch(fetchBudgets());
      })
      .catch((error) => {
        console.error("Error al actualizar el estado:", error);
        alert("Error al actualizar el estado: " + (error.message || "Unknown error"));
      });
  };
  // --- MODIFICADA: FUNCIÓN PARA MOSTRAR PDF DE PERMISO/OPCIONAL EN MODAL ---
  const handleShowPermitPdfInModal = async (budget, pdfType) => {
    console.log(`handleShowPermitPdfInModal llamado con budget ID: ${budget.idBudget}, pdfType: ${pdfType}`); // DEBUG INICIAL
    const loadingKey = `${budget.idBudget}-${pdfType}`;
    setIsLoadingPdfInModal(loadingKey);

    if (pdfUrlForModal) {
      console.log("Revocando URL de modal anterior:", pdfUrlForModal); // DEBUG
      URL.revokeObjectURL(pdfUrlForModal);
      setPdfUrlForModal('');
    }

    let pdfDataBlob;
    let title;

    if (pdfType === 'budgetSelf') { // Para el PDF del presupuesto mismo
      try {
        console.log(`Obteniendo PDF del presupuesto (budgetSelf) para ID: ${budget.idBudget}`); // DEBUG
        const response = await api.get(`/budget/${budget.idBudget}/preview`, {
          responseType: 'blob',
        });
        pdfDataBlob = response.data;
        title = `Presupuesto - ${budget.idBudget}`;
        console.log("PDF del presupuesto (budgetSelf) obtenido, blob:", pdfDataBlob); // DEBUG
      } catch (error) {
        console.error(`Error al obtener PDF del presupuesto (${budget.idBudget}):`, error);
        alert(`Error al obtener el PDF del presupuesto: ${error.response?.data?.message || error.message}`);
        setIsLoadingPdfInModal(null);
        return;
      }
    } else if (budget.Permit) {
      console.log("Procesando PDF de Permiso. budget.Permit:", budget.Permit); // DEBUG
      if (pdfType === 'pdfData' && budget.Permit.pdfData) {
        pdfDataBlob = budget.Permit.pdfData;
        title = `Permiso Principal - Presupuesto ${budget.idBudget}`;
        console.log("Usando budget.Permit.pdfData para 'pdfData', blob:", pdfDataBlob); // DEBUG
      } else if (pdfType === 'optionalDocs' && budget.Permit.optionalDocs) {
        pdfDataBlob = budget.Permit.optionalDocs;
        title = `Documentos Opcionales - Presupuesto ${budget.idBudget}`;
        console.log("Usando budget.Permit.optionalDocs para 'optionalDocs', blob:", pdfDataBlob); // DEBUG
      } else {
        console.log(`Tipo de PDF de permiso '${pdfType}' no encontrado o sin datos en budget.Permit`); // DEBUG
      }
    } else {
      console.log("budget.Permit no existe, no se puede procesar PDF de permiso."); // DEBUG
    }

    if (pdfDataBlob) {
      try {
        console.log("Procesando pdfDataBlob:", pdfDataBlob, "para pdfType:", pdfType, "con título:", title); // DEBUG
        let finalBlob;
        if (pdfDataBlob instanceof Blob) {
          finalBlob = pdfDataBlob;
          console.log("pdfDataBlob ya es una instancia de Blob."); // DEBUG
        } else if (typeof pdfDataBlob === 'string') { // Asumir base64
          console.log("pdfDataBlob es un string, intentando convertir desde base64."); // DEBUG
          const byteCharacters = atob(pdfDataBlob);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          finalBlob = new Blob([byteArray], { type: 'application/pdf' });
          console.log("finalBlob creado desde string base64:", finalBlob); // DEBUG
        } else if (pdfDataBlob && pdfDataBlob.type === 'Buffer' && Array.isArray(pdfDataBlob.data)) { // Común desde Node.js
          console.log("pdfDataBlob es un objeto Buffer, intentando convertir."); // DEBUG
          finalBlob = new Blob([new Uint8Array(pdfDataBlob.data)], { type: 'application/pdf' });
          console.log("finalBlob creado desde Buffer:", finalBlob); // DEBUG
        } else {
          console.error("Formato de pdfDataBlob no reconocido o es nulo:", pdfDataBlob);
          alert("No se pudo procesar el archivo PDF. Formato no reconocido.");
          setIsLoadingPdfInModal(null);
          return;
        }

        if (!title) {
          console.warn("El título del PDF es undefined. Usando título por defecto."); // DEBUG
          // title = "Vista Previa del PDF"; // Opcional: poner un default si es crítico
        }

        const objectUrl = URL.createObjectURL(finalBlob);
        console.log("objectUrl creado:", objectUrl, "con título:", title); // DEBUG
        setPdfUrlForModal(objectUrl);
        setPdfTitleForModal(title);
        setIsModalOpen(true);
        console.log("Modal debería estar abriéndose."); // DEBUG
      } catch (e) {
        console.error("Error creando Object URL o procesando el blob:", e, pdfDataBlob);
        alert("Error al procesar el archivo PDF.");
        setPdfUrlForModal('');
      }
    } else {
      console.log(`No se encontraron datos válidos en pdfDataBlob para el PDF (${pdfType}) en el presupuesto ${budget.idBudget}. No se abrirá el modal.`); // DEBUG
      alert(`No se encontraron datos para el PDF (${pdfType}) en el presupuesto ${budget.idBudget}.`);
      setPdfUrlForModal('');
    }
    setIsLoadingPdfInModal(null);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    if (pdfUrlForModal) {
      URL.revokeObjectURL(pdfUrlForModal);
    }
    setPdfUrlForModal('');
    setPdfTitleForModal('');
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

  const totalPages = Math.ceil(sortedBudgets.length / itemsPerPage);
  console.log("IDs en currentBudgetsForDisplay:", currentBudgetsForDisplay.map(b => b.idBudget));
  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold mb-8 text-blue-900 flex items-center gap-3">
          <span className="inline-block bg-blue-100 text-blue-700 rounded-full px-3 py-1 text-lg font-semibold">Monthly Budgets</span>
          <span className="text-base font-normal text-gray-400">Overview & Management</span>
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
                    <th className="border border-gray-200 px-4 py-3 text-left">Applicant</th>
                    <th className="border border-gray-200 px-4 py-3 text-left">Date</th>
                    <th className="border border-gray-200 px-4 py-3 text-left">End Date</th>
                    <th className="border border-gray-200 px-4 py-3 text-right">Total Price</th>
                    <th className="border border-gray-200 px-4 py-3 text-right">Pay</th>
                    <th className="border border-gray-200 px-4 py-3 text-center">Status</th>
                    <th className="border border-gray-200 px-4 py-3 text-left">Address</th>
                    <th className="border border-gray-200 px-4 py-3 text-left">System</th>
                    <th className="border border-gray-200 px-4 py-3 text-left">Notes</th>
                    <th className="border border-gray-200 px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentBudgetsForDisplay.map((budget) => {
                    let permitExpirationAlertIcon = null;
                    const permitExpStatus = budget.Permit?.expirationStatus || budget.permitExpirationStatus;
                    const permitExpMessage = budget.Permit?.expirationMessage || budget.permitExpirationMessage;


                    if (permitExpStatus === "expired" || permitExpStatus === "soon_to_expire") {
                      const isError = permitExpStatus === "expired";
                      const alertColorClass = isError ? "text-red-500" : "text-yellow-500";
                      const pingColorClass = isError ? "bg-red-400" : "bg-yellow-400";
                      const alertMessage = permitExpMessage || (isError ? "Permiso Vencido" : "Permiso Próximo a Vencer");

                      permitExpirationAlertIcon = (
                        <span
                          title={alertMessage}
                          className="relative ml-2 cursor-help inline-flex items-center justify-center h-5 w-5" // Explicit size for table icon container
                        >
                          <span className={`absolute inline-flex h-full w-full rounded-full ${pingColorClass} opacity-75 animate-ping`}></span>
                          <ExclamationTriangleIcon className={`relative z-10 inline-flex h-5 w-5 ${alertColorClass}`} /> {/* z-10 and explicit size */}
                        </span>
                      );
                    }

                    const permitId = budget.Permit?.idPermit;

                    // --- CONDICIÓN DE RENDERIZADO DE BOTONES AJUSTADA ---
                    // Ahora verificamos si budget.Permit existe y si los campos pdfData/optionalDocs tienen contenido.
                    const hasPermitPdfData = !!(budget.Permit && budget.Permit.pdfData);
                    const hasPermitOptionalDocs = !!(budget.Permit && budget.Permit.optionalDocs);
                    const hasBudgetPdfItself = !!budget.pdfPath; // O la lógica que uses para el PDF del presupuesto
                    return (
                      <tr
                        key={budget.idBudget}
                        className={`hover:bg-gray-100 transition-colors ${getStatusColor(budget.status)}`}
                      >
                        <td className="border border-gray-300 px-4 py-2 text-xs">
                          <div className="flex items-center">
                            <span>{budget.applicantName}</span>
                            {permitExpirationAlertIcon}
                          </div>
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-xs">{formatDate(budget.date)}</td>
                        <td className="border border-gray-300 px-4 py-2 text-xs">{budget.expirationDate ? formatDate(budget.expirationDate) : "N/A"}</td>
                        <td className="border border-gray-300 px-4 py-2 text-xs text-right">${budget.totalPrice}</td>
                        <td className="border border-gray-300 px-4 py-2 text-xs text-right">${budget.initialPayment}</td>
                        <td className="border border-gray-300 px-4 py-2 text-xs text-center">{budget.status}</td>
                        <td className="border border-gray-300 px-4 py-2 text-xs">{budget.propertyAddress || "N/A"}</td>
                        <td className="border border-gray-300 px-4 py-2 text-xs"> {budget.Permit?.systemType || budget.systemType || "N/A"}</td>
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
                                    <svg className="animate-spin h-4 w-4 text-white" /* ... spinner ... */ ></svg>
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
                              <span className="whitespace-pre-wrap break-words max-w-[200px]"> {/* Permitir saltos de línea y limitar ancho */}
                                {budget.generalNotes || <span className="text-gray-400 italic">No notes</span>}
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
                          <div className="flex flex-row items-center justify-center space-x-1 min-w-[120px]"> {/* Cambio: flex-row y space-x-1 */}

                            {/* ESTADO: CREATED - Botón Send */}
                            {budget.status === "created" && (
                              <button
                                onClick={() => handleUpdateStatus(budget.idBudget, "send", budget)}
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
                                    <p className="text-green-600 text-[8px] font-semibold mt-0.5">✓ Invoice</p>
                                  ) : (
                                    <p className="text-orange-600 text-[8px] font-semibold mt-0.5">⚠ Invoice</p>
                                  )}
                                </div>
                                <button
                                  onClick={() => handleUpdateStatus(budget.idBudget, "rejected", budget)}
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
                                  onClick={() => handleUpdateStatus(budget.idBudget, "rejected", budget)}
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
                                  onClick={() => handleUpdateStatus(budget.idBudget, "rejected", budget)}
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
                                  onClick={() => handleShowPermitPdfInModal(budget, 'budgetSelf')}
                                  disabled={isLoadingPdfInModal === `${budget.idBudget}-budgetSelf`}
                                  className="inline-flex items-center justify-center bg-teal-600 text-white px-1 py-0.5 rounded text-[9px] hover:bg-teal-700 disabled:opacity-50 h-6 w-12"
                                  title="View Budget PDF"
                                >
                                  {isLoadingPdfInModal === `${budget.idBudget}-budgetSelf` ? (
                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                  ) : (
                                    <EyeIcon className="h-4 w-4" />
                                  )}
                                </button>

                                <button
                                  onClick={() => handleDownloadPdf(budget.idBudget, `budget_${budget.idBudget}.pdf`)}
                                  disabled={downloadingPdfId === budget.idBudget}
                                  className="inline-flex items-center justify-center bg-blue-600 text-white px-1 py-0.5 rounded text-[9px] hover:bg-blue-700 disabled:opacity-50 h-6 w-12"
                                  title="Download Budget PDF"
                                >
                                  {downloadingPdfId === budget.idBudget ? (
                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
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
                                onClick={() => handleShowPermitPdfInModal(budget, 'pdfData')}
                                disabled={isLoadingPdfInModal === `${budget.idBudget}-pdfData`}
                                className="inline-flex items-center justify-center bg-indigo-600 text-white px-1 py-0.5 rounded text-[9px] hover:bg-indigo-700 disabled:opacity-50 h-6 w-12"
                                title="View Permit PDF"
                              >
                                {isLoadingPdfInModal === `${budget.idBudget}-pdfData` ? (
                                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                ) : (
                                  <PaperClipIcon className="h-4 w-4" />
                                )}
                              </button>
                            )}

                            {permitId && hasPermitOptionalDocs && (
                              <button
                                onClick={() => handleShowPermitPdfInModal(budget, 'optionalDocs')}
                                disabled={isLoadingPdfInModal === `${budget.idBudget}-optionalDocs`}
                                className="inline-flex items-center justify-center bg-purple-600 text-white px-1 py-0.5 rounded text-[9px] hover:bg-purple-700 disabled:opacity-50 h-6 w-12"
                                title="View Optional Docs"
                              >
                                {isLoadingPdfInModal === `${budget.idBudget}-optionalDocs` ? (
                                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                ) : (
                                  <PaperClipIcon className="h-4 w-4" />
                                )}
                              </button>
                            )}

                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Vista de cards optimizada para tablet/móvil */}
            <div className="block lg:hidden space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {currentBudgetsForDisplay.map((budget) => {
                  let paymentLabel = `Pay ${budget.initialPaymentPercentage || 60}%`;
                  if (budget.initialPaymentPercentage === 100 || String(budget.initialPaymentPercentage).toLowerCase() === 'total') {
                    paymentLabel = `Pay 100%`;
                  }

                  let permitExpirationAlertIconCard = null;
                  const permitExpStatus = budget.Permit?.expirationStatus || budget.permitExpirationStatus;
                  const permitExpMessage = budget.Permit?.expirationMessage || budget.permitExpirationMessage;

                  if (permitExpStatus === "expired" || permitExpStatus === "soon_to_expire") {
                    const isError = permitExpStatus === "expired";
                    const alertColorClass = isError ? "text-red-500" : "text-yellow-500";
                    const pingColorClass = isError ? "bg-red-400" : "bg-yellow-400";
                    const alertMessage = permitExpMessage || (isError ? "Permiso Vencido" : "Permiso Próximo a Vencer");

                    permitExpirationAlertIconCard = (
                      <span
                        title={alertMessage}
                        className="relative ml-2 cursor-help inline-flex items-center justify-center h-6 w-6" // Explicit size for card icon container
                      >
                        <span className={`absolute inline-flex h-full w-full rounded-full ${pingColorClass} opacity-75 animate-ping`}></span>
                        <ExclamationTriangleIcon className={`relative z-10 inline-flex h-6 w-6 ${alertColorClass}`} /> {/* z-10 and explicit size */}
                      </span>
                    );
                  }
                  // Variables para la lógica de los botones PDF (igual que en la tabla)
                  const permitId = budget.Permit?.idPermit;
                  const hasPermitPdfData = !!(budget.Permit && budget.Permit.pdfData);
                  const hasPermitOptionalDocs = !!(budget.Permit && budget.Permit.optionalDocs);
                  const hasBudgetPdfItself = !!budget.pdfPath;

                  return (
                    <div
                      key={budget.idBudget}
                      className={`border border-gray-300 rounded-xl p-4 md:p-6 shadow-lg hover:shadow-xl transition-all duration-200 ${getStatusColor(budget.status)}`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <p className="text-sm md:text-base font-semibold text-gray-700 flex items-center">
                          {budget.applicantName}
                          {permitExpirationAlertIconCard}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 md:gap-3 text-xs md:text-sm text-gray-600 mb-4">
                        <p>Date: {formatDate(budget.date)}</p>
                        <p>End: {budget.expirationDate ? formatDate(budget.expirationDate) : "N/A"}</p>
                        <p>Price: <span className="font-semibold">${budget.totalPrice}</span></p>
                        <p>{paymentLabel}: <span className="font-semibold">${budget.initialPayment}</span></p>
                        <p className="col-span-2">Status: <span className="font-medium capitalize">{budget.status}</span></p>
                        <p className="col-span-2 truncate">Address: {budget.propertyAddress || "N/A"}</p>
                        <p className="col-span-2">System: {budget.Permit?.systemType || budget.systemType || "N/A"}</p>
                      </div>

                      {/* Notes section */}
                      <div className="mb-4 pt-3 border-t border-gray-200">
                        <p className="text-xs md:text-sm font-semibold text-gray-700 mb-2">Notes:</p>
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
                              {budget.generalNotes || <span className="text-gray-400 italic">No notes</span>}
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
                        <p className="text-sm font-semibold mb-3 text-gray-700">Actions:</p>
                        <div className="space-y-3">
                          {/* Status action buttons */}
                          {budget.status === "created" && (
                            <button
                              onClick={() => handleUpdateStatus(budget.idBudget, "send", budget)}
                              className="w-full bg-yellow-500 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-yellow-600 transition-colors"
                            >
                              Send Budget
                            </button>
                          )}

                          {/* ESTADO: SEND - Estado + botón reject horizontalmente */}
                          {budget.status === "send" && (
                            <div className="w-full space-y-2">
                              <div className="text-center p-2 border rounded bg-yellow-50">
                                <p className="text-xs font-semibold text-yellow-700">Sent</p>
                                {budget.paymentInvoice ? (
                                  <p className="text-green-600 text-[10px] font-semibold">✓ Invoice OK</p>
                                ) : (
                                  <p className="text-orange-600 text-[10px] font-semibold">⚠ Need Invoice</p>
                                )}
                              </div>
                              <button
                                onClick={() => handleUpdateStatus(budget.idBudget, "rejected", budget)}
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
                                <p className="text-xs font-semibold text-blue-700">Sent to Sign</p>
                              </div>
                              <button
                                onClick={() => handleUpdateStatus(budget.idBudget, "rejected", budget)}
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
                                <p className="text-xs font-semibold text-orange-700">No Response</p>
                              </div>
                              <button
                                onClick={() => handleUpdateStatus(budget.idBudget, "rejected", budget)}
                                className="w-full bg-red-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
                              >
                                Reject
                              </button>
                            </div>
                          )}


                          {/* Botones de PDF (usando grid para mejor distribución si hay varios) */}
                          {(hasBudgetPdfItself || (permitId && (hasPermitPdfData || hasPermitOptionalDocs))) && (
                            <div className="grid grid-cols-2 gap-2 pt-2">
                              {hasBudgetPdfItself && (
                                <>
                                  <button 
                                    onClick={() => handleShowPermitPdfInModal(budget, 'budgetSelf')} 
                                    disabled={isLoadingPdfInModal === `${budget.idBudget}-budgetSelf`} 
                                    className="flex items-center justify-center bg-teal-600 text-white px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors"
                                  >
                                    {isLoadingPdfInModal === `${budget.idBudget}-budgetSelf` ? (
                                      <svg className="animate-spin h-4 w-4 mr-1" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                      </svg>
                                    ) : (
                                      <EyeIcon className="h-4 w-4 mr-1" />
                                    )} 
                                    View
                                  </button>
                                  <button 
                                    onClick={() => handleDownloadPdf(budget.idBudget, `budget_${budget.idBudget}.pdf`)} 
                                    disabled={downloadingPdfId === budget.idBudget} 
                                    className="flex items-center justify-center bg-blue-600 text-white px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                  >
                                    {downloadingPdfId === budget.idBudget ? (
                                      <svg className="animate-spin h-4 w-4 mr-1" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                      </svg>
                                    ) : (
                                      <DocumentArrowDownIcon className="h-4 w-4 mr-1" />
                                    )} 
                                    Download
                                  </button>
                                </>
                              )}
                              {permitId && hasPermitPdfData && (
                                <button onClick={() => handleShowPermitPdfInModal(budget, 'pdfData')} disabled={isLoadingPdfInModal === `${budget.idBudget}-pdfData`} className="inline-flex items-center justify-center bg-indigo-600 text-white px-2 py-1.5 rounded text-xs hover:bg-indigo-700 disabled:opacity-50">
                                  {isLoadingPdfInModal === `${budget.idBudget}-pdfData` ? <svg className="animate-spin h-3 w-3 mr-1" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : <PaperClipIcon className="h-3 w-3 mr-1" />} Permit
                                </button>
                              )}
                              {permitId && hasPermitOptionalDocs && (
                                <button onClick={() => handleShowPermitPdfInModal(budget, 'optionalDocs')} disabled={isLoadingPdfInModal === `${budget.idBudget}-optionalDocs`} className="inline-flex items-center justify-center bg-purple-600 text-white px-2 py-1.5 rounded text-xs hover:bg-purple-700 disabled:opacity-50">
                                  {isLoadingPdfInModal === `${budget.idBudget}-optionalDocs` ? <svg className="animate-spin h-3 w-3 mr-1" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : <PaperClipIcon className="h-3 w-3 mr-1" />} Optional
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