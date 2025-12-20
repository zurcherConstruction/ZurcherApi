import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../../utils/axios';
import {
  XMarkIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon,
  CurrencyDollarIcon,
  BanknotesIcon,
  CreditCardIcon,
  DocumentTextIcon,
  ChevronDownIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';

const DetailedFinancialDashboard = ({ isOpen, onClose }) => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [expandedSections, setExpandedSections] = useState({
    incomes: false,
    expenses: false,
    fixedPayments: false,
    duplicates: false
  });

  // Cargar datos cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      loadDashboardData();
    }
  }, [isOpen, selectedMonth, selectedYear]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get('/financial-dashboard/detailed', {
        params: {
          month: selectedMonth,
          year: selectedYear,
          refresh: true, // 🎯 Forzar limpieza de caché para obtener datos actualizados
          _t: Date.now() // 🎯 Cache buster adicional
        }
      });
      
      if (response.data.success) {
        setDashboardData(response.data.data);
      } else {
        throw new Error(response.data.error || 'Error al cargar datos');
      }
    } catch (error) {
      console.error('Error loading detailed dashboard:', error);
      setError(error.response?.data?.details || error.message);
      toast.error('Error al cargar el dashboard detallado');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('es-ES');
    } catch (e) {
      return dateString;
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const getPaymentMethodIcon = (method) => {
    if (method?.includes('Credit') || method?.includes('AMEX')) {
      return <CreditCardIcon className="h-4 w-4" />;
    } else if (method?.includes('Bank') || method?.includes('BOFA')) {
      return <BanknotesIcon className="h-4 w-4" />;
    } else if (method?.includes('Efectivo')) {
      return <CurrencyDollarIcon className="h-4 w-4" />;
    } else {
      return <DocumentTextIcon className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type) => {
    const typeColors = {
      'Materiales': 'bg-blue-100 text-blue-800',
      'Gastos Generales': 'bg-gray-100 text-gray-800',
      'Gasto Fijo': 'bg-green-100 text-green-800',
      'Workers': 'bg-purple-100 text-purple-800',
      'Inspección Inicial': 'bg-yellow-100 text-yellow-800',
      'Inspección Final': 'bg-orange-100 text-orange-800',
      'Materiales Iniciales': 'bg-indigo-100 text-indigo-800'
    };
    return typeColors[type] || 'bg-gray-100 text-gray-800';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <DocumentTextIcon className="h-8 w-8" />
              <div>
                <h2 className="text-2xl font-bold">Dashboard Financiero Detallado</h2>
                <p className="text-indigo-100">
                  Análisis completo de transacciones para detectar duplicaciones
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Selectores de período */}
          <div className="flex space-x-4 mt-4">
            <div>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="px-3 py-2 rounded-lg text-gray-700 border border-gray-300 focus:ring-2 focus:ring-indigo-500"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(2023, i).toLocaleDateString('es-ES', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="px-3 py-2 rounded-lg text-gray-700 border border-gray-300 focus:ring-2 focus:ring-indigo-500"
              >
                {[2024, 2025, 2026].map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(95vh-200px)]">
          {loading && (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
              <span className="ml-3 text-gray-600">Cargando análisis detallado...</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <XCircleIcon className="h-5 w-5 text-red-500 mr-2" />
                <span className="text-red-700">Error: {error}</span>
              </div>
            </div>
          )}

          {dashboardData && (
            <div className="space-y-6">
              {/* Resumen Principal */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-600 text-sm font-medium">Total Ingresos</p>
                      <p className="text-2xl font-bold text-green-700">
                        {formatCurrency(dashboardData.summary.totalIncome)}
                      </p>
                      <p className="text-xs text-green-600">
                        {dashboardData.incomeDetails.transactionCount} transacciones
                      </p>
                    </div>
                    <BanknotesIcon className="h-8 w-8 text-green-600" />
                  </div>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-red-600 text-sm font-medium">Gastos Generales</p>
                      <p className="text-2xl font-bold text-red-700">
                        {formatCurrency(dashboardData.summary.totalGeneralExpenses)}
                      </p>
                      <p className="text-xs text-red-600">
                        {dashboardData.expenseDetails.transactionCount} transacciones
                      </p>
                    </div>
                    <CreditCardIcon className="h-8 w-8 text-red-600" />
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-600 text-sm font-medium">Gastos Fijos Pagados</p>
                      <p className="text-2xl font-bold text-blue-700">
                        {formatCurrency(dashboardData.summary.totalFixedPaid)}
                      </p>
                      <p className="text-xs text-blue-600">
                        {dashboardData.fixedPaymentDetails.paymentCount} pagos
                      </p>
                    </div>
                    <DocumentTextIcon className="h-8 w-8 text-blue-600" />
                  </div>
                </div>

                <div className={`border rounded-lg p-4 ${
                  dashboardData.summary.netBalance >= 0 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-sm font-medium ${
                        dashboardData.summary.netBalance >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        Balance Neto
                      </p>
                      <p className={`text-2xl font-bold ${
                        dashboardData.summary.netBalance >= 0 ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {formatCurrency(dashboardData.summary.netBalance)}
                      </p>
                      <p className={`text-xs ${
                        dashboardData.summary.netBalance >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        Eficiencia: {dashboardData.summary.efficiency}%
                      </p>
                    </div>
                    {dashboardData.summary.netBalance >= 0 ? (
                      <CheckCircleIcon className="h-8 w-8 text-green-600" />
                    ) : (
                      <XCircleIcon className="h-8 w-8 text-red-600" />
                    )}
                  </div>
                </div>
              </div>

              {/* Alertas de Duplicaciones */}
              {dashboardData.alerts.potentialDuplicates.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start">
                    <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500 mr-2 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-medium text-yellow-800">
                        ⚠️ Posibles Duplicaciones Detectadas ({dashboardData.alerts.duplicateCount})
                      </h3>
                      <div className="mt-2 space-y-1">
                        {dashboardData.alerts.potentialDuplicates.map((duplicate, index) => (
                          <p key={index} className="text-sm text-yellow-700">
                            • {duplicate.description} - Fecha: {formatDate(duplicate.date)}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Sección de Ingresos Detallados */}
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                <button
                  onClick={() => toggleSection('incomes')}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center">
                    <BanknotesIcon className="h-5 w-5 text-green-600 mr-2" />
                    <h3 className="text-lg font-semibold text-gray-900">
                      Ingresos Detallados ({dashboardData.incomeDetails.transactionCount})
                    </h3>
                  </div>
                  <div className="flex items-center">
                    <span className="text-green-600 font-semibold mr-2">
                      {formatCurrency(dashboardData.incomeDetails.total)}
                    </span>
                    {expandedSections.incomes ? (
                      <ChevronDownIcon className="h-5 w-5" />
                    ) : (
                      <ChevronRightIcon className="h-5 w-5" />
                    )}
                  </div>
                </button>

                {expandedSections.incomes && (
                  <div className="px-6 pb-4">
                    {/* Resumen por método de pago */}
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Por Método de Pago:</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {Object.entries(dashboardData.incomeDetails.byMethod).map(([method, data]) => (
                          <div key={method} className="bg-green-50 rounded-lg p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                {getPaymentMethodIcon(method)}
                                <span className="ml-2 text-sm font-medium text-green-800">{method}</span>
                              </div>
                              <span className="text-green-700 font-semibold">{formatCurrency(data.total)}</span>
                            </div>
                            <p className="text-xs text-green-600 mt-1">{data.count} transacciones</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Todas las transacciones */}
                    <div className="max-h-64 overflow-y-auto">
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Monto</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Método</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Notas</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {dashboardData.incomeDetails.allTransactions.map((transaction) => (
                            <tr key={transaction.id} className="hover:bg-gray-50">
                              <td className="px-3 py-2 text-gray-900">{formatDate(transaction.date)}</td>
                              <td className="px-3 py-2 text-green-600 font-semibold">{formatCurrency(transaction.amount)}</td>
                              <td className="px-3 py-2 text-gray-600">{transaction.method || 'N/A'}</td>
                              <td className="px-3 py-2">
                                <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                                  {transaction.type}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-gray-600 max-w-xs truncate">
                                {transaction.notes || 'Sin notas'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Sección de Gastos Generales por Categoría */}
              <div className="space-y-4">
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                  <div className="px-6 py-4 bg-red-50 border-b border-red-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <CreditCardIcon className="h-5 w-5 text-red-600 mr-2" />
                        <h3 className="text-lg font-semibold text-gray-900">
                          Gastos Generales ({dashboardData.expenseDetails.transactionCount})
                        </h3>
                      </div>
                      <span className="text-red-600 font-semibold">
                        {formatCurrency(dashboardData.expenseDetails.total)}
                      </span>
                    </div>
                  </div>

                  <div className="p-6 space-y-4">
                    {Object.entries(dashboardData.expenseDetails.byCategory || {}).map(([category, categoryData]) => (
                      <div key={category} className="bg-white border border-gray-200 rounded-lg shadow-sm">
                        <button
                          onClick={() => toggleSection(`expense-category-${category}`)}
                          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center">
                            <div className={`px-3 py-1 rounded-full text-sm font-medium mr-3 ${
                              category === 'Comisiones de Vendedores' ? 'bg-purple-100 text-purple-800' :
                              category === 'Pagos a Proveedores' ? 'bg-blue-100 text-blue-800' :
                              category === 'Materiales Iniciales' ? 'bg-cyan-100 text-cyan-800' :
                              category === 'Materiales' ? 'bg-teal-100 text-teal-800' :
                              category === 'Inspección Inicial' ? 'bg-amber-100 text-amber-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {category}
                            </div>
                            <span className="text-sm font-medium text-gray-700">
                              {categoryData.count} transacciones
                            </span>
                          </div>
                          <div className="flex items-center">
                            <span className="text-red-600 font-semibold mr-2">
                              {formatCurrency(categoryData.total)}
                            </span>
                            {expandedSections[`expense-category-${category}`] ? (
                              <ChevronDownIcon className="h-4 w-4" />
                            ) : (
                              <ChevronRightIcon className="h-4 w-4" />
                            )}
                          </div>
                        </button>

                        {expandedSections[`expense-category-${category}`] && (
                          <div className="px-4 pb-3 border-t border-gray-100">
                            
                            {/* Si es "Pagos a Proveedores", mostrar subsecciones por proveedor */}
                            {category === 'Pagos a Proveedores' && dashboardData.expenseDetails.bySupplier && (
                              <div className="mt-3 space-y-2">
                                <h5 className="text-sm font-medium text-gray-600 mb-2">Por Proveedor:</h5>
                                {Object.entries(dashboardData.expenseDetails.bySupplier).map(([supplier, supplierData]) => (
                                  <div key={supplier} className="bg-blue-50 border border-blue-200 rounded-lg">
                                    <button
                                      onClick={() => toggleSection(`supplier-${supplier}`)}
                                      className="w-full px-3 py-2 flex items-center justify-between hover:bg-blue-100 transition-colors"
                                    >
                                      <div className="flex items-center">
                                        <span className="text-sm font-medium text-blue-800">{supplier}</span>
                                        <span className="ml-2 text-xs text-blue-600">
                                          ({supplierData.count} facturas)
                                        </span>
                                      </div>
                                      <div className="flex items-center">
                                        <span className="text-blue-700 font-semibold text-sm mr-1">
                                          {formatCurrency(supplierData.total)}
                                        </span>
                                        {expandedSections[`supplier-${supplier}`] ? (
                                          <ChevronDownIcon className="h-3 w-3" />
                                        ) : (
                                          <ChevronRightIcon className="h-3 w-3" />
                                        )}
                                      </div>
                                    </button>

                                    {expandedSections[`supplier-${supplier}`] && (
                                      <div className="px-3 pb-2 border-t border-blue-200">
                                        <div className="mt-2 max-h-32 overflow-y-auto">
                                          <table className="min-w-full text-xs">
                                            <thead className="bg-blue-100">
                                              <tr>
                                                <th className="px-2 py-1 text-left text-blue-700">Fecha</th>
                                                <th className="px-2 py-1 text-left text-blue-700">Monto</th>
                                                <th className="px-2 py-1 text-left text-blue-700">Método</th>
                                                <th className="px-2 py-1 text-left text-blue-700">Descripción</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {supplierData.transactions.map((transaction) => (
                                                <tr key={transaction.id} className="hover:bg-blue-100">
                                                  <td className="px-2 py-1 text-gray-900">{formatDate(transaction.date)}</td>
                                                  <td className="px-2 py-1 text-red-600 font-semibold">{formatCurrency(transaction.amount)}</td>
                                                  <td className="px-2 py-1 text-gray-600">{transaction.method || 'N/A'}</td>
                                                  <td className="px-2 py-1 text-gray-600 max-w-xs">
                                                    <div className="truncate" title={transaction.notes}>
                                                      {transaction.notes || 'Sin notas'}
                                                    </div>
                                                  </td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Para otras categorías, mostrar transacciones directamente */}
                            {category !== 'Pagos a Proveedores' && (
                              <div className="mt-3">
                                <div className="max-h-48 overflow-y-auto">
                                  <table className="min-w-full text-sm">
                                    <thead className="bg-gray-50">
                                      <tr>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Monto</th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Método</th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                      {categoryData.transactions.map((transaction) => (
                                        <tr key={transaction.id} className="hover:bg-gray-50">
                                          <td className="px-3 py-2 text-gray-900">{formatDate(transaction.date)}</td>
                                          <td className="px-3 py-2 text-red-600 font-semibold">{formatCurrency(transaction.amount)}</td>
                                          <td className="px-3 py-2 text-gray-600">{transaction.method || 'N/A'}</td>
                                          <td className="px-3 py-2 text-gray-600 max-w-xs">
                                            <div className="truncate" title={transaction.notes}>
                                              {transaction.notes || 'Sin notas'}
                                            </div>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sección de Pagos de Gastos Fijos */}
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                <button
                  onClick={() => toggleSection('fixedPayments')}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center">
                    <DocumentTextIcon className="h-5 w-5 text-blue-600 mr-2" />
                    <h3 className="text-lg font-semibold text-gray-900">
                      Pagos Gastos Fijos ({dashboardData.fixedPaymentDetails.paymentCount})
                    </h3>
                  </div>
                  <div className="flex items-center">
                    <span className="text-blue-600 font-semibold mr-2">
                      {formatCurrency(dashboardData.fixedPaymentDetails.paid)}
                    </span>
                    {expandedSections.fixedPayments ? (
                      <ChevronDownIcon className="h-5 w-5" />
                    ) : (
                      <ChevronRightIcon className="h-5 w-5" />
                    )}
                  </div>
                </button>

                {expandedSections.fixedPayments && (
                  <div className="px-6 pb-4">
                    {/* Resumen por método de pago */}
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Por Método de Pago:</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {Object.entries(dashboardData.fixedPaymentDetails.byPaymentMethod).map(([method, data]) => (
                          <div key={method} className="bg-blue-50 rounded-lg p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                {getPaymentMethodIcon(method)}
                                <span className="ml-2 text-sm font-medium text-blue-800">{method}</span>
                              </div>
                              <span className="text-blue-700 font-semibold">{formatCurrency(data.total)}</span>
                            </div>
                            <p className="text-xs text-blue-600 mt-1">{data.count} pagos</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Todos los pagos */}
                    <div className="max-h-64 overflow-y-auto">
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Monto</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Método</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Gasto Fijo</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Categoría</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {dashboardData.fixedPaymentDetails.allPayments.map((payment) => (
                            <tr key={payment.id} className="hover:bg-gray-50">
                              <td className="px-3 py-2 text-gray-900">{formatDate(payment.date)}</td>
                              <td className="px-3 py-2 text-blue-600 font-semibold">{formatCurrency(payment.amount)}</td>
                              <td className="px-3 py-2 text-gray-600">{payment.method || 'N/A'}</td>
                              <td className="px-3 py-2 text-gray-900 max-w-xs truncate">{payment.fixedExpenseName}</td>
                              <td className="px-3 py-2">
                                <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                                  {payment.category}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {dashboardData && (
              <>
                Período: {dashboardData.period.periodName}
              </>
            )}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={loadDashboardData}
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              Actualizar
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailedFinancialDashboard;