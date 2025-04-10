import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchBudgets, updateBudget, uploadInvoice } from "../../Redux/Actions/budgetActions";

import BudgetPDF from "./BudgetPDF";
import { parseISO, isSameMonth, format } from "date-fns";


const BudgetList = () => {
  const dispatch = useDispatch();

  // Obtener el estado de budgets desde Redux
  const { budgets, loading, error } = useSelector((state) => state.budget);

  // Estados para el paginado
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  
   useEffect(() => {
    dispatch(fetchBudgets());
  }, [dispatch]);

  // Obtener la fecha actual
  const currentDate = new Date();



  // Filtrar presupuestos del mes actual
  const currentMonthBudgets = budgets.filter((budget) => {
    const budgetDate = parseISO(budget.date); // Convierte la fecha de 'YYYY-MM-DD' a un objeto Date
    return isSameMonth(budgetDate, currentDate);
  });

  // Ordenar los presupuestos por estado (priorizando "created")
  const sortedBudgets = currentMonthBudgets
    .slice() // Crear una copia para no mutar el estado original
    .sort((a, b) => {
      if (a.status === "created" && b.status !== "created") return -1;
      if (a.status !== "created" && b.status === "created") return 1;
      return 0;
    });

  // Calcular los presupuestos para la página actual
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentBudgets = sortedBudgets.slice(indexOfFirstItem, indexOfLastItem);

  // Cambiar de página
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const formatDate = (date) => format(new Date(date), "dd-MM-yyyy");

  const handleUpdateStatus = (idBudget, newStatus, budget) => {
    const validTransitions = {
      created: ["send"],
      send: ["approved", "rejected"],
      approved: [],
      rejected: [],
    };
  
    if (!validTransitions[budget.status].includes(newStatus)) {
      alert("No se puede cambiar a este estado.");
      return;
    }
  
    if (newStatus === "approved" && !budget.paymentInvoice) {
      alert("Debe cargar la factura antes de aprobar el presupuesto.");
      return;
    }
  
    // Excluir cualquier campo no deseado antes de enviar la solicitud
    const payload = { status: newStatus };
  
    dispatch(updateBudget(idBudget, payload))
      .then(() => {
        console.log(`Estado actualizado a: ${newStatus}`);
        // Recargar los presupuestos desde el backend
        dispatch(fetchBudgets());
      })
      .catch((error) => {
        console.error("Error al actualizar el estado:", error);
      });
  };
  const handleUploadPayment = async (idBudget, file) => {
    if (!file) {
      alert("Debe seleccionar un archivo.");
      return;
    }

    if (file.type !== "application/pdf") {
      alert("Solo se permiten archivos PDF.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("El archivo no debe superar los 5 MB.");
      return;
    }

    const budget = budgets.find((b) => b.idBudget === idBudget);
    if (budget.paymentInvoice) {
      alert("Ya se ha cargado una factura para este presupuesto.");
      return;
    }

    try {
      await dispatch(uploadInvoice(idBudget, file));
      alert("Factura cargada exitosamente.");
      dispatch(fetchBudgets());
    } catch (error) {
      alert("Error al cargar la factura: " + error.message);
    }
  };

  // Función para obtener el color de fondo según el estado
  const getStatusColor = (status) => {
    switch (status) {
      case "created":
        return "bg-white"; // Blanco
      case "send":
        return "bg-yellow-200"; // Amarillo
      case "approved":
        return "bg-green-200"; // Verde
      case "notResponded":
        return "bg-orange-200"; // Naranja
      case "rejected":
        return "bg-red-200"; // Rojo
      default:
        return "bg-white"; // Blanco por defecto
    }
  };

  // Calcular el número total de páginas
  const totalPages = Math.ceil(sortedBudgets.length / itemsPerPage);

  return (
    <div className="p-4">
      <h1 className="text-sm font-semibold mb-4">Presupuestos</h1>
  
      {/* Mostrar estado de carga */}
      {loading && <p className="text-blue-500">Cargando presupuestos...</p>}
  
      {/* Mostrar error si ocurre */}
      {error && <p className="text-red-500">Error: {error}</p>}
  
      {/* Mostrar lista de presupuestos */}
      {!loading && !error && (
        <>
          {/* Tabla para pantallas grandes y medianas */}
          <div className="hidden lg:block">
            <table className="table-auto w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border border-gray-300 font-Montserrat px-4 text-xs">Aplicant</th>
                  <th className="border border-gray-300 font-Montserrat px-4 text-xs">Date</th>
                  <th className="border border-gray-300 px-4 font-Montserrat text-xs">End Date</th>
                  <th className="border border-gray-300 px-4 font-Montserrat text-xs">Precio</th>
                  <th className="border border-gray-300 px-4 font-Montserrat text-xs">Pago 60%</th>
                  <th className="border border-gray-300 px-4 font-Montserrat text-xs">Estado</th>
                  <th className="border border-gray-300 px-4 font-Montserrat text-xs">Dirección</th>
                  <th className="border border-gray-300 px-4 font-Montserrat text-xs">System Type</th>
                  <th className="border border-gray-300 px-4 font-Montserrat text-xs">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {currentBudgets.map((budget) => (
                  <tr
                    key={budget.idBudget}
                    className={`hover:bg-gray-100 ${getStatusColor(budget.status)}`}
                  >
                    <td className="border border-gray-300 px-4 text-xs">{budget.applicantName}</td>
                    <td className="border border-gray-300 px-4 text-xs">
                      {format(parseISO(budget.date), "dd-MM-yyyy")}
                    </td>
                    <td className="border border-gray-300 px-4 text-xs">
                      {budget.expirationDate
                        ? format(parseISO(budget.expirationDate), "dd-MM-yyyy")
                        : "N/A"}
                    </td>
                    <td className="border border-gray-300 px-4 text-xs">${budget.price}</td>
                    <td className="border border-gray-300 px-4 text-xs">${budget.initialPayment}</td>
                    <td className="border border-gray-300 px-4 text-xs">{budget.status}</td>
                    <td className="border border-gray-300 px-4 text-xs">
                      {budget.propertyAddress || "No especificada"}
                    </td>
                    <td className="border border-gray-300 px-4 text-xs">
                      {budget.systemType || "No especificada"}
                    </td>
                    <td className="border border-gray-300 px-4">
                      {/* Acciones según el estado */}
                      {budget.status === "created" && (
                        <button
                          onClick={() => handleUpdateStatus(budget.idBudget, "send", budget)}
                          className="bg-yellow-500 text-white px-2 py-1 rounded text-xs"
                        >
                          Enviar
                        </button>
                      )}
  
  {budget.status === "send" && (
  <>
    {/* Subir factura */}
    <input
      type="file"
      onChange={(e) =>
        handleUploadPayment(budget.idBudget, e.target.files[0])
      }
      className="mb-2 text-xs"
      disabled={!!budget.paymentInvoice} // Deshabilitar si ya hay una factura cargada
    />
    {budget.paymentInvoice && (
      <p className="text-green-500 text-xs">Factura cargada</p>
    )}

    {/* Aprobar presupuesto */}
    {budget.paymentInvoice && (
      <button
        onClick={() =>
          handleUpdateStatus(budget.idBudget, "approved", budget)
        }
        className="bg-green-500 text-white px-2 py-1 rounded text-xs"
      >
        Aprobar
      </button>
    )}

    {/* Rechazar presupuesto */}
    <button
      onClick={() =>
        handleUpdateStatus(budget.idBudget, "rejected", budget)
      }
      className="bg-red-500 text-white px-2 py-1 rounded text-xs ml-2"
    >
      Rechazar
    </button>
  </>
)}
  
                      {budget.status === "approved" && (
                        <p className="text-green-500 text-xs">Presupuesto aprobado</p>
                      )}
  
                      {budget.status === "rejected" && (
                        <p className="text-red-500 text-xs">Presupuesto rechazado</p>
                      )}
  
                      {/* Descargar PDF */}
                      <BudgetPDF
                        budget={{
                          ...budget,
                          price: parseFloat(budget.price),
                          initialPayment: parseFloat(budget.initialPayment),
                        }}
                        editMode={false}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
  
          {/* Tarjetas para pantallas pequeñas */}
          <div className="block lg:hidden space-y-4">
            {currentBudgets.map((budget) => (
              <div
                key={budget.idBudget}
                className={`border border-gray-300 rounded-lg p-4 shadow-md ${getStatusColor(
                  budget.status
                )}`}
              >
                <p className="text-xs font-semibold">Aplicant: {budget.applicantName}</p>
                <p className="text-xs">Date: {budget.date}</p>
                <p className="text-xs">End Date: {budget.expirationDate || "N/A"}</p>
                <p className="text-xs">Precio: ${budget.price}</p>
                <p className="text-xs">Pago 60%: ${budget.initialPayment}</p>
                <p className="text-xs">Estado: {budget.status}</p>
                <p className="text-xs">Dirección: {budget.propertyAddress || "No especificada"}</p>
                <p className="text-xs">System Type: {budget.systemType || "No especificada"}</p>
                <div className="mt-2">
                  {/* Acciones según el estado */}
                  {budget.status === "created" && (
                    <button
                      onClick={() => handleUpdateStatus(budget.idBudget, "send", budget)}
                      className="bg-yellow-500 text-white px-2 py-1 rounded text-xs"
                    >
                      Enviar
                    </button>
                  )}
  
  {budget.status === "send" && (
  <>
    {/* Subir factura */}
    <input
      type="file"
      onChange={(e) =>
        handleUploadPayment(budget.idBudget, e.target.files[0])
      }
      className="mb-2 text-xs"
      disabled={!!budget.paymentInvoice} // Deshabilitar si ya hay una factura cargada
    />
    {budget.paymentInvoice && (
      <p className="text-green-500 text-xs">Factura cargada</p>
    )}

    {/* Aprobar presupuesto */}
    {budget.paymentInvoice && (
      <button
        onClick={() =>
          handleUpdateStatus(budget.idBudget, "approved", budget)
        }
        className="bg-green-500 text-white px-2 py-1 rounded text-xs"
      >
        Aprobar
      </button>
    )}

    {/* Rechazar presupuesto */}
    <button
      onClick={() =>
        handleUpdateStatus(budget.idBudget, "rejected", budget)
      }
      className="bg-red-500 text-white px-2 py-1 rounded text-xs ml-2"
    >
      Rechazar
    </button>
  </>
)}
  
                  {budget.status === "approved" && (
                    <p className="text-green-500 text-xs">Presupuesto aprobado</p>
                  )}
  
                  {budget.status === "rejected" && (
                    <p className="text-red-500 text-xs">Presupuesto rechazado</p>
                  )}
  
                  {/* Descargar PDF */}
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
  
          {/* Paginado */}
          <div className="flex justify-center mt-4">
            {Array.from({ length: totalPages }, (_, index) => (
              <button
                key={index + 1}
                onClick={() => handlePageChange(index + 1)}
                className={`mx-1 px-2 py-1 text-xs rounded ${
                  currentPage === index + 1
                    ? "bg-blue-950 text-white"
                    : "bg-gray-200 text-gray-700"
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