import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { bankAccountActions, bankTransactionActions } from '../../Redux/Actions/bankAccountActions';
import { toast } from 'react-toastify';
import { FaArrowLeft, FaArrowDown, FaArrowUp, FaExchangeAlt, FaSpinner } from 'react-icons/fa';

const NewTransactionModal = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentStaff = useSelector((state) => state.auth.currentStaff);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [transactionType, setTransactionType] = useState('deposit'); // deposit, withdrawal, transfer
  
  const [formData, setFormData] = useState({
    accountId: location.state?.accountId || '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    notes: '',
    // Para transferencias
    fromAccountId: '',
    toAccountId: ''
  });

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const response = await bankAccountActions.getAll();
      if (response.error) {
        toast.error(response.message || 'Error al cargar las cuentas');
      } else {
        setAccounts((response.accounts || []).filter(acc => acc.isActive));
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
      toast.error('Error al cargar las cuentas');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validaciones
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error('El monto debe ser mayor a 0');
      return;
    }

    if (transactionType === 'transfer') {
      if (!formData.fromAccountId || !formData.toAccountId) {
        toast.error('Selecciona las cuentas de origen y destino');
        return;
      }
      if (formData.fromAccountId === formData.toAccountId) {
        toast.error('Las cuentas de origen y destino deben ser diferentes');
        return;
      }
    } else {
      if (!formData.accountId) {
        toast.error('Selecciona una cuenta');
        return;
      }
    }

    try {
      setLoading(true);
      let response;

      if (transactionType === 'deposit') {
        response = await bankTransactionActions.createDeposit({
          accountId: formData.accountId,
          amount: parseFloat(formData.amount),
          date: formData.date,
          description: formData.description || 'Depósito manual',
          notes: formData.notes,
          createdByStaffId: currentStaff?.idStaff
        });
        if (!response.error) {
          toast.success('✅ Depósito registrado exitosamente');
        }
      } else if (transactionType === 'withdrawal') {
        response = await bankTransactionActions.createWithdrawal({
          accountId: formData.accountId,
          amount: parseFloat(formData.amount),
          date: formData.date,
          description: formData.description || 'Retiro manual',
          notes: formData.notes,
          createdByStaffId: currentStaff?.idStaff
        });
        if (!response.error) {
          toast.success('✅ Retiro registrado exitosamente');
        }
      } else if (transactionType === 'transfer') {
        response = await bankTransactionActions.createTransfer({
          fromAccountId: formData.fromAccountId,
          toAccountId: formData.toAccountId,
          amount: parseFloat(formData.amount),
          date: formData.date,
          description: formData.description || 'Transferencia entre cuentas',
          notes: formData.notes,
          createdByStaffId: currentStaff?.idStaff
        });
        if (!response.error) {
          toast.success('✅ Transferencia realizada exitosamente');
        }
      }

      if (response.error) {
        toast.error(`❌ ${response.message}`);
        return;
      }

      // Redirigir
      if (formData.accountId) {
        navigate(`/bank-accounts/${formData.accountId}`);
      } else if (formData.fromAccountId) {
        navigate(`/bank-accounts/${formData.fromAccountId}`);
      } else {
        navigate('/bank-accounts');
      }
    } catch (error) {
      console.error('Error creating transaction:', error);
      const errorMsg = error.response?.data?.error || error.response?.data?.message || 'Error al crear la transacción';
      toast.error(`❌ ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const getSelectedAccount = () => {
    if (transactionType === 'transfer') {
      return accounts.find(acc => acc.idBankAccount === formData.fromAccountId);
    }
    return accounts.find(acc => acc.idBankAccount === formData.accountId);
  };

  const selectedAccount = getSelectedAccount();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <button
          onClick={() => navigate('/bank-accounts')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6 transition-colors"
        >
          <FaArrowLeft />
          Volver
        </button>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
            <h2 className="text-2xl font-bold">Nueva Transacción</h2>
            <p className="text-blue-100 mt-1">Registra depósitos, retiros o transferencias</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6">
            {/* Transaction Type Selector */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Tipo de Transacción
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setTransactionType('deposit')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    transactionType === 'deposit'
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <FaArrowDown className="text-2xl mx-auto mb-2" />
                  <span className="font-semibold text-sm">Depósito</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTransactionType('withdrawal')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    transactionType === 'withdrawal'
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <FaArrowUp className="text-2xl mx-auto mb-2" />
                  <span className="font-semibold text-sm">Retiro</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTransactionType('transfer')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    transactionType === 'transfer'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <FaExchangeAlt className="text-2xl mx-auto mb-2" />
                  <span className="font-semibold text-sm">Transferencia</span>
                </button>
              </div>
            </div>

            {/* Account Selection */}
            {transactionType !== 'transfer' ? (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cuenta
                </label>
                <select
                  name="accountId"
                  value={formData.accountId}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Selecciona una cuenta</option>
                  {accounts.map(acc => (
                    <option key={acc.idBankAccount} value={acc.idBankAccount}>
                      {acc.accountName} - ${parseFloat(acc.currentBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Desde (Cuenta Origen)
                  </label>
                  <select
                    name="fromAccountId"
                    value={formData.fromAccountId}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Selecciona cuenta origen</option>
                    {accounts.map(acc => (
                      <option key={acc.idBankAccount} value={acc.idBankAccount}>
                        {acc.accountName} - ${parseFloat(acc.currentBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hacia (Cuenta Destino)
                  </label>
                  <select
                    name="toAccountId"
                    value={formData.toAccountId}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Selecciona cuenta destino</option>
                    {accounts.filter(acc => acc.idBankAccount !== formData.fromAccountId).map(acc => (
                      <option key={acc.idBankAccount} value={acc.idBankAccount}>
                        {acc.accountName} - ${parseFloat(acc.currentBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {/* Amount */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Monto
              </label>
              <div className="relative">
                <span className="absolute left-4 top-3 text-gray-500 text-lg">$</span>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                />
              </div>
              {selectedAccount && transactionType === 'withdrawal' && (
                <p className="text-sm text-gray-600 mt-2">
                  Balance disponible: ${parseFloat(selectedAccount.currentBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              )}
            </div>

            {/* Date */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha
              </label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Description */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descripción
              </label>
              <input
                type="text"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder={
                  transactionType === 'deposit' 
                    ? 'Ej: Depósito inicial' 
                    : transactionType === 'withdrawal'
                    ? 'Ej: Retiro para gastos'
                    : 'Ej: Transferencia interna'
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Notes */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notas (Opcional)
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows="3"
                placeholder="Información adicional..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => navigate('/bank-accounts')}
                disabled={loading}
                className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-semibold transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`flex-1 px-6 py-3 rounded-lg text-white font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${
                  transactionType === 'deposit'
                    ? 'bg-green-600 hover:bg-green-700'
                    : transactionType === 'withdrawal'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {loading ? (
                  <>
                    <FaSpinner className="animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    {transactionType === 'deposit' && 'Registrar Depósito'}
                    {transactionType === 'withdrawal' && 'Registrar Retiro'}
                    {transactionType === 'transfer' && 'Realizar Transferencia'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
  
export default NewTransactionModal;
