import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../../utils/axios';
import {
  XMarkIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

const FixedExpensesSummaryModal = ({ isOpen, onClose }) => {
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Cargar datos cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      loadSummaryData();
    }
  }, [isOpen]);

  const loadSummaryData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/fixed-expenses/monthly-summary');
      
      if (response.data.success) {
        setSummaryData(response.data.data);
      } else {
        throw new Error(response.data.error || 'Error al cargar resumen');
      }
    } catch (error) {
      console.error('Error loading summary:', error);
      setError(error.response?.data?.details || error.message);
      toast.error('Error al cargar el resumen mensual');
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

  const getAlertIcon = (type) => {
    switch (type) {
      case 'error':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      case 'info':
        return <InformationCircleIcon className="h-5 w-5 text-blue-500" />;
      default:
        return <InformationCircleIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <ChartBarIcon className="h-8 w-8" />
              <div>
                <h2 className="text-2xl font-bold">Dashboard Gastos Fijos</h2>
                {summaryData && (
                  <p className="text-blue-100">
                    {summaryData.period.month} {summaryData.period.year}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading && (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Cargando resumen...</span>
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

          {summaryData && (
            <div className="space-y-6">
              {/* Resumen Principal */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-lg shadow-md">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100 text-sm font-medium">Total Pagado</p>
                      <p className="text-2xl font-bold">{formatCurrency(summaryData.totals.totalPagado)}</p>
                    </div>
                    <CheckCircleIcon className="h-8 w-8 text-green-200" />
                  </div>
                </div>

                <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-6 rounded-lg shadow-md">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-red-100 text-sm font-medium">Total Pendiente</p>
                      <p className="text-2xl font-bold">{formatCurrency(summaryData.totals.totalPendiente)}</p>
                    </div>
                    <XCircleIcon className="h-8 w-8 text-red-200" />
                  </div>
                </div>

                <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-lg shadow-md">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm font-medium">Total Mensual</p>
                      <p className="text-2xl font-bold">{formatCurrency(summaryData.totals.commitmentMensual)}</p>
                    </div>
                    <CurrencyDollarIcon className="h-8 w-8 text-blue-200" />
                  </div>
                </div>

                <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6 rounded-lg shadow-md">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100 text-sm font-medium">% Pagado</p>
                      <p className="text-2xl font-bold">{summaryData.totals.percentagePaid}%</p>
                    </div>
                    <ChartBarIcon className="h-8 w-8 text-purple-200" />
                  </div>
                </div>
              </div>

              {/* Estado de Pagos */}
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <ChartBarIcon className="h-5 w-5 mr-2 text-blue-600" />
                  Estado de Pagos
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <CheckCircleIcon className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-green-700">{summaryData.paymentStatus.paid}</p>
                    <p className="text-sm text-green-600">Completamente Pagados</p>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <ClockIcon className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-yellow-700">{summaryData.paymentStatus.partial}</p>
                    <p className="text-sm text-yellow-600">Parcialmente Pagados</p>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <XCircleIcon className="h-8 w-8 text-red-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-red-700">{summaryData.paymentStatus.unpaid}</p>
                    <p className="text-sm text-red-600">Sin Pagar</p>
                  </div>
                </div>
              </div>

              {/* Resumen por Categoría */}
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumen por Categoría</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Categoría
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Cantidad
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Pagado
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Pendiente
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          % Pagado
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {summaryData.categorySummary.map((category, index) => (
                        <tr key={category.category} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {category.category}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {category.count}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatCurrency(category.totalAmount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                            {formatCurrency(category.paidAmount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                            {formatCurrency(category.pendingAmount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="flex items-center">
                              <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full" 
                                  style={{ width: `${category.percentage}%` }}
                                ></div>
                              </div>
                              <span className="text-xs">{category.percentage}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Próximos Vencimientos */}
              {summaryData.upcomingExpenses.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <ClockIcon className="h-5 w-5 mr-2 text-orange-600" />
                    Próximos Vencimientos (7 días)
                  </h3>
                  <div className="space-y-3">
                    {summaryData.upcomingExpenses.map((expense) => (
                      <div key={expense.idFixedExpense} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{expense.name}</p>
                          <p className="text-sm text-gray-600">
                            Vence: {formatDate(expense.nextDueDate)} 
                            <span className="ml-2 text-orange-600">
                              ({expense.daysUntilDue === 0 ? 'Hoy' : `${expense.daysUntilDue} días`})
                            </span>
                          </p>
                        </div>
                        <div className="flex items-center space-x-4">
                          <span className="font-semibold text-gray-900">
                            {formatCurrency(expense.totalAmount)}
                          </span>
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            expense.paymentStatus === 'paid'
                              ? 'bg-green-100 text-green-800'
                              : expense.paymentStatus === 'partial'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {expense.paymentStatus === 'paid' ? '✅ Pagado' :
                             expense.paymentStatus === 'partial' ? '🟡 Parcial' :
                             '🔴 Pendiente'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Alertas */}
              {summaryData.hasAlerts && (
                <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <ExclamationTriangleIcon className="h-5 w-5 mr-2 text-yellow-600" />
                    Alertas y Notificaciones
                  </h3>
                  <div className="space-y-3">
                    {summaryData.alerts.map((alert, index) => (
                      <div key={index} className={`flex items-center p-3 rounded-lg ${
                        alert.type === 'error' ? 'bg-red-50 border border-red-200' :
                        alert.type === 'warning' ? 'bg-yellow-50 border border-yellow-200' :
                        'bg-blue-50 border border-blue-200'
                      }`}>
                        {getAlertIcon(alert.type)}
                        <div className="ml-3">
                          <p className={`font-medium ${
                            alert.type === 'error' ? 'text-red-800' :
                            alert.type === 'warning' ? 'text-yellow-800' :
                            'text-blue-800'
                          }`}>
                            {alert.action}
                          </p>
                          <p className={`text-sm ${
                            alert.type === 'error' ? 'text-red-700' :
                            alert.type === 'warning' ? 'text-yellow-700' :
                            'text-blue-700'
                          }`}>
                            {alert.message}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {summaryData && (
              <>
                Actualizado: {summaryData.period.date} {summaryData.period.time}
              </>
            )}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={loadSummaryData}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
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

export default FixedExpensesSummaryModal;