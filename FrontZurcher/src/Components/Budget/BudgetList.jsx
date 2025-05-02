import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchBudgets,
  updateBudget,
  // uploadInvoice, // Ya no se usa aquí si se eliminó handleUploadPayment
} from "../../Redux/Actions/budgetActions";
import { DocumentArrowDownIcon, EyeIcon } from '@heroicons/react/24/outline'; // Icono para descarga
//import BudgetPDF from "./BudgetPDF";
import { parseISO,  format } from "date-fns";
import api from "../../utils/axios";


const BudgetList = () => {
  // ... (dispatch, useSelector, state, useEffect, filtros, ordenación, paginación) ...
  const dispatch = useDispatch();
  const { budgets, loading, error } = useSelector((state) => state.budget);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
console.log("Presupuestos:", budgets); // Verifica si los presupuestos se están obteniendo correctamente
 
const [downloadingPdfId, setDownloadingPdfId] = useState(null); // Estado para indicar descarga
const [viewingPdfId, setViewingPdfId] = useState(null);

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

  // --- ELIMINA handleUploadPayment si ya no se usa ---
  // const handleUploadPayment = async (idBudget, file) => { ... };

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
                  <th className="border border-gray-300 px-4 py-2 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentBudgetsForDisplay.map((budget) => (
                  <tr
                    key={budget.idBudget}
                    className={`hover:bg-gray-100 ${getStatusColor(budget.status)}`}
                  >
                   
                    <td className="border border-gray-300 px-4 py-2 text-xs">{budget.applicantName}</td>
                    <td className="border border-gray-300 px-4 py-2 text-xs">{formatDate(budget.date)}</td>
                    <td className="border border-gray-300 px-4 py-2 text-xs">{budget.expirationDate ? formatDate(budget.expirationDate) : "N/A"}</td>
                    <td className="border border-gray-300 px-4 py-2 text-xs text-right">${budget.totalPrice}</td>
                    <td className="border border-gray-300 px-4 py-2 text-xs text-right">${budget.initialPayment}</td>
                    <td className="border border-gray-300 px-4 py-2 text-xs text-center">{budget.status}</td>
                    <td className="border border-gray-300 px-4 py-2 text-xs">{budget.propertyAddress || "N/A"}</td>
                    <td className="border border-gray-300 px-4 py-2 text-xs"> {budget.Permit?.systemType || "N/A"}</td>
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
                      
                        {budget.pdfPath ? (
                          <>
                           
                            <button
                              onClick={() => handleViewPdf(budget.idBudget)}
                              disabled={viewingPdfId === budget.idBudget} // Deshabilitar mientras carga
                              className="inline-flex items-center justify-center bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700 w-16 disabled:opacity-50 disabled:cursor-wait"
                              title="View PDF"
                            >
                              {viewingPdfId === budget.idBudget ? (
                                <svg className="animate-spin h-4 w-4 text-white" /* ... spinner ... */ ></svg>
                              ) : (
                                <EyeIcon className="h-4 w-4" />
                              )}
                              <span className="ml-1">View</span>
                            </button>

                            
                            <button
                              onClick={() => handleDownloadPdf(budget.idBudget, `budget_${budget.idBudget}.pdf`)}
                              disabled={downloadingPdfId === budget.idBudget}
                              className="inline-flex items-center justify-center bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700 w-16 disabled:opacity-50 disabled:cursor-wait"
                              title="Download PDF"
                            >
                              {downloadingPdfId === budget.idBudget ? (
                                <svg className="animate-spin h-4 w-4 text-white" /* ... */ ></svg>
                              ) : (
                                <DocumentArrowDownIcon className="h-4 w-4" />
                              )}
                              <span className="ml-1">PDF</span>
                            </button>
                            </>
                        ) : (
                          // Espaciador si no hay PDF para mantener alineación (opcional)
                          <div className="w-16 h-px"></div> // O un span vacío con ancho
                        )}
                       

                      </div> 
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Tarjetas para pantallas pequeñas */}
          <div className="block lg:hidden space-y-4">
            {currentBudgetsForDisplay.map((budget) => {
              // --- INICIO CAMBIO: Determinar etiqueta de pago ---
              let paymentLabel = `Pay ${budget.initialPaymentPercentage || 60}%`; // Default o valor guardado
              if (budget.initialPaymentPercentage === 100) {
                paymentLabel = `Pay 100%`; // Etiqueta específica para 100%
              }
              // --- FIN CAMBIO ---

              return (
              <div
                key={budget.idBudget}
                className={`border border-gray-300 rounded-lg p-4 shadow-md ${getStatusColor(budget.status)}`}
              >
                {/* ... (detalles del presupuesto sin cambios) ... */}
                <p className="text-sm font-semibold text-gray-700">Applicant: {budget.applicantName}</p>
                <p className="text-xs text-gray-600">Date: {formatDate(budget.date)}</p>
                <p className="text-xs text-gray-600">End Date: {budget.expirationDate ? formatDate(budget.expirationDate) : "N/A"}</p>
                <p className="text-xs text-gray-600">Price: ${budget.totalPrice}</p>
                <p className="text-xs text-gray-600">{paymentLabel}: ${budget.initialPayment}</p>
                <p className="text-xs text-gray-600">Status: <span className="font-medium">{budget.status}</span></p>
                <p className="text-xs text-gray-600">Address: {budget.propertyAddress || "N/A"}</p>
                <p className="text-xs text-gray-600">System Type: {budget.systemType || "N/A"}</p>
                <div className="mt-3 border-t pt-2 flex items-center justify-between"> {/* Separador y flex */}
                  
                  <div> 
                    {budget.status === "created" && (
                      <button
                        onClick={() => handleUpdateStatus(budget.idBudget, "send", budget)}
                        className="bg-yellow-500 text-white px-2 py-1 rounded text-xs hover:bg-yellow-600"
                      >
                        Send
                      </button>
                    )}

                    {budget.status === "send" && (
                      <div className="flex items-center space-x-2"> {/* Flex para alinear */}
                        {budget.paymentInvoice ? (
                          <p className="text-green-600 text-xs font-semibold">Invoice Uploaded</p>
                        ) : (
                          <p className="text-orange-600 text-xs font-semibold">Pending Invoice</p>
                        )}

                       
                        <button
                          onClick={() => handleUpdateStatus(budget.idBudget, "rejected", budget)}
                          className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600"
                        >
                          Reject
                        </button>
                      </div>
                    )}

                    {budget.status === "approved" && (
                      <p className="text-green-600 text-xs font-semibold">
                        Approved
                      </p>
                    )}

                    {budget.status === "rejected" && (
                      <p className="text-red-600 text-xs font-semibold">
                        Rejected
                      </p>
                    )}
                  </div>

                  
                  <div className="flex items-center space-x-1"> 
                    {budget.pdfPath ? (
                      <>
                        
                        <button
                                  onClick={() => handleViewPdf(budget.idBudget)}
                                  disabled={viewingPdfId === budget.idBudget}
                                  className="inline-flex items-center justify-center bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700 w-16 disabled:opacity-50 disabled:cursor-wait"
                                  title="View PDF"
                               >
                                  {viewingPdfId === budget.idBudget ? ( <svg /* spinner */></svg> ) : ( <EyeIcon className="h-4 w-4" /> )}
                                  <span className="ml-1">View</span>
                               </button>
                        
                        <button
                          onClick={() => handleDownloadPdf(budget.idBudget, `budget_${budget.idBudget}.pdf`)}
                          disabled={downloadingPdfId === budget.idBudget}
                          className="inline-flex items-center justify-center bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700 w-16 disabled:opacity-50 disabled:cursor-wait"
                          title="Download PDF"
                        >
                          {downloadingPdfId === budget.idBudget ? ( <svg /* ... */></svg> ) : ( <DocumentArrowDownIcon className="h-4 w-4" /> )}
                          <span className="ml-1">PDF</span>
                        </button>
                      </>
                    ) : (
                      <span className="text-xs text-gray-400 italic">No PDF</span>
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
        </>
      )}
    </div>
  );
};

export default BudgetList;