import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { supplierInvoiceActions } from '../../Redux/Actions/supplierInvoiceActions';
import { expenseActions } from '../../Redux/Actions/balanceActions';
import api from '../../utils/axios';
import {
  fetchAccountsPayableRequest,
  fetchAccountsPayableSuccess,
  fetchAccountsPayableFailure,
} from '../../Redux/Reducer/supplierInvoiceReducer';
import { FaDollarSign, FaClock, FaExclamationTriangle, FaChartLine, FaFileInvoice, FaReceipt, FaMoneyCheck } from 'react-icons/fa';

const AccountsPayableSummary = () => {
  const dispatch = useDispatch();
  const [stats, setStats] = useState({
    // Facturas de proveedores
    totalInvoicesPending: 0,
    totalInvoicesOverdue: 0,
    totalInvoicesPartial: 0,
    invoicesCount: 0,
    // Gastos sin pagar
    totalUnpaidExpenses: 0,
    unpaidExpensesCount: 0,
    // Gastos fijos sin pagar
    totalUnpaidFixedExpenses: 0,
    unpaidFixedExpensesCount: 0,
    // Total general
    totalPayable: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAccountsPayable();
  }, []);

  const loadAccountsPayable = async () => {
    setLoading(true);
    dispatch(fetchAccountsPayableRequest());
    
    try {
      // 1. Cargar facturas de proveedores pendientes
      const invoicesResponse = await supplierInvoiceActions.getAccountsPayable();
      
      let totalInvoicesPending = 0;
      let totalInvoicesOverdue = 0;
      let totalInvoicesPartial = 0;
      let invoicesCount = 0;
      
      if (!invoicesResponse.error && invoicesResponse.invoices) {
        const invoicesArray = invoicesResponse.invoices || [];
        dispatch(fetchAccountsPayableSuccess(invoicesArray));
        
        const pending = invoicesArray.filter((inv) => inv.paymentStatus === 'pending');
        const overdue = invoicesArray.filter((inv) => inv.paymentStatus === 'overdue');
        const partial = invoicesArray.filter((inv) => inv.paymentStatus === 'partial');
        
        totalInvoicesPending = pending.reduce((sum, inv) => sum + (parseFloat(inv.totalAmount) - parseFloat(inv.paidAmount || 0)), 0);
        totalInvoicesOverdue = overdue.reduce((sum, inv) => sum + (parseFloat(inv.totalAmount) - parseFloat(inv.paidAmount || 0)), 0);
        totalInvoicesPartial = partial.reduce((sum, inv) => sum + (parseFloat(inv.totalAmount) - parseFloat(inv.paidAmount || 0)), 0);
        invoicesCount = invoicesArray.length;
      }
      
      // 2. Cargar gastos sin pagar (Expenses)
      const expensesResponse = await api.get('/expense/unpaid');
      const unpaidExpenses = expensesResponse.data || [];
      const totalUnpaidExpenses = unpaidExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0);
      const unpaidExpensesCount = unpaidExpenses.length;
      
      // 3. Cargar gastos fijos sin pagar (FixedExpenses)
      const fixedExpensesResponse = await api.get('/fixed-expenses/unpaid');
      const unpaidFixedExpenses = fixedExpensesResponse.data || [];
      const totalUnpaidFixedExpenses = unpaidFixedExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0);
      const unpaidFixedExpensesCount = unpaidFixedExpenses.length;
      
      // 4. Calcular total general
      const totalPayable = totalInvoicesPending + totalInvoicesOverdue + totalInvoicesPartial + totalUnpaidExpenses + totalUnpaidFixedExpenses;
      
      setStats({
        totalInvoicesPending,
        totalInvoicesOverdue,
        totalInvoicesPartial,
        invoicesCount,
        totalUnpaidExpenses,
        unpaidExpensesCount,
        totalUnpaidFixedExpenses,
        unpaidFixedExpensesCount,
        totalPayable,
      });
      
      setLoading(false);
    } catch (error) {
      console.error('Error al cargar cuentas por pagar:', error);
      dispatch(fetchAccountsPayableFailure(error.message));
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
    }).format(amount || 0);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        Resumen de Cuentas por Pagar
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total General */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <FaChartLine className="text-blue-600 text-2xl" />
            <span className="text-xs font-medium text-blue-600">
              Total
            </span>
          </div>
          <div className="text-sm text-gray-600 mb-1">Total por Pagar</div>
          <div className="text-2xl font-bold text-blue-900">
            {formatCurrency(stats.totalPayable)}
          </div>
          <div className="text-xs text-gray-500 mt-2">
            {stats.invoicesCount + stats.unpaidExpensesCount + stats.unpaidFixedExpensesCount} items
          </div>
        </div>

        {/* Facturas de Proveedores */}
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-4 border border-yellow-200">
          <div className="flex items-center justify-between mb-2">
            <FaFileInvoice className="text-yellow-600 text-2xl" />
            <span className="text-xs font-medium text-yellow-600">
              {stats.invoicesCount} facturas
            </span>
          </div>
          <div className="text-sm text-gray-600 mb-1">Facturas Proveedores</div>
          <div className="text-2xl font-bold text-yellow-900">
            {formatCurrency(stats.totalInvoicesPending + stats.totalInvoicesOverdue + stats.totalInvoicesPartial)}
          </div>
          {stats.totalInvoicesOverdue > 0 && (
            <div className="text-xs text-red-600 mt-2">
              <FaExclamationTriangle className="inline mr-1" />
              {formatCurrency(stats.totalInvoicesOverdue)} vencido
            </div>
          )}
        </div>

        {/* Gastos Sin Pagar */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <FaReceipt className="text-green-600 text-2xl" />
            <span className="text-xs font-medium text-green-600">
              {stats.unpaidExpensesCount} gastos
            </span>
          </div>
          <div className="text-sm text-gray-600 mb-1">Gastos Sin Pagar</div>
          <div className="text-2xl font-bold text-green-900">
            {formatCurrency(stats.totalUnpaidExpenses)}
          </div>
          <div className="text-xs text-gray-500 mt-2">
            Sin factura vinculada
          </div>
        </div>

        {/* Gastos Fijos Sin Pagar */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
          <div className="flex items-center justify-between mb-2">
            <FaMoneyCheck className="text-purple-600 text-2xl" />
            <span className="text-xs font-medium text-purple-600">
              {stats.unpaidFixedExpensesCount} fijos
            </span>
          </div>
          <div className="text-sm text-gray-600 mb-1">Gastos Fijos</div>
          <div className="text-2xl font-bold text-purple-900">
            {formatCurrency(stats.totalUnpaidFixedExpenses)}
          </div>
          <div className="text-xs text-gray-500 mt-2">
            Recurrentes sin pagar
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountsPayableSummary;
