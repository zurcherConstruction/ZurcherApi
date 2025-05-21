import React, { useEffect, useState } from "react";
import {
  incomeActions,
  expenseActions,
  balanceActions,
} from "../Redux/Actions/balanceActions";
import { createReceipt, deleteReceipt } from "../Redux/Actions/receiptActions";
import { toast } from 'react-toastify';


const incomeTypes = [
  "Factura Pago Inicial Budget",
  "Factura Pago Final Budget",
  "DiseñoDif",
  "Comprobante Ingreso",
];

const expenseTypes = [
  "Materiales",
  "Diseño",
  "Workers",
  "Imprevistos",
  "Comprobante Gasto",
  "Gastos Generales",
];

const Summary = () => {
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    type: "",
    typeIncome: "",
    typeExpense: "",
    staffId: "",
  });
  const [movements, setMovements] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editModal, setEditModal] = useState({ open: false, movement: null });
  const [editData, setEditData] = useState({});
  const [receiptUrl, setReceiptUrl] = useState(null);

  // Obtener movimientos con filtros
  const fetchMovements = async () => {
    setLoading(true);
    try {
      const data = await balanceActions.getGeneralBalance(filters);
      const incomes = data.list?.incomes || [];
      const expenses = data.list?.expenses || [];
      const allMovements = [
        ...incomes.map((m) => ({ ...m, movimiento: "Ingreso" })),
        ...expenses.map((m) => ({ ...m, movimiento: "Gasto" })),
      ];
      setMovements(allMovements);

      // Extraer staff únicos de los movimientos
      const uniqueStaff = [];
      const seen = new Set();
      allMovements.forEach((mov) => {
        if (mov.Staff && mov.Staff.id && !seen.has(mov.Staff.id)) {
          uniqueStaff.push(mov.Staff);
          seen.add(mov.Staff.id);
        }
      });
      setStaffList(uniqueStaff);
    } catch {
      setMovements([]);
      setStaffList([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMovements();
    // eslint-disable-next-line
  }, []);

  const handleChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleFilter = (e) => {
    e.preventDefault();
    fetchMovements();
  };

  // Eliminar movimiento
  const handleDelete = async (mov) => {
    if (window.confirm("¿Seguro que deseas eliminar este movimiento?")) {
      try {
        if (mov.movimiento === "Ingreso") {
          const isInvoicePayment = 
            mov.typeIncome === "Factura Pago Final Budget" || 
            mov.typeIncome === "Factura Pago Inicial Budget";

          if (isInvoicePayment) {
            // Es un ingreso de tipo factura
            if (mov.Receipts && mov.Receipts.length > 0) {
              const receiptToDelete = mov.Receipts[0]; 
              if (receiptToDelete && receiptToDelete.idReceipt) {
                console.log(`SUMMARY: Intentando llamar a deleteReceipt (de receiptActions) con ID de Recibo: ${receiptToDelete.idReceipt}`);
                await deleteReceipt(receiptToDelete.idReceipt); 
                toast.success("Comprobante y movimiento asociado eliminados correctamente.");
              } else {
                // Es un ingreso de factura, se esperaba un recibo con ID, pero no se encontró.
                // Esto podría ser un estado de datos inconsistente.
                // Decide si quieres borrar solo el income como fallback o mostrar un error más específico.
                console.warn(`SUMMARY: Ingreso de factura (ID: ${mov.idIncome}, Tipo: ${mov.typeIncome}) no tiene un idReceipt válido en sus Receipts. Borrando solo el ingreso como fallback.`);
                await incomeActions.delete(mov.idIncome);
                toast.warn("Movimiento de ingreso eliminado, pero hubo un problema al procesar el comprobante asociado (ID de recibo no encontrado).");
              }
            } else {
              // Es un ingreso de factura, pero no tiene `mov.Receipts`.
              // Esto también podría ser un estado de datos inconsistente.
              console.warn(`SUMMARY: Ingreso de factura (ID: ${mov.idIncome}, Tipo: ${mov.typeIncome}) no tiene Receipts adjuntos. Borrando solo el ingreso como fallback.`);
              await incomeActions.delete(mov.idIncome);
              toast.warn("Movimiento de ingreso eliminado, pero no se encontraron comprobantes asociados para una eliminación completa.");
            }
          } else {
            // No es un ingreso de tipo factura, borrar solo el income.
            console.log(`SUMMARY: Llamando a incomeActions.delete para Ingreso (no factura) ID: ${mov.idIncome}, Tipo: ${mov.typeIncome}`);
            await incomeActions.delete(mov.idIncome);
            toast.success("Movimiento de ingreso eliminado.");
          }
        } else if (mov.movimiento === "Gasto") {
          // Lógica para gastos
          if (mov.Receipts && mov.Receipts.length > 0) {
            const receiptToDelete = mov.Receipts[0];
            if (receiptToDelete && receiptToDelete.idReceipt) {
              console.log(`SUMMARY: Intentando llamar a deleteReceipt (de receiptActions) con ID de Recibo (Gasto): ${receiptToDelete.idReceipt}`);
              await deleteReceipt(receiptToDelete.idReceipt);
              toast.success("Comprobante y movimiento de gasto asociado eliminados correctamente.");
            } else {
              console.warn(`SUMMARY: Gasto (ID: ${mov.idExpense}) no tiene un idReceipt válido en sus Receipts. Borrando solo el gasto como fallback.`);
              await expenseActions.delete(mov.idExpense);
              toast.warn("Movimiento de gasto eliminado, pero hubo un problema al procesar el comprobante asociado (ID de recibo no encontrado).");
            }
          } else {
            // Gasto sin recibos, borrar solo el gasto.
            console.log(`SUMMARY: Llamando a expenseActions.delete para Gasto ID: ${mov.idExpense}`);
            await expenseActions.delete(mov.idExpense);
            toast.success("Movimiento de gasto eliminado.");
          }
        }
        fetchMovements(); // Recargar movimientos después de la eliminación
      } catch (error) {
        console.error("Error al eliminar en Summary:", error);
        // Asegúrate de que el error que se muestra sea útil.
        // Si el error viene de la acción de Redux, ya debería estar formateado.
        const displayError = error.response?.data?.message || error.message || "Error desconocido al eliminar.";
        toast.error(displayError);
      }
    }
  };

  // Abrir modal de edición
  const handleEdit = (mov) => {
    setEditModal({ open: true, movement: mov });
    setEditData({
      amount: mov.amount,
      notes: mov.notes,
      date: mov.date,
      typeIncome: mov.typeIncome || "",
      typeExpense: mov.typeExpense || "",
    });
  };

  // Guardar edición
  const handleEditSave = async () => {
    const mov = editModal.movement;
    try {
      if (mov.movimiento === "Ingreso") {
        await incomeActions.update(mov.idIncome, {
          ...editData, // Contiene amount, notes, date
          typeIncome: editData.typeIncome, // Asegúrate que el backend acepte typeIncome en la actualización
        });
      } else {
        await expenseActions.update(mov.idExpense, {
          ...editData,
          typeExpense: editData.typeExpense,
        });
      }
      toast.success("Movimiento actualizado correctamente.");
      setEditModal({ open: false, movement: null });
      fetchMovements();
    } catch (error) {
      console.error("Error al actualizar:", error);
      toast.error(error?.response?.data?.message || error.message || "Error al actualizar el movimiento.");
    }
  };


  // Filtrado en frontend
  const filteredMovements = movements.filter((mov) => {
    if (filters.type === "income" && mov.movimiento !== "Ingreso") return false;
    if (filters.type === "expense" && mov.movimiento !== "Gasto") return false;
    if (
      filters.typeIncome &&
      mov.movimiento === "Ingreso" &&
      mov.typeIncome !== filters.typeIncome
    )
      return false;
    if (
      filters.typeExpense &&
      mov.movimiento === "Gasto" &&
      mov.typeExpense !== filters.typeExpense
    )
      return false;
    if (filters.staffId && mov.Staff && mov.Staff.id !== filters.staffId)
      return false;
    if (filters.staffId && !mov.Staff) return false;
    return true;
  });

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-4">Movimientos</h2>
      <form className="flex flex-wrap gap-4 mb-6" onSubmit={handleFilter}>
        <input
          type="date"
          name="startDate"
          value={filters.startDate}
          onChange={handleChange}
          className="border rounded px-2 py-1"
          placeholder="Desde"
        />
        <input
          type="date"
          name="endDate"
          value={filters.endDate}
          onChange={handleChange}
          className="border rounded px-2 py-1"
          placeholder="Hasta"
        />
        <select
          name="type"
          value={filters.type}
          onChange={handleChange}
          className="border rounded px-2 py-1"
        >
          <option value="">Todos</option>
          <option value="income">Ingresos</option>
          <option value="expense">Gastos</option>
        </select>
        <select
          name="typeIncome"
          value={filters.typeIncome}
          onChange={handleChange}
          className="border rounded px-2 py-1"
        >
          <option value="">Todos los tipos de ingreso</option>
          {incomeTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        <select
          name="typeExpense"
          value={filters.typeExpense}
          onChange={handleChange}
          className="border rounded px-2 py-1"
        >
          <option value="">Todos los tipos de gasto</option>
          {expenseTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        <select
          name="staffId"
          value={filters.staffId}
          onChange={handleChange}
          className="border rounded px-2 py-1"
        >
          <option value="">Todos los usuarios</option>
          {staffList.map((staff) => (
            <option key={staff.id} value={staff.id}>
              {staff.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700"
        >
          Filtrar
        </button>
      </form>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border rounded">
          <thead>
            <tr>
              <th className="px-2 py-1 border">Fecha</th>
              <th className="px-2 py-1 border">Tipo</th>
              <th className="px-2 py-1 border">Monto</th>
              <th className="px-2 py-1 border">Movimiento</th>
              <th className="px-2 py-1 border">Notas</th>
              <th className="px-2 py-1 border">Usuario</th>
              <th className="px-2 py-1 border">Comprobante</th>
              <th className="px-2 py-1 border">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-4">
                  Cargando...
                </td>
              </tr>
            ) : filteredMovements.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-4">
                  Sin movimientos
                </td>
              </tr>
            ) : (
              filteredMovements.map((mov) => (
                <tr key={mov.idIncome || mov.idExpense}>
                  <td className="border px-2 py-1">{mov.date}</td>
                  <td className="border px-2 py-1">{mov.movimiento}</td>
                  <td className="border px-2 py-1">{mov.amount}</td>
                  <td className="border px-2 py-1">
                    {mov.typeIncome || mov.typeExpense || "-"}
                  </td>
                  <td className="border px-2 py-1">{mov.notes}</td>
                  <td className="border px-2 py-1">{mov.Staff?.name || "-"}</td>

                  <td className="border px-2 py-1">
                    {mov.Receipts && mov.Receipts.length > 0 ? (
                      <button
                        className="bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-700"
                        onClick={() => {
                          console.log('Abriendo comprobante:', mov.Receipts[0]);
                          setReceiptUrl(mov.Receipts[0]);
                        }}
                      >
                        Ver
                      </button>
                    ) : (
                      "Sin comprobante"
                    )}
                  </td>
                  <td className="border px-2 py-1 flex gap-2">
                    <button
                      className="bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-600"
                      onClick={() => handleEdit(mov)}
                    >
                      Editar
                    </button>
                    <button
                      className="bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
                      onClick={() => handleDelete(mov)}
                    >
                      Eliminar
                    </button>
                  </td>

                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de edición */}
      {editModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">
              Editar {editModal.movement.movimiento}
            </h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleEditSave();
              }}
              className="flex flex-col gap-3"
            >
              <label className="text-sm font-medium">Fecha:</label>
              <input
                type="date"
                value={editData.date ? new Date(editData.date).toISOString().split('T')[0] : ''}
                onChange={(e) =>
                  setEditData({ ...editData, date: e.target.value })
                }
                className="border rounded px-2 py-1"
              />
              <label className="text-sm font-medium">Monto:</label>
              <input
                type="number"
                step="0.01"
                value={editData.amount}
                onChange={(e) =>
                  setEditData({ ...editData, amount: e.target.value })
                }
                className="border rounded px-2 py-1"
                placeholder="Monto"
              />
              <label className="text-sm font-medium">Notas:</label>
              <textarea
                value={editData.notes}
                onChange={(e) =>
                  setEditData({ ...editData, notes: e.target.value })
                }
                className="border rounded px-2 py-1"
                placeholder="Notas"
                rows="3"
              />
              {editModal.movement.movimiento === "Ingreso" ? (
                <>
                  <label className="text-sm font-medium">Tipo de Ingreso:</label>
                  <select
                    name="typeIncome"
                    value={editData.typeIncome}
                    onChange={(e) =>
                      setEditData({ ...editData, typeIncome: e.target.value })
                    }
                    className="border rounded px-2 py-1"
                  >
                    <option value="">Seleccione tipo</option>
                    {incomeTypes.map(type => <option key={type} value={type}>{type}</option>)}
                  </select>
                </>
              ) : (
                <>
                  <label className="text-sm font-medium">Tipo de Gasto:</label>
                  <select
                    name="typeExpense"
                    value={editData.typeExpense}
                    onChange={(e) =>
                      setEditData({ ...editData, typeExpense: e.target.value })
                    }
                    className="border rounded px-2 py-1"
                  >
                    <option value="">Seleccione tipo</option>
                    {expenseTypes.map(type => <option key={type} value={type}>{type}</option>)}
                  </select>
                </>
              )}
              <div className="flex gap-2 mt-2">
                <button
                  type="submit"
                  className="bg-green-600 text-white px-4 py-1 rounded hover:bg-green-700"
                >
                  Guardar
                </button>
                <button
                  type="button"
                  className="bg-gray-400 text-white px-4 py-1 rounded hover:bg-gray-500"
                  onClick={() => setEditModal({ open: false, movement: null })}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {receiptUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded shadow-lg p-6 max-w-3xl w-full relative">
            <button
              className="absolute top-2 right-2 text-gray-700 hover:text-gray-900 text-2xl leading-none"
              onClick={() => setReceiptUrl(null)}
              aria-label="Cerrar modal"
            >
              &times;
            </button>
            {console.log('Modal comprobante data:', receiptUrl)}
            {receiptUrl && typeof receiptUrl === 'object' && receiptUrl.fileUrl && receiptUrl.mimeType ? (
              receiptUrl.mimeType.startsWith('image/') ? (
                <img
                  src={receiptUrl.fileUrl}
                  alt={receiptUrl.originalName || "Comprobante"}
                  className="max-h-[80vh] w-auto mx-auto rounded"
                />
              ) : receiptUrl.mimeType === 'application/pdf' ? (
                <iframe
                  key={receiptUrl.fileUrl}
                  src={`https://docs.google.com/gview?url=${encodeURIComponent(receiptUrl.fileUrl)}&embedded=true`}
                  title={receiptUrl.originalName || "Vista previa PDF"}
                  width="100%"
                  height="600px"
                  className="rounded border"
                  allow="autoplay" // Aunque no es para PDF, a veces ayuda con iframes
                >
                  <p className="p-4 text-center text-gray-600">
                    No se pudo cargar la vista previa del PDF. Intenta abrirlo en una nueva pestaña.
                  </p>
                </iframe>
              ) : (
                <p className="p-4 text-center text-gray-600">
                  Archivo no previsualizable (tipo: {receiptUrl.mimeType}).
                </p>
              )
            ) : (
              <p className="p-4 text-center text-gray-600">
                No se puede mostrar el comprobante. Datos del archivo incompletos o incorrectos.
              </p>
            )}
            {/* Enlace de descarga eliminado */}
          </div>
        </div>
      )}
    </div>
  );
};

export default Summary;