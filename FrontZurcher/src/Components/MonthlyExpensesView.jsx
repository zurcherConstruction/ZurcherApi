import React, { useState, useEffect } from 'react';
import { formatCurrency } from '../utils/formatters';
import api from '../utils/apiClient';

const MonthlyExpensesView = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // 🆕 Por defecto el mes actual
  const [refreshing, setRefreshing] = useState(false);
  
  // Estados para controlar qué secciones están expandidas
  const [expandedSections, setExpandedSections] = useState({});

  const months = [
    { value: 1, label: 'Enero' },
    { value: 2, label: 'Febrero' },
    { value: 3, label: 'Marzo' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Mayo' },
    { value: 6, label: 'Junio' },
    { value: 7, label: 'Julio' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Septiembre' },
    { value: 10, label: 'Octubre' },
    { value: 11, label: 'Noviembre' },
    { value: 12, label: 'Diciembre' }
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  // Toggle sección expandida/colapsada
  const toggleSection = (sectionId) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  // Cargar datos
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      params.append('year', selectedYear);
      if (selectedMonth) {
        params.append('month', selectedMonth);
      }

      const response = await api.get(`/monthly-expenses?${params.toString()}`);
      setData(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al cargar datos');
      console.error('Error fetching monthly expenses:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // 🆕 Función para refrescar datos manualmente
  const handleManualRefresh = async () => {
    setRefreshing(true);
    await fetchData();
  };

  // Cargar datos cuando cambian los filtros (año/mes)
  useEffect(() => {
    fetchData();
  }, [selectedYear, selectedMonth]);

  // Función para obtener el color del estado de pago
  const getPaymentStatusBadge = (status) => {
    switch (status) {
      case 'paid':
      case 'paid_via_invoice':
        return 'bg-green-100 text-green-800';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800';
      case 'unpaid':
      default:
        return 'bg-red-100 text-red-800';
    }
  };

  // Función para obtener la etiqueta del estado
  const getPaymentStatusLabel = (status) => {
    switch (status) {
      case 'paid':
        return 'Pagado';
      case 'paid_via_invoice':
        return 'Pagado vía Invoice';
      case 'partial':
        return 'Parcial';
      case 'unpaid':
      default:
        return 'No Pagado';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            📊 Gastos Devengados Mensuales
          </h1>
          <p className="text-lg text-gray-600">
            Análisis de gastos generados independientemente del estado de pago
          </p>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Año
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
              >
                {years.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Mes
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
              >
                {months.map(month => (
                  <option key={month.value} value={month.value}>{month.label}</option>
                ))}
              </select>
            </div>
            <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3">
              {data?.summary && (
                <div className="space-y-1">
                  <p className="font-medium">📈 {data.summary.generalExpensesFound} gastos generales</p>
                  <p className="font-medium">🔄 {data.summary.fixedExpensesActive} gastos fijos activos</p>
                </div>
              )}
            </div>
            <button
              onClick={handleManualRefresh}
              disabled={refreshing || loading}
              className={`h-12 px-6 rounded-lg font-medium flex items-center justify-center gap-2 transition-all ${
                refreshing || loading
                  ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
              }`}
            >
              <svg
                className={`w-4 h-4 ${(refreshing || loading) ? 'animate-spin' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              {refreshing || loading ? 'Actualizando...' : 'Actualizar'}
            </button>
          </div>
        </div>

        {loading && (
          <div className="flex justify-center items-center min-h-96">
            <div className="flex flex-col items-center space-y-4">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
              <p className="text-gray-600 font-medium">Cargando datos...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-red-800 mb-2">Error al cargar datos</h3>
                <p className="text-sm text-red-700">{error}</p>
                <button 
                  onClick={fetchData} 
                  className="mt-3 bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700 transition-colors"
                >
                  Reintentar
                </button>
              </div>
            </div>
          </div>
        )}

        {!loading && !error && data && (
          <div className="space-y-8">
            {/* Mostrar resumen de actualización */}
            {refreshing === false && data && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                ✅ Datos actualizados. Se encontraron {data.summary?.generalExpensesFound || 0} gastos generales y {data.summary?.fixedExpensesActive || 0} gastos fijos activos.
              </div>
            )}

            {/* Datos mensuales */}
            <div className="space-y-6">
              {data.monthlyData.filter(month => month.monthNumber === parseInt(selectedMonth)).map((month) => (
                <div key={month.month} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  {/* Header del mes */}
                  <div className="bg-gray-50 px-8 py-6 border-b border-gray-200">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-1">
                          📅 {month.monthName} {data.year || selectedYear}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {month.generalExpenses.count + month.fixedExpenses.count} gastos registrados
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-gray-900 mb-1">
                          {formatCurrency(month.totalMonth)}
                        </div>
                        <p className="text-sm text-gray-500">Total del mes</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-8 space-y-6">
                    {/* Gastos Generales - Sección desplegable */}
                    {month.generalExpenses.count > 0 && (
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <button
                          onClick={() => toggleSection(`general-${month.month}`)}
                          className="w-full bg-blue-50 hover:bg-blue-100 px-6 py-4 flex items-center justify-between transition-colors"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="bg-blue-500 text-white rounded-lg p-2">
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a2 2 0 11-4 0 2 2 0 014 0zm2-2a2 2 0 100 4h8a2 2 0 100-4H8z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <div className="text-left">
                              <h4 className="text-lg font-semibold text-gray-900">
                                Gastos Generales ({month.generalExpenses.count})
                              </h4>
                              <p className="text-sm text-gray-600">
                                Pagados: {formatCurrency(month.generalExpenses.paid)} • 
                                Parciales: {formatCurrency(month.generalExpenses.partial)} • 
                                Pendientes: {formatCurrency(month.generalExpenses.unpaid)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className="text-right">
                              <div className="text-xl font-bold text-blue-600">
                                {formatCurrency(month.generalExpenses.total)}
                              </div>
                            </div>
                            <div className={`transform transition-transform ${expandedSections[`general-${month.month}`] ? 'rotate-180' : ''}`}>
                              <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            </div>
                          </div>
                        </button>
                        
                        {expandedSections[`general-${month.month}`] && (
                          <div className="border-t border-gray-200 bg-white">
                            <div className="p-6 space-y-3">
                              {month.generalExpenses.items.map((item, index) => (
                                <div key={index} className="flex items-start justify-between p-4 bg-gray-50 rounded-lg border">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                      <span className="text-lg font-bold text-gray-900">
                                        {formatCurrency(item.amount)}
                                      </span>
                                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getPaymentStatusBadge(item.status)}`}>
                                        {getPaymentStatusLabel(item.status)}
                                      </span>
                                    </div>
                                    <div className="text-sm text-gray-600 space-y-1">
                                      <p className="flex items-center">
                                        <span className="mr-2">📅</span>
                                        {item.date}
                                      </p>
                                      {item.vendor && (
                                        <p className="flex items-center">
                                          <span className="mr-2">🏢</span>
                                          {item.vendor}
                                        </p>
                                      )}
                                      {item.notes && (
                                        <p className="flex items-center">
                                          <span className="mr-2">💬</span>
                                          {item.notes}
                                        </p>
                                      )}
                                      {item.paidAmount > 0 && item.paidAmount < item.amount && (
                                        <p className="flex items-center text-yellow-700">
                                          <span className="mr-2">💰</span>
                                          Pagado: {formatCurrency(item.paidAmount)} | 
                                          Pendiente: {formatCurrency(item.amount - item.paidAmount)}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Gastos Fijos - Sección desplegable */}
                    {month.fixedExpenses.count > 0 && (
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <button
                          onClick={() => toggleSection(`fixed-${month.month}`)}
                          className="w-full bg-purple-50 hover:bg-purple-100 px-6 py-4 flex items-center justify-between transition-colors"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="bg-purple-500 text-white rounded-lg p-2">
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <div className="text-left">
                              <h4 className="text-lg font-semibold text-gray-900">
                                Gastos Fijos ({month.fixedExpenses.count})
                              </h4>
                              <p className="text-sm text-gray-600">
                                Gastos recurrentes y comprometidos
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className="text-right">
                              <div className="text-xl font-bold text-purple-600">
                                {formatCurrency(month.fixedExpenses.total)}
                              </div>
                            </div>
                            <div className={`transform transition-transform ${expandedSections[`fixed-${month.month}`] ? 'rotate-180' : ''}`}>
                              <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            </div>
                          </div>
                        </button>
                        
                        {expandedSections[`fixed-${month.month}`] && (
                          <div className="border-t border-gray-200 bg-white">
                            <div className="p-6 space-y-3">
                              {month.fixedExpenses.items.map((item, index) => (
                                <div key={index} className="flex items-start justify-between p-4 bg-gray-50 rounded-lg border">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                      <span className="text-lg font-bold text-gray-900">
                                        {formatCurrency(item.amount)}
                                      </span>
                                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
                                        {item.frequency}
                                      </span>
                                      {/* 🆕 Mostrar multiplicador si aplica */}
                                      {item.timesPerMonth > 1 && (
                                        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                                          ×{item.timesPerMonth} veces
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-sm text-gray-600 space-y-1">
                                      <p className="flex items-center font-medium text-gray-900">
                                        <span className="mr-2">🏢</span>
                                        {item.name}
                                      </p>
                                      <p className="flex items-center">
                                        <span className="mr-2">📂</span>
                                        {item.category}
                                      </p>
                                      {/* 🆕 Mostrar desglose si se multiplica */}
                                      {item.timesPerMonth > 1 && (
                                        <p className="flex items-center text-blue-600">
                                          <span className="mr-2">💵</span>
                                          {formatCurrency(item.baseAmount)} × {item.timesPerMonth} = {formatCurrency(item.amount)}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && !error && (!data || data.monthlyData.filter(m => m.monthNumber === parseInt(selectedMonth)).length === 0) && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-8 text-center">
            <div className="mb-4">
              <svg className="mx-auto h-16 w-16 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-blue-900 mb-2">No hay gastos registrados</h3>
            <p className="text-blue-700">No se encontraron gastos para el mes seleccionado.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MonthlyExpensesView;