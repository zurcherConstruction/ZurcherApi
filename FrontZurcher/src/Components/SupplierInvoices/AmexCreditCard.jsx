import { useState, useEffect } from 'react';
import axios from 'axios';

// Helper para obtener fecha local (sin conversión UTC)
const getLocalDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const AmexCreditCard = ({ token }) => {
  const [loading, setLoading] = useState(true);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [statistics, setStatistics] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    transactionType: 'charge', // 'charge', 'payment', 'interest'
    description: '',
    amount: '',
    date: getLocalDateString(),
    paymentMethod: 'Chase Bank',
    paymentDetails: '',
    vendor: '', // Para cargos manuales
    notes: ''
  });

  // Cargar datos
  const fetchBalance = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/supplier-invoices/amex/balance`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        setCurrentBalance(response.data.currentBalance);
        setStatistics(response.data.statistics);
        setTransactions(response.data.transactions);
      }
    } catch (error) {
      console.error('Error cargando balance:', error);
      alert('Error al cargar balance de tarjeta');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalance();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      alert('El monto debe ser mayor a 0');
      return;
    }

    if (!formData.description.trim()) {
      alert('La descripción es requerida');
      return;
    }

    try {
      setSubmitting(true);

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/supplier-invoices/amex/transaction`,
        {
          transactionType: formData.transactionType,
          vendor: 'AMEX',
          description: formData.description,
          amount: formData.amount,
          date: formData.date,
          invoiceNumber: formData.transactionType === 'charge' ? formData.description : undefined,
          paymentMethod: formData.transactionType === 'payment' ? formData.paymentMethod : undefined,
          paymentDetails: formData.transactionType === 'payment' ? formData.paymentDetails : undefined,
          notes: formData.notes
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        alert(`✅ ${getTransactionLabel(formData.transactionType)} registrado exitosamente`);
        setShowForm(false);
        setFormData({
          transactionType: 'charge',
          description: '',
          amount: '',
          date: getLocalDateString(),
          paymentMethod: 'Chase Bank',
          paymentDetails: '',
          vendor: '',
          notes: ''
        });
        fetchBalance(); // Recargar datos
      }
    } catch (error) {
      console.error('Error creando transacción:', error);
      alert('Error al crear transacción: ' + (error.response?.data?.message || error.message));
    } finally {
      setSubmitting(false);
    }
  };

  const getTransactionLabel = (type) => {
    switch (type) {
      case 'charge': return 'Cargo';
      case 'payment': return 'Pago';
      case 'interest': return 'Interés';
      default: return type;
    }
  };

  const getTransactionColor = (type) => {
    switch (type) {
      case 'charge': return 'text-red-600';
      case 'payment': return 'text-green-600';
      case 'interest': return 'text-orange-600';
      default: return 'text-gray-600';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    // NO usar new Date() para evitar conversión UTC
    // Si viene "2025-11-17", parsearlo directamente
    if (!dateString) return '';
    
    const [year, month, day] = dateString.split('T')[0].split('-');
    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    
    return `${parseInt(day)} ${months[parseInt(month) - 1]} ${year}`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-600">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con Balance - AMEX theme (azul oscuro) */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-950 rounded-lg shadow-lg p-6 text-white">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold mb-2">💳 American Express (AMEX)</h2>
            <div className="text-blue-200 text-sm">Balance Actual</div>
            <div className="text-4xl font-bold mt-2">{formatCurrency(currentBalance)}</div>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-white text-blue-900 px-4 py-2 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
          >
            {showForm ? 'Cancelar' : '+ Nueva Transacción'}
          </button>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-blue-800">
          <div>
            <div className="text-blue-300 text-xs uppercase">Total Cargos</div>
            <div className="text-xl font-bold">{formatCurrency(statistics.totalCharges)}</div>
          </div>
          <div>
            <div className="text-blue-300 text-xs uppercase">Total Pagos</div>
            <div className="text-xl font-bold">{formatCurrency(statistics.totalPayments)}</div>
          </div>
          <div>
            <div className="text-blue-300 text-xs uppercase">Transacciones</div>
            <div className="text-xl font-bold">{statistics.transactionCount}</div>
          </div>
        </div>
      </div>

      {/* Formulario de Nueva Transacción */}
      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Nueva Transacción</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Tipo de Transacción */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Transacción
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, transactionType: 'charge' })}
                  className={`px-4 py-3 rounded-lg border-2 font-semibold transition-colors ${
                    formData.transactionType === 'charge'
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                  }`}
                >
                  💳 Cargo
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, transactionType: 'payment' })}
                  className={`px-4 py-3 rounded-lg border-2 font-semibold transition-colors ${
                    formData.transactionType === 'payment'
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                  }`}
                >
                  💵 Pago
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, transactionType: 'interest' })}
                  className={`px-4 py-3 rounded-lg border-2 font-semibold transition-colors ${
                    formData.transactionType === 'interest'
                      ? 'border-orange-500 bg-orange-50 text-orange-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                  }`}
                >
                  📈 Interés
                </button>
              </div>
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripción *
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Ej: Home Depot - Materiales, Pago mensual, Intereses octubre"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-transparent"
                required
              />
            </div>

            {/* Vendor (solo para cargos) */}
            {formData.transactionType === 'charge' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Proveedor (opcional)
                </label>
                <input
                  type="text"
                  value={formData.vendor}
                  onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                  placeholder="Ej: Home Depot, Gasolinera, etc."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Si no especificas, se usará "AMEX"
                </p>
              </div>
            )}

            {/* Monto y Fecha */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monto * $
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha *
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-transparent"
                  required
                />
              </div>
            </div>

            {/* Campos adicionales para PAGO */}
            {formData.transactionType === 'payment' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Método de Pago
                  </label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-transparent"
                  >
                    <option value="Chase Bank">Chase Bank</option>
                    <option value="Capital Proyectos Septic">Capital Proyectos Septic</option>
                    <option value="Cap Trabajos Septic">Cap Trabajos Septic</option>
                    <option value="Transferencia Bancaria">Transferencia Bancaria</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Detalles del Pago (Check #, Referencia, etc.)
                  </label>
                  <input
                    type="text"
                    value={formData.paymentDetails}
                    onChange={(e) => setFormData({ ...formData, paymentDetails: e.target.value })}
                    placeholder="Ej: Check #1234, Ref: TRX789"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-transparent"
                  />
                </div>
              </>
            )}

            {/* Notas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notas Adicionales
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows="2"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-transparent"
                placeholder="Notas opcionales..."
              />
            </div>

            {/* Botones */}
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 bg-blue-900 text-white rounded-lg font-semibold hover:bg-blue-950 disabled:bg-gray-400 transition-colors"
              >
                {submitting ? 'Guardando...' : `Registrar ${getTransactionLabel(formData.transactionType)}`}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de Transacciones */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold">Historial de Transacciones</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {transactions.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No hay transacciones registradas
            </div>
          ) : (
            transactions.map((transaction) => (
              <div key={transaction.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`font-semibold ${getTransactionColor(transaction.transactionType)}`}>
                        {getTransactionLabel(transaction.transactionType)}
                      </span>
                      <span className="text-gray-400">•</span>
                      <span className="text-sm text-gray-600">{formatDate(transaction.date)}</span>
                    </div>
                    <div className="text-gray-800">{transaction.description}</div>
                    {transaction.paymentMethod && (
                      <div className="text-sm text-gray-500 mt-1">
                        Pagado con: {transaction.paymentMethod}
                        {transaction.paymentDetails && ` - ${transaction.paymentDetails}`}
                      </div>
                    )}
                    {transaction.type === 'charge' && (
                      <div className="text-sm text-gray-600 mt-1">
                        Pendiente: {formatCurrency(transaction.pendingAmount || 0)} | Estado: {transaction.paymentStatus}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-bold ${getTransactionColor(transaction.transactionType)}`}>
                      {transaction.transactionType === 'payment' ? '-' : '+'}
                      {formatCurrency(transaction.amount)}
                    </div>
                    {transaction.balanceAfter !== undefined && (
                      <div className="text-sm text-gray-500">
                        Balance: {formatCurrency(transaction.balanceAfter)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AmexCreditCard;
