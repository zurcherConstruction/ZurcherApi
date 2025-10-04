import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import {
  FaDollarSign,
  FaFileInvoiceDollar,
  FaMoneyBillWave,
  FaHandHoldingUsd,
  FaChartLine,
  FaExclamationTriangle,
  FaCheckCircle,
  FaClock,
  FaUserTie
} from 'react-icons/fa';

const AccountsReceivable = () => {
  const token = useSelector((state) => state.auth.token);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // overview, works, commissions
  const [data, setData] = useState({
    summary: {},
    details: {
      budgetsWithoutWork: [],
      worksInProgress: [],
      pendingFinalInvoices: [],
      approvedChangeOrders: []
    }
  });
  const [commissionsData, setCommissionsData] = useState({
    summary: {},
    bySalesRep: [],
    allBudgets: []
  });

  useEffect(() => {
    fetchAccountsReceivable();
    fetchPendingCommissions();
  }, []);

  const fetchAccountsReceivable = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/accounts-receivable/summary`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setData(response.data);
    } catch (error) {
      console.error('Error fetching accounts receivable:', error);
      alert('Error al cargar cuentas por cobrar');
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingCommissions = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/accounts-receivable/pending-commissions`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCommissionsData(response.data);
    } catch (error) {
      console.error('Error fetching pending commissions:', error);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
          <FaDollarSign className="text-green-600" />
          Accounts Receivable - Cuentas por Cobrar
        </h1>
        <p className="text-gray-600 mt-2">
          Seguimiento completo de dinero pendiente por cobrar
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Accounts Receivable */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Total por Cobrar</p>
              <p className="text-3xl font-bold mt-2">
                {formatCurrency(data.summary.totalAccountsReceivable)}
              </p>
            </div>
            <FaMoneyBillWave className="text-5xl text-green-200 opacity-50" />
          </div>
        </div>

        {/* Pending from Budgets */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Budgets sin Work</p>
              <p className="text-3xl font-bold mt-2">
                {formatCurrency(data.summary.totalPendingFromBudgets)}
              </p>
              <p className="text-blue-100 text-xs mt-1">
                {data.summary.budgetsWithoutWorkCount} budgets
              </p>
            </div>
            <FaFileInvoiceDollar className="text-5xl text-blue-200 opacity-50" />
          </div>
        </div>

        {/* Works in Progress */}
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm font-medium">Works en Progreso</p>
              <p className="text-3xl font-bold mt-2">
                {formatCurrency(data.summary.totalPendingFromWorks)}
              </p>
              <p className="text-orange-100 text-xs mt-1">
                {data.summary.worksInProgressCount} obras
              </p>
            </div>
            <FaChartLine className="text-5xl text-orange-200 opacity-50" />
          </div>
        </div>

        {/* Pending Commissions */}
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Comisiones Pendientes</p>
              <p className="text-3xl font-bold mt-2">
                {formatCurrency(commissionsData.summary.totalPendingCommissions)}
              </p>
              <p className="text-purple-100 text-xs mt-1">
                {commissionsData.summary.totalBudgetsWithCommissions} budgets
              </p>
            </div>
            <FaUserTie className="text-5xl text-purple-200 opacity-50" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-md mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-6 py-4 text-sm font-medium ${
                activeTab === 'overview'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FaChartLine className="inline mr-2" />
              Resumen General
            </button>
            <button
              onClick={() => setActiveTab('works')}
              className={`px-6 py-4 text-sm font-medium ${
                activeTab === 'works'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FaHandHoldingUsd className="inline mr-2" />
              Works en Progreso
            </button>
            <button
              onClick={() => setActiveTab('commissions')}
              className={`px-6 py-4 text-sm font-medium ${
                activeTab === 'commissions'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FaUserTie className="inline mr-2" />
              Comisiones Vendedores
            </button>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Budgets Without Work */}
          {data.details.budgetsWithoutWork.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <FaExclamationTriangle className="text-yellow-500" />
                Budgets Aprobados sin Work ({data.details.budgetsWithoutWork.length})
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Budget ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Propiedad
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Cliente
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Total
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Pago Inicial
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Pendiente
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Estado
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {data.details.budgetsWithoutWork.map((budget) => (
                      <tr key={budget.budgetId} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                          #{budget.budgetId}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {budget.propertyAddress}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {budget.clientName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                          {formatCurrency(budget.totalPrice)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                          {formatCurrency(budget.initialPayment)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-600">
                          {formatCurrency(budget.amountPending)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            {budget.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Pending Final Invoices */}
          {data.details.pendingFinalInvoices.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <FaClock className="text-orange-500" />
                Final Invoices Pendientes ({data.details.pendingFinalInvoices.length})
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Invoice ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Propiedad
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Cliente
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Monto Total
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Extras
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Fecha
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {data.details.pendingFinalInvoices.map((invoice) => (
                      <tr key={invoice.finalInvoiceId} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                          #{invoice.finalInvoiceId}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {invoice.propertyAddress}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {invoice.clientName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-600">
                          {formatCurrency(invoice.finalAmountDue)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {formatCurrency(invoice.subtotalExtras)}
                          <span className="text-xs text-gray-400 ml-1">
                            ({invoice.extraItemsCount} items)
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            invoice.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-orange-100 text-orange-800'
                          }`}>
                            {invoice.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(invoice.invoiceDate)}
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

      {activeTab === 'works' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <FaChartLine className="text-blue-500" />
            Works en Progreso - Detalle Financiero
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Work ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Propiedad
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Budget
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Change Orders
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Extras
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Total por Cobrar
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Estado Final Invoice
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.details.worksInProgress.map((work) => (
                  <tr key={work.workId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                      {work.workId}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {work.propertyAddress}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {work.clientName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(work.budgetTotal)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {work.changeOrdersTotal > 0 ? (
                        <span className="text-blue-600 font-semibold">
                          +{formatCurrency(work.changeOrdersTotal)}
                          <span className="text-xs text-gray-400 ml-1">
                            ({work.changeOrdersCount})
                          </span>
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {work.finalInvoiceExtras > 0 ? (
                        <span className="text-purple-600 font-semibold">
                          +{formatCurrency(work.finalInvoiceExtras)}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-600">
                      {formatCurrency(work.amountPending)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        work.finalInvoiceStatus === 'paid'
                          ? 'bg-green-100 text-green-800'
                          : work.finalInvoiceStatus === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {work.finalInvoiceStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'commissions' && (
        <div className="space-y-6">
          {/* Commissions by Sales Rep */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <FaUserTie className="text-purple-500" />
              Comisiones por Vendedor
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
              {commissionsData.bySalesRep.map((salesRep) => (
                <div key={salesRep.staffId} className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 border border-purple-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-purple-500 text-white rounded-full w-12 h-12 flex items-center justify-center">
                      <FaUserTie className="text-xl" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800">{salesRep.staffName}</h3>
                      <p className="text-sm text-gray-600">{salesRep.staffEmail}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Total Comisiones:</span>
                      <span className="text-lg font-bold text-purple-600">
                        {formatCurrency(salesRep.totalCommissions)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Budgets:</span>
                      <span className="text-sm font-semibold text-gray-700">
                        {salesRep.budgetsCount}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* All Budgets with Commissions */}
            <h3 className="text-lg font-semibold text-gray-700 mb-3">Detalle de Comisiones</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Budget ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Propiedad
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Vendedor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Comisión
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Estado Budget
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Estado Work
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Fecha
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {commissionsData.allBudgets.map((budget) => (
                    <tr key={budget.budgetId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                        #{budget.budgetId}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {budget.propertyAddress}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-purple-600">
                        {budget.salesRepName}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {budget.clientName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                        {formatCurrency(budget.commissionAmount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          {budget.budgetStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          budget.workStatus === 'no_work'
                            ? 'bg-gray-100 text-gray-600'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {budget.workStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(budget.date)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountsReceivable;
