import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import api from '../../utils/axios';
import {
  XMarkIcon,
  CalendarDaysIcon,
  BanknotesIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  DocumentTextIcon,
  ArrowTrendingUpIcon
} from '@heroicons/react/24/outline';

/**
 * 📊 FixedExpensesSummaryModal
 * 
 * Muestra un resumen mensual de:
 * - Gastos totales pendientes
 * - Gastos pagados este mes
 * - Comparativa meses anteriores
 * - Deuda total vencida
 */
const FixedExpensesSummaryModal = ({ isOpen, onClose }) => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());

  useEffect(() => {
    if (isOpen) {
      loadSummary();
    }
  }, [isOpen, selectedMonth]);

  function getCurrentMonth() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  const loadSummary = async () => {
    try {
      setLoading(true);
      const response = await api.get('/fixed-expenses/summary', {
        params: { month: selectedMonth }
      });

      if (response.data.success) {
        setSummary(response.data.summary);
      }
    } catch (error) {
      console.error('Error loading summary:', error);
      toast.error('Error al cargar resumen');
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  const handlePrevMonth = () => {
    const [year, month] = selectedMonth.split('-');
    let y = parseInt(year);
    let m = parseInt(month);
    m--;
    if (m === 0) {
      m = 12;
      y--;
    }
    setSelectedMonth(`${y}-${String(m).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const [year, month] = selectedMonth.split('-');
    let y = parseInt(year);
    let m = parseInt(month);
    m++;
    if (m === 13) {
      m = 1;
      y++;
    }
    setSelectedMonth(`${y}-${String(m).padStart(2, '0')}`);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0);
  };

  const getMonthName = (monthStr) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(year, parseInt(month) - 1, 1);
    return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'long' });
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-4 flex justify-between items-center rounded-t-lg">
          <div className="flex items-center gap-3">
            <ChartBarIcon className="h-8 w-8" />
            <div>
              <h2 className="text-2xl font-bold">Resumen de Gastos Fijos</h2>
              <p className="text-indigo-100 text-sm">Análisis mensual</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-indigo-700 rounded-lg transition"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Selector de mes */}
        <div className="bg-indigo-50 border-b border-indigo-200 px-6 py-3 flex items-center justify-between">
          <button
            onClick={handlePrevMonth}
            className="px-4 py-2 bg-white border border-indigo-300 text-indigo-600 rounded-lg hover:bg-indigo-50 transition font-medium"
          >
            ← Mes Anterior
          </button>
          <h3 className="text-lg font-bold text-indigo-900 capitalize">
            {getMonthName(selectedMonth)}
          </h3>
          <button
            onClick={handleNextMonth}
            className="px-4 py-2 bg-white border border-indigo-300 text-indigo-600 rounded-lg hover:bg-indigo-50 transition font-medium"
          >
            Mes Siguiente →
          </button>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
          ) : !summary ? (
            <div className="text-center py-12">
              <DocumentTextIcon className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 text-lg">No hay datos disponibles</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* KPIs Principales */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <SummaryCard
                  title="Gastos Totales"
                  value={formatCurrency(summary.totalAmount || 0)}
                  icon={<BanknotesIcon className="h-8 w-8" />}
                  bgColor="bg-blue-50"
                  borderColor="border-blue-200"
                  textColor="text-blue-900"
                  iconColor="text-blue-600"
                />
                <SummaryCard
                  title="Pagado Este Mes"
                  value={formatCurrency(summary.paidThisMonth || 0)}
                  icon={<CheckCircleIcon className="h-8 w-8" />}
                  bgColor="bg-green-50"
                  borderColor="border-green-200"
                  textColor="text-green-900"
                  iconColor="text-green-600"
                />
                <SummaryCard
                  title="Pendiente de Pago"
                  value={formatCurrency(summary.pendingAmount || 0)}
                  icon={<ExclamationTriangleIcon className="h-8 w-8" />}
                  bgColor="bg-red-50"
                  borderColor="border-red-200"
                  textColor="text-red-900"
                  iconColor="text-red-600"
                />
              </div>

              {/* Detalle de gastos */}
              {summary.expenses && summary.expenses.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Detalles por Gasto</h3>
                  <div className="space-y-3">
                    {summary.expenses.map((expense, idx) => (
                      <ExpenseDetailRow
                        key={idx}
                        expense={expense}
                        formatCurrency={formatCurrency}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Vencidos */}
              {summary.overdueAmount > 0 && (
                <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <ExclamationTriangleIcon className="h-8 w-8 text-red-600 flex-shrink-0" />
                    <div>
                      <p className="font-bold text-red-900">Gastos Vencidos</p>
                      <p className="text-sm text-red-700">
                        {summary.overdueCount || 0} gasto(s) vencido(s) hace más de 30 días
                      </p>
                    </div>
                    <div className="ml-auto text-right">
                      <p className="text-2xl font-bold text-red-600">
                        {formatCurrency(summary.overdueAmount || 0)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-3 rounded-b-lg flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// COMPONENTES AUXILIARES
// ============================================================

function SummaryCard({
  title,
  value,
  icon,
  bgColor,
  borderColor,
  textColor,
  iconColor
}) {
  return (
    <div className={`${bgColor} border ${borderColor} rounded-lg p-4`}>
      <div className="flex items-start justify-between">
        <div>
          <p className={`text-sm font-medium ${textColor}`}>{title}</p>
          <p className={`text-2xl font-bold ${textColor} mt-1`}>{value}</p>
        </div>
        <div className={`${iconColor}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function ExpenseDetailRow({ expense, formatCurrency }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 flex justify-between items-center hover:shadow-md transition">
      <div className="flex-1">
        <p className="font-medium text-gray-900">{expense.name}</p>
        <p className="text-xs text-gray-600 mt-0.5">
          {expense.category} • {expense.frequency}
        </p>
      </div>
      <div className="text-right ml-4">
        <p className="font-bold text-gray-900">{formatCurrency(expense.totalAmount)}</p>
        <p className={`text-xs font-medium mt-0.5 ${
          expense.paymentStatus === 'paid' ? 'text-green-600' :
          expense.paymentStatus === 'partial' ? 'text-yellow-600' :
          'text-red-600'
        }`}>
          {expense.paymentStatus === 'paid' ? '✓ Pagado' :
           expense.paymentStatus === 'partial' ? '⏳ Parcial' :
           '⚠️ Pendiente'}
        </p>
      </div>
    </div>
  );
}

export default FixedExpensesSummaryModal;