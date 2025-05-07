import React, { useEffect, useState } from "react";
import {
  incomeActions,
  expenseActions,
  balanceActions,
} from "../Redux/Actions/balanceActions";

const incomeTypes = [
  'Factura Pago Inicial Budget',
  'Factura Pago Final Budget',
  'DiseñoDif',
  'Comprobante Ingreso',
];

const expenseTypes = [
  'Materiales',
  'Diseño',
  'Workers',
  'Imprevistos',
  'Comprobante Gasto',
  'Gastos Generales',
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
      if (mov.movimiento === "Ingreso") {
        await incomeActions.delete(mov.idIncome);
      } else {
        await expenseActions.delete(mov.idExpense);
      }
      fetchMovements();
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
    if (mov.movimiento === "Ingreso") {
      await incomeActions.update(mov.idIncome, {
        ...editData,
        typeIncome: editData.typeIncome,
      });
    } else {
      await expenseActions.update(mov.idExpense, {
        ...editData,
        typeExpense: editData.typeExpense,
      });
    }
    setEditModal({ open: false, movement: null });
    fetchMovements();
  };

  // Filtrado en frontend
  const filteredMovements = movements.filter((mov) => {
    if (filters.type === "income" && mov.movimiento !== "Ingreso") return false;
    if (filters.type === "expense" && mov.movimiento !== "Gasto") return false;
    if (
      filters.typeIncome &&
      mov.movimiento === "Ingreso" &&
      mov.typeIncome !== filters.typeIncome
    ) return false;
    if (
      filters.typeExpense &&
      mov.movimiento === "Gasto" &&
      mov.typeExpense !== filters.typeExpense
    ) return false;
    if (filters.staffId && mov.Staff && mov.Staff.id !== filters.staffId) return false;
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
      <option key={type} value={type}>{type}</option>
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
      <option key={type} value={type}>{type}</option>
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
                        onClick={() =>
                          window.open(mov.Receipts[0].fileUrl, "_blank")
                        }
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
              <input
                type="date"
                value={editData.date}
                onChange={(e) =>
                  setEditData({ ...editData, date: e.target.value })
                }
                className="border rounded px-2 py-1"
              />
              <input
                type="number"
                value={editData.amount}
                onChange={(e) =>
                  setEditData({ ...editData, amount: e.target.value })
                }
                className="border rounded px-2 py-1"
                placeholder="Monto"
              />
              <input
                type="text"
                value={editData.notes}
                onChange={(e) =>
                  setEditData({ ...editData, notes: e.target.value })
                }
                className="border rounded px-2 py-1"
                placeholder="Notas"
              />
              {editModal.movement.movimiento === "Ingreso" ? (
                <input
                  type="text"
                  value={editData.typeIncome}
                  onChange={(e) =>
                    setEditData({ ...editData, typeIncome: e.target.value })
                  }
                  className="border rounded px-2 py-1"
                  placeholder="Tipo de ingreso"
                />
              ) : (
                <input
                  type="text"
                  value={editData.typeExpense}
                  onChange={(e) =>
                    setEditData({ ...editData, typeExpense: e.target.value })
                  }
                  className="border rounded px-2 py-1"
                  placeholder="Tipo de gasto"
                />
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
    </div>
  );
};

export default Summary;
