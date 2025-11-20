import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { bankAccountActions } from '../../Redux/Actions/bankAccountActions';
import { FaUniversity, FaMoneyBillWave, FaExchangeAlt, FaChartLine, FaPlus } from 'react-icons/fa';

const BankAccountsDashboard = () => {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState([]);
  const [summary, setSummary] = useState({
    totalBalance: 0,
    totalAccounts: 0,
    activeAccounts: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const response = await bankAccountActions.getDashboard();
      
      if (response.success) {
        setAccounts(response.accounts || []);
        setSummary(response.summary || {
          totalBalance: 0,
          totalAccounts: 0,
          activeAccounts: 0
        });
      } else if (response.error) {
        toast.error(response.message || 'Error al cargar el dashboard de cuentas bancarias');
      }
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      toast.error('Error al cargar el dashboard de cuentas bancarias');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  const getAccountIcon = (accountName) => {
    if (accountName.toLowerCase().includes('chase')) return '🏦';
    if (accountName.toLowerCase().includes('efectivo') || accountName.toLowerCase().includes('caja')) return '💵';
    if (accountName.toLowerCase().includes('capital')) return '💼';
    if (accountName.toLowerCase().includes('trabajos')) return '🔧';
    return '🏦';
  };

  const getBalanceColor = (balance) => {
    const amount = parseFloat(balance);
    if (amount > 5000) return 'text-green-600';
    if (amount > 1000) return 'text-blue-600';
    if (amount > 0) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando cuentas bancarias...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
              <FaUniversity className="text-blue-600" />
              Cuentas Bancarias
            </h1>
            <p className="text-gray-600 mt-2">
              Gestión y seguimiento de todas las cuentas bancarias
            </p>
          </div>
          <button
            onClick={() => navigate('/bank-accounts/new-transaction')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors shadow-lg"
          >
            <FaPlus />
            Nueva Transacción
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold opacity-90">Balance Total</h3>
            <FaMoneyBillWave className="text-3xl opacity-80" />
          </div>
          <p className="text-4xl font-bold">{formatCurrency(summary.totalBalance)}</p>
          <p className="text-sm opacity-80 mt-2">En todas las cuentas</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold opacity-90">Cuentas Activas</h3>
            <FaUniversity className="text-3xl opacity-80" />
          </div>
          <p className="text-4xl font-bold">{summary.activeAccounts}</p>
          <p className="text-sm opacity-80 mt-2">de {summary.totalAccounts} totales</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold opacity-90">Movimientos</h3>
            <FaExchangeAlt className="text-3xl opacity-80" />
          </div>
          <p className="text-4xl font-bold">
            {accounts.reduce((sum, acc) => sum + (parseInt(acc.transactionCount) || 0), 0)}
          </p>
          <p className="text-sm opacity-80 mt-2">Transacciones totales</p>
        </div>
      </div>

      {/* Accounts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        {accounts.map((account) => (
          <div
            key={account.id}
            onClick={() => navigate(`/bank-accounts/${account.id}`)}
            className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer border border-gray-200 hover:border-blue-300"
          >
            {/* Account Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 rounded-t-xl text-white">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{getAccountIcon(account.accountName)}</span>
                  <div>
                    <h3 className="text-xl font-bold">{account.accountName}</h3>
                    <p className="text-blue-100 text-sm mt-1">
                      {account.accountType === 'checking' ? 'Cuenta Corriente' : 'Cuenta de Ahorros'}
                    </p>
                  </div>
                </div>
                {account.isActive ? (
                  <span className="bg-green-500 text-white text-xs px-3 py-1 rounded-full font-semibold">
                    Activa
                  </span>
                ) : (
                  <span className="bg-red-500 text-white text-xs px-3 py-1 rounded-full font-semibold">
                    Inactiva
                  </span>
                )}
              </div>
            </div>

            {/* Account Body */}
            <div className="p-6">
              {/* Current Balance */}
              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-1">Balance Actual</p>
                <p className={`text-3xl font-bold ${getBalanceColor(account.currentBalance)}`}>
                  {formatCurrency(account.currentBalance)}
                </p>
              </div>

              {/* Statistics */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-green-50 rounded-lg p-3">
                  <p className="text-xs text-gray-600 mb-1">Depósitos</p>
                  <p className="text-lg font-bold text-green-600">
                    {formatCurrency(account.totalDeposits)}
                  </p>
                </div>
                <div className="bg-red-50 rounded-lg p-3">
                  <p className="text-xs text-gray-600 mb-1">Retiros</p>
                  <p className="text-lg font-bold text-red-600">
                    {formatCurrency(account.totalWithdrawals)}
                  </p>
                </div>
              </div>

              {/* Transaction Count */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2 text-gray-600">
                  <FaChartLine />
                  <span className="text-sm font-medium">
                    {account.transactionCount} transacciones
                  </span>
                </div>
                <button className="text-blue-600 hover:text-blue-700 font-semibold text-sm flex items-center gap-1">
                  Ver detalles
                  <span>→</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {accounts.length === 0 && (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <FaUniversity className="text-6xl text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-700 mb-2">
            No hay cuentas bancarias registradas
          </h3>
          <p className="text-gray-600 mb-6">
            Comienza agregando tu primera cuenta bancaria
          </p>
          <button
            onClick={() => navigate('/bank-accounts/new')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg inline-flex items-center gap-2 transition-colors"
          >
            <FaPlus />
            Agregar Cuenta
          </button>
        </div>
      )}
    </div>
  );
};

export default BankAccountsDashboard;
