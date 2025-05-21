import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchBudgets,
  updateBudget,
  // uploadInvoice, // Ya no se usa aquí si se eliminó handleUploadPayment
} from "../../Redux/Actions/budgetActions";
import { DocumentArrowDownIcon, EyeIcon, PencilIcon, CheckIcon, XMarkIcon, ExclamationTriangleIcon, PaperClipIcon } from '@heroicons/react/24/outline'; // Icono para descarga
//import BudgetPDF from "./BudgetPDF";
import { parseISO,  format } from "date-fns";
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
  // ... (dispatch, useSelector, state, useEffect, filtros, ordenación, paginación) ...
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

  // const currentDate = new Date();
  // // Asegúrate de que budgets no sea undefined antes de filtrar
  // const currentMonthBudgets = budgets ? budgets.filter((budget) => {
  //   try {
  //     const budgetDate = parseISO(budget.date);
  //     return isSameMonth(budgetDate, currentDate);
  //   } catch (e) {
  //     console.error("Error parsing budget date:", budget.date, e);
  //     return false; // Excluir si la fecha es inválida
  //   }
  // }) : [];

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
    // La transición a 'approved' ya no se inicia desde aquí
    const validTransitions = {
      created: ["send"],
      send: ["rejected"], // Solo se puede rechazar desde aquí
      approved: [],
      rejected: [],
    };

    if (!validTransitions[budget.status]?.includes(newStatus)) {
      alert("Acción no permitida desde esta vista.");
      return;
    }

    // Ya no se necesita esta validación aquí si no se puede aprobar
    // if (newStatus === "approved" && !budget.paymentInvoice) { ... }

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

 // ...existing code...

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
            const response = await api.get(`/budget/${budget.idBudget}/pdf`, {
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
            finalBlob = new Blob([byteArray], {type: 'application/pdf'});
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

// ...existing code...

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
    // ... (sin cambios) ...
    switch (status) {
      case "created": return "bg-white";
      case "send": return "bg-yellow-200";
      case "approved": return "bg-green-200";
      case "notResponded": return "bg-orange-200"; // Asumiendo que este estado existe
      case "rejected": return "bg-red-200";
      default: return "bg-gray-100"; // Un gris claro por defecto
    }
  };

  const totalPages = Math.ceil(sortedBudgets.length / itemsPerPage);
  console.log("IDs en currentBudgetsForDisplay:", currentBudgetsForDisplay.map(b => b.idBudget));
  return (
    <div className="p-4">
      <h1 className="text-lg font-semibold mb-4 text-gray-800">Monthly Budgets</h1>

      

      {loading && <p className="text-blue-500">Loading Budgets...</p>}
      {error && <p className="text-red-500">Error: {error}</p>}
      {!loading && !error && (
        <>
          {/* Tabla para pantallas grandes y medianas */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="min-w-full table-auto border-collapse border border-gray-300 bg-white shadow-md rounded-lg">
              <thead>
                <tr className="bg-gray-200 text-xs text-gray-600 uppercase">
                  {/* ... (cabeceras th sin cambios) ... */}
                  <th className="border border-gray-300 px-4 py-2 text-left">Applicant</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Date</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">End Date</th>
                  <th className="border border-gray-300 px-4 py-2 text-right">Total Price</th>
                  <th className="border border-gray-300 px-4 py-2 text-right">Pay</th>
                  <th className="border border-gray-300 px-4 py-2 text-center">Status</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Address</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">System</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Notes</th>
                  <th className="border border-gray-300 px-4 py-2 text-center">Actions</th>
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
                      className={`hover:bg-gray-100 ${getStatusColor(budget.status)}`}
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
                    <td className="border border-gray-300 px-4 py-2">
                      <div className="flex items-center justify-center space-x-2"> 

                        {budget.status === "created" && (
                          <button
                            onClick={() => handleUpdateStatus(budget.idBudget, "send", budget)}
                            className="inline-flex items-center justify-center bg-yellow-500 text-white px-2 py-1 rounded text-xs hover:bg-yellow-600 w-16" // Añadido w-16 para ancho fijo
                            title="Send Budget"
                          >
                            Send
                          </button>
                        )}

                        {budget.status === "send" && (
                          <div className="flex flex-col items-center space-y-1">
                             {/* Botón "Sent" deshabilitado */}
                             <button
                               disabled
                               className="inline-flex items-center justify-center bg-gray-400 text-white px-2 py-1 rounded text-xs cursor-not-allowed w-16" // Añadido w-16
                               title="Budget Sent"
                             >
                               Sent
                             </button>
                             {/* Indicador de Invoice */}
                             {budget.paymentInvoice ? (
                               <p className="text-green-600 text-[10px] font-semibold mt-1">Invoice OK</p> // Más pequeño
                             ) : (
                               <p className="text-orange-600 text-[10px] font-semibold mt-1">Need Invoice</p> // Más pequeño
                             )}
                             {/* Botón Reject */}
                             <button
                               onClick={() => handleUpdateStatus(budget.idBudget, "rejected", budget)}
                               className="inline-flex items-center justify-center bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600 w-16 mt-1" // Añadido w-16 y margen
                               title="Reject Budget"
                             >
                               Reject
                             </button>
                          </div>
                        )}

                        {budget.status === "approved" && (
                          <p className="text-green-600 text-xs font-semibold px-2 py-1 w-16 text-center"> {/* Añadido w-16 y text-center */}
                            Approved
                          </p>
                        )}

                        {budget.status === "rejected" && (
                          <p className="text-red-600 text-xs font-semibold px-2 py-1 w-16 text-center"> {/* Añadido w-16 y text-center */}
                            Rejected
                          </p>
                        )}
                      
                        {/* Acciones para el PDF del Presupuesto mismo */}
                        {hasBudgetPdfItself && ( // Si budget.pdfPath existe
                        <>
                            {/* Botón para VER el PDF del Presupuesto EN MODAL */}
                            <button 
                            onClick={() => handleShowPermitPdfInModal(budget, 'budgetSelf')} 
                            disabled={isLoadingPdfInModal === `${budget.idBudget}-budgetSelf`} 
                            className="inline-flex items-center justify-center bg-teal-600 text-white px-2 py-1 rounded text-xs hover:bg-teal-700 min-w-[70px] m-0.5 disabled:opacity-50" 
                            title="View Budget PDF"
                            >
                            {isLoadingPdfInModal === `${budget.idBudget}-budgetSelf` ? <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : <EyeIcon className="h-4 w-4" />}
                            <span className="ml-1 text-[10px]">Budget</span>
                            </button>

                            {/* Botón para DESCARGAR el PDF del Presupuesto */}
                            <button 
                            onClick={() => handleDownloadPdf(budget.idBudget, `budget_${budget.idBudget}.pdf`)} 
                            disabled={downloadingPdfId === budget.idBudget} 
                            className="inline-flex items-center justify-center bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700 min-w-[80px] m-0.5 disabled:opacity-50"  // Ajustado min-w para "Download"
                            title="Download Budget PDF"
                            >
                            {downloadingPdfId === budget.idBudget ? <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : <DocumentArrowDownIcon className="h-4 w-4" />}
                            <span className="ml-1 text-[10px]">Download</span>
                            </button>
                        </>
                        )}

                        {/* Botón para ver PDF Principal del Permiso */}
                        {permitId && hasPermitPdfData && (
                            <button
                            onClick={() => handleShowPermitPdfInModal(budget, 'pdfData')}
                            disabled={isLoadingPdfInModal === `${budget.idBudget}-pdfData`}
                            className="inline-flex items-center justify-center bg-indigo-600 text-white px-2 py-1 rounded text-xs hover:bg-indigo-700 min-w-[70px] m-0.5 disabled:opacity-50"
                            title="View Permit PDF"
                            >
                            {isLoadingPdfInModal === `${budget.idBudget}-pdfData` ? <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : <PaperClipIcon className="h-4 w-4" />}
                            <span className="ml-1 text-[10px]">Permit</span>
                            </button>
                        )}

                        {/* Botón para ver Documentos Opcionales del Permiso */}
                        {permitId && hasPermitOptionalDocs && (
                            <button
                            onClick={() => handleShowPermitPdfInModal(budget, 'optionalDocs')}
                            disabled={isLoadingPdfInModal === `${budget.idBudget}-optionalDocs`}
                            className="inline-flex items-center justify-center bg-purple-600 text-white px-2 py-1 rounded text-xs hover:bg-purple-700 min-w-[70px] m-0.5 disabled:opacity-50"
                            title="View Optional Docs"
                            >
                            {isLoadingPdfInModal === `${budget.idBudget}-optionalDocs` ? <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : <PaperClipIcon className="h-4 w-4" />}
                            <span className="ml-1 text-[10px]">Optional</span>
                            </button>
                        )}
                        
                        {/* Placeholder si no hay NINGÚN PDF (ni de budget, ni de permit, ni opcional) */}
                        {!hasBudgetPdfItself && !(permitId && (hasPermitPdfData || hasPermitOptionalDocs)) && (
                            <div className="w-px h-px m-0.5"></div> 
                        )}
                      </div> 
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>

          <div className="block lg:hidden space-y-4">
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
                  className={`border border-gray-300 rounded-lg p-4 shadow-md ${getStatusColor(budget.status)}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-sm font-semibold text-gray-700 flex items-center">
                      {budget.applicantName}
                      {permitExpirationAlertIconCard}
                    </p>
                    {/* Aquí puedes poner el botón de editar notas si lo deseas en la parte superior */}
                  </div>
               
                  <p className="text-xs text-gray-600">Date: {formatDate(budget.date)}</p>
                  <p className="text-xs text-gray-600">End Date: {budget.expirationDate ? formatDate(budget.expirationDate) : "N/A"}</p>
                  <p className="text-xs text-gray-600">Price: ${budget.totalPrice}</p>
                  <p className="text-xs text-gray-600">{paymentLabel}: ${budget.initialPayment}</p>
                  <p className="text-xs text-gray-600">Status: <span className="font-medium">{budget.status}</span></p>
                  <p className="text-xs text-gray-600">Address: {budget.propertyAddress || "N/A"}</p>
                  <p className="text-xs text-gray-600">System Type: {budget.Permit?.systemType || budget.systemType || "N/A"}</p>
                  
                  {/* Notas (similar a la tabla) */}
                  <div className="mt-2 pt-2 border-t">
                    <p className="text-xs font-semibold text-gray-700 mb-1">Notes:</p>
                    {editingBudgetId === budget.idBudget ? (
                        <div className="flex flex-col">
                          <textarea
                            value={currentNote}
                            onChange={handleNoteChange}
                            className="w-full p-1 border rounded text-xs resize-y min-h-[40px]"
                            rows={2}
                            disabled={isSavingNote}
                          />
                          <div className="flex justify-end space-x-1 mt-1">
                            <button onClick={handleSaveNote} disabled={isSavingNote} className="p-1 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50" title="Save Notes">
                              {isSavingNote ? <svg className="animate-spin h-3 w-3 text-white" viewBox="0 0 24 24">...</svg> : <CheckIcon className="h-3 w-3" />}
                            </button>
                            <button onClick={handleCancelEditNote} disabled={isSavingNote} className="p-1 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50" title="Cancel Edit">
                              <XMarkIcon className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-between items-start">
                          <span className="whitespace-pre-wrap break-words text-xs text-gray-600 max-w-[calc(100%-2rem)]">
                            {budget.generalNotes || <span className="text-gray-400 italic">No notes</span>}
                          </span>
                          <button onClick={() => handleEditNoteClick(budget)} className="ml-2 p-0.5 text-blue-600 hover:text-blue-800" title="Edit Notes">
                            <PencilIcon className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                  </div>

                  {/* Acciones (Botones de estado y PDF) */}
                  <div className="mt-3 border-t pt-3">
                    <p className="text-xs font-semibold mb-1 text-gray-600">Actions:</p>
                    <div className="space-y-2"> {/* Contenedor principal para acciones */}
                        {/* Botones de Estado */}
                        {budget.status === "created" && (
                            <button onClick={() => handleUpdateStatus(budget.idBudget, "send", budget)} className="w-full text-center bg-yellow-500 text-white px-3 py-1.5 rounded text-xs hover:bg-yellow-600">Send Budget</button>
                        )}
                        {budget.status === "send" && (
                            <div className="w-full text-center p-2 border rounded bg-gray-50">
                                <p className="text-xs font-semibold text-gray-500">Sent</p>
                                {budget.paymentInvoice ? <p className="text-green-600 text-[10px] font-semibold">Invoice OK</p> : <p className="text-orange-600 text-[10px] font-semibold">Need Invoice</p>}
                                <button onClick={() => handleUpdateStatus(budget.idBudget, "rejected", budget)} className="mt-1 w-full bg-red-500 text-white px-3 py-1.5 rounded text-xs hover:bg-red-600">Reject</button>
                            </div>
                        )}
                        {budget.status === "approved" && <p className="w-full text-center text-green-600 text-xs font-semibold p-2 border rounded bg-green-50">Approved</p>}
                        {budget.status === "rejected" && <p className="w-full text-center text-red-600 text-xs font-semibold p-2 border rounded bg-red-50">Rejected</p>}

                        {/* Botones de PDF (usando grid para mejor distribución si hay varios) */}
                        {(hasBudgetPdfItself || (permitId && (hasPermitPdfData || hasPermitOptionalDocs))) && (
                          <div className="grid grid-cols-2 gap-2 pt-2">
                            {hasBudgetPdfItself && (
                                <>
                                    <button onClick={() => handleShowPermitPdfInModal(budget, 'budgetSelf')} disabled={isLoadingPdfInModal === `${budget.idBudget}-budgetSelf`} className="inline-flex items-center justify-center bg-teal-600 text-white px-2 py-1.5 rounded text-xs hover:bg-teal-700 disabled:opacity-50">
                                        {isLoadingPdfInModal === `${budget.idBudget}-budgetSelf` ? <svg className="animate-spin h-3 w-3 mr-1" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : <EyeIcon className="h-3 w-3 mr-1" />} Budget
                                    </button>
                                    <button onClick={() => handleDownloadPdf(budget.idBudget, `budget_${budget.idBudget}.pdf`)} disabled={downloadingPdfId === budget.idBudget} className="inline-flex items-center justify-center bg-blue-600 text-white px-2 py-1.5 rounded text-xs hover:bg-blue-700 disabled:opacity-50">
                                        {downloadingPdfId === budget.idBudget ? <svg className="animate-spin h-3 w-3 mr-1" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : <DocumentArrowDownIcon className="h-3 w-3 mr-1" />} Download
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
                        {/* Mensaje si no hay PDFs */}
                        {!hasBudgetPdfItself && !(permitId && (hasPermitPdfData || hasPermitOptionalDocs)) && (
                            <p className="text-xs text-gray-400 italic text-center pt-2">No PDF actions available</p> 
                        )}
                    </div>
                  </div>
                </div>
               );
              })}
          </div>

          {/* Paginado (sin cambios) */}
          <div className="flex justify-center mt-6">
            {Array.from({ length: totalPages }, (_, index) => (
              <button
                key={`page-${index + 1}`} // <--- AÑADE UN PREFIJO A LA KEY
                onClick={() => handlePageChange(index + 1)}
                className={`mx-1 px-3 py-1 text-xs rounded ${
                  currentPage === index + 1
                    ? "bg-blue-950 text-white shadow"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
              >
                {index + 1}
              </button>
            ))}
          </div>
            <PdfModal
            isOpen={isModalOpen}
            onClose={closeModal}
            pdfUrl={pdfUrlForModal}
            title={pdfTitleForModal}
          />
        </>
      )}
    </div>
  );
};

export default BudgetList;