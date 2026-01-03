import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../../utils/axios';
import {
  XMarkIcon,
  CalendarDaysIcon,
  BanknotesIcon,
  DocumentTextIcon,
  TrashIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ReceiptPercentIcon
} from '@heroicons/react/24/outline';

/**
 * 📊 FixedExpensePaymentHistory
 * 
 * Muestra historial de pagos de un gasto fijo específico
 * Incluye: período, monto, fecha, recibo, estado
 */
const FixedExpensePaymentHistory = ({ isOpen, expense, onClose }) => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });

  useEffect(() => {
    if (isOpen && expense?.idFixedExpense) {
      loadPaymentHistory();
    }
  }, [isOpen, expense?.idFixedExpense, pagination.page]);

  const loadPaymentHistory = async () => {
    try {
      setLoading(true);
      const response = await api.get(
        `/fixed-expenses/${expense.idFixedExpense}/payments?page=${pagination.page}&limit=${pagination.limit}`
      );

      // La respuesta contiene los datos directamente (sin wrapper de success)
      const data = response.data;
      console.log('💰 Respuesta completa de pagos:', data);
      console.log('📋 Pagos recibidos:', data.payments);
      console.log('📎 Receipts en pagos:', data.payments?.map(p => ({
        idPayment: p.idPayment,
        receipts: p.receipts,
        receiptUrl: p.receiptUrl
      })));
      
      setPayments(data.payments || []);
      setPagination({
        page: data.pagination?.page || 1,
        limit: data.pagination?.limit || 10,
        total: data.pagination?.total || 0,
        pages: data.pagination?.pages || 0
      });
    } catch (error) {
      console.error('Error loading payment history:', error);
      toast.error('Error al cargar historial de pagos');
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePayment = async (paymentId) => {
    if (!window.confirm('¿Eliminar este pago? Se revertirá la transacción bancaria.')) {
      return;
    }

    try {
      await api.delete(`/fixed-expenses/payments/${paymentId}`);
      toast.success('Pago eliminado');
      loadPaymentHistory();
    } catch (error) {
      toast.error('Error al eliminar pago');
      console.error('Error deleting payment:', error);
    }
  };

  const handleNextPage = () => {
    if (pagination.page < pagination.pages) {
      setPagination({...pagination, page: pagination.page + 1});
    }
  };

  const handlePrevPage = () => {
    if (pagination.page > 1) {
      setPagination({...pagination, page: pagination.page - 1});
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    // 🔴 CRITICAL: NO usar new Date(dateStr) porque interpreta en timezone local
    // Primero, limpiar la fecha
    let cleanDateStr = dateStr;
    // Si incluye 'T' (ISO format), tomar solo la parte de fecha
    if (typeof cleanDateStr === 'string' && cleanDateStr.includes('T')) {
      cleanDateStr = cleanDateStr.split('T')[0];
    }
    // Convertir a string si no lo es
    if (typeof cleanDateStr !== 'string') {
      cleanDateStr = cleanDateStr.toISOString().split('T')[0];
    }
    // Parsear manualmente: YYYY-MM-DD
    const [year, month, day] = cleanDateStr.split('-').map(Number);
    if (!year || !month || !day) return dateStr; // Fallback
    // Crear Date en UTC para que no descuente un día
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.toLocaleDateString('es-ES', { 
      year: 'numeric', 
      month: 'short', 
      day: '2-digit',
      timeZone: 'UTC'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 flex justify-between items-center rounded-t-lg">
          <div>
            <h2 className="text-2xl font-bold">{expense.name}</h2>
            <p className="text-blue-100 text-sm">Historial de Pagos</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-blue-700 rounded-lg transition"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-12">
              <DocumentTextIcon className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 text-lg">No hay pagos registrados</p>
            </div>
          ) : (
            <div className="space-y-3">
              {payments.map((payment) => (
                <PaymentRow
                  key={payment.idPayment}
                  payment={payment}
                  onDelete={() => handleDeletePayment(payment.idPayment)}
                  formatCurrency={formatCurrency}
                  formatDate={formatDate}
                />
              ))}
            </div>
          )}
        </div>

        {/* Paginación */}
        {!loading && payments.length > 0 && pagination.pages > 1 && (
          <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-between items-center rounded-b-lg">
            <div className="text-sm text-gray-600">
              Página {pagination.page} de {pagination.pages} ({pagination.total} total)
            </div>
            <div className="flex gap-2">
              <button
                onClick={handlePrevPage}
                disabled={pagination.page === 1}
                className="p-2 hover:bg-gray-200 disabled:opacity-50 rounded-lg transition"
              >
                <ChevronLeftIcon className="h-5 w-5" />
              </button>
              <button
                onClick={handleNextPage}
                disabled={pagination.page === pagination.pages}
                className="p-2 hover:bg-gray-200 disabled:opacity-50 rounded-lg transition"
              >
                <ChevronRightIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}

        {/* Si hay contenido y paginación */}
        {!loading && payments.length > 0 && pagination.pages === 1 && (
          <div className="bg-gray-50 border-t border-gray-200 px-6 py-3 rounded-b-lg text-sm text-gray-600 text-center">
            Total: {pagination.total} pago(s)
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================
// COMPONENTE: Fila de Pago
// ============================================================

function PaymentRow({ payment, onDelete, formatCurrency, formatDate }) {
  const [showReceipt, setShowReceipt] = useState(false);

  console.log(`🔍 PaymentRow para ${payment.idPayment}:`, {
    hasReceiptUrl: !!payment.receiptUrl,
    hasReceipts: !!payment.receipts,
    receiptsLength: payment.receipts?.length || 0,
    receipts: payment.receipts
  });

  return (
    <div className="bg-white border border-gray-200 rounded-lg hover:shadow-md transition p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-3">
        {/* Período */}
        <div className="flex items-start gap-2">
          <CalendarDaysIcon className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-medium text-gray-600 uppercase">Período</p>
            <p className="text-sm font-bold text-gray-900">{payment.periodDescription}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Vence: {formatDate(payment.periodDueDate)}
            </p>
          </div>
        </div>

        {/* Monto */}
        <div className="flex items-start gap-2">
          <BanknotesIcon className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-medium text-gray-600 uppercase">Monto Pagado</p>
            <p className="text-sm font-bold text-green-700">{formatCurrency(payment.amount)}</p>
          </div>
        </div>

        {/* Fecha de Pago */}
        <div className="flex items-start gap-2">
          <CheckCircleIcon className="h-5 w-5 text-indigo-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-medium text-gray-600 uppercase">Fecha de Pago</p>
            <p className="text-sm font-bold text-gray-900">{formatDate(payment.paymentDate)}</p>
          </div>
        </div>

        {/* Método de Pago */}
        <div className="flex items-start gap-2">
          <ReceiptPercentIcon className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-medium text-gray-600 uppercase">Método</p>
            <p className="text-sm font-bold text-gray-900">{payment.paymentMethod || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Detalles adicionales */}
      {(payment.notes || payment.receiptUrl || (payment.receipts && payment.receipts.length > 0)) && (
        <div className="border-t border-gray-100 pt-3 mt-3 space-y-2 text-sm">
          {payment.notes && (
            <p className="text-gray-700">
              <span className="font-medium">Notas:</span> {payment.notes}
            </p>
          )}
          
          {/* 🆕 Mostrar receipts del Expense */}
          {payment.receipts && payment.receipts.length > 0 && (
            <div>
              <button
                onClick={() => setShowReceipt(!showReceipt)}
                className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
              >
                <DocumentTextIcon className="h-4 w-4" />
                {showReceipt ? 'Ocultar' : 'Ver'} Comprobante ({payment.receipts.length})
              </button>
              {showReceipt && (
                <div className="mt-2 space-y-2">
                  {payment.receipts.map((receipt, idx) => (
                    <div key={receipt.idReceipt} className="border border-gray-200 rounded overflow-hidden bg-gray-50">
                      {/* Check if PDF or image based on mime type or URL */}
                      {receipt.mimeType === 'application/pdf' || receipt.fileUrl.toLowerCase().includes('/pdf/') || receipt.fileUrl.toLowerCase().endsWith('.pdf') ? (
                        // PDF Preview using Google Docs Viewer
                        <iframe
                          src={`https://docs.google.com/gview?url=${encodeURIComponent(receipt.fileUrl)}&embedded=true`}
                          title={`Comprobante PDF ${idx + 1}`}
                          width="100%"
                          height="400px"
                          allow="autoplay"
                        >
                          <p className="p-4 text-center text-gray-600">
                            No se pudo cargar la vista previa del PDF. 
                            <a 
                              href={receipt.fileUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-700 ml-1"
                            >
                              Descargar
                            </a>
                          </p>
                        </iframe>
                      ) : receipt.mimeType?.startsWith('image/') ? (
                        // Image Preview
                        <img
                          src={receipt.fileUrl}
                          alt={receipt.originalName || `Comprobante ${idx + 1}`}
                          className="max-w-full h-auto"
                        />
                      ) : (
                        // Other file types
                        <div className="p-4 text-center text-gray-600">
                          <DocumentTextIcon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                          <p className="text-sm">Archivo: {receipt.originalName || `Comprobante ${idx + 1}`}</p>
                          <a 
                            href={receipt.fileUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700 text-sm mt-1 inline-block"
                          >
                            Descargar archivo
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Fallback: si hay receiptUrl directo en el pago (para compatibilidad) */}
          {payment.receiptUrl && (!payment.receipts || payment.receipts.length === 0) && (
            <div>
              <button
                onClick={() => setShowReceipt(!showReceipt)}
                className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
              >
                <DocumentTextIcon className="h-4 w-4" />
                {showReceipt ? 'Ocultar' : 'Ver'} Comprobante
              </button>
              {showReceipt && (
                <div className="mt-2 border border-gray-200 rounded overflow-hidden bg-gray-50">
                  {/* Check if PDF or image based on URL */}
                  {payment.receiptUrl.toLowerCase().includes('/pdf/') || payment.receiptUrl.toLowerCase().endsWith('.pdf') ? (
                    // PDF Preview using Google Docs Viewer
                    <iframe
                      src={`https://docs.google.com/gview?url=${encodeURIComponent(payment.receiptUrl)}&embedded=true`}
                      title="Comprobante PDF"
                      width="100%"
                      height="400px"
                      allow="autoplay"
                    >
                      <p className="p-4 text-center text-gray-600">
                        No se pudo cargar la vista previa del PDF. 
                        <a 
                          href={payment.receiptUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-700 ml-1"
                        >
                          Descargar archivo
                        </a>
                      </p>
                    </iframe>
                  ) : (
                    // Image Preview
                    <img
                      src={payment.receiptUrl}
                      alt="Comprobante"
                      className="max-w-full h-auto"
                    />
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Acciones */}
      <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-gray-100">
        <button
          onClick={() => onDelete()}
          className="px-3 py-1.5 bg-red-50 text-red-700 rounded hover:bg-red-100 transition text-xs font-medium flex items-center gap-1"
        >
          <TrashIcon className="h-4 w-4" />
          Eliminar
        </button>
      </div>
    </div>
  );
}

export default FixedExpensePaymentHistory;
