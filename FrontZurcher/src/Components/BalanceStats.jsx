import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const BalanceStats = () => {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dataKey, setDataKey] = useState(0);
  
  const [filters, setFilters] = useState({
    month: new Date().getMonth() + 1, // Mes actual
    year: new Date().getFullYear(), // Año actual
    startDate: "",
    endDate: "",
  });

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);

      // Construir query params
      const params = {};
      if (filters.startDate && filters.endDate) {
        params.startDate = filters.startDate;
        params.endDate = filters.endDate;
      } else if (filters.month && filters.year) {
        params.month = filters.month;
        params.year = filters.year;
      }

      console.log('Fetching dashboard with params:', params);

      const token = localStorage.getItem('token');
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/financial-dashboard`, {
        params,
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      console.log('Dashboard response:', response.data);
      setDashboard(response.data);
      setDataKey(prev => prev + 1); // Force re-render
      setLoading(false);
    } catch (err) {
      console.error('Error fetching dashboard:', err);
      setError(err.response?.data?.message || err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('Filters changed, fetching dashboard...', filters);
    fetchDashboard();
  }, [filters.month, filters.year, filters.startDate, filters.endDate]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    console.log(`Filter changed: ${name} = ${value}`);
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleClearDateRange = () => {
    setFilters(prev => ({
      ...prev,
      startDate: "",
      endDate: "",
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear()
    }));
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  if (loading && !dashboard) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-6 bg-gray-50 min-h-screen" key={dataKey}>
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
            Dashboard Financiero
          </h1>
          {filters.month && filters.year && !filters.startDate && (
            <p className="text-gray-600 mt-1">
              {monthNames[filters.month - 1]} {filters.year}
            </p>
          )}
        </div>
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-md"
          onClick={() => navigate('/summary')}
        >
          Ver Detalles
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-3">Seleccionar Período</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Filtro por mes/año */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mes</label>
            <select
              name="month"
              value={filters.month}
              onChange={handleFilterChange}
              disabled={filters.startDate || filters.endDate}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            >
              <option value="">Todos</option>
              {monthNames.map((month, idx) => (
                <option key={idx} value={idx + 1}>{month}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Año</label>
            <input
              type="number"
              name="year"
              value={filters.year}
              onChange={handleFilterChange}
              disabled={filters.startDate || filters.endDate}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              placeholder="2024"
            />
          </div>

          {/* Rango de fechas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Inicio</label>
            <input
              type="date"
              name="startDate"
              value={filters.startDate}
              onChange={handleFilterChange}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Fin</label>
            <input
              type="date"
              name="endDate"
              value={filters.endDate}
              onChange={handleFilterChange}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {(filters.startDate || filters.endDate) && (
          <button
            onClick={handleClearDateRange}
            className="mt-3 text-sm text-blue-600 hover:text-blue-800 underline"
          >
            ← Volver a vista mensual
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
          Error: {error}
        </div>
      )}

      {dashboard && (
        <>
          {/* Tarjetas principales */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6">
            {/* Total Ingresos */}
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium opacity-90">💰 Total Ingresos</h3>
              </div>
              <p className="text-3xl md:text-4xl font-bold mb-1">{formatCurrency(dashboard.summary.totalIncome)}</p>
              <p className="text-sm opacity-75">
                {dashboard.counts.initialPaymentsCount + dashboard.counts.finalPaymentsCount} transacciones
              </p>
            </div>

            {/* Total Egresos */}
            <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-lg p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium opacity-90">💸 Total Egresos</h3>
              </div>
              <p className="text-3xl md:text-4xl font-bold mb-1">{formatCurrency(dashboard.summary.totalEgresos)}</p>
              <p className="text-sm opacity-75">
                {dashboard.counts.expensesCount + dashboard.counts.fixedExpensesCount + dashboard.counts.supplierExpensesCount + dashboard.counts.commissionsCount} gastos
              </p>
            </div>

            {/* Balance Neto */}
            <div className={`bg-gradient-to-br ${dashboard.summary.balanceNeto >= 0 ? 'from-blue-500 to-blue-600' : 'from-orange-500 to-orange-600'} rounded-lg shadow-lg p-6 text-white`}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium opacity-90">📊 Balance Neto</h3>
              </div>
              <p className="text-3xl md:text-4xl font-bold mb-1">{formatCurrency(dashboard.summary.balanceNeto)}</p>
              <p className="text-sm opacity-75">
                {dashboard.summary.balanceNeto >= 0 ? '✅ Positivo' : '⚠️ Negativo'}
              </p>
            </div>

            {/* Ratio */}
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium opacity-90">📈 Eficiencia</h3>
              </div>
              <p className="text-3xl md:text-4xl font-bold mb-1">
                {dashboard.summary.totalEgresos > 0 
                  ? `${((dashboard.summary.totalIncome / dashboard.summary.totalEgresos) * 100).toFixed(0)}%`
                  : '∞'
                }
              </p>
              <p className="text-sm opacity-75">Ingresos vs Gastos</p>
            </div>
          </div>

          {/* Sección de Ingresos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Ingresos por Método de Pago */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-bold text-green-600 mb-4 flex items-center gap-2">
                💰 Ingresos por Método de Pago
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center bg-green-50 p-3 rounded-lg">
                  <span className="font-semibold text-gray-700">Initial Payments</span>
                  <span className="text-lg font-bold text-green-600">{formatCurrency(dashboard.summary.totalInitialPayments)}</span>
                </div>
                <div className="flex justify-between items-center bg-green-50 p-3 rounded-lg">
                  <span className="font-semibold text-gray-700">Final Payments</span>
                  <span className="text-lg font-bold text-green-600">{formatCurrency(dashboard.summary.totalFinalPayments)}</span>
                </div>
              </div>

              {dashboard.incomeByPaymentMethod && dashboard.incomeByPaymentMethod.length > 0 && (
                <>
                  <div className="border-t border-gray-200 my-4"></div>
                  <h4 className="text-sm font-semibold text-gray-600 mb-3 uppercase">Desglose por Método:</h4>
                  <div className="space-y-2">
                    {dashboard.incomeByPaymentMethod
                      .sort((a, b) => b.amount - a.amount)
                      .map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                          <span className="text-gray-700">{item.method}</span>
                          <span className="font-semibold text-green-600">{formatCurrency(item.amount)}</span>
                        </div>
                      ))}
                  </div>
                </>
              )}
            </div>

            {/* Ingresos Desglosados */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-bold text-green-600 mb-4 flex items-center gap-2">
                📋 Detalle de Ingresos
              </h3>
              <div className="space-y-3">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">Pagos Iniciales Recibidos</span>
                    <span className="text-sm font-semibold text-gray-700">{dashboard.counts.initialPaymentsCount} pagos</span>
                  </div>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(dashboard.summary.totalInitialPayments)}</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">Pagos Finales Recibidos</span>
                    <span className="text-sm font-semibold text-gray-700">{dashboard.counts.finalPaymentsCount} pagos</span>
                  </div>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(dashboard.summary.totalFinalPayments)}</p>
                </div>

                <div className="bg-green-100 p-4 rounded-lg border-2 border-green-300">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-semibold text-green-800">TOTAL INGRESADO</span>
                    <span className="text-sm font-semibold text-green-700">
                      {dashboard.counts.initialPaymentsCount + dashboard.counts.finalPaymentsCount} transacciones
                    </span>
                  </div>
                  <p className="text-3xl font-bold text-green-700">{formatCurrency(dashboard.summary.totalIncome)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Sección de Egresos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Egresos por Método de Pago */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-bold text-red-600 mb-4 flex items-center gap-2">
                💳 Gastos por Método de Pago
              </h3>
              
              {dashboard.expensesByPaymentMethod && dashboard.expensesByPaymentMethod.length > 0 ? (
                <div className="space-y-2">
                  {dashboard.expensesByPaymentMethod
                    .sort((a, b) => b.amount - a.amount)
                    .map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center py-3 px-4 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                        <div>
                          <span className="font-semibold text-gray-800">{item.method}</span>
                          <p className="text-xs text-gray-500 mt-1">
                            {((item.amount / dashboard.summary.totalEgresos) * 100).toFixed(1)}% del total
                          </p>
                        </div>
                        <span className="text-lg font-bold text-red-600">{formatCurrency(item.amount)}</span>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No hay gastos registrados</p>
              )}
            </div>

            {/* Egresos por Categoría */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-bold text-red-600 mb-4 flex items-center gap-2">
                📊 Gastos por Categoría
              </h3>
              
              <div className="space-y-3 mb-4">
                <div className="flex justify-between items-center bg-red-50 p-3 rounded-lg">
                  <span className="font-semibold text-gray-700">Gastos Regulares</span>
                  <span className="text-lg font-bold text-red-600">{formatCurrency(dashboard.summary.totalExpenses)}</span>
                </div>
                <div className="flex justify-between items-center bg-red-50 p-3 rounded-lg">
                  <span className="font-semibold text-gray-700">Gastos Fijos</span>
                  <span className="text-lg font-bold text-red-600">{formatCurrency(dashboard.summary.totalFixedExpenses)}</span>
                </div>
                <div className="flex justify-between items-center bg-red-50 p-3 rounded-lg">
                  <span className="font-semibold text-gray-700">Proveedores</span>
                  <span className="text-lg font-bold text-red-600">{formatCurrency(dashboard.summary.totalSupplierExpenses)}</span>
                </div>
                <div className="flex justify-between items-center bg-red-50 p-3 rounded-lg">
                  <span className="font-semibold text-gray-700">Comisiones</span>
                  <span className="text-lg font-bold text-red-600">{formatCurrency(dashboard.summary.totalCommissions)}</span>
                </div>
              </div>

              {dashboard.expensesByType && dashboard.expensesByType.length > 0 && (
                <>
                  <div className="border-t border-gray-200 my-4"></div>
                  <h4 className="text-sm font-semibold text-gray-600 mb-3 uppercase">Desglose Detallado:</h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {dashboard.expensesByType
                      .sort((a, b) => b.amount - a.amount)
                      .map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                          <span className="text-sm text-gray-700">{item.type}</span>
                          <span className="font-semibold text-red-600">{formatCurrency(item.amount)}</span>
                        </div>
                      ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Resumen Final */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg shadow-lg p-6 border-2 border-blue-200">
            <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">
              📊 Resumen del Período
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">Total Ingresado</p>
                <p className="text-3xl font-bold text-green-600">{formatCurrency(dashboard.summary.totalIncome)}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {dashboard.counts.initialPaymentsCount + dashboard.counts.finalPaymentsCount} transacciones
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">Total Gastado</p>
                <p className="text-3xl font-bold text-red-600">{formatCurrency(dashboard.summary.totalEgresos)}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {dashboard.counts.expensesCount + dashboard.counts.fixedExpensesCount + 
                   dashboard.counts.supplierExpensesCount + dashboard.counts.commissionsCount} gastos
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">Balance Final</p>
                <p className={`text-3xl font-bold ${dashboard.summary.balanceNeto >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                  {formatCurrency(dashboard.summary.balanceNeto)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {dashboard.summary.balanceNeto >= 0 ? '✅ Ganancia' : '⚠️ Pérdida'}
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default BalanceStats;

