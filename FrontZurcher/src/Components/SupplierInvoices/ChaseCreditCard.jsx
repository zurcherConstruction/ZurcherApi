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

const ChaseCreditCard = ({ token }) => {
  const [loading, setLoading] = useState(true);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [statistics, setStatistics] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [receiptFile, setReceiptFile] = useState(null); // 📄 NUEVO: archivo de comprobante
  const [receiptPreview, setReceiptPreview] = useState(null); // 📄 NUEVO: preview del comprobante
  const [showReceiptModal, setShowReceiptModal] = useState(false); // 📄 NUEVO: modal de visualización
  const [selectedReceipt, setSelectedReceipt] = useState(null); // 📄 NUEVO: receipt seleccionado

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
        `${import.meta.env.VITE_API_URL}/supplier-invoices/credit-card/balance`,
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

      // 📄 Crear FormData para enviar archivo
      const submitData = new FormData();
      submitData.append('transactionType', formData.transactionType);
      submitData.append('vendor', 'Chase Credit Card');
      submitData.append('description', formData.description);
      submitData.append('amount', formData.amount);
      submitData.append('date', formData.date);
      
      if (formData.transactionType === 'charge') {
        if (formData.vendor) submitData.append('vendor', formData.vendor);
      }
      
      if (formData.transactionType === 'payment') {
        submitData.append('paymentMethod', formData.paymentMethod);
        if (formData.paymentDetails) submitData.append('paymentDetails', formData.paymentDetails);
        
        // 📄 Agregar receipt si existe
        if (receiptFile) {
          submitData.append('receipt', receiptFile);
        }
      }
      
      if (formData.notes) submitData.append('notes', formData.notes);

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/supplier-invoices/credit-card/transaction`,
        submitData,
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
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
        setReceiptFile(null); // 📄 Limpiar archivo
        setReceiptPreview(null); // 📄 Limpiar preview
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

  const handleReversePayment = async (paymentId, paymentAmount) => {
    // Confirmar con el usuario
    const confirmed = window.confirm(
      `⚠️ ¿Estás seguro de revertir este pago?\n\n` +
      `Monto: ${formatCurrency(paymentAmount)}\n` +
      `ID: ${paymentId}\n\n` +
      `Esta acción:\n` +
      `✓ Eliminará el registro de pago\n` +
      `✓ Revertirá los cambios en los expenses pagados\n` +
      `✓ Actualizará el balance de la tarjeta\n\n` +
      `Esta acción NO se puede deshacer.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setSubmitting(true);

      const response = await axios.delete(
        `${import.meta.env.VITE_API_URL}/supplier-invoices/credit-card/payment/${paymentId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        alert(
          `✅ Pago revertido exitosamente\n\n` +
          `Monto revertido: ${formatCurrency(response.data.paymentAmount)}\n` +
          `Expenses afectados: ${response.data.revertedExpenses.length}\n` +
          `Nuevo balance: ${formatCurrency(response.data.currentBalance)}`
        );
        fetchBalance(); // Recargar datos
      }
    } catch (error) {
      console.error('Error revirtiendo pago:', error);
      alert('❌ Error al revertir pago:\n' + (error.response?.data?.message || error.message));
    } finally {
      setSubmitting(false);
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
    if (!dateString) return '';
    
    // Extraer solo la parte de fecha (YYYY-MM-DD) ignorando hora/timezone si existe
    const datePart = dateString.split('T')[0];
    const [year, month, day] = datePart.split('-').map(Number);
    
    // Crear fecha local (sin conversión UTC)
    const date = new Date(year, month - 1, day);
    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
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
      {/* Header con Balance */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg shadow-lg p-6 text-white">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold mb-2">💳 Chase Credit Card</h2>
            <div className="text-blue-100 text-sm">Balance Actual</div>
            <div className="text-4xl font-bold mt-2">{formatCurrency(currentBalance)}</div>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-white text-blue-600 px-4 py-2 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
          >
            {showForm ? 'Cancelar' : '+ Nueva Transacción'}
          </button>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-blue-500">
          <div>
            <div className="text-blue-200 text-xs uppercase">Total Cargos</div>
            <div className="text-xl font-bold">{formatCurrency(statistics.totalCharges)}</div>
          </div>
          <div>
            <div className="text-blue-200 text-xs uppercase">Total Pagos</div>
            <div className="text-xl font-bold">{formatCurrency(statistics.totalPayments)}</div>
          </div>
          <div>
            <div className="text-blue-200 text-xs uppercase">Transacciones</div>
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
                  💳 Gasto no registrado
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Si no especificas, se usará "Chase Credit Card"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="Chase Bank">Chase Bank</option>
                    <option value="Proyecto Septic BOFA">Proyecto Septic BOFA</option>
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                {/* 📄 NUEVO: Subir comprobante */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Comprobante de Pago (opcional)
                  </label>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        setReceiptFile(file);
                        // Crear preview si es imagen
                        if (file.type.startsWith('image/')) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setReceiptPreview(reader.result);
                          };
                          reader.readAsDataURL(file);
                        } else {
                          setReceiptPreview(null);
                        }
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {receiptPreview && (
                    <div className="mt-2">
                      <img src={receiptPreview} alt="Preview" className="max-h-32 rounded border" />
                    </div>
                  )}
                  {receiptFile && !receiptPreview && (
                    <div className="mt-2 text-sm text-gray-600">
                      📄 {receiptFile.name}
                    </div>
                  )}
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
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
              <div key={transaction.id} className="p-4 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`font-semibold ${getTransactionColor(transaction.transactionType)}`}>
                        {getTransactionLabel(transaction.transactionType)}
                      </span>
                      <span className="text-gray-400">•</span>
                      <span className="text-sm text-gray-600">{formatDate(transaction.date)}</span>
                      {transaction.transactionType === 'payment' && (
                        <>
                          <span className="text-gray-400">•</span>
                          <span className="text-xs text-gray-500">ID: {transaction.id}</span>
                        </>
                      )}
                    </div>
                    <div className="text-gray-800">{transaction.description}</div>
                    {transaction.paymentMethod && (
                      <div className="text-sm text-gray-500 mt-1">
                        Pagado con: {transaction.paymentMethod}
                        {transaction.paymentDetails && ` - ${transaction.paymentDetails}`}
                        {/* 📄 Botón para ver comprobante */}
                        {transaction.receiptUrl && (
                          <>
                            <span className="mx-1">•</span>
                            <button
                              onClick={() => {
                                setSelectedReceipt(transaction.receiptUrl);
                                setShowReceiptModal(true);
                              }}
                              className="text-blue-600 hover:text-blue-800 underline text-xs"
                            >
                              Ver comprobante
                            </button>
                          </>
                        )}
                      </div>
                    )}
                    {transaction.type === 'charge' && (
                      <div className="text-sm text-gray-600 mt-1">
                        Pendiente: {formatCurrency(transaction.pendingAmount || 0)} | Estado: {transaction.paymentStatus}
                      </div>
                    )}
                  </div>
                  <div className="text-right flex flex-col items-end gap-2">
                    <div className={`text-lg font-bold ${getTransactionColor(transaction.transactionType)}`}>
                      {transaction.transactionType === 'payment' ? '-' : '+'}
                      {formatCurrency(transaction.amount)}
                    </div>
                    {transaction.balanceAfter !== undefined && (
                      <div className="text-sm text-gray-500">
                        Balance: {formatCurrency(transaction.balanceAfter)}
                      </div>
                    )}
                    {/* Botón de revertir solo para pagos */}
                    {transaction.transactionType === 'payment' && (
                      <button
                        onClick={() => handleReversePayment(transaction.id, transaction.amount)}
                        disabled={submitting}
                        className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md border border-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                        title="Revertir este pago"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                        </svg>
                        Revertir
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 📄 Modal para visualizar comprobante */}
      {showReceiptModal && selectedReceipt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                📄 Comprobante de Pago
              </h3>
              <button
                onClick={() => {
                  setShowReceiptModal(false);
                  setSelectedReceipt(null);
                }}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="max-h-[calc(90vh-120px)] overflow-auto">
              {selectedReceipt.endsWith('.pdf') ? (
                <iframe
                  src={`https://docs.google.com/gview?url=${encodeURIComponent(selectedReceipt)}&embedded=true`}
                  title="Vista previa PDF"
                  width="100%"
                  height="600px"
                  className="rounded-lg border"
                />
              ) : (
                <img
                  src={selectedReceipt}
                  alt="Comprobante"
                  className="max-w-full h-auto mx-auto rounded-lg"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChaseCreditCard;
