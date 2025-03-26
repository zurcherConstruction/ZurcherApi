import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchBudgets } from "../../Redux/Actions/budgetActions"; // Asegúrate de que esta ruta sea correcta

const BudgetList = () => {
  const dispatch = useDispatch();

  // Obtener el estado de budgets desde Redux
  const { budgets, loading, error } = useSelector((state) => state.Budget);

  // Llamar a la acción para obtener los budgets al montar el componente
  useEffect(() => {
    dispatch(fetchBudgets());
  }, [dispatch]);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Lista de Presupuestos</h1>

      {/* Mostrar estado de carga */}
      {loading && <p className="text-blue-500">Cargando presupuestos...</p>}

      {/* Mostrar error si ocurre */}
      {error && <p className="text-red-500">Error: {error}</p>}

      {/* Mostrar lista de presupuestos */}
      {!loading && !error && (
        <table className="table-auto w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-200">
              <th className="border border-gray-300 px-4 py-2">ID</th>
              <th className="border border-gray-300 px-4 py-2">Nombre del Solicitante</th>
              <th className="border border-gray-300 px-4 py-2">Fecha</th>
              <th className="border border-gray-300 px-4 py-2">Fecha de Expiración</th>
              <th className="border border-gray-300 px-4 py-2">Precio</th>
              <th className="border border-gray-300 px-4 py-2">Pago Inicial</th>
              <th className="border border-gray-300 px-4 py-2">Estado</th>
              <th className="border border-gray-300 px-4 py-2">Dirección de Propiedad</th>
            </tr>
          </thead>
          <tbody>
            {budgets.map((budget) => (
              <tr key={budget.idBudget} className="hover:bg-gray-100">
                <td className="border border-gray-300 px-4 py-2">{budget.idBudget}</td>
                <td className="border border-gray-300 px-4 py-2">{budget.applicantName}</td>
                <td className="border border-gray-300 px-4 py-2">{budget.date}</td>
                <td className="border border-gray-300 px-4 py-2">{budget.expirationDate || "N/A"}</td>
                <td className="border border-gray-300 px-4 py-2">${budget.price}</td>
                <td className="border border-gray-300 px-4 py-2">${budget.initialPayment}</td>
                <td className="border border-gray-300 px-4 py-2">{budget.status}</td>
                <td className="border border-gray-300 px-4 py-2">
                  {budget.propertyAddress || "No especificada"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default BudgetList;