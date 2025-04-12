import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { balanceActions } from "../Redux/Actions/balanceActions";
// Importa las acciones generadas por createSlice
import {
  fetchGeneralBalanceRequest,
  fetchGeneralBalanceSuccess,
  fetchGeneralBalanceFailure
} from '../Redux/Reducer/balanceReducer'; // <-- Ajusta esta ruta si es necesario
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

const BalanceStats = () => {
  const dispatch = useDispatch();
  const today = new Date();
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(today.getMonth() - 3);
  const [filters, setFilters] = useState({
    workId: "",
    type: "",
    startDate: "",
    endDate: "",
  });

  // Accede al estado balance como un objeto
  const { balance, loading, error } = useSelector((state) => state.balance);
  console.log("Estado balance en el componente:", balance);
  useEffect(() => {
    const fetchBalance = async () => {
      // dispatch({ type: "fetchGeneralBalanceRequest" }); // Antes
      dispatch(fetchGeneralBalanceRequest()); // Ahora: Usa el action creator importado
      try {
        const data = await balanceActions.getGeneralBalance(filters);
        if (data.error) {
          console.error("Error recibido:", data.message);
          // dispatch({ type: "fetchGeneralBalanceFailure", payload: data.message }); // Antes
          dispatch(fetchGeneralBalanceFailure(data.message)); // Ahora: Usa el action creator importado
        } else {
          console.log("Datos recibidos:", data);
          // dispatch({ type: "fetchGeneralBalanceSuccess", payload: data }); // Antes
          dispatch(fetchGeneralBalanceSuccess(data)); // Ahora: Usa el action creator importado
        }
      } catch (err) {
        console.error("Error inesperado:", err);
        // dispatch({ type: "fetchGeneralBalanceFailure", payload: err.message }); // Antes
        dispatch(fetchGeneralBalanceFailure(err.message)); // Ahora: Usa el action creator importado
      }
    };

    fetchBalance();
}, [dispatch, filters]);

  console.log("Estado balance:", balance);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  // Datos para los gráficos
  const data = balance
    ? [
        { name: "Ingresos", value: balance.totalIncome || 0 },
        { name: "Gastos", value: balance.totalExpense || 0 },
      ]
    : [];

  return (
    <div className="p-6 bg-gray-100 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-blue-600 mb-4">
        Estadísticas de Balance
      </h2>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <input
          type="text"
          name="workId"
          placeholder="ID de Obra"
          value={filters.workId}
          onChange={handleFilterChange}
          className="p-2 border border-gray-300 rounded"
        />
        <select
          name="type"
          value={filters.type}
          onChange={handleFilterChange}
          className="p-2 border border-gray-300 rounded"
        >
          <option value="">Tipo</option>
          <option value="income">Ingreso</option>
          <option value="expense">Gasto</option>
        </select>
        <input
          type="date"
          name="startDate"
          value={filters.startDate}
          onChange={handleFilterChange}
          className="p-2 border border-gray-300 rounded"
        />
        <input
          type="date"
          name="endDate"
          value={filters.endDate}
          onChange={handleFilterChange}
          className="p-2 border border-gray-300 rounded"
        />
      </div>

      {/* Resultados */}
      {loading ? (
        <p className="text-blue-500">Cargando...</p>
      ) : error ? (
        <p className="text-red-500">Error: {error}</p>
      ) : balance ? (
        <div>
          {/* Gráfico de pastel */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              Distribución de Balance
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  label
                >
                  {data.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Gráfico de barras */}
          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              Comparación de Ingresos y Gastos
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#2563eb" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <p className="text-gray-500">No hay datos disponibles.</p>
      )}
    </div>
  );
};

export default BalanceStats;
