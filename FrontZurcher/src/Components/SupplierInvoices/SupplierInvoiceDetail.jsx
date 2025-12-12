import React, { useState, useEffect } from 'react';
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
  FaEye,
  FaProjectDiagram,
} from 'react-icons/fa';
import { XMarkIcon } from '@heroicons/react/24/outline';
import DistributeInvoiceModal from './DistributeInvoiceModal';

// Modal para ver PDF
const PdfModal = ({ isOpen, onClose, pdfUrl, title }) => {
  if (!isOpen || !pdfUrl) {
    return null;
  }

  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;
  const isMobile = screenWidth < 768;
  const isTablet = screenWidth >= 768 && screenWidth < 1024;
  const isLarge = screenWidth >= 1024;
  
  const isIPadPro = (screenWidth === 1024 && screenHeight === 1366) || 
                    (screenWidth === 1366 && screenHeight === 1024) ||
                    navigator.userAgent.includes('iPad');

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[9999]"
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        padding: isIPadPro ? '20px' : (isMobile ? '8px' : '16px')
      }}
    >
      <div 
        className="bg-white rounded-lg shadow-2xl flex flex-col overflow-hidden"
        style={{
          width: isIPadPro ? '90vw' : (isLarge ? '85vw' : isTablet ? '85vw' : '95vw'),
          height: isIPadPro ? '85vh' : (isLarge ? '80vh' : isTablet ? '88vh' : '96vh'),
          maxWidth: 'none',
          maxHeight: 'none',
          margin: 'auto'
        }}
      >
        <div className="flex justify-between items-center p-3 sm:p-4 md:p-5 lg:p-6 border-b border-gray-200 bg-gray-50 flex-shrink-0">
          <h3 className="text-sm sm:text-base md:text-lg lg:text-xl font-semibold text-gray-800 truncate pr-2 max-w-[70%]">
            {title || "Vista Previa del Comprobante"}
          </h3>
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {(isMobile || isTablet) && (
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 text-xs sm:text-sm md:text-base underline whitespace-nowrap font-medium"
              >
                Nueva pestaña
              </a>
            )}
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 hover:bg-gray-200 p-1.5 sm:p-2 rounded-full transition-colors"
            >
              <XMarkIcon className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7" />
            </button>
          </div>
        </div>
        
        <div className="flex-grow overflow-hidden relative bg-gray-100">
          {pdfUrl.includes('.pdf') || pdfUrl.includes('/raw/') ? (
            // Si es PDF raw de Cloudinary, usar Google Docs Viewer
            <iframe
              src={`https://docs.google.com/viewer?url=${encodeURIComponent(pdfUrl)}&embedded=true`}
              className="w-full h-full border-0"
              title={title || "Comprobante"}
            />
          ) : (
            // Si es imagen, mostrar directamente
            <div className="w-full h-full flex items-center justify-center overflow-auto p-4">
              <img
                src={pdfUrl}
                alt={title || "Comprobante"}
                className="max-w-full max-h-full object-contain"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const SupplierInvoiceDetail = ({ invoice, onClose, onEdit }) => {
  const dispatch = useDispatch();
  const [currentInvoice, setCurrentInvoice] = useState(invoice);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [showDistributeModal, setShowDistributeModal] = useState(false);
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

  // Sincronizar con el invoice prop cuando cambie
  useEffect(() => {
    setCurrentInvoice(invoice);
  }, [invoice]);

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

  const remainingAmount = parseFloat(currentInvoice.totalAmount) - parseFloat(currentInvoice.paidAmount || 0);
  const canRegisterPayment = currentInvoice.paymentStatus !== 'paid' && currentInvoice.paymentStatus !== 'cancelled';
  const canEdit = currentInvoice.paymentStatus !== 'paid' && currentInvoice.paymentStatus !== 'cancelled';

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
      currentInvoice.idSupplierInvoice,
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
      
      // Actualizar el estado local inmediatamente con la respuesta del backend
      setCurrentInvoice(response);
      
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

    const response = await supplierInvoiceActions.delete(currentInvoice.idSupplierInvoice);

    if (response.error) {
      dispatch(deleteSupplierInvoiceFailure(response.message));
      alert('Error al eliminar: ' + response.message);
    } else {
      dispatch(deleteSupplierInvoiceSuccess(currentInvoice.idSupplierInvoice));
      alert('Invoice eliminado exitosamente');
      onClose();
    }

    setLoading(false);
  };

  const handleDistributeSuccess = () => {
    // Recargar el invoice actualizado
    setShowDistributeModal(false);
    // El modal ya actualizará el estado automáticamente
    // Cerrar después de 1 segundo para que el usuario vea el estado actualizado
    setTimeout(() => {
      onClose();
    }, 1000);
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
                Invoice {currentInvoice.invoiceNumber}
              </h2>
              <p className="text-blue-100 text-sm">
                {currentInvoice.vendor}
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
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border ${getStatusColor(currentInvoice.paymentStatus)}`}>
            {getStatusIcon(currentInvoice.paymentStatus)}
            <span className="font-semibold">{getStatusText(currentInvoice.paymentStatus)}</span>
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
                <div className="font-semibold text-gray-900">{currentInvoice.invoiceNumber}</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <FaBuilding className="text-gray-400 mt-1" />
              <div>
                <div className="text-sm text-gray-600">Proveedor</div>
                <div className="font-semibold text-gray-900">{currentInvoice.vendor}</div>
                {currentInvoice.vendorCuit && (
                  <div className="text-sm text-gray-500">CUIT: {currentInvoice.vendorCuit}</div>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <FaCalendarAlt className="text-gray-400 mt-1" />
              <div>
                <div className="text-sm text-gray-600">Fecha del Invoice</div>
                <div className="font-semibold text-gray-900">{formatDate(currentInvoice.issueDate)}</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <FaCalendarAlt className="text-gray-400 mt-1" />
              <div>
                <div className="text-sm text-gray-600">Fecha de Vencimiento</div>
                <div className="font-semibold text-gray-900">{formatDate(currentInvoice.dueDate)}</div>
              </div>
            </div>

            {currentInvoice.description && (
              <div>
                <div className="text-sm text-gray-600 mb-1">Descripción</div>
                <div className="text-gray-900">{currentInvoice.description}</div>
              </div>
            )}

            {/* Comprobante del Invoice */}
            {currentInvoice.invoicePdfPath && (
              <div>
                <div className="text-sm text-gray-600 mb-2">Comprobante</div>
                <button
                  onClick={() => {
                    console.log('📄 Abriendo PDF Modal. URL:', currentInvoice.invoicePdfPath);
                    setShowPdfModal(true);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <FaEye />
                  Ver Comprobante
                </button>
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
                {formatCurrency(currentInvoice.totalAmount)}
              </div>
            </div>

            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <FaCheckCircle className="text-green-600" />
                <span className="text-sm text-gray-600">Monto Pagado</span>
              </div>
              <div className="text-2xl font-bold text-green-900">
                {formatCurrency(currentInvoice.paidAmount || 0)}
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
                {(currentInvoice.items || currentInvoice.SupplierInvoiceItems || [])?.map((item, index) => (
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

        {/* 🆕 Trabajos Vinculados (si existen) */}
        {currentInvoice.linkedWorks && currentInvoice.linkedWorks.length > 0 && (
          <div className="mb-6 bg-blue-50 rounded-lg p-4 border border-blue-200">
            <h3 className="text-lg font-semibold text-blue-900 mb-3 flex items-center gap-2">
              <FaProjectDiagram className="text-blue-600" />
              Trabajos Vinculados ({currentInvoice.linkedWorks.length})
            </h3>
            <p className="text-sm text-blue-700 mb-3">
              Al registrar el pago, se crearán automáticamente gastos distribuidos equitativamente entre estos trabajos.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {currentInvoice.linkedWorks.map((work) => (
                <div key={work.idWork} className="bg-white rounded p-3 border border-blue-200">
                  <div className="text-sm font-medium text-gray-900">📍 {work.propertyAddress}</div>
                  <div className="text-xs text-blue-600 mt-1">
                    ${(currentInvoice.totalAmount / currentInvoice.linkedWorks.length).toFixed(2)} por trabajo
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 🚫 SECCIÓN DE PAGO REMOVIDA - Ahora solo se paga desde "Vista por Proveedores" */}
        {/* El pago se gestiona con las 3 opciones nuevas: vincular existentes, crear con works, o crear general */}

        {/* Botón para ir a Vista por Proveedores */}
        {canRegisterPayment && (
          <div className="border-t pt-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-gray-700 mb-3">
                💡 <strong>Para pagar este invoice:</strong> Ve a la pestaña "Vista por Proveedores" donde podrás:
              </p>
              <ul className="text-sm text-gray-600 ml-4 mb-3 list-disc">
                <li>Vincular a gastos existentes</li>
                <li>Crear gastos para obras específicas</li>
                <li>Crear un gasto general</li>
              </ul>
              <p className="text-xs text-gray-500">
                Puedes cerrar esta ventana y usar el nuevo flujo de pago simplificado.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Modal para ver PDF */}
      <PdfModal 
        isOpen={showPdfModal}
        onClose={() => {
          console.log('🔍 Cerrando PDF Modal. URL:', currentInvoice.invoicePdfPath);
          setShowPdfModal(false);
        }}
        pdfUrl={currentInvoice.invoicePdfPath}
        title={`Comprobante Invoice ${currentInvoice.invoiceNumber}`}
      />

      {/* Modal para distribuir invoice */}
      {showDistributeModal && (
        <DistributeInvoiceModal
          invoice={currentInvoice}
          onClose={() => setShowDistributeModal(false)}
          onSuccess={handleDistributeSuccess}
        />
      )}
    </div>
  );
};

export default SupplierInvoiceDetail;
