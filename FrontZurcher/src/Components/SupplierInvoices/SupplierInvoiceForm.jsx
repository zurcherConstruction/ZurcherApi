import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { supplierInvoiceActions } from '../../Redux/Actions/supplierInvoiceActions';
import { expenseActions } from '../../Redux/Actions/balanceActions';
import { fixedExpenseActions } from '../../Redux/Actions/fixedExpenseActions';
import {
  createSupplierInvoiceRequest,
  createSupplierInvoiceSuccess,
  createSupplierInvoiceFailure,
  updateSupplierInvoiceRequest,
  updateSupplierInvoiceSuccess,
  updateSupplierInvoiceFailure,
} from '../../Redux/Reducer/supplierInvoiceReducer';
import { FaSave, FaTimes, FaPlus, FaTrash, FaSearch, FaToggleOn, FaToggleOff } from 'react-icons/fa';

// Lista de proveedores frecuentes
const COMMON_VENDORS = [
  'ACELIO GARCIA',
  'Arian transport Inc',
  'H P TRUCKING, INC.',
  'HAJOCA',
  'Hugo & AY Professional Pavers',
  'JY&Trucking Transportation LLC',
  'Kye motors llc',
  'Lopez-Concrete Services LLC',
  'VCCG Partner corp',
  'Otro (Escribir manualmente)'
];

const SupplierInvoiceForm = ({ invoice, onClose }) => {
  const dispatch = useDispatch();
  const isEditing = !!invoice;

  // Estado del formulario
  const [formData, setFormData] = useState({
    invoiceNumber: '',
    invoiceDate: (() => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    })(),
    dueDate: '',
    vendorName: '',
    vendorCuit: '',
    description: '',
  });

  const [selectedVendor, setSelectedVendor] = useState('');
  const [customVendor, setCustomVendor] = useState('');
  const [items, setItems] = useState([]);
  const [unpaidExpenses, setUnpaidExpenses] = useState([]);
  const [unpaidFixedExpenses, setUnpaidFixedExpenses] = useState([]);
  const [showExpenseSelector, setShowExpenseSelector] = useState(false);
  const [expenseType, setExpenseType] = useState('regular'); // 'regular' o 'fixed'
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Cargar datos si estamos editando
  useEffect(() => {
    if (invoice) {
      const vendor = invoice.vendor || invoice.vendorName || '';
      
      // Verificar si el vendor está en la lista de comunes
      if (COMMON_VENDORS.slice(0, -1).includes(vendor)) {
        setSelectedVendor(vendor);
        setCustomVendor('');
      } else {
        setSelectedVendor('Otro (Escribir manualmente)');
        setCustomVendor(vendor);
      }
      
      setFormData({
        invoiceNumber: invoice.invoiceNumber || '',
        invoiceDate: invoice.issueDate?.split('T')[0] || invoice.invoiceDate?.split('T')[0] || '',
        dueDate: invoice.dueDate?.split('T')[0] || '',
        vendorName: vendor,
        vendorCuit: invoice.vendorCuit || '',
        description: invoice.description || invoice.notes || '',
      });
      
      // Procesar items: si vienen del backend sin quantity/unitPrice, inicializarlos
      const processedItems = (invoice.items || invoice.SupplierInvoiceItems || []).map(item => ({
        ...item,
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice || parseFloat(item.amount),
        amount: item.amount,
        isNew: false // Items del backend no son nuevos
      }));
      
      setItems(processedItems);
    }
  }, [invoice]);

  // Cargar gastos sin pagar
  useEffect(() => {
    loadUnpaidExpenses();
  }, []);

  const loadUnpaidExpenses = async () => {
    // Cargar gastos regulares sin pagar
    const expensesResponse = await expenseActions.getUnpaid();
    if (!expensesResponse.error) {
      setUnpaidExpenses(expensesResponse);
    }
    
    // Cargar gastos fijos sin pagar
    const fixedExpensesResponse = await fixedExpenseActions.getUnpaid();
    if (!fixedExpensesResponse.error) {
      setUnpaidFixedExpenses(fixedExpensesResponse);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    // Limpiar error del campo
    if (errors[name]) {
      setErrors({ ...errors, [name]: null });
    }
  };

  const handleVendorChange = (e) => {
    const value = e.target.value;
    setSelectedVendor(value);
    
    if (value === 'Otro (Escribir manualmente)') {
      setCustomVendor('');
      setFormData({ ...formData, vendorName: '' });
    } else {
      setCustomVendor('');
      setFormData({ ...formData, vendorName: value });
    }
    
    // Limpiar error
    if (errors.vendorName) {
      setErrors({ ...errors, vendorName: null });
    }
  };

  const handleCustomVendorChange = (e) => {
    const value = e.target.value;
    setCustomVendor(value);
    setFormData({ ...formData, vendorName: value });
    
    // Limpiar error
    if (errors.vendorName) {
      setErrors({ ...errors, vendorName: null });
    }
  };

  // Mapear categorías de FixedExpense a categorías válidas de SupplierInvoiceItem
  const mapFixedExpenseCategoryToInvoiceCategory = (fixedCategory) => {
    const categoryMap = {
      'Renta': 'Gasto Fijo',
      'Servicios': 'Gasto Fijo',
      'Seguros': 'Gasto Fijo',
      'Salarios': 'Gasto Fijo',
      'Equipamiento': 'Gasto Fijo',
      'Software/Subscripciones': 'Gasto Fijo',
      'Mantenimiento Vehicular': 'Gasto Fijo',
      'Combustible': 'Gasto Fijo',
      'Impuestos': 'Gasto Fijo',
      'Contabilidad/Legal': 'Gasto Fijo',
      'Marketing': 'Gasto Fijo',
      'Telefonía': 'Gasto Fijo',
      'Otros': 'Otro'
    };
    return categoryMap[fixedCategory] || 'Gasto Fijo';
  };

  const handleAddExistingExpense = (expense, type = 'regular') => {
    const expenseId = type === 'regular' ? expense.idExpense : expense.idFixedExpense;
    
    // Verificar que no esté ya agregado
    if (items.some(item => 
      (type === 'regular' && item.relatedExpenseId === expenseId) ||
      (type === 'fixed' && item.relatedFixedExpenseId === expenseId)
    )) {
      alert('Este gasto ya está agregado');
      return;
    }

    // Determinar la categoría correcta
    let category;
    if (type === 'regular') {
      category = expense.typeExpense; // Expense usa typeExpense
    } else {
      // FixedExpense usa category, pero necesita mapeo
      category = mapFixedExpenseCategoryToInvoiceCategory(expense.category);
    }

    const newItem = {
      relatedExpenseId: type === 'regular' ? expenseId : null,
      relatedFixedExpenseId: type === 'fixed' ? expenseId : null,
      description: expense.notes || expense.description || expense.name || expense.typeExpense || expense.category || 'Gasto',
      quantity: 1,
      unitPrice: parseFloat(expense.amount),
      amount: parseFloat(expense.amount),
      workId: expense.workId || null,
      category: category,
      expenseType: type, // 'regular' o 'fixed'
      // Info adicional para mostrar
      expenseData: expense,
    };

    setItems([...items, newItem]);
    setShowExpenseSelector(false);
    setSearchTerm('');
  };

  const handleAddNewItem = () => {
    const newItem = {
      relatedExpenseId: null,
      description: '',
      quantity: 1,
      unitPrice: 0,
      amount: 0,
      workId: null,
      category: '',
      isNew: true,
    };
    setItems([...items, newItem]);
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };

    // Recalcular amount si cambia quantity o unitPrice
    if (field === 'quantity' || field === 'unitPrice') {
      const quantity = parseFloat(newItems[index].quantity) || 0;
      const unitPrice = parseFloat(newItems[index].unitPrice) || 0;
      newItems[index].amount = quantity * unitPrice;
    }

    setItems(newItems);
  };

  const handleRemoveItem = (index) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.invoiceNumber.trim()) {
      newErrors.invoiceNumber = 'Número de factura es requerido';
    }
    if (!formData.invoiceDate) {
      newErrors.invoiceDate = 'Fecha de factura es requerida';
    }
    if (!formData.dueDate) {
      newErrors.dueDate = 'Fecha de vencimiento es requerida';
    }
    if (!formData.vendorName.trim()) {
      newErrors.vendorName = 'Nombre del proveedor es requerido';
    }
    if (items.length === 0) {
      newErrors.items = 'Debe agregar al menos un item';
    }

    // Validar items
    items.forEach((item, index) => {
      if (!item.description?.trim()) {
        newErrors[`item_${index}_description`] = 'Descripción requerida';
      }
      if (!item.quantity || item.quantity <= 0) {
        newErrors[`item_${index}_quantity`] = 'Cantidad inválida';
      }
      if (!item.unitPrice || item.unitPrice <= 0) {
        newErrors[`item_${index}_unitPrice`] = 'Precio inválido';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    // Mapear los campos del frontend a los nombres que espera el backend
    const invoiceData = {
      invoiceNumber: formData.invoiceNumber,
      vendor: formData.vendorName, // Backend espera 'vendor', no 'vendorName'
      issueDate: formData.invoiceDate, // Backend espera 'issueDate', no 'invoiceDate'
      dueDate: formData.dueDate,
      notes: formData.description,
      vendorEmail: formData.vendorEmail || null,
      vendorPhone: formData.vendorPhone || null,
      vendorAddress: formData.vendorAddress || null,
      items: items.map(item => ({
        relatedExpenseId: item.relatedExpenseId || null,
        relatedFixedExpenseId: item.relatedFixedExpenseId || null,
        description: item.description,
        category: item.category || 'Otro',
        amount: parseFloat(item.amount),
        workId: item.workId || null,
        notes: item.notes || null,
      })),
    };

    if (isEditing) {
      dispatch(updateSupplierInvoiceRequest());
      const response = await supplierInvoiceActions.update(invoice.idSupplierInvoice, invoiceData);
      
      if (response.error) {
        dispatch(updateSupplierInvoiceFailure(response.message));
        alert('❌ Error al actualizar: ' + response.message);
        setLoading(false);
      } else {
        dispatch(updateSupplierInvoiceSuccess(response));
        alert('✅ Factura actualizada exitosamente');
        setLoading(false);
        onClose();
      }
    } else {
      dispatch(createSupplierInvoiceRequest());
      const response = await supplierInvoiceActions.create(invoiceData);
      
      if (response.error) {
        dispatch(createSupplierInvoiceFailure(response.message));
        alert('❌ Error al crear: ' + response.message);
        setLoading(false);
      } else {
        dispatch(createSupplierInvoiceSuccess(response));
        alert('✅ Factura creada exitosamente');
        setLoading(false);
        onClose();
      }
    }
  };

  // Filtrar gastos según el tipo seleccionado
  const filteredExpenses = (expenseType === 'regular' ? unpaidExpenses : unpaidFixedExpenses).filter(exp => {
    const searchLower = searchTerm.toLowerCase();
    return (
      exp.notes?.toLowerCase().includes(searchLower) ||
      exp.description?.toLowerCase().includes(searchLower) ||
      exp.typeExpense?.toLowerCase().includes(searchLower) ||
      exp.category?.toLowerCase().includes(searchLower) ||
      exp.work?.propertyAddress?.toLowerCase().includes(searchLower) ||
      exp.vendor?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <form onSubmit={handleSubmit}>
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">
              {isEditing ? 'Editar Factura' : 'Nueva Factura de Proveedor'}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <FaTimes size={24} />
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Información de la Factura */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Información de la Factura
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Número de Factura *
                </label>
                <input
                  type="text"
                  name="invoiceNumber"
                  value={formData.invoiceNumber}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.invoiceNumber ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="FAC-001"
                />
                {errors.invoiceNumber && (
                  <p className="mt-1 text-sm text-red-600">{errors.invoiceNumber}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Proveedor *
                </label>
                <select
                  value={selectedVendor}
                  onChange={handleVendorChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.vendorName ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Seleccionar proveedor...</option>
                  {COMMON_VENDORS.map((vendor) => (
                    <option key={vendor} value={vendor}>
                      {vendor}
                    </option>
                  ))}
                </select>
                
                {selectedVendor === 'Otro (Escribir manualmente)' && (
                  <input
                    type="text"
                    value={customVendor}
                    onChange={handleCustomVendorChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mt-2 ${
                      errors.vendorName ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Escribir nombre del proveedor"
                  />
                )}
                
                {errors.vendorName && (
                  <p className="mt-1 text-sm text-red-600">{errors.vendorName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CUIT
                </label>
                <input
                  type="text"
                  name="vendorCuit"
                  value={formData.vendorCuit}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="20-12345678-9"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha de Factura *
                </label>
                <input
                  type="date"
                  name="invoiceDate"
                  value={formData.invoiceDate}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.invoiceDate ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.invoiceDate && (
                  <p className="mt-1 text-sm text-red-600">{errors.invoiceDate}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha de Vencimiento *
                </label>
                <input
                  type="date"
                  name="dueDate"
                  value={formData.dueDate}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.dueDate ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.dueDate && (
                  <p className="mt-1 text-sm text-red-600">{errors.dueDate}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="2"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Descripción general de la factura..."
                />
              </div>
            </div>
          </div>

          {/* Items de la Factura */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                Items de la Factura
              </h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowExpenseSelector(!showExpenseSelector)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                >
                  <FaSearch />
                  Vincular Gasto Existente
                </button>
                <button
                  type="button"
                  onClick={handleAddNewItem}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  <FaPlus />
                  Nuevo Item
                </button>
              </div>
            </div>

            {errors.items && (
              <p className="mb-4 text-sm text-red-600">{errors.items}</p>
            )}

            {/* Selector de gastos existentes */}
            {showExpenseSelector && (
              <div className="mb-4 p-4 border border-blue-200 rounded-lg bg-blue-50">
                {/* Tabs para seleccionar tipo de gasto */}
                <div className="flex gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setExpenseType('regular')}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                      expenseType === 'regular'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    Gastos de Obras ({unpaidExpenses.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpenseType('fixed')}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                      expenseType === 'fixed'
                        ? 'bg-purple-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    Gastos Fijos ({unpaidFixedExpenses.length})
                  </button>
                </div>
                
                <div className="mb-3">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar por descripción, categoría u obra..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                
                <div className="max-h-64 overflow-y-auto">
                  {filteredExpenses.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">
                      No hay {expenseType === 'regular' ? 'gastos' : 'gastos fijos'} sin pagar disponibles
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {filteredExpenses.map((expense) => {
                        const expenseId = expenseType === 'regular' ? expense.idExpense : expense.idFixedExpense;
                        return (
                          <div
                            key={expenseId}
                            className="flex items-center justify-between p-3 bg-white rounded border border-gray-200 hover:border-blue-400 cursor-pointer"
                            onClick={() => handleAddExistingExpense(expense, expenseType)}
                          >
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">
                                {expense.notes || expense.description || expense.typeExpense || expense.category || 'Gasto'}
                              </div>
                              <div className="text-sm text-gray-600">
                                {expenseType === 'regular' 
                                  ? (expense.work?.propertyAddress || 'Gasto general')
                                  : expense.vendor || 'Proveedor'
                                } • {expense.typeExpense || expense.category}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold text-gray-900">
                                ${parseFloat(expense.amount).toLocaleString('es-AR')}
                              </div>
                              <div className="text-xs text-gray-500">
                                {new Date(expense.date || expense.nextDueDate).toLocaleDateString('es-AR')}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Lista de items */}
            {items.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No hay items agregados. Vincule un gasto existente o agregue un nuevo item.
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item, index) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-lg">
                    <div className="grid grid-cols-12 gap-3">
                      <div className="col-span-5">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Descripción *
                        </label>
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                          disabled={!item.isNew}
                          className={`w-full px-2 py-1 text-sm border rounded ${
                            item.isNew ? 'border-gray-300' : 'border-gray-200 bg-gray-50'
                          } ${errors[`item_${index}_description`] ? 'border-red-500' : ''}`}
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Cantidad *
                        </label>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                          disabled={!item.isNew}
                          className={`w-full px-2 py-1 text-sm border rounded ${
                            item.isNew ? 'border-gray-300' : 'border-gray-200 bg-gray-50'
                          } ${errors[`item_${index}_quantity`] ? 'border-red-500' : ''}`}
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Precio Unit. *
                        </label>
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                          disabled={!item.isNew}
                          className={`w-full px-2 py-1 text-sm border rounded ${
                            item.isNew ? 'border-gray-300' : 'border-gray-200 bg-gray-50'
                          } ${errors[`item_${index}_unitPrice`] ? 'border-red-500' : ''}`}
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Total
                        </label>
                        <div className="px-2 py-1 text-sm font-semibold text-gray-900">
                          ${parseFloat(item.amount || 0).toLocaleString('es-AR')}
                        </div>
                      </div>
                      <div className="col-span-1 flex items-end">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Eliminar"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                    {item.expenseData && (
                      <div className="mt-2 text-xs text-gray-500">
                        Vinculado a: {item.expenseData.Work?.name || 'Gasto general'}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Totales */}
          <div className="border-t pt-4">
            <div className="flex justify-end">
              <div className="w-64">
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-700">Subtotal:</span>
                  <span className="font-semibold text-gray-900">
                    ${calculateTotal().toLocaleString('es-AR')}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-t-2 border-gray-300">
                  <span className="text-lg font-bold text-gray-900">Total:</span>
                  <span className="text-lg font-bold text-blue-600">
                    ${calculateTotal().toLocaleString('es-AR')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              <FaSave />
              {loading ? 'Guardando...' : (isEditing ? 'Actualizar' : 'Guardar')}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default SupplierInvoiceForm;
