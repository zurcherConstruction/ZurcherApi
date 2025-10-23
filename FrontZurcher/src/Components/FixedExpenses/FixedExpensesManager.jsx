import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { fixedExpenseActions } from '../../Redux/Actions/balanceActions';
import { 
  PAYMENT_METHODS_GROUPED, 
  FIXED_EXPENSE_CATEGORIES,
  FIXED_EXPENSE_FREQUENCIES 
} from '../../utils/paymentConstants';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  BellAlertIcon,
  CheckCircleIcon,
  XCircleIcon,
  CalendarDaysIcon,
  BanknotesIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  ReceiptPercentIcon
} from '@heroicons/react/24/outline';

const FixedExpensesManager = () => {
  const dispatch = useDispatch();
  const staff = useSelector((state) => state.auth.currentStaff);
  
  // Estados
  const [fixedExpenses, setFixedExpenses] = useState([]);
  const [filteredExpenses, setFilteredExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [upcomingExpenses, setUpcomingExpenses] = useState([]);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedExpenseForGenerate, setSelectedExpenseForGenerate] = useState(null);
  
  // Helper para obtener fecha local
  const getLocalDateString = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  };
  
  const [generateFormData, setGenerateFormData] = useState({
    paymentDate: getLocalDateString(),
    notes: ''
  });

  // Filtros
  const [filters, setFilters] = useState({
    isActive: 'all',
    category: 'all',
    paymentMethod: 'all',
    search: ''
  });

  // Form data
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    amount: '',
    frequency: 'monthly',
    category: '',
    paymentMethod: '',
    paymentAccount: '',
    startDate: getLocalDateString(),
    endDate: '',
    isActive: true,
    autoCreateExpense: false,
    vendor: '',
    accountNumber: '',
    notes: '',
    createdByStaffId: staff?.id || null
  });

  // Cargar datos al montar
  useEffect(() => {
    loadFixedExpenses();
    loadUpcomingExpenses();
  }, []);

  // Aplicar filtros
  useEffect(() => {
    applyFilters();
  }, [filters, fixedExpenses]);

  const loadFixedExpenses = async () => {
    try {
      setLoading(true);
      const response = await fixedExpenseActions.getAll();
      
      if (response.error) {
        console.error('Error al cargar gastos fijos:', response.error);
        // No mostrar toast de error si simplemente no hay datos
        if (!response.error.includes('no encontr')) {
          toast.error('Error al cargar gastos fijos');
        }
        setFixedExpenses([]);
        return;
      }

      // Validar que response.fixedExpenses sea un array
      const expenses = Array.isArray(response.fixedExpenses) ? response.fixedExpenses : [];
      setFixedExpenses(expenses);
    } catch (error) {
      console.error('Error loading fixed expenses:', error);
      setFixedExpenses([]);
      // Solo mostrar error si es un error real, no si simplemente no hay datos
      if (error.response?.status !== 404) {
        toast.error('Error al cargar gastos fijos');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadUpcomingExpenses = async () => {
    try {
      const response = await fixedExpenseActions.getUpcoming(7);
      
      if (response.error) {
        console.error('Error loading upcoming expenses:', response.error);
        setUpcomingExpenses([]);
        return;
      }

      // Validar que response.upcomingExpenses sea un array
      const upcoming = Array.isArray(response.upcomingExpenses) ? response.upcomingExpenses : [];
      setUpcomingExpenses(upcoming);
    } catch (error) {
      console.error('Error loading upcoming:', error);
      setUpcomingExpenses([]);
    }
  };

  const applyFilters = () => {
    let filtered = [...fixedExpenses];

    // Filtro por estado
    if (filters.isActive !== 'all') {
      filtered = filtered.filter(exp => 
        filters.isActive === 'true' ? exp.isActive : !exp.isActive
      );
    }

    // Filtro por categoría
    if (filters.category !== 'all') {
      filtered = filtered.filter(exp => exp.category === filters.category);
    }

    // Filtro por método de pago
    if (filters.paymentMethod !== 'all') {
      filtered = filtered.filter(exp => exp.paymentMethod === filters.paymentMethod);
    }

    // Búsqueda
    if (filters.search.trim()) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(exp =>
        exp.name?.toLowerCase().includes(searchLower) ||
        exp.vendor?.toLowerCase().includes(searchLower) ||
        exp.description?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredExpenses(filtered);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.amount || !formData.category || !formData.paymentMethod) {
      toast.error('Por favor completa todos los campos obligatorios');
      return;
    }

    try {
      // Preparar datos para enviar, convirtiendo strings vacíos a null
      const dataToSend = {
        ...formData,
        endDate: formData.endDate || null, // Convertir string vacío a null
        paymentAccount: formData.paymentAccount || null,
        vendor: formData.vendor || null,
        accountNumber: formData.accountNumber || null,
        notes: formData.notes || null,
        description: formData.description || null,
      };

      if (editingExpense) {
        // Actualizar
        const response = await fixedExpenseActions.update(editingExpense.idFixedExpense, dataToSend);
        
        if (response.error) {
          toast.error('Error al actualizar gasto fijo');
          return;
        }

        toast.success('✅ Gasto fijo actualizado correctamente');
      } else {
        // Crear nuevo
        const response = await fixedExpenseActions.create(dataToSend);
        
        if (response.error) {
          toast.error('Error al crear gasto fijo');
          return;
        }

        toast.success('✅ Gasto fijo creado correctamente');
      }

      // Recargar y resetear
      await loadFixedExpenses();
      resetForm();
    } catch (error) {
      console.error('Error submitting:', error);
      toast.error('Error al guardar gasto fijo');
    }
  };

  const handleEdit = (expense) => {
    setEditingExpense(expense);
    setFormData({
      name: expense.name || '',
      description: expense.description || '',
      amount: expense.amount || '',
      frequency: expense.frequency || 'monthly',
      category: expense.category || '',
      paymentMethod: expense.paymentMethod || '',
      paymentAccount: expense.paymentAccount || '',
      startDate: expense.startDate || '',
      endDate: expense.endDate || '',
      isActive: expense.isActive !== undefined ? expense.isActive : true,
      autoCreateExpense: expense.autoCreateExpense || false,
      vendor: expense.vendor || '',
      accountNumber: expense.accountNumber || '',
      notes: expense.notes || '',
      createdByStaffId: expense.createdByStaffId || staff?.id
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este gasto fijo?')) {
      return;
    }

    try {
      const response = await fixedExpenseActions.delete(id);
      
      if (response.error) {
        toast.error('Error al eliminar gasto fijo');
        return;
      }

      toast.success('✅ Gasto fijo eliminado');
      await loadFixedExpenses();
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error('Error al eliminar');
    }
  };

  const handleToggleActive = async (expense) => {
    try {
      const response = await fixedExpenseActions.toggleActive(expense.idFixedExpense, expense.isActive);
      
      if (response.error) {
        toast.error('Error al cambiar estado');
        return;
      }

      toast.success(`✅ Gasto fijo ${expense.isActive ? 'desactivado' : 'activado'}`);
      await loadFixedExpenses();
    } catch (error) {
      console.error('Error toggling:', error);
      toast.error('Error al cambiar estado');
    }
  };

  const handleGenerateExpense = async () => {
    if (!selectedExpenseForGenerate) return;

    try {
      const response = await fixedExpenseActions.generateExpense(
        selectedExpenseForGenerate.idFixedExpense,
        generateFormData
      );
      
      if (response.error) {
        toast.error('Error al generar gasto');
        return;
      }

      toast.success('✅ Gasto generado correctamente y registrado en el sistema');
      
      // Recargar gastos fijos (nextDueDate se habrá actualizado)
      await loadFixedExpenses();
      await loadUpcomingExpenses();
      
      // Cerrar modal y resetear
      setShowGenerateModal(false);
      setSelectedExpenseForGenerate(null);
      setGenerateFormData({
        paymentDate: getLocalDateString(),
        notes: ''
      });
    } catch (error) {
      console.error('Error generating expense:', error);
      toast.error('Error al generar gasto');
    }
  };

  const openGenerateModal = (expense) => {
    setSelectedExpenseForGenerate(expense);
    setGenerateFormData({
      paymentDate: getLocalDateString(),
      notes: `Pago de ${expense.name}`
    });
    setShowGenerateModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      amount: '',
      frequency: 'monthly',
      category: '',
      paymentMethod: '',
      paymentAccount: '',
      startDate: getLocalDateString(),
      endDate: '',
      isActive: true,
      autoCreateExpense: false,
      vendor: '',
      accountNumber: '',
      notes: '',
      createdByStaffId: staff?.id || null
    });
    setEditingExpense(null);
    setShowForm(false);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getFrequencyLabel = (freq) => {
    const labels = {
      weekly: 'Semanal',
      biweekly: 'Quincenal',
      monthly: 'Mensual',
      quarterly: 'Trimestral',
      semiannual: 'Semestral',
      annual: 'Anual',
      one_time: 'Único'
    };
    return labels[freq] || freq;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">💰 Gastos Fijos</h1>
        <p className="text-gray-600">
          Gestiona tus gastos recurrentes y compromisos mensuales
        </p>
      </div>

      {/* Alertas de Próximos Vencimientos */}
      {upcomingExpenses.length > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-lg">
          <div className="flex items-start">
            <BellAlertIcon className="h-6 w-6 text-yellow-600 mr-3 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-yellow-800">
                Próximos vencimientos (7 días)
              </h3>
              <ul className="mt-2 text-sm text-yellow-700">
                {upcomingExpenses.slice(0, 3).map(exp => (
                  <li key={exp.idFixedExpense} className="flex items-center gap-2">
                    <CalendarDaysIcon className="h-4 w-4" />
                    <span className="font-medium">{exp.name}</span>
                    <span>- {formatCurrency(exp.amount)}</span>
                    <span className="text-xs">({exp.nextDueDate})</span>
                  </li>
                ))}
              </ul>
              {upcomingExpenses.length > 3 && (
                <p className="text-xs text-yellow-600 mt-1">
                  Y {upcomingExpenses.length - 3} más...
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Botón Crear + Filtros */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <PlusIcon className="h-5 w-5" />
            {showForm ? 'Cancelar' : 'Nuevo Gasto Fijo'}
          </button>

          <div className="flex gap-3 flex-wrap flex-1 justify-end">
            {/* Búsqueda */}
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar..."
                value={filters.search}
                onChange={(e) => setFilters({...filters, search: e.target.value})}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Filtro Estado */}
            <select
              value={filters.isActive}
              onChange={(e) => setFilters({...filters, isActive: e.target.value})}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos los estados</option>
              <option value="true">✅ Activos</option>
              <option value="false">❌ Inactivos</option>
            </select>

            {/* Filtro Categoría */}
            <select
              value={filters.category}
              onChange={(e) => setFilters({...filters, category: e.target.value})}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todas las categorías</option>
              {FIXED_EXPENSE_CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>

            <button
              onClick={loadFixedExpenses}
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
              title="Recargar"
            >
              <ArrowPathIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">
            {editingExpense ? '✏️ Editar Gasto Fijo' : '➕ Nuevo Gasto Fijo'}
          </h2>
          
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Nombre */}
            <div className="col-span-full">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Nombre del Gasto <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: Alquiler de Oficina, Internet, Seguro..."
                required
              />
            </div>

            {/* Descripción */}
            <div className="col-span-full">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Descripción
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows="2"
                placeholder="Detalles adicionales..."
              />
            </div>

            {/* Monto */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Monto <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
                required
              />
            </div>

            {/* Frecuencia */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Frecuencia <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.frequency}
                onChange={(e) => setFormData({...formData, frequency: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                {FIXED_EXPENSE_FREQUENCIES.map(freq => (
                  <option key={freq.value} value={freq.value}>{freq.label}</option>
                ))}
              </select>
            </div>

            {/* Categoría */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Categoría <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Seleccionar...</option>
                {FIXED_EXPENSE_CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>

            {/* Método de Pago */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Método de Pago <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.paymentMethod}
                onChange={(e) => setFormData({...formData, paymentMethod: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Seleccionar...</option>
                <optgroup label="🏦 Cuentas Bancarias">
                  {PAYMENT_METHODS_GROUPED.bank.map(method => (
                    <option key={method.value} value={method.value}>{method.label}</option>
                  ))}
                </optgroup>
                <optgroup label="💳 Tarjetas">
                  {PAYMENT_METHODS_GROUPED.card.map(method => (
                    <option key={method.value} value={method.value}>{method.label}</option>
                  ))}
                </optgroup>
                <optgroup label="💰 Otros">
                  {PAYMENT_METHODS_GROUPED.other.map(method => (
                    <option key={method.value} value={method.value}>{method.label}</option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Proveedor */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Proveedor/Beneficiario
              </label>
              <input
                type="text"
                value={formData.vendor}
                onChange={(e) => setFormData({...formData, vendor: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Nombre del proveedor"
              />
            </div>

            {/* Fecha de Inicio */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Fecha de Inicio <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Checkboxes */}
            <div className="col-span-full flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Activo</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.autoCreateExpense}
                  onChange={(e) => setFormData({...formData, autoCreateExpense: e.target.checked})}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Auto-generar gasto</span>
              </label>
            </div>

            {/* Botones */}
            <div className="col-span-full flex gap-3 justify-end mt-4">
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                {editingExpense ? 'Actualizar' : 'Crear Gasto Fijo'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de Gastos Fijos */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            Cargando gastos fijos...
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <BanknotesIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <p>No se encontraron gastos fijos</p>
            <p className="text-sm">Crea uno nuevo para comenzar</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoría</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monto</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Frecuencia</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Método Pago</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Próximo Venc.</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredExpenses.map((expense) => (
                  <tr key={expense.idFixedExpense} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleActive(expense)}
                        className="flex items-center gap-1"
                      >
                        {expense.isActive ? (
                          <CheckCircleIcon className="h-5 w-5 text-green-500" title="Activo" />
                        ) : (
                          <XCircleIcon className="h-5 w-5 text-gray-400" title="Inactivo" />
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{expense.name}</div>
                      {expense.vendor && (
                        <div className="text-xs text-gray-500">{expense.vendor}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                        {expense.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-semibold text-gray-900">
                          {formatCurrency(expense.amount)}
                        </span>
                        {expense.isPaidThisPeriod && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 w-fit">
                            ✓ Generado {expense.lastPaymentDate && `(${expense.lastPaymentDate})`}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {getFrequencyLabel(expense.frequency)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {expense.paymentMethod}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {expense.nextDueDate}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openGenerateModal(expense)}
                          className={`p-1 rounded ${
                            !expense.isActive || expense.isPaidThisPeriod
                              ? 'text-gray-400 cursor-not-allowed'
                              : 'text-green-600 hover:text-green-800 hover:bg-green-50'
                          }`}
                          title={
                            expense.isPaidThisPeriod
                              ? 'Ya generado en este período'
                              : !expense.isActive
                              ? 'Gasto inactivo'
                              : 'Generar Gasto'
                          }
                          disabled={!expense.isActive || expense.isPaidThisPeriod}
                        >
                          <ReceiptPercentIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleEdit(expense)}
                          className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50"
                          title="Editar"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(expense.idFixedExpense)}
                          className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50"
                          title="Eliminar"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal para Generar Gasto */}
      {showGenerateModal && selectedExpenseForGenerate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <ReceiptPercentIcon className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Generar Gasto</h3>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <h4 className="font-semibold text-gray-800 mb-2">{selectedExpenseForGenerate.name}</h4>
              <div className="space-y-1 text-sm text-gray-600">
                <p><span className="font-medium">Categoría:</span> {selectedExpenseForGenerate.category}</p>
                <p><span className="font-medium">Monto:</span> {formatCurrency(selectedExpenseForGenerate.amount)}</p>
                <p><span className="font-medium">Método de Pago:</span> {selectedExpenseForGenerate.paymentMethod}</p>
                {selectedExpenseForGenerate.vendor && (
                  <p><span className="font-medium">Proveedor:</span> {selectedExpenseForGenerate.vendor}</p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Fecha de Pago
                </label>
                <input
                  type="date"
                  value={generateFormData.paymentDate}
                  onChange={(e) => setGenerateFormData({...generateFormData, paymentDate: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Notas Adicionales (Opcional)
                </label>
                <textarea
                  value={generateFormData.notes}
                  onChange={(e) => setGenerateFormData({...generateFormData, notes: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 resize-none"
                  rows="3"
                  placeholder="Detalles del pago..."
                />
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-4">
              <p className="text-xs text-yellow-800">
                💡 <strong>Nota:</strong> Al generar este gasto, se creará un registro en Expenses con tipo "Gasto Fijo" 
                y se actualizará automáticamente la próxima fecha de vencimiento.
              </p>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowGenerateModal(false);
                  setSelectedExpenseForGenerate(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleGenerateExpense}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2"
              >
                <ReceiptPercentIcon className="h-5 w-5" />
                Generar Gasto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FixedExpensesManager;
