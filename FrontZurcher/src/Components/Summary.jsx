import React, { useEffect, useState } from "react";
import {
  incomeActions,
  expenseActions,
  balanceActions,
} from "../Redux/Actions/balanceActions";
import { createReceipt, deleteReceipt } from "../Redux/Actions/receiptActions";
import { toast } from 'react-toastify';
import {
  ChartBarIcon,
  CalendarDaysIcon,
  UserIcon,
  FunnelIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  DocumentTextIcon,
  BanknotesIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  XMarkIcon,
  MagnifyingGlassIcon
} from "@heroicons/react/24/outline";

const incomeTypes = [
  "Factura Pago Inicial Budget",
  "Factura Pago Final Budget",
  "DiseñoDif",
  "Comprobante Ingreso",
];

const expenseTypes = [
  "Materiales",
  "Materiales Iniciales",
  "Inspección Inicial",
  "Inspección Final",
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
          const isInitialPayment = mov.typeIncome === "Factura Pago Inicial Budget";
          const isFinalPayment = mov.typeIncome === "Factura Pago Final Budget";

          if (isInitialPayment || isFinalPayment) {
            // Para pagos de facturas, verificar si tiene comprobantes
            if (mov.Receipts && mov.Receipts.length > 0) {
              const receiptToDelete = mov.Receipts[0];
              
              // Si el comprobante viene del Budget (pago inicial)
              if (receiptToDelete.source === 'budget') {
                console.log(`SUMMARY: Pago inicial con comprobante de Budget. Solo eliminando el Income ID: ${mov.idIncome}`);
                await incomeActions.delete(mov.idIncome);
                toast.success("Movimiento de ingreso eliminado. El comprobante del budget se mantiene.");
              } 
              // Si el comprobante viene de FinalInvoice (pago final)
              else if (receiptToDelete.source === 'finalInvoice') {
                console.log(`SUMMARY: Pago final con comprobante de FinalInvoice. Solo eliminando el Income ID: ${mov.idIncome}`);
                await incomeActions.delete(mov.idIncome);
                toast.success("Movimiento de ingreso eliminado. El comprobante de la factura final se mantiene.");
              }
              // Si es un Receipt real (no vinculado a Budget o FinalInvoice)
              else if (receiptToDelete.idReceipt && !receiptToDelete.idReceipt.toString().startsWith('budget-')) {
                console.log(`SUMMARY: Eliminando Receipt ID: ${receiptToDelete.idReceipt}`);
                await deleteReceipt(receiptToDelete.idReceipt);
                toast.success("Comprobante y movimiento asociado eliminados correctamente.");
              } else {
                // Fallback para casos edge
                await incomeActions.delete(mov.idIncome);
                toast.success("Movimiento de ingreso eliminado.");
              }
            } else {
              // Sin comprobantes, eliminar solo el income
              await incomeActions.delete(mov.idIncome);
              toast.success("Movimiento de ingreso eliminado.");
            }
          } else {
            // No es un ingreso de factura
            await incomeActions.delete(mov.idIncome);
            toast.success("Movimiento de ingreso eliminado.");
          }
        } else if (mov.movimiento === "Gasto") {
          // Lógica para gastos (sin cambios)
          if (mov.Receipts && mov.Receipts.length > 0) {
            const receiptToDelete = mov.Receipts[0];
            if (receiptToDelete && receiptToDelete.idReceipt) {
              await deleteReceipt(receiptToDelete.idReceipt);
              toast.success("Comprobante y movimiento de gasto asociado eliminados correctamente.");
            } else {
              await expenseActions.delete(mov.idExpense);
              toast.warn("Movimiento de gasto eliminado, pero hubo un problema al procesar el comprobante asociado.");
            }
          } else {
            await expenseActions.delete(mov.idExpense);
            toast.success("Movimiento de gasto eliminado.");
          }
        }
        fetchMovements();
      } catch (error) {
        console.error("Error al eliminar en Summary:", error);
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
          amount: editData.amount,
          notes: editData.notes,
          date: editData.date,
          typeIncome: editData.typeIncome,
        });
        toast.success("Ingreso actualizado.");
      } else {
        await expenseActions.update(mov.idExpense, {
          amount: editData.amount,
          notes: editData.notes,
          date: editData.date,
          typeExpense: editData.typeExpense,
        });
        toast.success("Gasto actualizado.");
      }
      setEditModal({ open: false, movement: null });
      fetchMovements();
    } catch (error) {
      toast.error("Error al actualizar.");
    }
  };

  // Filtrado en frontend
  const filteredMovements = movements.filter((mov) => {
    if (filters.type && filters.type === "income" && mov.movimiento !== "Ingreso")
      return false;
    if (filters.type && filters.type === "expense" && mov.movimiento !== "Gasto")
      return false;
    if (filters.typeIncome && mov.typeIncome !== filters.typeIncome)
      return false;
    if (filters.typeExpense && mov.typeExpense !== filters.typeExpense)
      return false;
    if (filters.staffId && mov.Staff && mov.Staff.id !== filters.staffId)
      return false;
    if (filters.staffId && !mov.Staff) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="max-w-full mx-auto px-2">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg">
              <ChartBarIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Resumen Financiero</h2>
              <p className="text-gray-600">Gestión de ingresos y gastos del proyecto</p>
            </div>
          </div>

          {/* Filtros */}
          <form className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4" onSubmit={handleFilter}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <CalendarDaysIcon className="h-4 w-4 inline mr-1" />
                Fecha Desde
              </label>
              <input
                type="date"
                name="startDate"
                value={filters.startDate}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <CalendarDaysIcon className="h-4 w-4 inline mr-1" />
                Fecha Hasta
              </label>
              <input
                type="date"
                name="endDate"
                value={filters.endDate}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FunnelIcon className="h-4 w-4 inline mr-1" />
                Tipo General
              </label>
              <select
                name="type"
                value={filters.type}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              >
                <option value="">Todos</option>
                <option value="income">Ingresos</option>
                <option value="expense">Gastos</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <ArrowTrendingUpIcon className="h-4 w-4 inline mr-1" />
                Tipo de Ingreso
              </label>
              <select
                name="typeIncome"
                value={filters.typeIncome}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              >
                <option value="">Todos</option>
                {incomeTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <ArrowTrendingDownIcon className="h-4 w-4 inline mr-1" />
                Tipo de Gasto
              </label>
              <select
                name="typeExpense"
                value={filters.typeExpense}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              >
                <option value="">Todos</option>
                {expenseTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <UserIcon className="h-4 w-4 inline mr-1" />
                Usuario
              </label>
              <select
                name="staffId"
                value={filters.staffId}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              >
                <option value="">Todos</option>
                {staffList.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2 lg:col-span-3 xl:col-span-6 flex gap-3">
              <button
                type="submit"
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-all duration-200 transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center space-x-2"
              >
                <MagnifyingGlassIcon className="h-5 w-5" />
                <span>Filtrar</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setFilters({
                    startDate: "",
                    endDate: "",
                    type: "",
                    typeIncome: "",
                    typeExpense: "",
                    staffId: "",
                  });
                  fetchMovements();
                }}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-6 rounded-lg transition-all duration-200 flex items-center space-x-2"
              >
                <XMarkIcon className="h-5 w-5" />
                <span>Limpiar</span>
              </button>
            </div>
          </form>
        </div>

        {/* Tabla de movimientos */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="px-4 py-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center space-x-2">
              <BanknotesIcon className="h-5 w-5 text-blue-600" />
              <span>Movimientos Registrados</span>
              <span className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full ml-2">
                {filteredMovements.length} registros
              </span>
            </h3>
          </div>

          {/* Contenedor con scroll vertical solamente */}
          <div className="max-h-[70vh] overflow-y-auto">
            <table className="w-full min-w-full table-auto">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                    Fecha
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                    Tipo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                    Monto
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                    Categoría
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Notas / Dirección
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                    Usuario
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                    Comprobante
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        <span className="text-gray-500">Cargando movimientos...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredMovements.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <div className="text-center">
                        <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">Sin movimientos</h3>
                        <p className="mt-1 text-sm text-gray-500">
                          No se encontraron movimientos con los filtros aplicados.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredMovements.map((mov) => (
                    <tr key={mov.idIncome || mov.idExpense} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(mov.date).toLocaleDateString('es-ES')}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          mov.movimiento === 'Ingreso' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {mov.movimiento === 'Ingreso' ? (
                            <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />
                          ) : (
                            <ArrowTrendingDownIcon className="h-4 w-4 mr-1" />
                          )}
                          {mov.movimiento}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                        <span className={`${
                          mov.movimiento === 'Ingreso' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {mov.movimiento === 'Ingreso' ? '+' : '-'}${parseFloat(mov.amount).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-md text-xs">
                          {mov.typeIncome || mov.typeExpense || "-"}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900">
                        <div className="max-w-xs">
                          {mov.notes ? (
                            <div className="break-words">
                              <span className="font-medium text-gray-900">{mov.notes}</span>
                              {mov.work?.propertyAddress && (
                                <div className="text-xs text-gray-500 mt-1">
                                  📍 {mov.work.propertyAddress}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-gray-600 italic">
                              {mov.work?.propertyAddress ? (
                                <span>📍 {mov.work.propertyAddress}</span>
                              ) : (
                                "Sin información"
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <UserIcon className="h-4 w-4 text-gray-400 mr-2" />
                          <span className={mov.Staff?.name ? 'text-gray-900' : 'text-red-500 italic font-medium'}>
                            {mov.Staff?.name || "⚠️ Sin asignar"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm">
                        {mov.Receipts && mov.Receipts.length > 0 ? (
                          <button
                            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-md transition-colors flex items-center space-x-1"
                            onClick={() => {
                              console.log('Movimiento completo:', mov);
                              console.log('Recibos encontrados:', mov.Receipts);
                              setReceiptUrl(mov.Receipts[0]);
                            }}
                          >
                            <EyeIcon className="h-4 w-4" />
                            <span>Ver</span>
                          </button>
                        ) : (
                          <span className="text-gray-400 text-xs italic flex items-center">
                            <DocumentTextIcon className="h-4 w-4 mr-1" />
                            Sin comprobante
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm space-x-2">
                        <button
                          className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded-md transition-colors inline-flex items-center space-x-1"
                          onClick={() => handleEdit(mov)}
                        >
                          <PencilIcon className="h-4 w-4" />
                          <span>Editar</span>
                        </button>
                        <button
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md transition-colors inline-flex items-center space-x-1"
                          onClick={() => handleDelete(mov)}
                        >
                          <TrashIcon className="h-4 w-4" />
                          <span>Eliminar</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal de edición */}
        {editModal.open && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-800">
                  Editar {editModal.movement.movimiento}
                </h3>
                <button
                  onClick={() => setEditModal({ open: false, movement: null })}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
              
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleEditSave();
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <CalendarDaysIcon className="h-4 w-4 inline mr-1" />
                    Fecha
                  </label>
                  <input
                    type="date"
                    value={editData.date ? new Date(editData.date).toISOString().split('T')[0] : ''}
                    onChange={(e) =>
                      setEditData({ ...editData, date: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <BanknotesIcon className="h-4 w-4 inline mr-1" />
                    Monto
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editData.amount}
                    onChange={(e) =>
                      setEditData({ ...editData, amount: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <DocumentTextIcon className="h-4 w-4 inline mr-1" />
                    Notas
                  </label>
                  <textarea
                    value={editData.notes}
                    onChange={(e) =>
                      setEditData({ ...editData, notes: e.target.value })
                    }
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  />
                </div>

                {editModal.movement.movimiento === "Ingreso" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipo de Ingreso
                    </label>
                    <select
                      value={editData.typeIncome}
                      onChange={(e) =>
                        setEditData({ ...editData, typeIncome: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    >
                      <option value="">Seleccione tipo</option>
                      {incomeTypes.map(type => 
                        <option key={type} value={type}>{type}</option>
                      )}
                    </select>
                  </div>
                )}

                {editModal.movement.movimiento === "Gasto" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipo de Gasto
                    </label>
                    <select
                      value={editData.typeExpense}
                      onChange={(e) =>
                        setEditData({ ...editData, typeExpense: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    >
                      <option value="">Seleccione tipo</option>
                      {expenseTypes.map(type => 
                        <option key={type} value={type}>{type}</option>
                      )}
                    </select>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200"
                  >
                    Guardar
                  </button>
                  <button
                    type="button"
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg transition-all duration-200"
                    onClick={() => setEditModal({ open: false, movement: null })}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal de comprobante */}
        {receiptUrl && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center space-x-2">
                  <DocumentTextIcon className="h-5 w-5 text-blue-600" />
                  <span>Comprobante</span>
                </h3>
                <button
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  onClick={() => setReceiptUrl(null)}
                  aria-label="Cerrar modal"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
              
              <div className="max-h-[calc(90vh-120px)] overflow-auto">
                {console.log('Modal comprobante data:', receiptUrl)}
                {receiptUrl && typeof receiptUrl === 'object' && receiptUrl.fileUrl && receiptUrl.mimeType ? (
                  receiptUrl.mimeType.startsWith('image/') ? (
                    <img
                      src={receiptUrl.fileUrl}
                      alt={receiptUrl.originalName || "Comprobante"}
                      className="max-w-full h-auto mx-auto rounded-lg"
                    />
                  ) : receiptUrl.mimeType === 'application/pdf' ? (
                    <iframe
                      key={receiptUrl.fileUrl}
                      src={`https://docs.google.com/gview?url=${encodeURIComponent(receiptUrl.fileUrl)}&embedded=true`}
                      title={receiptUrl.originalName || "Vista previa PDF"}
                      width="100%"
                      height="600px"
                      className="rounded-lg border"
                      allow="autoplay"
                    >
                      <p className="p-4 text-center text-gray-600">
                        No se pudo cargar la vista previa del PDF. Intenta abrirlo en una nueva pestaña.
                      </p>
                    </iframe>
                  ) : (
                    <div className="text-center py-12">
                      <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
                      <p className="mt-2 text-gray-600">
                        Archivo no previsualizable (tipo: {receiptUrl.mimeType}).
                      </p>
                    </div>
                  )
                ) : (
                  <div className="text-center py-12">
                    <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-gray-600">
                      No se puede mostrar el comprobante. Datos del archivo incompletos o incorrectos.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Summary;
