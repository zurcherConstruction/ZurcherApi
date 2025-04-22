import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { balanceActions } from "../Redux/Actions/balanceActions";
import {
  fetchGeneralBalanceRequest,
  fetchGeneralBalanceSuccess,
  fetchGeneralBalanceFailure,
  fetchBalanceByWorkIdRequest,
  fetchBalanceByWorkIdSuccess,
  fetchBalanceByWorkIdFailure
} from '../Redux/Reducer/balanceReducer';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, 
  Tooltip, Legend, ResponsiveContainer
} from "recharts";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

const BalanceStats = () => {
  const dispatch = useDispatch();
  const { balance, loading, error } = useSelector((state) => state.balance);
  const [filters, setFilters] = useState({
    workId: "",
    type: "",
    startDate: "",
    endDate: "",
  });

  useEffect(() => {
    const fetchBalance = async () => {
      try {
        if (filters.workId) {
          dispatch(fetchBalanceByWorkIdRequest());
          const data = await balanceActions.getBalanceByWorkId(
            filters.workId, 
            { type: filters.type }
          );
          
          if (data.error) {
            dispatch(fetchBalanceByWorkIdFailure(data.message));
          } else {
            dispatch(fetchBalanceByWorkIdSuccess(data));
          }
        } else {
          dispatch(fetchGeneralBalanceRequest());
          const data = await balanceActions.getGeneralBalance(filters);
          
          if (data.error) {
            dispatch(fetchGeneralBalanceFailure(data.message));
          } else {
            dispatch(fetchGeneralBalanceSuccess(data));
          }
        }
      } catch (err) {
        console.error('Error fetching balance:', err);
        dispatch(filters.workId ? 
          fetchBalanceByWorkIdFailure(err.message) : 
          fetchGeneralBalanceFailure(err.message)
        );
      }
    };

    fetchBalance();
  }, [dispatch, filters]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const prepareChartData = () => {
    if (!balance) return [];
    console.log('Balance data:', balance); // Debug log
  
    // Para balance general
    if (!filters.workId) {
      return [
        { name: "Ingresos Totales", value: Number(balance.totalIncome) || 0 },
        { name: "Gastos Totales", value: Number(balance.totalExpense) || 0 }
      ];
    }
  
    // Para balance específico de una obra
    if (balance.details) {
      // Si se selecciona tipo "income", mostrar desglose de ingresos
      if (filters.type === 'income' && Array.isArray(balance.details.incomes)) {
        console.log('Income details:', balance.details.incomes); // Debug log
        return balance.details.incomes.map(income => ({
          name: income.name || 'Sin clasificar',
          value: Number(income.value) || 0,
          count: Number(income.count) || 0
        }));
      }
  
      // Si se selecciona tipo "expense", mostrar desglose de gastos
      if (filters.type === 'expense' && Array.isArray(balance.details.expenses)) {
        console.log('Expense details:', balance.details.expenses); // Debug log
        return balance.details.expenses.map(expense => ({
          name: expense.name || 'Sin clasificar',
          value: Number(expense.value) || 0,
          count: Number(expense.count) || 0
        }));
      }
  
      // Si no hay filtro de tipo, mostrar totales de la obra
      return [
        { name: "Ingresos", value: Number(balance.totalIncome) || 0 },
        { name: "Gastos", value: Number(balance.totalExpense) || 0 }
      ];
    }
  
    return [];
  };

  const data = prepareChartData();

  return (
    <div className="p-6 bg-gray-100 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-blue-600 mb-4">
        {filters.workId ? `Balance de Obra ${filters.workId}` : 'Balance General'}
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
