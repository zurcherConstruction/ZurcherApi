import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { supplierInvoiceActions } from '../../Redux/Actions/supplierInvoiceActions';
import {
  fetchSupplierInvoicesRequest,
  fetchSupplierInvoicesSuccess,
  fetchSupplierInvoicesFailure,
  setFilters,
  clearFilters,
  setCurrentInvoice,
  clearCurrentInvoice,
} from '../../Redux/Reducer/supplierInvoiceReducer';
import SupplierInvoiceForm from './SupplierInvoiceForm';
import SupplierInvoiceList from './SupplierInvoiceList';
import SupplierInvoiceDetail from './SupplierInvoiceDetail';
import AccountsPayableSummary from './AccountsPayableSummary';
import { FaFileInvoiceDollar, FaPlus, FaFilter, FaTimes } from 'react-icons/fa';

const SupplierInvoiceManager = () => {
  const dispatch = useDispatch();
  const { supplierInvoices, loading, error, filters } = useSelector(
    (state) => state.supplierInvoice
  );

  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // Cargar facturas al montar el componente
  useEffect(() => {
    loadInvoices();
  }, [filters]);

  const loadInvoices = async () => {
    dispatch(fetchSupplierInvoicesRequest());
    const response = await supplierInvoiceActions.getAll(filters);
    
    if (response.error) {
      dispatch(fetchSupplierInvoicesFailure(response.message));
      console.error('Error al cargar facturas:', response);
    } else {
      // Asegurar que response sea un array
      const invoicesArray = Array.isArray(response) ? response : [];
      console.log('✅ Facturas cargadas:', invoicesArray.length, invoicesArray);
      dispatch(fetchSupplierInvoicesSuccess(invoicesArray));
    }
  };

  const handleCreateNew = () => {
    setSelectedInvoice(null);
    dispatch(clearCurrentInvoice());
    setShowForm(true);
    setShowDetail(false);
  };

  const handleEdit = (invoice) => {
    setSelectedInvoice(invoice);
    dispatch(setCurrentInvoice(invoice));
    setShowForm(true);
    setShowDetail(false);
  };

  const handleView = (invoice) => {
    setSelectedInvoice(invoice);
    dispatch(setCurrentInvoice(invoice));
    setShowDetail(true);
    setShowForm(false);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setSelectedInvoice(null);
    dispatch(clearCurrentInvoice());
    loadInvoices(); // Recargar lista
  };

  const handleDetailClose = () => {
    setShowDetail(false);
    setSelectedInvoice(null);
    dispatch(clearCurrentInvoice());
  };

  const handleFilterChange = (field, value) => {
    dispatch(setFilters({ [field]: value }));
  };

  const handleClearFilters = () => {
    dispatch(clearFilters());
  };

  const getStatusBadgeColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      partial: 'bg-blue-100 text-blue-800',
      paid: 'bg-green-100 text-green-800',
      overdue: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FaFileInvoiceDollar className="text-3xl text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-800">
                  Cuentas por Pagar
                </h1>
                <p className="text-sm text-gray-600">
                  Gestión de invoices y pagos a proveedores
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <FaFilter />
                Filtros
              </button>
              <button
                onClick={handleCreateNew}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <FaPlus />
                Nuevo Invoice
              </button>
            </div>
          </div>
        </div>

        {/* Resumen de Cuentas por Pagar */}
        <AccountsPayableSummary />

        {/* Filtros */}
        {showFilters && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Filtros</h3>
              <button
                onClick={() => setShowFilters(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaTimes />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estado de Pago
                </label>
                <select
                  value={filters.paymentStatus}
                  onChange={(e) => handleFilterChange('paymentStatus', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Todos</option>
                  <option value="pending">Pendiente</option>
                  <option value="partial">Pago Parcial</option>
                  <option value="paid">Pagado</option>
                  <option value="overdue">Vencido</option>
                  <option value="cancelled">Cancelado</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Proveedor
                </label>
                <input
                  type="text"
                  value={filters.vendorName}
                  onChange={(e) => handleFilterChange('vendorName', e.target.value)}
                  placeholder="Nombre del proveedor"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Desde
                </label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hasta
                </label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleClearFilters}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Limpiar Filtros
              </button>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Content */}
        {showForm ? (
          <SupplierInvoiceForm
            invoice={selectedInvoice}
            onClose={handleFormClose}
          />
        ) : showDetail ? (
          <SupplierInvoiceDetail
            invoice={selectedInvoice}
            onClose={handleDetailClose}
            onEdit={handleEdit}
          />
        ) : (
          <SupplierInvoiceList
            invoices={supplierInvoices}
            loading={loading}
            onView={handleView}
            onEdit={handleEdit}
          />
        )}
      </div>
    </div>
  );
};

export default SupplierInvoiceManager;
