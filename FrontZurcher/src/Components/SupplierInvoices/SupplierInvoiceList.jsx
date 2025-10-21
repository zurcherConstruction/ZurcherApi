import React from 'react';
import { FaEye, FaEdit, FaTrash, FaClock, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import LoadingSpinner from '../LoadingSpinner';

const SupplierInvoiceList = ({ invoices, loading, onView, onEdit }) => {
  if (loading) {
    return <LoadingSpinner />;
  }

  // Asegurar que invoices sea un array
  const invoicesArray = Array.isArray(invoices) ? invoices : [];

  if (invoicesArray.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-12 text-center">
        <div className="text-gray-400 text-6xl mb-4">📄</div>
        <h3 className="text-xl font-semibold text-gray-700 mb-2">
          No hay invoices registrados
        </h3>
        <p className="text-gray-500">
          Comienza creando un nuevo invoice de proveedor
        </p>
      </div>
    );
  }

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
      paid: 'Pagado',
      overdue: 'Vencido',
      cancelled: 'Cancelado',
    };
    return texts[status] || status;
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      partial: 'bg-blue-100 text-blue-800',
      paid: 'bg-green-100 text-green-800',
      overdue: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

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

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Número Invoice
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Proveedor
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fecha
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Vencimiento
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Monto Total
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Pagado
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {invoicesArray.map((invoice) => (
              <tr
                key={invoice.idSupplierInvoice}
                className="hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => onView(invoice)}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {invoice.invoiceNumber}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{invoice.vendor || '-'}</div>
                  {invoice.vendorCuit && (
                    <div className="text-xs text-gray-500">
                      CUIT: {invoice.vendorCuit}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {formatDate(invoice.issueDate)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {formatDate(invoice.dueDate)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <div className="text-sm font-semibold text-gray-900">
                    {formatCurrency(invoice.totalAmount)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <div className="text-sm text-gray-900">
                    {formatCurrency(invoice.paidAmount)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                      invoice.paymentStatus
                    )}`}
                  >
                    {getStatusIcon(invoice.paymentStatus)}
                    {getStatusText(invoice.paymentStatus)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onView(invoice);
                      }}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Ver detalles"
                    >
                      <FaEye />
                    </button>
                    {invoice.paymentStatus !== 'paid' && invoice.paymentStatus !== 'cancelled' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(invoice);
                        }}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <FaEdit />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SupplierInvoiceList;
