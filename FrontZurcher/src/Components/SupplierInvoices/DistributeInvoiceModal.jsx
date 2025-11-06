import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import api from '../../utils/axios';
import { supplierInvoiceActions } from '../../Redux/Actions/supplierInvoiceActions';
import { PAYMENT_METHODS_GROUPED } from '../../utils/paymentConstants';
import {
  XMarkIcon,
  PlusIcon,
  TrashIcon,
  DocumentArrowUpIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

const DistributeInvoiceModal = ({ invoice, onClose, onSuccess }) => {
  const dispatch = useDispatch();
  const [works, setWorks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingWorks, setLoadingWorks] = useState(true);
  
  // Estado para la distribución
  const [distribution, setDistribution] = useState([
    { idWork: '', propertyAddress: '', amount: '', notes: '' }
  ]);
  
  // Estado para el pago
  const [paymentData, setPaymentData] = useState({
    paymentMethod: 'Chase Bank',
    paymentDate: (() => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    })(),
    referenceNumber: '',
  });

  // Estado para el receipt
  const [receipt, setReceipt] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);

  // Cargar lista de works activos
  useEffect(() => {
    loadWorks();
  }, []);

  const loadWorks = async () => {
    setLoadingWorks(true);
    try {
      const response = await api.get('/work');
      if (!response.data.error) {
        // Filtrar solo works activos
        const activeWorks = response.data.filter(w => w.status !== 'completed' && w.status !== 'cancelled');
        setWorks(activeWorks);
      }
    } catch (error) {
      console.error('Error cargando works:', error);
    }
    setLoadingWorks(false);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
    }).format(amount || 0);
  };

  // Calcular total distribuido
  const getTotalDistributed = () => {
    return distribution.reduce((sum, item) => {
      const amount = parseFloat(item.amount) || 0;
      return sum + amount;
    }, 0);
  };

  // Calcular saldo restante
  const getRemainingAmount = () => {
    const remaining = parseFloat(invoice.totalAmount) - getTotalDistributed();
    return remaining;
  };

  // Verificar si la distribución es válida
  const isDistributionValid = () => {
    // Al menos un work seleccionado
    if (distribution.length === 0) return false;
    
    // Todos los works deben tener ID y monto
    const allValid = distribution.every(item => {
      return item.idWork && parseFloat(item.amount) > 0;
    });
    
    if (!allValid) return false;
    
    // El total debe coincidir con el invoice
    const remaining = Math.abs(getRemainingAmount());
    return remaining < 0.01; // Tolerancia de 1 centavo por redondeos
  };

  // Agregar nueva línea de distribución
  const handleAddDistribution = () => {
    setDistribution([
      ...distribution,
      { idWork: '', propertyAddress: '', amount: '', notes: '' }
    ]);
  };

  // Eliminar línea de distribución
  const handleRemoveDistribution = (index) => {
    if (distribution.length > 1) {
      const newDistribution = distribution.filter((_, i) => i !== index);
      setDistribution(newDistribution);
    }
  };

  // Actualizar campo de distribución
  const handleDistributionChange = (index, field, value) => {
    const newDistribution = [...distribution];
    
    if (field === 'idWork') {
      const selectedWork = works.find(w => w.idWork === value);
      newDistribution[index].idWork = value;
      newDistribution[index].propertyAddress = selectedWork?.propertyAddress || '';
    } else {
      newDistribution[index][field] = value;
    }
    
    setDistribution(newDistribution);
  };

  // Manejar selección de receipt
  const handleReceiptChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setReceipt(file);
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
  };

  // Distribuir automáticamente el monto de forma equitativa
  const handleDistributeEqually = () => {
    const validDistributions = distribution.filter(d => d.idWork);
    if (validDistributions.length === 0) {
      alert('Selecciona al menos un trabajo antes de distribuir');
      return;
    }

    const amountPerWork = (parseFloat(invoice.totalAmount) / validDistributions.length).toFixed(2);
    
    const newDistribution = distribution.map(item => {
      if (item.idWork) {
        return { ...item, amount: amountPerWork };
      }
      return item;
    });

    setDistribution(newDistribution);
  };

  // Enviar distribución al backend
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isDistributionValid()) {
      alert('La distribución no es válida. Verifica que todos los campos estén completos y el total coincida.');
      return;
    }

    if (!receipt) {
      if (!window.confirm('No has subido un comprobante. ¿Deseas continuar sin comprobante?')) {
        return;
      }
    }

    setLoading(true);

    try {
      // Crear FormData para enviar archivo y datos
      const formData = new FormData();
      
      // Agregar datos de distribución
      formData.append('distribution', JSON.stringify(distribution));
      formData.append('paymentMethod', paymentData.paymentMethod);
      formData.append('paymentDate', paymentData.paymentDate);
      formData.append('referenceNumber', paymentData.referenceNumber);
      
      // Agregar receipt si existe
      if (receipt) {
        formData.append('receipt', receipt);
      }

      // Llamar al endpoint de distribución
      const response = await supplierInvoiceActions.distributeToWorks(
        invoice.idSupplierInvoice,
        formData
      );

      if (response.error) {
        alert('Error al distribuir el invoice: ' + response.message);
      } else {
        alert(`✅ Invoice distribuido exitosamente!\n\n${response.expensesCreated} gastos creados en ${response.worksUpdated} trabajos.`);
        onSuccess();
        onClose();
      }
    } catch (error) {
      console.error('Error distribuyendo invoice:', error);
      alert('Error al distribuir el invoice');
    }

    setLoading(false);
  };

  const remaining = getRemainingAmount();
  const isValid = isDistributionValid();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">
              Distribuir Invoice entre Trabajos
            </h2>
            <p className="text-blue-100 text-sm mt-1">
              Invoice #{invoice.invoiceNumber} - {invoice.vendor}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
            disabled={loading}
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Resumen del Invoice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-gray-600">Total del Invoice:</span>
                <p className="text-xl font-bold text-blue-900">{formatCurrency(invoice.totalAmount)}</p>
              </div>
              <div>
                <span className="text-sm text-gray-600">Total Distribuido:</span>
                <p className={`text-xl font-bold ${isValid ? 'text-green-600' : 'text-orange-600'}`}>
                  {formatCurrency(getTotalDistributed())}
                </p>
              </div>
            </div>
            
            {!isValid && (
              <div className="mt-3 flex items-center gap-2 text-sm">
                {remaining > 0.01 ? (
                  <div className="text-orange-600 flex items-center gap-2">
                    <ExclamationTriangleIcon className="h-5 w-5" />
                    Falta distribuir: {formatCurrency(remaining)}
                  </div>
                ) : remaining < -0.01 ? (
                  <div className="text-red-600 flex items-center gap-2">
                    <ExclamationTriangleIcon className="h-5 w-5" />
                    Excede por: {formatCurrency(Math.abs(remaining))}
                  </div>
                ) : null}
              </div>
            )}
            
            {isValid && (
              <div className="mt-3 flex items-center gap-2 text-green-600 text-sm font-medium">
                <CheckCircleIcon className="h-5 w-5" />
                Distribución completa y válida
              </div>
            )}
          </div>

          {/* Lista de distribuciones */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800">Distribuir entre trabajos:</h3>
              <button
                type="button"
                onClick={handleDistributeEqually}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Distribuir equitativamente
              </button>
            </div>

            <div className="space-y-3">
              {distribution.map((item, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                    {/* Selector de Work */}
                    <div className="md:col-span-5">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Trabajo / Property Address
                      </label>
                      <select
                        value={item.idWork}
                        onChange={(e) => handleDistributionChange(index, 'idWork', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        required
                        disabled={loadingWorks}
                      >
                        <option value="">Seleccionar trabajo...</option>
                        {works.map(work => {
                          const clientName = work.client?.name || 'Sin cliente';
                          return (
                            <option key={work.idWork} value={work.idWork}>
                              {work.propertyAddress} - {clientName}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {/* Monto */}
                    <div className="md:col-span-3">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Monto
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.amount}
                        onChange={(e) => handleDistributionChange(index, 'amount', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        placeholder="0.00"
                        required
                      />
                    </div>

                    {/* Notas */}
                    <div className="md:col-span-3">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Notas (opcional)
                      </label>
                      <input
                        type="text"
                        value={item.notes}
                        onChange={(e) => handleDistributionChange(index, 'notes', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        placeholder="Descripción..."
                      />
                    </div>

                    {/* Botón eliminar */}
                    <div className="md:col-span-1 flex items-end">
                      <button
                        type="button"
                        onClick={() => handleRemoveDistribution(index)}
                        className="w-full p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={distribution.length === 1}
                        title="Eliminar"
                      >
                        <TrashIcon className="h-5 w-5 mx-auto" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Botón agregar */}
            <button
              type="button"
              onClick={handleAddDistribution}
              className="mt-3 w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
            >
              <PlusIcon className="h-5 w-5" />
              Agregar trabajo
            </button>
          </div>

          {/* Datos de pago */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h3 className="font-semibold text-gray-800 mb-3">Información del pago:</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Método de pago */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Método de pago
                </label>
                <select
                  value={paymentData.paymentMethod}
                  onChange={(e) => setPaymentData({ ...paymentData, paymentMethod: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  {Object.entries(PAYMENT_METHODS_GROUPED).map(([group, methods]) => (
                    <optgroup key={group} label={group}>
                      {methods.map(method => (
                        <option key={method.value} value={method.value}>{method.label}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              {/* Fecha de pago */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de pago
                </label>
                <input
                  type="date"
                  value={paymentData.paymentDate}
                  onChange={(e) => setPaymentData({ ...paymentData, paymentDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Referencia */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Referencia (opcional)
                </label>
                <input
                  type="text"
                  value={paymentData.referenceNumber}
                  onChange={(e) => setPaymentData({ ...paymentData, referenceNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="# Cheque, confirmación..."
                />
              </div>
            </div>
          </div>

          {/* Upload Receipt */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h3 className="font-semibold text-gray-800 mb-3">Comprobante de pago:</h3>
            
            <div className="flex items-center gap-4">
              <label className="flex-1">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 transition-colors cursor-pointer">
                  <DocumentArrowUpIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">
                    {receipt ? receipt.name : 'Click para subir comprobante (opcional)'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG (max 5MB)</p>
                </div>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleReceiptChange}
                  className="hidden"
                />
              </label>

              {receiptPreview && (
                <div className="w-32 h-32 border rounded-lg overflow-hidden">
                  <img src={receiptPreview} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            {receipt && (
              <button
                type="button"
                onClick={() => {
                  setReceipt(null);
                  setReceiptPreview(null);
                }}
                className="mt-2 text-sm text-red-600 hover:text-red-700"
              >
                Eliminar comprobante
              </button>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="border-t bg-gray-50 px-6 py-4 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
            disabled={loading}
          >
            Cancelar
          </button>
          
          <button
            onClick={handleSubmit}
            disabled={!isValid || loading}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Procesando...
              </>
            ) : (
              <>
                <CheckCircleIcon className="h-5 w-5" />
                Generar Gastos y Pagar Invoice
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DistributeInvoiceModal;
