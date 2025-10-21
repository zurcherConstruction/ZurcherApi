import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { supplierInvoiceActions } from '../../Redux/Actions/supplierInvoiceActions';
import { PAYMENT_METHODS_GROUPED } from '../../utils/paymentConstants';
import {
  registerPaymentRequest,
  registerPaymentSuccess,
  registerPaymentFailure,
  deleteSupplierInvoiceRequest,
  deleteSupplierInvoiceSuccess,
  deleteSupplierInvoiceFailure,
} from '../../Redux/Reducer/supplierInvoiceReducer';
import {
  FaTimes,
  FaEdit,
  FaTrash,
  FaDollarSign,
  FaCheckCircle,
  FaClock,
  FaExclamationTriangle,
  FaFileInvoice,
  FaBuilding,
  FaCalendarAlt,
  FaMoneyBillWave,
} from 'react-icons/fa';

const SupplierInvoiceDetail = ({ invoice, onClose, onEdit }) => {
  const dispatch = useDispatch();
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentData, setPaymentData] = useState({
    amount: '',
    paymentDate: (() => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    })(),
    paymentMethod: 'Chase Bank',
    referenceNumber: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    if (!date) return '-';
    const d = new Date(date);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const year = d.getFullYear();
    return `${month}-${day}-${year}`;
  };

  const getStatusIcon = (status) => {
    const icons = {
      pending: <FaClock className="text-yellow-500" />,
      partial: <FaClock className="text-blue-500" />,
      paid: <FaCheckCircle className="text-green-500" />,
      overdue: <FaExclamationTriangle className="text-red-500" />,
      cancelled: <FaTrash className="text-gray-500" />,
    };
    return icons[status] || <FaClock className="text-gray-500" />;
  };

  const getStatusText = (status) => {
    const texts = {
      pending: 'Pendiente',
      partial: 'Pago Parcial',
      paid: 'Pagado Completamente',
      overdue: 'Vencido',
      cancelled: 'Cancelado',
    };
    return texts[status] || status;
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      partial: 'bg-blue-100 text-blue-800 border-blue-200',
      paid: 'bg-green-100 text-green-800 border-green-200',
      overdue: 'bg-red-100 text-red-800 border-red-200',
      cancelled: 'bg-gray-100 text-gray-800 border-gray-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const remainingAmount = parseFloat(invoice.totalAmount) - parseFloat(invoice.paidAmount || 0);
  const canRegisterPayment = invoice.paymentStatus !== 'paid' && invoice.paymentStatus !== 'cancelled';
  const canEdit = invoice.paymentStatus !== 'paid' && invoice.paymentStatus !== 'cancelled';

  const handlePaymentInputChange = (e) => {
    const { name, value } = e.target;
    setPaymentData({ ...paymentData, [name]: value });
  };

  const handleRegisterPayment = async (e) => {
    e.preventDefault();

    const amount = parseFloat(paymentData.amount);
    
    if (!amount || amount <= 0) {
      alert('Ingrese un monto válido');
      return;
    }

    if (amount > remainingAmount) {
      alert(`El monto no puede ser mayor al saldo pendiente (${formatCurrency(remainingAmount)})`);
      return;
    }

    setLoading(true);
    dispatch(registerPaymentRequest());

    const response = await supplierInvoiceActions.registerPayment(
      invoice.idSupplierInvoice,
      {
        paymentMethod: paymentData.paymentMethod,
        paymentDate: paymentData.paymentDate,
        paidAmount: amount,
        paymentDetails: paymentData.referenceNumber,
        notes: paymentData.notes,
      }
    );

    if (response.error) {
      dispatch(registerPaymentFailure(response.message));
      alert('Error al registrar el pago: ' + response.message);
    } else {
      dispatch(registerPaymentSuccess(response));
      setShowPaymentForm(false);
      setPaymentData({
        amount: '',
        paymentDate: (() => {
          const now = new Date();
          const year = now.getFullYear();
          const month = String(now.getMonth() + 1).padStart(2, '0');
          const day = String(now.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        })(),
        paymentMethod: 'Chase Bank',
        referenceNumber: '',
        notes: '',
      });
      alert('Pago registrado exitosamente');
      // Actualizar la factura actual
      if (response.paymentStatus === 'paid') {
        setTimeout(() => onClose(), 1000);
      }
    }

    setLoading(false);
  };

  const handleDelete = async () => {
    if (!window.confirm('¿Está seguro de eliminar este invoice? Esta acción no se puede deshacer.')) {
      return;
    }

    setLoading(true);
    dispatch(deleteSupplierInvoiceRequest());

    const response = await supplierInvoiceActions.delete(invoice.idSupplierInvoice);

    if (response.error) {
      dispatch(deleteSupplierInvoiceFailure(response.message));
      alert('Error al eliminar: ' + response.message);
    } else {
      dispatch(deleteSupplierInvoiceSuccess(invoice.idSupplierInvoice));
      alert('Invoice eliminado exitosamente');
      onClose();
    }

    setLoading(false);
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FaFileInvoice className="text-white text-3xl" />
            <div>
              <h2 className="text-2xl font-bold text-white">
                Invoice {invoice.invoiceNumber}
              </h2>
              <p className="text-blue-100 text-sm">
                {invoice.vendor}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <FaTimes size={24} />
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* Estado y Acciones */}
        <div className="flex items-center justify-between mb-6 pb-6 border-b">
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border ${getStatusColor(invoice.paymentStatus)}`}>
            {getStatusIcon(invoice.paymentStatus)}
            <span className="font-semibold">{getStatusText(invoice.paymentStatus)}</span>
          </div>
          <div className="flex gap-2">
            {canEdit && (
              <button
                onClick={() => onEdit(invoice)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                disabled={loading}
              >
                <FaEdit /> Editar
              </button>
            )}
            {canEdit && (
              <button
                onClick={handleDelete}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                disabled={loading}
              >
                <FaTrash /> Eliminar
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Información de la Factura */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
              Información del Invoice
            </h3>
            
            <div className="flex items-start gap-3">
              <FaFileInvoice className="text-gray-400 mt-1" />
              <div>
                <div className="text-sm text-gray-600">Número de Invoice</div>
                <div className="font-semibold text-gray-900">{invoice.invoiceNumber}</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <FaBuilding className="text-gray-400 mt-1" />
              <div>
                <div className="text-sm text-gray-600">Proveedor</div>
                <div className="font-semibold text-gray-900">{invoice.vendor}</div>
                {invoice.vendorCuit && (
                  <div className="text-sm text-gray-500">CUIT: {invoice.vendorCuit}</div>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <FaCalendarAlt className="text-gray-400 mt-1" />
              <div>
                <div className="text-sm text-gray-600">Fecha del Invoice</div>
                <div className="font-semibold text-gray-900">{formatDate(invoice.issueDate)}</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <FaCalendarAlt className="text-gray-400 mt-1" />
              <div>
                <div className="text-sm text-gray-600">Fecha de Vencimiento</div>
                <div className="font-semibold text-gray-900">{formatDate(invoice.dueDate)}</div>
              </div>
            </div>

            {invoice.description && (
              <div>
                <div className="text-sm text-gray-600 mb-1">Descripción</div>
                <div className="text-gray-900">{invoice.description}</div>
              </div>
            )}
          </div>

          {/* Información Financiera */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
              Información Financiera
            </h3>

            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <FaMoneyBillWave className="text-blue-600" />
                <span className="text-sm text-gray-600">Monto Total</span>
              </div>
              <div className="text-3xl font-bold text-blue-900">
                {formatCurrency(invoice.totalAmount)}
              </div>
            </div>

            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <FaCheckCircle className="text-green-600" />
                <span className="text-sm text-gray-600">Monto Pagado</span>
              </div>
              <div className="text-2xl font-bold text-green-900">
                {formatCurrency(invoice.paidAmount || 0)}
              </div>
            </div>

            {remainingAmount > 0 && (
              <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                <div className="flex items-center gap-2 mb-2">
                  <FaDollarSign className="text-yellow-600" />
                  <span className="text-sm text-gray-600">Saldo Pendiente</span>
                </div>
                <div className="text-2xl font-bold text-yellow-900">
                  {formatCurrency(remainingAmount)}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Items de la Factura */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
            Items del Invoice
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Obra</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Precio Unit.</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {invoice.SupplierInvoiceItems?.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-900">{item.description}</div>
                      {item.category && (
                        <div className="text-xs text-gray-500">{item.category}</div>
                      )}
                      {item.relatedExpense && (
                        <div className="text-xs text-blue-600 mt-1">
                          📊 Gasto vinculado: {item.relatedExpense.typeExpense}
                        </div>
                      )}
                      {item.relatedFixedExpense && (
                        <div className="text-xs text-purple-600 mt-1">
                          📌 Gasto fijo vinculado: {item.relatedFixedExpense.description}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {item.work?.propertyAddress || 'General'}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-900">
                      {item.quantity}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-900">
                      {formatCurrency(item.unitPrice)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                      {formatCurrency(item.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Formulario de Pago */}
        {canRegisterPayment && (
          <div className="border-t pt-6">
            {!showPaymentForm ? (
              <button
                onClick={() => setShowPaymentForm(true)}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <FaDollarSign />
                Registrar Pago
              </button>
            ) : (
              <form onSubmit={handleRegisterPayment} className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Registrar Nuevo Pago
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Monto a Pagar *
                    </label>
                    <input
                      type="number"
                      name="amount"
                      value={paymentData.amount}
                      onChange={handlePaymentInputChange}
                      max={remainingAmount}
                      step="0.01"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder={`Máximo: ${formatCurrency(remainingAmount)}`}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fecha de Pago *
                    </label>
                    <input
                      type="date"
                      name="paymentDate"
                      value={paymentData.paymentDate}
                      onChange={handlePaymentInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Método de Pago *
                    </label>
                    <select
                      name="paymentMethod"
                      value={paymentData.paymentMethod}
                      onChange={handlePaymentInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <optgroup label="🏦 Cuentas Bancarias">
                        {PAYMENT_METHODS_GROUPED.bank.map((method) => (
                          <option key={method.value} value={method.value}>
                            {method.label}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="💳 Tarjetas">
                        {PAYMENT_METHODS_GROUPED.card.map((method) => (
                          <option key={method.value} value={method.value}>
                            {method.label}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="🌐 Pagos Online">
                        {PAYMENT_METHODS_GROUPED.online.map((method) => (
                          <option key={method.value} value={method.value}>
                            {method.label}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="💰 Otros Métodos">
                        {PAYMENT_METHODS_GROUPED.other.map((method) => (
                          <option key={method.value} value={method.value}>
                            {method.label}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Número de Referencia
                    </label>
                    <input
                      type="text"
                      name="referenceNumber"
                      value={paymentData.referenceNumber}
                      onChange={handlePaymentInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Ej: TRANS-12345"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notas
                    </label>
                    <textarea
                      name="notes"
                      value={paymentData.notes}
                      onChange={handlePaymentInputChange}
                      rows="2"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Notas adicionales sobre el pago..."
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    disabled={loading}
                  >
                    <FaCheckCircle />
                    {loading ? 'Procesando...' : 'Confirmar Pago'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPaymentForm(false)}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    disabled={loading}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SupplierInvoiceDetail;
