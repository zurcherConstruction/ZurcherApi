import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import api from '../../utils/axios';
import { fixedExpenseActions } from '../../Redux/Actions/balanceActions';
import { 
  FIXED_EXPENSE_CATEGORIES,
  FIXED_EXPENSE_FREQUENCIES 
} from '../../utils/paymentConstants';
import FixedExpensesSummaryModal from './FixedExpensesSummaryModal';
import FixedExpensePaymentHistory from './FixedExpensePaymentHistory';
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
  ReceiptPercentIcon,
  CreditCardIcon,
  ClockIcon,
  DocumentTextIcon,
  ChartBarIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

/**
 * 📊 FixedExpensesManager - Refactorizado
 * 
 * RESPONSABILIDADES:
 * - Listar todos los gastos fijos
 * - Mostrar pendientes de pago
 * - Ver historial de pagos
 * - Crear/Editar gastos fijos
 * 
 * ❌ NO HACE:
 * - Registrar pagos (eso es en AttachInvoice)
 * - Generar transacciones (eso es en AttachInvoice)
 */
const FixedExpensesManager = () => {
  const dispatch = useDispatch();
  const staff = useSelector((state) => state.auth.currentStaff);
  
  // ============================================================
  // ESTADOS
  // ============================================================
  
  // Datos
  const [fixedExpenses, setFixedExpenses] = useState([]);
  const [filteredExpenses, setFilteredExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modales
  const [showForm, setShowForm] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);
  
  // Edición
  const [editingExpense, setEditingExpense] = useState(null);
  const [selectedExpenseForHistory, setSelectedExpenseForHistory] = useState(null);
  
  // Filtros
  const [filters, setFilters] = useState({
    isActive: 'all',
    paymentStatus: 'active', // 'active' (unpaid/partial) | 'paid' | 'all'
    category: 'all',
    search: ''
  });

  // Formulario
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

  // ============================================================
  // HELPERS
  // ============================================================

  function getLocalDateString() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  }

  function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: '2-digit' });
  }

  function getDaysUntilDue(dueDate) {
    if (!dueDate) return null;
    const due = new Date(dueDate);
    const today = new Date();
    const diff = due - today;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  function getStatusBadgeColor(status) {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800';
      case 'unpaid':
        return 'bg-red-100 text-red-800';
      case 'paid_via_invoice':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  function getStatusText(status) {
    const map = {
      paid: '✓ Pagado',
      partial: '⏳ Parcial',
      unpaid: '⚠️ Pendiente',
      paid_via_invoice: '📄 Pagado (Factura)'
    };
    return map[status] || status;
  }

  // ============================================================
  // EFECTOS
  // ============================================================

  useEffect(() => {
    loadFixedExpenses();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, fixedExpenses]);

  // ============================================================
  // CARGAR DATOS
  // ============================================================

  const loadFixedExpenses = async () => {
    try {
      setLoading(true);
      const response = await fixedExpenseActions.getAll();
      
      if (response.error) {
        console.error('Error loading fixed expenses:', response.error);
        setFixedExpenses([]);
        return;
      }

      const expenses = Array.isArray(response.fixedExpenses) ? response.fixedExpenses : [];
      setFixedExpenses(expenses);
    } catch (error) {
      console.error('Error loading fixed expenses:', error);
      setFixedExpenses([]);
      if (error.response?.status !== 404) {
        toast.error('Error al cargar gastos fijos');
      }
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // FILTRADO
  // ============================================================

  const applyFilters = () => {
    let filtered = [...fixedExpenses];

    // Filtro: Estado de pago
    if (filters.paymentStatus === 'active') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      filtered = filtered.filter(exp => {
        // Solo unpaid/partial
        if (exp.paymentStatus === 'paid' || exp.paymentStatus === 'paid_via_invoice') {
          return false;
        }
        // Vencimiento: hoy, futuro, o hace menos de 30 días
        if (exp.nextDueDate) {
          const dueDate = new Date(exp.nextDueDate);
          dueDate.setHours(0, 0, 0, 0);
          const daysInPast = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
          return daysInPast <= 30;
        }
        return true;
      });
    } else if (filters.paymentStatus === 'paid') {
      filtered = filtered.filter(exp => exp.paymentStatus === 'paid' || exp.paymentStatus === 'paid_via_invoice');
    }

    // Filtro: Estado activo/inactivo
    if (filters.isActive !== 'all') {
      filtered = filtered.filter(exp => 
        filters.isActive === 'true' ? exp.isActive : !exp.isActive
      );
    }

    // Filtro: Categoría
    if (filters.category !== 'all') {
      filtered = filtered.filter(exp => exp.category === filters.category);
    }

    // Filtro: Búsqueda
    if (filters.search.trim()) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(exp =>
        exp.name.toLowerCase().includes(search) ||
        exp.vendor?.toLowerCase().includes(search) ||
        exp.description?.toLowerCase().includes(search)
      );
    }

    setFilteredExpenses(filtered);
  };

  // ============================================================
  // CREAR/EDITAR
  // ============================================================

  const handleCreate = () => {
    setEditingExpense(null);
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
    setShowForm(true);
  };

  const handleEdit = (expense) => {
    setEditingExpense(expense);
    setFormData({
      ...expense,
      amount: expense.totalAmount || expense.amount,
      startDate: expense.startDate || getLocalDateString(),
      createdByStaffId: expense.createdByStaffId || staff?.id
    });
    setShowForm(true);
  };

  const handleSaveExpense = async (e) => {
    e.preventDefault();

    try {
      if (editingExpense) {
        // Actualizar
        const updateData = {
          ...formData,
          totalAmount: parseFloat(formData.amount || 0)
        };
        delete updateData.amount;
        
        await api.put(`/fixed-expenses/${editingExpense.idFixedExpense}`, updateData);
        toast.success('Gasto fijo actualizado');
      } else {
        // Crear
        const createData = {
          ...formData,
          totalAmount: parseFloat(formData.amount || 0)
        };
        delete createData.amount;

        await api.post('/fixed-expenses', createData);
        toast.success('Gasto fijo creado');
      }

      setShowForm(false);
      loadFixedExpenses();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al guardar gasto fijo');
      console.error('Error saving expense:', error);
    }
  };

  const handleDelete = async (expenseId) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este gasto fijo?')) {
      return;
    }

    try {
      await api.delete(`/fixed-expenses/${expenseId}`);
      toast.success('Gasto fijo eliminado');
      loadFixedExpenses();
    } catch (error) {
      toast.error('Error al eliminar gasto fijo');
      console.error('Error deleting expense:', error);
    }
  };

  const handleToggleStatus = async (expense) => {
    try {
      await api.patch(`/fixed-expenses/${expense.idFixedExpense}/toggle-status`);
      toast.success(`Gasto ${expense.isActive ? 'desactivado' : 'activado'}`);
      loadFixedExpenses();
    } catch (error) {
      toast.error('Error al cambiar estado');
      console.error('Error toggling status:', error);
    }
  };

  // ============================================================
  // HISTORIAL
  // ============================================================

  const openPaymentHistory = (expense) => {
    setSelectedExpenseForHistory(expense);
    setShowPaymentHistory(true);
  };

  // ============================================================
  // RENDER
  // ============================================================

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Gastos Fijos</h1>
            <p className="text-gray-600 mt-1">Gestionar gastos recurrentes</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowSummaryModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
            >
              <ChartBarIcon className="h-5 w-5" />
              Resumen Mensual
            </button>
            <button
              onClick={handleCreate}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <PlusIcon className="h-5 w-5" />
              Nuevo Gasto
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Estado de Pago */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado de Pago</label>
              <select
                value={filters.paymentStatus}
                onChange={(e) => setFilters({...filters, paymentStatus: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="active">📋 Pendientes</option>
                <option value="paid">✅ Pagados</option>
                <option value="all">📊 Todos</option>
              </select>
            </div>

            {/* Categoría */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
              <select
                value={filters.category}
                onChange={(e) => setFilters({...filters, category: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todas</option>
                {FIXED_EXPENSE_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Estado */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              <select
                value={filters.isActive}
                onChange={(e) => setFilters({...filters, isActive: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todos</option>
                <option value="true">✅ Activos</option>
                <option value="false">❌ Inactivos</option>
              </select>
            </div>

            {/* Búsqueda */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Búsqueda</label>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters({...filters, search: e.target.value})}
                  placeholder="Nombre, proveedor..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Resumen */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-600 text-sm mb-1">Total Gastos Fijos</p>
            <p className="text-2xl font-bold text-gray-900">{fixedExpenses.length}</p>
          </div>
          <div className="bg-blue-50 rounded-lg shadow p-4 border border-blue-200">
            <p className="text-blue-700 text-sm mb-1">Pendientes de Pago</p>
            <p className="text-2xl font-bold text-blue-900">
              {fixedExpenses.filter(e => e.paymentStatus === 'unpaid' || e.paymentStatus === 'partial').length}
            </p>
          </div>
          <div className="bg-green-50 rounded-lg shadow p-4 border border-green-200">
            <p className="text-green-700 text-sm mb-1">Pagados</p>
            <p className="text-2xl font-bold text-green-900">
              {fixedExpenses.filter(e => e.paymentStatus === 'paid' || e.paymentStatus === 'paid_via_invoice').length}
            </p>
          </div>
        </div>
      </div>

      {/* Lista de Gastos */}
      <div className="space-y-4">
        {filteredExpenses.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <DocumentTextIcon className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 text-lg">No hay gastos fijos que coincidan con los filtros</p>
          </div>
        ) : (
          filteredExpenses.map((expense) => (
            <ExpenseCard
              key={expense.idFixedExpense}
              expense={expense}
              onEdit={() => handleEdit(expense)}
              onDelete={() => handleDelete(expense.idFixedExpense)}
              onToggleStatus={() => handleToggleStatus(expense)}
              onViewHistory={() => openPaymentHistory(expense)}
              getDaysUntilDue={getDaysUntilDue}
              formatCurrency={formatCurrency}
              formatDate={formatDate}
              getStatusBadgeColor={getStatusBadgeColor}
              getStatusText={getStatusText}
            />
          ))
        )}
      </div>

      {/* MODALES */}

      {/* Modal: Crear/Editar */}
      {showForm && (
        <FixedExpenseForm
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleSaveExpense}
          onClose={() => setShowForm(false)}
          isEditing={!!editingExpense}
        />
      )}

      {/* Modal: Resumen */}
      {showSummaryModal && (
        <FixedExpensesSummaryModal
          isOpen={showSummaryModal}
          onClose={() => setShowSummaryModal(false)}
        />
      )}

      {/* Modal: Historial de Pagos */}
      {showPaymentHistory && selectedExpenseForHistory && (
        <FixedExpensePaymentHistory
          isOpen={showPaymentHistory}
          expense={selectedExpenseForHistory}
          onClose={() => {
            setShowPaymentHistory(false);
            setSelectedExpenseForHistory(null);
          }}
        />
      )}
    </div>
  );
};

// ============================================================
// COMPONENTE: Tarjeta de Gasto
// ============================================================

function ExpenseCard({
  expense,
  onEdit,
  onDelete,
  onToggleStatus,
  onViewHistory,
  getDaysUntilDue,
  formatCurrency,
  formatDate,
  getStatusBadgeColor,
  getStatusText
}) {
  const daysUntil = getDaysUntilDue(expense.nextDueDate);
  const isOverdue = daysUntil !== null && daysUntil < 0;
  const isDuesoon = daysUntil !== null && daysUntil >= 0 && daysUntil <= 7;

  return (
    <div className={`bg-white rounded-lg shadow hover:shadow-lg transition ${
      isOverdue ? 'border-l-4 border-red-500' : 
      isDuesoon ? 'border-l-4 border-yellow-500' : 
      'border-l-4 border-gray-200'
    }`}>
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900">{expense.name}</h3>
            {expense.vendor && <p className="text-sm text-gray-600">Proveedor: {expense.vendor}</p>}
          </div>
          <div className="flex gap-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeColor(expense.paymentStatus)}`}>
              {getStatusText(expense.paymentStatus)}
            </span>
            {!expense.isActive && (
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                Inactivo
              </span>
            )}
          </div>
        </div>

        {expense.description && (
          <p className="text-gray-600 text-sm mb-4">{expense.description}</p>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 pb-4 border-b border-gray-200">
          <div>
            <p className="text-gray-600 text-xs font-medium mb-1">Monto</p>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(expense.totalAmount)}</p>
          </div>
          <div>
            <p className="text-gray-600 text-xs font-medium mb-1">Frecuencia</p>
            <p className="text-gray-900 capitalize">{expense.frequency}</p>
          </div>
          <div>
            <p className="text-gray-600 text-xs font-medium mb-1">Categoría</p>
            <p className="text-gray-900">{expense.category}</p>
          </div>
          <div>
            <p className="text-gray-600 text-xs font-medium mb-1">Vencimiento</p>
            <p className="text-gray-900">{formatDate(expense.nextDueDate)}</p>
          </div>
        </div>

        {/* Información de vencimiento */}
        {expense.paymentStatus === 'unpaid' || expense.paymentStatus === 'partial' ? (
          <div className={`mb-4 p-3 rounded-lg ${
            isOverdue ? 'bg-red-50 border border-red-200' :
            isDuesoon ? 'bg-yellow-50 border border-yellow-200' :
            'bg-blue-50 border border-blue-200'
          }`}>
            {isOverdue ? (
              <p className="text-red-700 text-sm font-medium">
                ⚠️ Vencido hace {Math.abs(daysUntil)} día(s)
              </p>
            ) : isDuesoon ? (
              <p className="text-yellow-700 text-sm font-medium">
                ⏰ Vence en {daysUntil} día(s)
              </p>
            ) : (
              <p className="text-blue-700 text-sm font-medium">
                📅 Vence en {daysUntil} día(s)
              </p>
            )}
          </div>
        ) : null}

        {/* Acciones */}
        <div className="flex gap-2">
          <button
            onClick={onViewHistory}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition text-sm font-medium"
          >
            <ClockIcon className="h-4 w-4" />
            Ver Historial
          </button>
          <button
            onClick={onEdit}
            className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            onClick={onToggleStatus}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
          >
            {expense.isActive ? <XCircleIcon className="h-4 w-4" /> : <CheckCircleIcon className="h-4 w-4" />}
          </button>
          <button
            onClick={onDelete}
            className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// COMPONENTE: Formulario de Gasto
// ============================================================

function FixedExpenseForm({ formData, setFormData, onSubmit, onClose, isEditing }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">
            {isEditing ? 'Editar Gasto Fijo' : 'Crear Gasto Fijo'}
          </h2>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-900">
            ✕
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monto *</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Frecuencia *</label>
              <select
                required
                value={formData.frequency}
                onChange={(e) => setFormData({...formData, frequency: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {FIXED_EXPENSE_FREQUENCIES.map(freq => (
                  <option key={freq} value={freq}>{freq}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoría *</label>
              <select
                required
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccionar...</option>
                {FIXED_EXPENSE_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
              <input
                type="text"
                value={formData.vendor}
                onChange={(e) => setFormData({...formData, vendor: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Método de Pago *</label>
              <select
                required
                value={formData.paymentMethod}
                onChange={(e) => setFormData({...formData, paymentMethod: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccionar...</option>
                <option value="Chase Bank">Chase Bank</option>
                <option value="Cheque">Cheque</option>
                <option value="Transferencia Bancaria">Transferencia Bancaria</option>
                <option value="AMEX">AMEX</option>
                <option value="Chase Credit Card">Chase Credit Card</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Inicio *</label>
              <input
                type="date"
                required
                value={formData.startDate}
                onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Fin</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
              className="h-4 w-4 text-blue-600 rounded"
            />
            <label htmlFor="isActive" className="text-sm text-gray-700">
              Activo
            </label>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition font-medium"
            >
              {isEditing ? 'Actualizar' : 'Crear'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition font-medium"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default FixedExpensesManager;
