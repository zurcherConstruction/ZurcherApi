import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
  PlusIcon,
  ChevronRightIcon,
  XMarkIcon,
  DocumentArrowDownIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import api from '../../utils/axios';

const FixedExpensesManager = () => {
  const staff = useSelector((state) => state.auth.currentStaff);
  
  // Estados principales
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [pendingPeriods, setPendingPeriods] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Estados del formulario
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    totalAmount: '',
    frequency: 'monthly',
    paymentMethod: '',
    startDate: '',
    endDate: ''
  });

  // Cargar gastos fijos al montar
  useEffect(() => {
    loadFixedExpenses();
  }, []);

  const loadFixedExpenses = async () => {
    try {
      setLoading(true);
      const response = await api.get('/fixed-expenses');
      setExpenses(response.data.filter(e => e.isActive) || []);
    } catch (error) {
      console.error('Error cargando gastos fijos:', error);
      toast.error('Error cargando gastos fijos');
    } finally {
      setLoading(false);
    }
  };

  const loadExpenseDetails = async (expenseId) => {
    try {
      setLoadingDetails(true);
      
      // Cargar historial de pagos
      const paymentsRes = await api.get(`/fixed-expenses/${expenseId}/payments`);
      setPaymentHistory(paymentsRes.data || []);
      
      // Cargar períodos pendientes
      const periodsRes = await api.get(`/fixed-expenses/${expenseId}/pending-periods`);
      setPendingPeriods(periodsRes.data.pendingPeriods || []);
    } catch (error) {
      console.error('Error cargando detalles:', error);
      toast.error('Error cargando detalles del gasto');
    } finally {
      setLoadingDetails(false);
    }
  };

  const openDetailModal = async (expense) => {
    setSelectedExpense(expense);
    setShowDetailModal(true);
    await loadExpenseDetails(expense.idFixedExpense);
  };

  const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedExpense(null);
    setPaymentHistory([]);
    setPendingPeriods([]);
  };

  const openCreateModal = () => {
    setFormData({
      name: '',
      description: '',
      category: '',
      totalAmount: '',
      frequency: 'monthly',
      paymentMethod: '',
      startDate: '',
      endDate: ''
    });
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCreateExpense = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.totalAmount || !formData.frequency) {
      toast.error('Por favor completa los campos requeridos');
      return;
    }

    try {
      const payload = {
        ...formData,
        totalAmount: parseFloat(formData.totalAmount),
        startDate: formData.startDate || new Date().toISOString().split('T')[0],
        endDate: formData.endDate || null,
        createdByStaffId: staff?.id
      };

      await api.post('/fixed-expenses', payload);
      toast.success('Gasto fijo creado exitosamente');
      closeCreateModal();
      await loadFixedExpenses();
    } catch (error) {
      console.error('Error creando gasto:', error);
      toast.error(error.response?.data?.message || 'Error creando gasto fijo');
    }
  };

  const getStatusColor = (expense) => {
    if (expense.paymentStatus === 'paid') return 'bg-green-100 border-green-300';
    if (expense.paymentStatus === 'partial') return 'bg-yellow-100 border-yellow-300';
    return 'bg-red-100 border-red-300';
  };

  const getStatusText = (expense) => {
    if (expense.paymentStatus === 'paid') return '✅ Pagado';
    if (expense.paymentStatus === 'partial') return '⚠️ Parcial';
    return '❌ Pendiente';
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(value);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('es-AR');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gastos Fijos</h1>
            <p className="text-gray-600 mt-2">Gestiona tus gastos recurrentes</p>
          </div>
          <button
            onClick={openCreateModal}
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition"
          >
            <PlusIcon className="h-5 w-5" />
            Nuevo Gasto
          </button>
        </div>
      </div>

      {/* Listado de gastos */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      ) : expenses.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-500 text-lg">No hay gastos fijos registrados</p>
          <button
            onClick={openCreateModal}
            className="mt-4 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600"
          >
            Crear el primero
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {expenses.map((expense) => (
            <div
              key={expense.idFixedExpense}
              onClick={() => openDetailModal(expense)}
              className={`bg-white rounded-lg border-2 p-6 cursor-pointer transition hover:shadow-lg ${getStatusColor(expense)}`}
            >
              {/* Encabezado */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{expense.name}</h3>
                  <p className="text-sm text-gray-600">{expense.category || '-'}</p>
                </div>
                <span className="text-xs font-semibold px-3 py-1 bg-white rounded-full">
                  {getStatusText(expense)}
                </span>
              </div>

              {/* Montos */}
              <div className="space-y-3 mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 text-sm">Monto Total:</span>
                  <span className="font-bold text-gray-900">{formatCurrency(expense.totalAmount)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 text-sm">Ya Pagado:</span>
                  <span className="font-semibold text-green-600">{formatCurrency(expense.paidAmount || 0)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 text-sm">Pendiente:</span>
                  <span className="font-semibold text-orange-600">
                    {formatCurrency((expense.totalAmount || 0) - (expense.paidAmount || 0))}
                  </span>
                </div>
              </div>

              {/* Información de vencimiento */}
              <div className="border-t pt-4 space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CalendarIcon className="h-4 w-4" />
                  <span>Próx. Vencimiento: {formatDate(expense.nextDueDate)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <ClockIcon className="h-4 w-4" />
                  <span>Frecuencia: {expense.frequency}</span>
                </div>
              </div>

              {/* Botón de detalles */}
              <button className="w-full mt-4 bg-blue-50 text-blue-700 py-2 rounded-lg hover:bg-blue-100 flex items-center justify-center gap-2 transition">
                <span>Ver Detalles</span>
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal de crear gasto */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b p-6 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Crear Gasto Fijo</h2>
              <button
                onClick={closeCreateModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleCreateExpense} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nombre */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Ej: Salario"
                    required
                  />
                </div>

                {/* Monto */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monto Total <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="totalAmount"
                    value={formData.totalAmount}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="0.00"
                    step="0.01"
                    required
                  />
                </div>

                {/* Categoría */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Categoría
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="">Seleccionar...</option>
                    <option value="Salarios">Salarios</option>
                    <option value="Servicios">Servicios</option>
                    <option value="Seguros">Seguros</option>
                    <option value="Alquileres">Alquileres</option>
                    <option value="Impuestos">Impuestos</option>
                    <option value="Otros">Otros</option>
                  </select>
                </div>

                {/* Frecuencia */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Frecuencia <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="frequency"
                    value={formData.frequency}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    required
                  >
                    <option value="weekly">Semanal</option>
                    <option value="biweekly">Quincenal</option>
                    <option value="monthly">Mensual</option>
                    <option value="quarterly">Trimestral</option>
                    <option value="semiannual">Semestral</option>
                    <option value="annual">Anual</option>
                    <option value="one_time">Una sola vez</option>
                  </select>
                </div>

                {/* Método de pago */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Método de Pago
                  </label>
                  <select
                    name="paymentMethod"
                    value={formData.paymentMethod}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="">Seleccionar...</option>
                    <option value="Chase Bank">Chase Bank</option>
                    <option value="BOFA">BOFA</option>
                    <option value="Mercado Pago">Mercado Pago</option>
                    <option value="Transferencia">Transferencia</option>
                    <option value="Efectivo">Efectivo</option>
                  </select>
                </div>

                {/* Fecha de inicio */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de Inicio
                  </label>
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                {/* Fecha de fin */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de Fin (Opcional)
                  </label>
                  <input
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción (Opcional)
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleFormChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  rows="3"
                  placeholder="Notas adicionales..."
                />
              </div>

              {/* Botones */}
              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                >
                  Crear Gasto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de detalles */}
      {showDetailModal && selectedExpense && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">{selectedExpense.name}</h2>
                <p className="text-orange-100">{selectedExpense.category || '-'}</p>
              </div>
              <button
                onClick={closeDetailModal}
                className="text-white hover:text-orange-100"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {loadingDetails ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
              </div>
            ) : (
              <div className="p-6 space-y-6">
                {/* Resumen */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <p className="text-blue-600 text-sm font-medium">Monto Total</p>
                    <p className="text-2xl font-bold text-blue-900">{formatCurrency(selectedExpense.totalAmount)}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <p className="text-green-600 text-sm font-medium">Ya Pagado</p>
                    <p className="text-2xl font-bold text-green-900">{formatCurrency(selectedExpense.paidAmount || 0)}</p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                    <p className="text-orange-600 text-sm font-medium">Pendiente</p>
                    <p className="text-2xl font-bold text-orange-900">
                      {formatCurrency((selectedExpense.totalAmount || 0) - (selectedExpense.paidAmount || 0))}
                    </p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                    <p className="text-purple-600 text-sm font-medium">Próx. Vencimiento</p>
                    <p className="text-lg font-bold text-purple-900">{formatDate(selectedExpense.nextDueDate)}</p>
                  </div>
                </div>

                {/* Información del gasto */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Información del Gasto</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-gray-600 text-sm">Frecuencia</p>
                      <p className="font-semibold text-gray-900">{selectedExpense.frequency}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm">Método de Pago</p>
                      <p className="font-semibold text-gray-900">{selectedExpense.paymentMethod || '-'}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm">Fecha de Inicio</p>
                      <p className="font-semibold text-gray-900">{formatDate(selectedExpense.startDate)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm">Estado</p>
                      <p className="font-semibold text-gray-900">{getStatusText(selectedExpense)}</p>
                    </div>
                  </div>
                </div>

                {/* Períodos pendientes */}
                {pendingPeriods.length > 0 && (
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">
                      ⏰ Períodos Pendientes de Pago ({pendingPeriods.length})
                    </h3>
                    <div className="space-y-2">
                      {pendingPeriods.map((period, idx) => (
                        <div key={idx} className="bg-red-50 border border-red-200 rounded-lg p-3 flex justify-between items-center">
                          <span className="text-red-900 font-medium">
                            📅 {period.displayDate}
                          </span>
                          <span className="text-xs text-red-600">
                            {formatDate(period.startDate)} al {formatDate(period.endDate)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Historial de pagos */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">
                    📜 Historial de Pagos ({paymentHistory.length})
                  </h3>
                  {paymentHistory.length === 0 ? (
                    <p className="text-gray-500 text-center py-6">No hay pagos registrados</p>
                  ) : (
                    <div className="space-y-3">
                      {paymentHistory.map((payment, idx) => (
                        <div
                          key={payment.idPayment || idx}
                          className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex justify-between items-start hover:bg-gray-100 transition"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <CalendarIcon className="h-4 w-4 text-gray-600" />
                              <span className="font-semibold text-gray-900">
                                {formatDate(payment.periodStart)} al {formatDate(payment.periodEnd)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                              <CurrencyDollarIcon className="h-4 w-4 text-green-600" />
                              <span className="text-green-700 font-bold">{formatCurrency(payment.amount)}</span>
                            </div>
                            <div className="text-xs text-gray-600">
                              Pagado: {formatDate(payment.paymentDate)} • {payment.paymentMethod || '-'}
                            </div>
                            {payment.notes && (
                              <p className="text-sm text-gray-600 mt-2 italic">"{payment.notes}"</p>
                            )}
                          </div>
                          {payment.fileUrl && (
                            <a
                              href={payment.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-4 bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 transition flex items-center gap-1 text-sm whitespace-nowrap"
                              title="Ver comprobante"
                            >
                              <DocumentArrowDownIcon className="h-4 w-4" />
                              Ver
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Botón cerrar */}
                <div className="flex gap-3 pt-4 border-t">
                  <button
                    onClick={closeDetailModal}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FixedExpensesManager;
