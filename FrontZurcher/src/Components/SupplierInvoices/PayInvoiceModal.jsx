import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { FaTimes, FaLink, FaBriefcase, FaGlobe, FaCheckCircle, FaEye, FaFileInvoiceDollar } from 'react-icons/fa';
import LoadingSpinner from '../LoadingSpinner';

const PayInvoiceModal = ({ invoice, onClose, onSuccess }) => {
  const token = useSelector((state) => state.auth.token);
  const [paymentType, setPaymentType] = useState('link_existing'); // 'link_existing', 'create_with_works', 'create_general'
  const [paymentMethod, setPaymentMethod] = useState('Chase Bank');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentDetails, setPaymentDetails] = useState('');
  const [generalExpenseDescription, setGeneralExpenseDescription] = useState(''); // 🆕 Para gasto general
  const [receiptFile, setReceiptFile] = useState(null); // 🆕 Archivo de receipt
  const [showInvoiceViewer, setShowInvoiceViewer] = useState(false); // 🆕 Modal para ver invoice
  
  // Para link_existing
  const [availableExpenses, setAvailableExpenses] = useState([]);
  const [selectedExpenses, setSelectedExpenses] = useState([]);
  
  // Para create_with_works
  const [availableWorks, setAvailableWorks] = useState([]);
  const [distribution, setDistribution] = useState([]); // { workId, amount, description }
  const [workSearchTerm, setWorkSearchTerm] = useState(''); // 🆕 Para filtrar works
  
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (paymentType === 'link_existing') {
      fetchAvailableExpenses();
    } else if (paymentType === 'create_with_works') {
      fetchAvailableWorks();
    }
  }, [paymentType]);

  const fetchAvailableExpenses = async () => {
    try {
      setLoading(true);
      // Obtener expenses que estén unpaid (disponibles para vincular)
      const response = await fetch(`${import.meta.env.VITE_API_URL}/expense?paymentStatus=unpaid`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Error al cargar expenses');
      
      const data = await response.json();
      
      // ✅ Filtrar expenses que NO sean de:
      // - Tarjetas de crédito (Chase CC o AMEX)
      // - Gastos fijos
      const filteredExpenses = (data || []).filter(expense => {
        const paymentMethod = expense.paymentMethod?.toLowerCase() || '';
        const typeExpense = expense.typeExpense?.toLowerCase() || '';
        
        const isCreditCard = paymentMethod.includes('chase credit card') || 
                            paymentMethod.includes('amex');
        const isFixedExpense = typeExpense.includes('gasto fijo') || 
                              typeExpense.includes('fixed expense');
        
        return !isCreditCard && !isFixedExpense;
      });
      
      setAvailableExpenses(filteredExpenses);
    } catch (error) {
      console.error('Error:', error);
      alert('Error al cargar expenses disponibles');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableWorks = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${import.meta.env.VITE_API_URL}/work`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Error al cargar works');
      
      const data = await response.json();
      // Filtrar works activos
      const activeWorks = data.filter(w => !['completed', 'cancelled'].includes(w.status));
      setAvailableWorks(activeWorks || []);
    } catch (error) {
      console.error('Error:', error);
      alert('Error al cargar trabajos disponibles');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpenseSelection = (expenseId) => {
    setSelectedExpenses(prev => {
      if (prev.includes(expenseId)) {
        return prev.filter(id => id !== expenseId);
      } else {
        return [...prev, expenseId];
      }
    });
  };

  // 🆕 Agregar work a la lista de distribución
  const addWorkToList = (workId) => {
    if (!distribution.some(d => d.workId === workId)) {
      setDistribution(prev => [...prev, { workId, amount: 0, description: '' }]);
    }
  };

  // 🆕 Remover work de la lista
  const removeWorkFromList = (workId) => {
    setDistribution(prev => prev.filter(d => d.workId !== workId));
  };

  // 🆕 Distribuir equitativamente
  const distributeEqually = () => {
    if (distribution.length === 0) return;
    const amountPerWork = (parseFloat(invoice.totalAmount) / distribution.length).toFixed(2);
    setDistribution(prev => prev.map(d => ({
      ...d,
      amount: parseFloat(amountPerWork)
    })));
  };

  const updateDistributionAmount = (workId, amount) => {
    setDistribution(prev => {
      const updated = prev.map(d => 
        d.workId === workId ? { ...d, amount: parseFloat(amount) || 0 } : d
      );
      return updated;
    });
  };

  const updateDistributionDescription = (workId, description) => {
    setDistribution(prev => {
      const updated = prev.map(d => 
        d.workId === workId ? { ...d, description } : d
      );
      return updated;
    });
  };

  const getSelectedExpensesTotal = () => {
    return selectedExpenses.reduce((sum, expId) => {
      const expense = availableExpenses.find(e => e.idExpense === expId);
      return sum + (expense ? parseFloat(expense.amount) : 0);
    }, 0);
  };

  const getDistributionTotal = () => {
    return distribution.reduce((sum, d) => sum + d.amount, 0);
  };

  const validateForm = () => {
    if (!paymentMethod) {
      alert('Selecciona un método de pago');
      return false;
    }

    if (paymentType === 'link_existing') {
      if (selectedExpenses.length === 0) {
        alert('Selecciona al menos un expense para vincular');
        return false;
      }
      
      const total = getSelectedExpensesTotal();
      const invoiceTotal = parseFloat(invoice.totalAmount);
      if (Math.abs(total - invoiceTotal) > 0.01) {
        alert(`El total de expenses ($${total.toFixed(2)}) debe coincidir con el total del invoice ($${invoiceTotal.toFixed(2)})`);
        return false;
      }
    }

    if (paymentType === 'create_with_works') {
      if (distribution.length === 0) {
        alert('Agrega al menos un work');
        return false;
      }

      const total = getDistributionTotal();
      const invoiceTotal = parseFloat(invoice.totalAmount);
      if (Math.abs(total - invoiceTotal) > 0.01) {
        alert(`El total distribuido ($${total.toFixed(2)}) debe coincidir con el total del invoice ($${invoiceTotal.toFixed(2)})`);
        return false;
      }

      // Validar que todos los works tengan monto
      const hasZeroAmount = distribution.some(d => !d.amount || d.amount <= 0);
      if (hasZeroAmount) {
        alert('Todos los works deben tener un monto mayor a 0');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      setSubmitting(true);

      // 🆕 Usar FormData para enviar archivo y datos
      const formData = new FormData();
      formData.append('paymentType', paymentType);
      formData.append('paymentMethod', paymentMethod);
      formData.append('paymentDate', paymentDate);
      formData.append('paymentDetails', paymentDetails);

      // 🆕 Agregar receipt si existe
      if (receiptFile) {
        formData.append('receipt', receiptFile);
      }

      if (paymentType === 'link_existing') {
        formData.append('expenseIds', JSON.stringify(selectedExpenses));
      } else if (paymentType === 'create_with_works') {
        // Enviar el array de distribution con workId, amount y description
        formData.append('distribution', JSON.stringify(distribution));
      } else if (paymentType === 'create_general') {
        // Enviar descripción para gasto general
        formData.append('generalDescription', generalExpenseDescription);
      }

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/supplier-invoices/${invoice.idSupplierInvoice}/pay-v2`,
        {
          method: 'POST',
          headers: { 
            Authorization: `Bearer ${token}`
            // 🆕 NO enviar Content-Type, FormData lo establece automáticamente con boundary
          },
          body: formData
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al procesar el pago');
      }

      const result = await response.json();
      alert(`✅ Invoice pagado exitosamente!\n\n${result.message}`);
      onSuccess();
    } catch (error) {
      console.error('Error:', error);
      alert(`❌ Error: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount || 0);
  };

  const paymentMethods = [
    'Proyecto Septic BOFA',
    'Chase Bank',
    'AMEX',
    'Chase Credit Card',
    'Cheque',
    'Transferencia Bancaria',
    'Efectivo',
    'Zelle',
    'Tarjeta Débito',
    'PayPal',
    'Otro'
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-6 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Pagar Invoice</h2>
              <p className="text-green-100 mt-1">
                Invoice #{invoice.invoiceNumber} - {formatCurrency(invoice.totalAmount)}
              </p>
              <p className="text-green-50 text-sm mt-1">
                Proveedor: {invoice.vendor}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-green-100 transition-colors"
            >
              <FaTimes className="text-2xl" />
            </button>
          </div>
        </div>

        {/* 🆕 Vista del Invoice */}
        {invoice.invoicePdfPath ? (
          <div className="bg-blue-50 border-b border-blue-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FaFileInvoiceDollar className="text-blue-600 text-xl" />
                <span className="text-sm font-medium text-gray-700">
                  Comprobante del Invoice
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowInvoiceViewer(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
              >
                <FaEye />
                <span>Ver Invoice</span>
              </button>
            </div>
            {invoice.notes && (
              <p className="text-sm text-gray-600 mt-2">
                <strong>Descripción:</strong> {invoice.notes}
              </p>
            )}
          </div>
        ) : (
          <div className="bg-yellow-50 border-b border-yellow-200 p-4">
            <div className="flex items-center space-x-2">
              <FaFileInvoiceDollar className="text-yellow-600 text-xl" />
              <span className="text-sm font-medium text-gray-700">
                ⚠️ Este invoice no tiene comprobante adjunto (creado antes del nuevo sistema)
              </span>
            </div>
            {invoice.notes && (
              <p className="text-sm text-gray-600 mt-2">
                <strong>Descripción:</strong> {invoice.notes}
              </p>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Opciones de Tipo de Pago */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Tipo de Pago
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Opción 1: Vincular Existente */}
              <button
                type="button"
                onClick={() => setPaymentType('link_existing')}
                className={`p-4 border-2 rounded-lg transition-all ${
                  paymentType === 'link_existing'
                    ? 'border-green-600 bg-green-50 shadow-md'
                    : 'border-gray-200 hover:border-green-300'
                }`}
              >
                <FaLink className={`text-3xl mb-2 ${paymentType === 'link_existing' ? 'text-green-600' : 'text-gray-400'}`} />
                <h3 className="font-semibold text-gray-800">Vincular Existente</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Vincular a expense(s) ya creado(s)
                </p>
              </button>

              {/* Opción 2: Crear con Works */}
              <button
                type="button"
                onClick={() => setPaymentType('create_with_works')}
                className={`p-4 border-2 rounded-lg transition-all ${
                  paymentType === 'create_with_works'
                    ? 'border-green-600 bg-green-50 shadow-md'
                    : 'border-gray-200 hover:border-green-300'
                }`}
              >
                <FaBriefcase className={`text-3xl mb-2 ${paymentType === 'create_with_works' ? 'text-green-600' : 'text-gray-400'}`} />
                <h3 className="font-semibold text-gray-800">Crear con Works</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Crear expense(s) vinculado(s) a obra(s)
                </p>
              </button>

              {/* Opción 3: Gasto General */}
              <button
                type="button"
                onClick={() => setPaymentType('create_general')}
                className={`p-4 border-2 rounded-lg transition-all ${
                  paymentType === 'create_general'
                    ? 'border-green-600 bg-green-50 shadow-md'
                    : 'border-gray-200 hover:border-green-300'
                }`}
              >
                <FaGlobe className={`text-3xl mb-2 ${paymentType === 'create_general' ? 'text-green-600' : 'text-gray-400'}`} />
                <h3 className="font-semibold text-gray-800">Gasto General</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Crear expense sin vincular a obra
                </p>
              </button>
            </div>
          </div>

          {/* Formulario Dinámico según Tipo */}
          {loading ? (
            <LoadingSpinner />
          ) : (
            <>
              {/* OPCIÓN 1: Vincular a Expenses Existentes */}
              {paymentType === 'link_existing' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-800 mb-3">
                    Seleccionar Expense(s) a Vincular
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Selecciona los expenses que deseas pagar con este invoice. El total debe coincidir: {formatCurrency(invoice.totalAmount)}
                  </p>
                  
                  {availableExpenses.length === 0 ? (
                    <p className="text-gray-500 italic">No hay expenses disponibles para vincular</p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {availableExpenses.map(expense => (
                        <label
                          key={expense.idExpense}
                          className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                            selectedExpenses.includes(expense.idExpense)
                              ? 'border-green-500 bg-green-50'
                              : 'border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedExpenses.includes(expense.idExpense)}
                            onChange={() => toggleExpenseSelection(expense.idExpense)}
                            className="mr-3"
                          />
                          <div className="flex-1">
                            <p className="font-medium">{expense.typeExpense}</p>
                            <p className="text-sm text-gray-600">{expense.notes || 'Sin notas'}</p>
                          </div>
                          <p className="font-bold text-green-600">{formatCurrency(expense.amount)}</p>
                        </label>
                      ))}
                    </div>
                  )}

                  {selectedExpenses.length > 0 && (
                    <div className="mt-4 p-3 bg-white rounded border border-gray-200">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Total Seleccionado:</span>
                        <span className={`text-lg font-bold ${
                          Math.abs(getSelectedExpensesTotal() - parseFloat(invoice.totalAmount)) < 0.01
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}>
                          {formatCurrency(getSelectedExpensesTotal())}
                        </span>
                      </div>
                      <div className="flex justify-between items-center mt-1 text-sm text-gray-600">
                        <span>Requerido:</span>
                        <span>{formatCurrency(invoice.totalAmount)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* OPCIÓN 2: Crear con Works */}
              {paymentType === 'create_with_works' && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-800 mb-3">
                    Agregar Works y Distribución
                  </h3>

                  {/* Buscador de Works */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Buscar y Seleccionar Obra
                    </label>
                    <input
                      type="text"
                      value={workSearchTerm}
                      onChange={(e) => setWorkSearchTerm(e.target.value)}
                      placeholder="Buscar por dirección o ID..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent mb-2"
                    />
                    
                    {/* Lista de Works Filtrados */}
                    {workSearchTerm && (
                      <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg bg-white shadow-sm">
                        {availableWorks
                          .filter(w => {
                            // Filtrar works que ya están en la distribución
                            if (distribution.some(d => d.workId === w.idWork)) return false;
                            
                            // Filtrar por término de búsqueda
                            const searchLower = workSearchTerm.toLowerCase();
                            const addressMatch = w.propertyAddress?.toLowerCase().includes(searchLower);
                            const idMatch = w.idWork?.toString().includes(searchLower);
                            
                            return addressMatch || idMatch;
                          })
                          .map(work => (
                            <button
                              key={work.idWork}
                              type="button"
                              onClick={() => {
                                addWorkToList(work.idWork);
                                setWorkSearchTerm(''); // Limpiar búsqueda
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-purple-50 border-b border-gray-100 last:border-b-0 transition-colors"
                            >
                              <p className="text-sm font-medium text-gray-800">
                                {work.propertyAddress}
                              </p>
                              <p className="text-xs text-gray-500">
                                ID: {work.idWork} • Status: {work.status}
                              </p>
                            </button>
                          ))
                        }
                        {availableWorks.filter(w => {
                          if (distribution.some(d => d.workId === w.idWork)) return false;
                          const searchLower = workSearchTerm.toLowerCase();
                          return w.propertyAddress?.toLowerCase().includes(searchLower) || 
                                 w.idWork?.toString().includes(searchLower);
                        }).length === 0 && (
                          <div className="px-4 py-3 text-sm text-gray-500 text-center">
                            No se encontraron obras
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Lista de Works Agregados con Montos */}
                  {distribution.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold text-gray-700">Obras Seleccionadas</h4>
                        <button
                          type="button"
                          onClick={distributeEqually}
                          className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                        >
                          Distribuir Equitativamente
                        </button>
                      </div>

                      {/* Items */}
                      {distribution.map((dist, index) => {
                        const work = availableWorks.find(w => w.idWork === dist.workId);
                        return (
                          <div key={dist.workId} className="bg-white border border-gray-200 rounded-lg p-3">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-800">
                                  {index + 1}. {work?.propertyAddress}
                                </p>
                                <p className="text-xs text-gray-500">Status: {work?.status}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeWorkFromList(dist.workId)}
                                className="text-red-500 hover:text-red-700 ml-2"
                              >
                                <FaTimes />
                              </button>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <label className="text-sm text-gray-600 w-16">Monto:</label>
                                <div className="relative flex-1">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={dist.amount || ''}
                                    onChange={(e) => updateDistributionAmount(dist.workId, e.target.value)}
                                    className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    placeholder="0.00"
                                  />
                                </div>
                              </div>
                              <div className="flex items-start space-x-2">
                                <label className="text-sm text-gray-600 w-16 mt-2">Nota:</label>
                                <textarea
                                  value={dist.description || ''}
                                  onChange={(e) => updateDistributionDescription(dist.workId, e.target.value)}
                                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                                  placeholder="Descripción específica para este work (opcional)"
                                  rows="2"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {/* Resumen de Distribución */}
                      <div className="bg-purple-100 border border-purple-300 rounded-lg p-3 mt-3">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium text-gray-700">Total Distribuido:</span>
                          <span className={`text-lg font-bold ${
                            Math.abs(getDistributionTotal() - parseFloat(invoice.totalAmount)) < 0.01
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}>
                            {formatCurrency(getDistributionTotal())}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600">Total del Invoice:</span>
                          <span className="font-semibold text-gray-800">{formatCurrency(invoice.totalAmount)}</span>
                        </div>
                        {Math.abs(getDistributionTotal() - parseFloat(invoice.totalAmount)) >= 0.01 && (
                          <div className="flex justify-between items-center mt-2 text-sm">
                            <span className="text-red-600 font-medium">Diferencia:</span>
                            <span className="font-semibold text-red-600">
                              {formatCurrency(Math.abs(getDistributionTotal() - parseFloat(invoice.totalAmount)))}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Advertencia si no coincide */}
                      {Math.abs(getDistributionTotal() - parseFloat(invoice.totalAmount)) >= 0.01 && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start space-x-2">
                          <span className="text-red-600 text-lg">⚠️</span>
                          <p className="text-sm text-red-700">
                            La suma de los montos debe ser igual al total del invoice (${invoice.totalAmount})
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Mensaje si no hay works */}
                  {distribution.length === 0 && (
                    <div className="text-center py-6 text-gray-500 italic">
                      Selecciona una o más obras del listado superior
                    </div>
                  )}
                </div>
              )}

              {/* OPCIÓN 3: Gasto General */}
              {paymentType === 'create_general' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3 mb-3">
                    <FaCheckCircle className="text-green-600 text-2xl mt-1" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800">Gasto General</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Se creará un expense general por {formatCurrency(invoice.totalAmount)} sin vincular a ninguna obra específica.
                      </p>
                    </div>
                  </div>
                  
                  {/* Campo de Descripción */}
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Descripción del Gasto
                    </label>
                    <textarea
                      value={generalExpenseDescription}
                      onChange={(e) => setGeneralExpenseDescription(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                      placeholder="Ej: Materiales varios, Herramientas, etc."
                      rows="3"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Esta descripción se agregará a: {invoice.vendor} - Invoice #{invoice.invoiceNumber}
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Información de Pago */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Método de Pago *
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              >
                {paymentMethods.map(method => (
                  <option key={method} value={method}>{method}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha de Pago *
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Detalles del Pago (Opcional)
            </label>
            <input
              type="text"
              value={paymentDetails}
              onChange={(e) => setPaymentDetails(e.target.value)}
              placeholder="Ej: Check #1234, Últimos 4 dígitos: 5678, etc."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* 🆕 Campo para Receipt */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Receipt / Comprobante (Opcional)
            </label>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => setReceiptFile(e.target.files[0])}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
            />
            {receiptFile && (
              <p className="text-sm text-green-600 mt-2">
                ✓ Archivo seleccionado: {receiptFile.name}
              </p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              {paymentType === 'link_existing' 
                ? 'El receipt NO se mostrará en los expenses vinculados (ya existen)'
                : 'El receipt se vinculará a los nuevos expenses creados'}
            </p>
          </div>

          {/* Botones */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={submitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>Procesando...</span>
                </>
              ) : (
                <>
                  <FaCheckCircle />
                  <span>Confirmar Pago</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* 🆕 Modal para ver el Invoice PDF/Imagen */}
      {showInvoiceViewer && invoice.invoicePdfPath && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="relative bg-white rounded-lg max-w-6xl w-full h-[90vh] flex flex-col">
            {/* Header del viewer */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center space-x-3">
                <FaFileInvoiceDollar className="text-blue-600 text-2xl" />
                <div>
                  <h3 className="font-semibold text-gray-900">
                    Invoice #{invoice.invoiceNumber}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {invoice.vendor}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowInvoiceViewer(false)}
                className="text-gray-500 hover:text-gray-700 transition-colors p-2"
              >
                <FaTimes className="text-2xl" />
              </button>
            </div>

            {/* Contenido del viewer */}
            <div className="flex-1 overflow-auto bg-gray-100 flex items-center justify-center">
              {/* Determinar si es imagen o PDF por la URL de Cloudinary */}
              {invoice.invoicePdfPath.includes('/image/') ? (
                // Es una imagen
                <img
                  src={invoice.invoicePdfPath}
                  alt="Invoice"
                  className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                />
              ) : (
                // Es un PDF u otro archivo - usar Google Docs Viewer
                <iframe
                  src={`https://docs.google.com/gview?url=${encodeURIComponent(invoice.invoicePdfPath)}&embedded=true`}
                  className="w-full h-full border-0"
                  title="Invoice Document"
                />
              )}
            </div>

            {/* Footer con botón de descarga */}
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
              <p className="text-sm text-gray-600">
                {invoice.notes || 'Sin descripción'}
              </p>
              <a
                href={invoice.invoicePdfPath}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Descargar
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayInvoiceModal;
