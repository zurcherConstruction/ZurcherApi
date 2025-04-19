import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchBudgets,
  updateBudget,
  // uploadInvoice, // Ya no se usa aquí si se eliminó handleUploadPayment
} from "../../Redux/Actions/budgetActions";

import BudgetPDF from "./BudgetPDF";
import { parseISO, isSameMonth, format } from "date-fns";

const BudgetList = () => {
  // ... (dispatch, useSelector, state, useEffect, filtros, ordenación, paginación) ...
  const dispatch = useDispatch();
  const { budgets, loading, error } = useSelector((state) => state.budget);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  useEffect(() => {
    dispatch(fetchBudgets());
  }, [dispatch]);

  const currentDate = new Date();
  // Asegúrate de que budgets no sea undefined antes de filtrar
  const currentMonthBudgets = budgets ? budgets.filter((budget) => {
    try {
      const budgetDate = parseISO(budget.date); 
      return isSameMonth(budgetDate, currentDate);
    } catch (e) {
      console.error("Error parsing budget date:", budget.date, e);
      return false; // Excluir si la fecha es inválida
    }
  }) : [];

  const sortedBudgets = currentMonthBudgets
    .slice() 
    .sort((a, b) => {
      // Orden más específico: created > send > approved > rejected
      const statusOrder = { created: 1, send: 2, approved: 3, rejected: 4 };
      return (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
    });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentBudgetsForDisplay = sortedBudgets.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
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

  return (
    <div className="p-4">
      <h1 className="text-lg font-semibold mb-4 text-gray-800">Monthly Budgets</h1>

      {/* --- YA NO SE RENDERIZA UploadInitialInvoice AQUÍ --- */}

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
                   <th className="border border-gray-300 px-4 py-2 text-right">Price</th>
                   <th className="border border-gray-300 px-4 py-2 text-right">Pay 60%</th>
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
                    {/* ... (celdas td de datos sin cambios) ... */}
                     <td className="border border-gray-300 px-4 py-2 text-xs">{budget.applicantName}</td>
                     <td className="border border-gray-300 px-4 py-2 text-xs">{formatDate(budget.date)}</td>
                     <td className="border border-gray-300 px-4 py-2 text-xs">{budget.expirationDate ? formatDate(budget.expirationDate) : "N/A"}</td>
                     <td className="border border-gray-300 px-4 py-2 text-xs text-right">${budget.price}</td>
                     <td className="border border-gray-300 px-4 py-2 text-xs text-right">${budget.initialPayment}</td>
                     <td className="border border-gray-300 px-4 py-2 text-xs text-center">{budget.status}</td>
                     <td className="border border-gray-300 px-4 py-2 text-xs">{budget.propertyAddress || "N/A"}</td>
                     <td className="border border-gray-300 px-4 py-2 text-xs">{budget.systemType || "N/A"}</td>
                    <td className="border border-gray-300 px-4 py-2 text-center"> {/* Centrado para acciones */}
                      {budget.status === "created" && (
                        <button
                          onClick={() => handleUpdateStatus(budget.idBudget, "send", budget)}
                          className="bg-yellow-500 text-white px-2 py-1 rounded text-xs hover:bg-yellow-600"
                        >
                          Send
                        </button>
                      )}

                      {budget.status === "send" && (
                        <div className="flex flex-col items-center space-y-1"> {/* Flex para alinear */}
                          {budget.paymentInvoice ? (
                             <p className="text-green-600 text-xs font-semibold">Invoice Uploaded</p>
                          ) : (
                             <p className="text-orange-600 text-xs font-semibold">Pending Invoice</p>
                          )}

                          {/* --- ELIMINAR EL BOTÓN DE APROBAR --- */}
                          {/* {budget.paymentInvoice && (
                            <button
                              onClick={() => handleUpdateStatus(budget.idBudget, "approved", budget)}
                              className="bg-green-500 text-white px-2 py-1 rounded text-xs"
                            >
                              Approve
                            </button>
                          )} */}

                          {/* Botón Rechazar */}
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

                      {/* Descargar PDF (siempre visible) */}
                      <div className="mt-1"> {/* Espacio para el botón PDF */}
                        <BudgetPDF
                          budget={{
                            ...budget,
                            price: parseFloat(budget.price),
                            initialPayment: parseFloat(budget.initialPayment),
                          }}
                          editMode={false}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Tarjetas para pantallas pequeñas */}
          <div className="block lg:hidden space-y-4">
            {currentBudgetsForDisplay.map((budget) => (
              <div
                key={budget.idBudget}
                className={`border border-gray-300 rounded-lg p-4 shadow-md ${getStatusColor(budget.status)}`}
              >
                {/* ... (detalles del presupuesto sin cambios) ... */}
                 <p className="text-sm font-semibold text-gray-700">Applicant: {budget.applicantName}</p>
                 <p className="text-xs text-gray-600">Date: {formatDate(budget.date)}</p>
                 <p className="text-xs text-gray-600">End Date: {budget.expirationDate ? formatDate(budget.expirationDate) : "N/A"}</p>
                 <p className="text-xs text-gray-600">Price: ${budget.price}</p>
                 <p className="text-xs text-gray-600">Pay 60%: ${budget.initialPayment}</p>
                 <p className="text-xs text-gray-600">Status: <span className="font-medium">{budget.status}</span></p>
                 <p className="text-xs text-gray-600">Address: {budget.propertyAddress || "N/A"}</p>
                 <p className="text-xs text-gray-600">System Type: {budget.systemType || "N/A"}</p>
                <div className="mt-3 border-t pt-2 flex items-center justify-between"> {/* Separador y flex */}
                  <div> {/* Contenedor para acciones de estado */}
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

                        {/* --- ELIMINAR EL BOTÓN DE APROBAR --- */}
                        {/* {budget.paymentInvoice && (
                          <button
                            onClick={() => handleUpdateStatus(budget.idBudget, "approved", budget)}
                            className="bg-green-500 text-white px-2 py-1 rounded text-xs"
                          >
                            Approve
                          </button>
                        )} */}
                        
                        {/* Botón Rechazar */}
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

                  {/* Descargar PDF (siempre visible) */}
                  <BudgetPDF
                    budget={{
                      ...budget,
                      price: parseFloat(budget.price),
                      initialPayment: parseFloat(budget.initialPayment),
                    }}
                    editMode={false}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Paginado (sin cambios) */}
          <div className="flex justify-center mt-6"> {/* Aumentado margen superior */}
            {Array.from({ length: totalPages }, (_, index) => (
              <button
                key={index + 1}
                onClick={() => handlePageChange(index + 1)}
                className={`mx-1 px-3 py-1 text-xs rounded ${ // Ligeramente más grande
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