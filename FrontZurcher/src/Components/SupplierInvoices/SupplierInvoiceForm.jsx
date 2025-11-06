import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import api from '../../utils/axios';
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
  
  // 🆕 Estado para vincular works
  const [linkedWorks, setLinkedWorks] = useState([]);
  const [availableWorks, setAvailableWorks] = useState([]);
  const [loadingWorks, setLoadingWorks] = useState(false);
  const [workSearchTerm, setWorkSearchTerm] = useState('');
  
  // Estado para archivo del invoice
  const [invoiceFile, setInvoiceFile] = useState(null);
  const [invoiceFilePreview, setInvoiceFilePreview] = useState(null);

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
      
      // 🆕 Cargar works vinculados si existen
      if (invoice.linkedWorks && invoice.linkedWorks.length > 0) {
        setLinkedWorks(invoice.linkedWorks.map(w => w.idWork));
      }
    }
    
    // Si estamos editando y hay un PDF del invoice, establecer la preview
    if (invoice?.invoicePdfPath) {
      setInvoiceFilePreview(invoice.invoicePdfPath);
    }
  }, [invoice]);

  // Cargar gastos sin pagar
  useEffect(() => {
    loadUnpaidExpenses();
    loadAvailableWorks();
  }, []);

  const loadAvailableWorks = async () => {
    setLoadingWorks(true);
    try {
      const response = await api.get('/work');
      if (!response.data.error) {
        // Filtrar solo works activos
        const activeWorks = response.data.filter(w => 
          w.status !== 'completed' && w.status !== 'cancelled'
        );
        setAvailableWorks(activeWorks);
      }
    } catch (error) {
      console.error('Error cargando works:', error);
    }
    setLoadingWorks(false);
  };

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

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validar tipo de archivo
    const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert('⚠️ Solo se permiten archivos PDF o imágenes (JPG, PNG, WEBP)');
      return;
    }

    // Validar tamaño (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('⚠️ El archivo no debe superar los 5MB');
      return;
    }

    setInvoiceFile(file);

    // Crear preview
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setInvoiceFilePreview(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      // Para PDFs, mostrar ícono
      setInvoiceFilePreview('PDF');
    }
  };

  const handleRemoveFile = () => {
    setInvoiceFile(null);
    setInvoiceFilePreview(null);
  };

  const uploadInvoiceFile = async (invoiceId) => {
    if (!invoiceFile) return true; // No hay archivo para subir

    try {
      console.log('📤 Subiendo comprobante para invoice:', invoiceId);
      console.log('📄 Archivo:', invoiceFile.name, invoiceFile.type, invoiceFile.size);
      
      const formData = new FormData();
      formData.append('file', invoiceFile);

      const response = await supplierInvoiceActions.uploadInvoicePdf(invoiceId, formData);
      
      if (response.error) {
        console.error('❌ Error uploading invoice file:', response);
        return false;
      }
      
      console.log('✅ Comprobante subido exitosamente:', response);
      return true;
    } catch (error) {
      console.error('❌ Error uploading invoice file:', error);
      return false;
    }
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

    // 🆕 Verificar que no se usen linkedWorks Y items con work asignado al mismo tiempo
    const itemsHaveWorks = items.some(item => item.workId);
    if (linkedWorks.length > 0 && itemsHaveWorks) {
      alert('⚠️ No puedes vincular trabajos al invoice Y asignar trabajos a items individuales al mismo tiempo. Elige una opción.');
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
      linkedWorks: linkedWorks, // 🆕 Works vinculados al invoice
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
        
        // Subir archivo del invoice si hay uno nuevo seleccionado
        if (invoiceFile) {
          const uploadSuccess = await uploadInvoiceFile(invoice.idSupplierInvoice);
          if (uploadSuccess) {
            alert('✅ Factura actualizada y comprobante subido exitosamente');
          } else {
            alert('✅ Factura actualizada, pero hubo un error al subir el comprobante. Puedes subirlo después desde el detalle.');
          }
        } else {
          alert('✅ Factura actualizada exitosamente');
        }
        
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
        
        // Subir archivo del invoice si existe
        if (invoiceFile) {
          const uploadSuccess = await uploadInvoiceFile(response.invoice.idSupplierInvoice);
          if (uploadSuccess) {
            alert('✅ Factura creada y comprobante subido exitosamente');
          } else {
            alert('✅ Factura creada, pero hubo un error al subir el comprobante. Puedes subirlo después desde el detalle.');
          }
        } else {
          alert('✅ Factura creada exitosamente');
        }
        
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
              {isEditing ? 'Editar Invoice' : 'Nuevo Invoice de Proveedor'}
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
              Información del Invoice
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Número de Invoice *
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
                  Fecha Invoice *
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

              {/* 🆕 Vincular a Works (opcional) */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  🏗️ Vincular a Trabajos (opcional)
                </label>
                
                {/* Verificar si hay items con works asignados */}
                {items.some(item => item.workId) ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-800">
                      ⚠️ Ya tienes items con trabajos específicos asignados. 
                      <br />
                      No puedes usar "Vincular a Trabajos" cuando los items tienen works individuales.
                      <br />
                      <strong>Opciones:</strong>
                      <br />
                      • Para distribuir equitativamente: Remueve los works de los items
                      <br />
                      • Para montos específicos por trabajo: Continúa asignando works a cada item
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-gray-500 mb-3">
                      Usa esta opción cuando quieras <strong>distribuir el monto total equitativamente</strong> entre varios trabajos. Si cada item va a un trabajo específico con su propio monto, asigna el work directamente en cada item.
                    </p>
                    
                    {/* Buscador */}
                    <div className="relative mb-3">
                      <input
                        type="text"
                        placeholder="🔍 Buscar por dirección..."
                        value={workSearchTerm}
                        onChange={(e) => setWorkSearchTerm(e.target.value)}
                        className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <svg className="absolute left-3 top-3 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>

                {/* Lista de trabajos disponibles (filtrados) */}
                {loadingWorks ? (
                  <div className="text-center py-4 text-gray-500">
                    Cargando trabajos...
                  </div>
                ) : (
                  <div className="border border-gray-300 rounded-lg max-h-60 overflow-y-auto mb-3">
                    {availableWorks
                      .filter(work => {
                        if (!workSearchTerm) return true;
                        const searchLower = workSearchTerm.toLowerCase();
                        return work.propertyAddress?.toLowerCase().includes(searchLower);
                      })
                      .map(work => {
                        const isSelected = linkedWorks.includes(work.idWork);
                        return (
                          <button
                            key={work.idWork}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setLinkedWorks(linkedWorks.filter(id => id !== work.idWork));
                              } else {
                                setLinkedWorks([...linkedWorks, work.idWork]);
                              }
                            }}
                            className={`w-full text-left px-4 py-3 border-b border-gray-200 hover:bg-blue-50 transition-colors flex items-center justify-between ${
                              isSelected ? 'bg-blue-100 border-l-4 border-l-blue-600' : ''
                            }`}
                          >
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">
                                📍 {work.propertyAddress}
                              </div>
                            </div>
                            {isSelected && (
                              <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            )}
                          </button>
                        );
                      })}
                    {availableWorks.filter(work => {
                      if (!workSearchTerm) return true;
                      const searchLower = workSearchTerm.toLowerCase();
                      return work.propertyAddress?.toLowerCase().includes(searchLower);
                    }).length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        {workSearchTerm ? 'No se encontraron trabajos' : 'No hay trabajos activos disponibles'}
                      </div>
                    )}
                  </div>
                )}

                {/* Trabajos seleccionados */}
                {linkedWorks.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      ✅ {linkedWorks.length} trabajo{linkedWorks.length !== 1 ? 's' : ''} seleccionado{linkedWorks.length !== 1 ? 's' : ''}:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {linkedWorks.map(workId => {
                        const work = availableWorks.find(w => w.idWork === workId);
                        return work ? (
                          <span key={workId} className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm">
                            📍 {work.propertyAddress}
                            <button
                              type="button"
                              onClick={() => setLinkedWorks(linkedWorks.filter(id => id !== workId))}
                              className="ml-1 text-white hover:text-blue-200 font-bold"
                            >
                              ×
                            </button>
                          </span>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}
                  </>
                )}
              </div>

              {/* Adjuntar comprobante del invoice */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Comprobante del Invoice (PDF o Imagen)
                </label>
                
                {!invoiceFilePreview ? (
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer">
                      <FaPlus />
                      Adjuntar Archivo
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.webp"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                    <span className="text-sm text-gray-500">
                      PDF o imagen (JPG, PNG, WEBP) - Máx 5MB
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    {invoiceFilePreview === 'PDF' ? (
                      <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg">
                        <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
                        </svg>
                        <span className="text-sm font-medium">
                          {invoiceFile?.name || 'Invoice PDF'}
                        </span>
                      </div>
                    ) : (
                      <img
                        src={invoiceFilePreview}
                        alt="Preview"
                        className="w-32 h-32 object-cover rounded-lg border border-gray-300"
                      />
                    )}
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                    >
                      <FaTrash className="inline mr-1" />
                      Eliminar
                    </button>
                    {typeof invoiceFilePreview === 'string' && invoiceFilePreview.startsWith('http') && (
                      <a
                        href={invoiceFilePreview}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        Ver Archivo
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Items de la Factura */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                Items del Invoice
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
