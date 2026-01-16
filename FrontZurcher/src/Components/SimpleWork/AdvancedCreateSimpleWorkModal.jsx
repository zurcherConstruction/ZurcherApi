import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import api from '../../utils/axios';
import { 
  FaPlus, FaMinus, FaTrash, FaSearch, FaTimes,
  FaTools, FaCalculator, FaEdit, FaCheck, FaArrowUp, FaArrowDown
} from 'react-icons/fa';
import { fetchBudgetItems } from "../../Redux/Actions/budgetItemActions";
import { createSimpleWork, updateSimpleWork, fetchClientWorks, clearClientWorks } from '../../Redux/Actions/simpleWorkActions';
import DynamicCategorySection from "../../Components/Budget/DynamicCategorySection";

// Helper para generar IDs temporales
const generateTempId = () => `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const AdvancedCreateSimpleWorkModal = ({ 
  isOpen, 
  onClose, 
  editingWork = null,
  onWorkCreated 
}) => {
  const dispatch = useDispatch();
  
  // Redux state
  const { items: budgetItemsCatalog, loading: itemsLoading } = useSelector(state => state.budgetItems);
  const { clientWorks } = useSelector(state => state.simpleWork);
  const { staff } = useSelector(state => state.auth);

  // Form state
  const [formData, setFormData] = useState({
    workType: 'culvert',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    description: '',
    notes: '',
    linkedWorkId: null,
  });

  // Items state - Now managed by DynamicCategorySection
  const [items, setItems] = useState([]);
  const [discountPercentage, setDiscountPercentage] = useState(0);
  
  // Payment percentage state (like Budget)
  const [initialPaymentPercentage, setInitialPaymentPercentage] = useState(100);
  
  // Attachments state
  const [attachments, setAttachments] = useState([]);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);

  // Normalize budget items like in CreateBudget (DEBE IR ANTES de availableCategories)
  const normalizedBudgetItemsCatalog = useMemo(() => {
    if (!budgetItemsCatalog || !Array.isArray(budgetItemsCatalog)) return [];
    
    return budgetItemsCatalog
      .filter(item => item && (item.item || item.name)) // Filter out invalid items
      .map(item => ({
        id: item.id,
        name: item.item || item.name || '', 
        item: item.item || item.name || '',
        category: item.category || '',
        unitPrice: parseFloat(item.unitPrice || 0),
        unit: item.unit || 'ea',
        marca: item.marca,
        capacity: item.capacity,
        description: item.description || item.item || item.name || ''
      }));
  }, [budgetItemsCatalog]);

  // Categories management like CreateBudget
  const customCategoryOrder = [
    'PIPE',
    'FITTINGS',
    'TANK',
    'DISTRIBUTION BOX',
    'ROCK',
    'INSPECTION',
    'LABOR FEE'
  ];

  const availableCategories = useMemo(() => {
    const categories = [...new Set(normalizedBudgetItemsCatalog.map(item => item.category).filter(cat => cat))];
    const filtered = categories.filter(cat => (cat || '').toUpperCase().trim() !== 'MATERIALES');
    return filtered.sort((a, b) => {
      // Safety checks for undefined values
      const categoryA = (a || '').toUpperCase();
      const categoryB = (b || '').toUpperCase();
      const aIdx = customCategoryOrder.indexOf(categoryA);
      const bIdx = customCategoryOrder.indexOf(categoryB);
      if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
      if (aIdx !== -1) return -1;
      if (bIdx !== -1) return 1;
      return categoryA.localeCompare(categoryB);
    });
  }, [normalizedBudgetItemsCatalog]);

  // Dynamic section visibility management
  const [dynamicSectionVisibility, setDynamicSectionVisibility] = useState({});

  // Initialize visibility for all categories
  useEffect(() => {
    const initialVisibility = {};
    availableCategories.forEach(category => {
      initialVisibility[category] = false;
    });
    setDynamicSectionVisibility(prev => ({ ...prev, ...initialVisibility }));
  }, [availableCategories]);

  // Toggle dynamic section
  const toggleDynamicSection = (category) => {
    setDynamicSectionVisibility(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  // Add item from dynamic section
  const addItemFromDynamicSection = (itemData) => {
    setItems(prevItems => [...prevItems, itemData]);
  };

  // Manual item form state
  const [showManualItemForm, setShowManualItemForm] = useState(false);
  const [manualItem, setManualItem] = useState({
    description: '',
    quantity: 1,
    unitCost: 0,
    category: 'OTHER'
  });

  // Add manual item
  const addManualItem = () => {
    if (!manualItem.description.trim()) {
      alert('Por favor ingrese una descripción para el ítem');
      return;
    }

    const newItem = {
      id: null,
      tempId: generateTempId(),
      category: manualItem.category,
      name: manualItem.description,
      description: manualItem.description,
      quantity: parseFloat(manualItem.quantity) || 1,
      unit: 'ea',
      unitCost: parseFloat(manualItem.unitCost) || 0,
      totalCost: (parseFloat(manualItem.quantity) || 1) * (parseFloat(manualItem.unitCost) || 0),
      discount: 0,
      finalCost: (parseFloat(manualItem.quantity) || 1) * (parseFloat(manualItem.unitCost) || 0),
      budgetItemId: null,
      isFromTemplate: false,
      templateItemId: null
    };

    setItems(prevItems => [...prevItems, newItem]);
    setManualItem({ description: '', quantity: 1, unitCost: 0, category: 'OTHER' });
    setShowManualItemForm(false);
  };

  // Work linking state
  const [showWorkSearch, setShowWorkSearch] = useState(false);
  const [workSearchQuery, setWorkSearchQuery] = useState('');
  const [selectedLinkedWork, setSelectedLinkedWork] = useState(null);

  // UI state
  const [errors, setErrors] = useState({});

  // Load budget items on mount
  useEffect(() => {
    if (isOpen) {
      console.log('🔄 Cargando BudgetItems...');
      dispatch(fetchBudgetItems());
    }
  }, [isOpen, dispatch]);

  // Debug para verificar carga de datos
  useEffect(() => {
    console.log('📊 BudgetItems actualizados:', budgetItemsCatalog?.length || 0, budgetItemsCatalog);
    console.log('🔗 ClientWorks actualizados:', clientWorks?.length || 0, clientWorks);
  }, [budgetItemsCatalog, clientWorks]);

  // Auto-load client works when work search is opened
  useEffect(() => {
    if (showWorkSearch && (!clientWorks || clientWorks.length === 0)) {
      console.log('🔄 Auto-cargando trabajos disponibles...');
      dispatch(fetchClientWorks({ limit: 50 }));
    }
  }, [showWorkSearch, clientWorks, dispatch]);

  // Initialize form when editing
  useEffect(() => {
    if (editingWork) {
      const clientData = editingWork.clientData || {};
      setFormData({
        workType: editingWork.workType || 'culvert',
        firstName: clientData.firstName || '',
        lastName: clientData.lastName || '',
        email: clientData.email || '',
        phone: clientData.phone || '',
        address: clientData.address || editingWork.propertyAddress || '',
        description: editingWork.description || '',
        notes: editingWork.notes || '',
        linkedWorkId: editingWork.linkedWorkId || null,
      });

      // Load existing items
      if (editingWork.items) {
        setItems(editingWork.items.map(item => ({
          id: item.id,
          tempId: generateTempId(),
          category: item.category,
          description: item.description,
          quantity: parseFloat(item.quantity),
          unit: item.unit || 'ea',
          unitCost: parseFloat(item.unitCost),
          totalCost: parseFloat(item.totalCost),
          discount: parseFloat(item.discount || 0),
          finalCost: parseFloat(item.finalCost),
          isFromTemplate: item.isFromTemplate || false,
          templateItemId: item.templateItemId || null
        })));
      }

      // 🆕 Cargar valores de discount y payment al editar
      setDiscountPercentage(editingWork.discountPercentage || 0);
      setInitialPaymentPercentage(editingWork.initialPaymentPercentage || 100);
    } else {
      // Reset form for new work
      setFormData({
        workType: 'culvert',
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        address: '',
        description: '',
        notes: '',
        linkedWorkId: null,
      });
      setItems([]);
      setDiscountPercentage(0);
      setInitialPaymentPercentage(100); // 🆕 Reset payment percentage
      setSelectedLinkedWork(null);
      setWorkSearchQuery('');
    }

    setErrors({});
  }, [editingWork, isOpen]);

  // Load attachments when editing work
  useEffect(() => {
    if (editingWork && editingWork.attachments) {
      setAttachments(editingWork.attachments || []);
    } else {
      setAttachments([]);
    }
  }, [editingWork]);

  // Handle form input change
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  // Search client works
  const handleWorkSearch = () => {
    if (workSearchQuery.trim()) {
      dispatch(fetchClientWorks({
        search: workSearchQuery.trim(),
        limit: 10
      }));
    }
  };

  // Select linked work
  const selectLinkedWork = (work) => {
    setSelectedLinkedWork(work);
    setFormData(prev => ({
      ...prev,
      linkedWorkId: work.id,
      firstName: work.clientData?.name?.split(' ')[0] || '',
      lastName: work.clientData?.name?.split(' ').slice(1).join(' ') || '',
      email: work.clientData?.email || '',
      phone: '', // No disponible desde Works
      address: work.clientData?.address || work.propertyAddress || '',
    }));
    setShowWorkSearch(false);
  };

  // Clear linked work
  const clearLinkedWork = () => {
    setSelectedLinkedWork(null);
    setFormData(prev => ({ ...prev, linkedWorkId: null }));
    dispatch(clearClientWorks());
  };

  // Attachment functions
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('El archivo no puede ser mayor a 10MB');
      return;
    }

    // Allow common file types (images and PDFs)
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Solo se permiten imágenes (JPG, PNG, GIF) y PDFs');
      return;
    }

    setIsUploadingAttachment(true);
    
    try {
      // Upload to temporary location or directly to cloudinary for temporary storage
      const formData = new FormData();
      formData.append('file', file);
      
      // Use a temp upload endpoint that doesn't require work ID
      const { data } = await api.post('/simple-works/temp-attachments', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (data.success) {
        const tempAttachment = {
          id: Date.now().toString(),
          filename: file.name,
          originalName: file.name,
          url: data.url,
          publicId: data.publicId,
          uploadedAt: new Date(),
          size: file.size,
          type: file.type,
          isTemp: true
        };
        
        setAttachments(prev => [...prev, tempAttachment]);
        toast.success('Archivo subido exitosamente');
        // Reset input
        event.target.value = '';
      } else {
        toast.error(data.message || 'Error subiendo archivo');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error(error.response?.data?.message || 'Error subiendo archivo');
    } finally {
      setIsUploadingAttachment(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId) => {
    const attachment = attachments.find(att => att.id === attachmentId);
    if (!attachment) return;

    try {
      // If it's a temporary attachment, delete from cloudinary directly
      if (attachment.isTemp) {
        const { data } = await api.delete(`/simple-works/temp-attachments/${attachmentId}`);
        
        if (data.success) {
          setAttachments(prev => prev.filter(att => att.id !== attachmentId));
          toast.success('Archivo eliminado exitosamente');
        }
      } else if (editingWork?.id) {
        // If it's a saved attachment, use the regular endpoint
        const { data } = await api.delete(`/simple-works/${editingWork.id}/attachments/${attachmentId}`);
        
        if (data.success) {
          setAttachments(prev => prev.filter(att => att.id !== attachmentId));
          toast.success('Archivo eliminado exitosamente');
        }
      } else {
        // Just remove from local state for temp files
        setAttachments(prev => prev.filter(att => att.id !== attachmentId));
        toast.success('Archivo eliminado exitosamente');
      }
    } catch (error) {
      console.error('Error deleting attachment:', error);
      toast.error('Error eliminando archivo');
    }
  };

  // Validation
  const validateForm = () => {
    const newErrors = {};

    if (!formData.workType.trim()) newErrors.workType = 'Tipo de trabajo requerido';
    if (!formData.firstName.trim()) newErrors.firstName = 'Nombre requerido';
    // lastName is now optional - no validation needed
    if (!formData.email.trim()) newErrors.email = 'Email requerido';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email debe tener formato válido';
    if (!formData.phone.trim()) newErrors.phone = 'Teléfono requerido';
    if (!formData.address.trim()) newErrors.address = 'Dirección requerida';
    if (!formData.description.trim()) newErrors.description = 'Descripción requerida';
    
    if (items.length === 0) {
      newErrors.items = 'Debe agregar al menos un item';
    }

    // Validate items
    const itemErrors = [];
    items.forEach((item, index) => {
      const itemError = {};
      if (!item.description?.trim()) itemError.description = 'Descripción requerida';
      if (item.quantity <= 0) itemError.quantity = 'Cantidad debe ser mayor a 0';
      if (item.unitCost <= 0) itemError.unitCost = 'Costo unitario debe ser mayor a 0';
      
      if (Object.keys(itemError).length > 0) {
        itemErrors[index] = itemError;
      }
    });

    if (itemErrors.length > 0) {
      newErrors.itemErrors = itemErrors;
    }

    return newErrors;
  };

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error('Por favor corrige los errores en el formulario');
      return;
    }

    try {
      // Prepare items for submission
      const itemsForSubmission = items.map((item, index) => ({
        category: item.category,
        description: item.description.trim(),
        quantity: item.quantity,
        unit: item.unit || 'ea',
        unitCost: item.unitCost,
        totalCost: item.totalCost,
        discount: item.discount || 0,
        finalCost: item.finalCost,
        displayOrder: index + 1,
        isFromTemplate: item.isFromTemplate || false,
        templateItemId: item.templateItemId || null
      }));

      // Calculate estimated amount from items
      const itemsTotal = itemsForSubmission.reduce((sum, item) => {
        const itemFinalCost = parseFloat(item.finalCost) || parseFloat(item.totalCost) || 0;
        return sum + itemFinalCost;
      }, 0);

      // Apply discount to get final estimated amount
      const estimatedAmount = discountPercentage > 0 
        ? itemsTotal * (1 - discountPercentage / 100)
        : itemsTotal;

      const workData = {
        workType: formData.workType,
        clientData: {
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim()
        },
        propertyAddress: formData.address.trim(),
        description: formData.description.trim(),
        estimatedAmount: estimatedAmount, // Required field
        notes: formData.notes.trim(),
        linkedWorkId: formData.linkedWorkId,
        items: itemsForSubmission,
        discountPercentage: discountPercentage,
        initialPaymentPercentage: initialPaymentPercentage,
        attachments: attachments // 🆕 Incluir attachments
      };

      if (editingWork) {
        await dispatch(updateSimpleWork(editingWork.id, workData));
        toast.success('Trabajo actualizado exitosamente');
      } else {
        await dispatch(createSimpleWork(workData));
        toast.success('Trabajo creado exitosamente');
      }

      if (onWorkCreated) {
        onWorkCreated();
      }
      onClose();
    } catch (error) {
      console.error('Error submitting SimpleWork:', error);
      toast.error('Error al procesar el trabajo');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 z-10">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <FaTools />
              {editingWork ? 'Editar Trabajo Simple' : 'Crear Nuevo Trabajo Simple'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 p-2"
            >
              <FaTimes size={20} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Work Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Trabajo *
            </label>
            <select
              value={formData.workType}
              onChange={(e) => handleInputChange('workType', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.workType ? 'border-red-500' : 'border-gray-300'
              }`}
              required
            >
              <option value="culvert">Culvert</option>
              <option value="drainfield">Drainfield</option>
              <option value="inspection">Inspection</option>
              <option value="repair">Repair</option>
              <option value="maintenance">Maintenance</option>
              <option value="other">Other</option>
            </select>
            {errors.workType && (
              <p className="text-red-500 text-xs mt-1">{errors.workType}</p>
            )}
          </div>

          {/* Link to existing work */}
          {!editingWork && (
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-medium text-gray-700">🔗 Vincular con Trabajo Existente (Opcional)</h3>
                <button
                  type="button"
                  onClick={() => setShowWorkSearch(!showWorkSearch)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <FaSearch />
                </button>
              </div>

              {showWorkSearch && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Buscar por dirección, nombre del cliente..."
                      value={workSearchQuery}
                      onChange={(e) => setWorkSearchQuery(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleWorkSearch()}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                    />
                    <button
                      type="button"
                      onClick={handleWorkSearch}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Buscar
                    </button>
                    <button
                      type="button"
                      onClick={() => dispatch(fetchClientWorks({ limit: 50 }))}
                      className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                    >
                      Ver Todos
                    </button>
                  </div>

                  {clientWorks && clientWorks.length > 0 ? (
                    <div className="max-h-40 overflow-y-auto space-y-2">
                      {clientWorks.map(work => (
                        <div
                          key={work.id}
                          onClick={() => selectLinkedWork(work)}
                          className="p-3 border border-gray-200 rounded-md cursor-pointer hover:bg-gray-50"
                        >
                          <div className="font-medium">Work #{work.id}</div>
                          <div className="text-sm text-gray-700">{work.propertyAddress}</div>
                          <div className="text-xs text-gray-500">
                            Cliente: {work.clientData?.name || 'No disponible'} - Status: {work.status}
                          </div>
                          {work.clientData?.email && (
                            <div className="text-xs text-gray-500">Email: {work.clientData.email}</div>
                          )}
                          {work.clientData?.company && (
                            <div className="text-xs text-gray-500">Empresa: {work.clientData.company}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500">
                      {workSearchQuery ? 'No se encontraron trabajos con esa búsqueda' : 'No hay trabajos disponibles para vinculación'}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Property Address */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium text-gray-700 mb-4">🏠 Property Address</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Property Address *
              </label>
              <input
                type="text"
                placeholder="123 Main Street, City, State ZIP"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.address ? 'border-red-500' : 'border-gray-300'
                }`}
                required
              />
              {errors.address && (
                <p className="text-red-500 text-xs mt-1">{errors.address}</p>
              )}
            </div>
          </div>

          {/* Customer Client */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium text-gray-700 mb-4">👤 CUSTOMER CLIENT</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  placeholder="Cliente Name"
                  value={`${formData.firstName} ${formData.lastName}`.trim()}
                  onChange={(e) => {
                    const names = e.target.value.split(' ');
                    const firstName = names[0] || '';
                    const lastName = names.slice(1).join(' ') || '';
                    handleInputChange('firstName', firstName);
                    handleInputChange('lastName', lastName);
                  }}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.firstName ? 'border-red-500' : 'border-gray-300'
                  }`}
                  required
                />
                {errors.firstName && (
                  <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  placeholder="email@example.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  required
                />
                {errors.email && (
                  <p className="text-red-500 text-xs mt-1">{errors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone *
                </label>
                <input
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.phone ? 'border-red-500' : 'border-gray-300'
                  }`}
                  required
                />
                {errors.phone && (
                  <p className="text-red-500 text-xs mt-1">{errors.phone}</p>
                )}
              </div>
            </div>
          </div>

          {/* Items Section - Using DynamicCategorySection like CreateBudget */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium text-gray-700 mb-4">📋 Items del Trabajo</h3>
            
            <div className="space-y-4">
              {/* Generar secciones dinámicamente para cada categoría */}
              {/* {availableCategories.map(category => (
                <DynamicCategorySection
                  key={category}
                  category={category}
                  normalizedCatalog={normalizedBudgetItemsCatalog}
                  isVisible={dynamicSectionVisibility[category] || false}
                  onToggle={() => toggleDynamicSection(category)}
                  onAddItem={addItemFromDynamicSection}
                  generateTempId={generateTempId}
                />
              ))} */}

              {/* Manual Item Button */}
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => setShowManualItemForm(true)}
                  className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
                >
                  + Agregar Item Manual
                </button>
              </div>

              {/* Manual Item Form Modal */}
              {showManualItemForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white p-6 rounded-lg shadow-lg w-96 max-w-90vw">
                    <h3 className="text-lg font-semibold mb-4">Agregar Item Manual</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Descripción *
                        </label>
                        <input
                          type="text"
                          value={manualItem.description}
                          onChange={(e) => setManualItem({...manualItem, description: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Descripción del item"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Cantidad
                          </label>
                          <input
                            type="number"
                            value={manualItem.quantity}
                            onChange={(e) => setManualItem({...manualItem, quantity: parseFloat(e.target.value) || 1})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            min="1"
                            step="0.01"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Precio Unitario ($)
                          </label>
                          <input
                            type="number"
                            value={manualItem.unitCost}
                            onChange={(e) => setManualItem({...manualItem, unitCost: parseFloat(e.target.value) || 0})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            min="0"
                            step="0.01"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Categoría
                        </label>
                        <select
                          value={manualItem.category}
                          onChange={(e) => setManualItem({...manualItem, category: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="OTHER">Otros</option>
                          {availableCategories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                        <strong>Total: ${((manualItem.quantity || 1) * (manualItem.unitCost || 0)).toFixed(2)}</strong>
                      </div>
                    </div>
                    
                    <div className="flex justify-end gap-3 mt-6">
                      <button
                        type="button"
                        onClick={() => setShowManualItemForm(false)}
                        className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={addManualItem}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        Agregar Item
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Show current items */}
              {items.length > 0 && (
                <div className="mt-6 border-t pt-4">
                  <h4 className="font-medium text-gray-700 mb-3">Items Agregados:</h4>
                  <div className="space-y-2">
                    {items.map((item, index) => (
                      <div key={item.tempId || index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <div>
                          <span className="font-medium">{item.description || item.name}</span>
                          <span className="text-sm text-gray-500 ml-2">
                            {item.quantity || 1} x ${(parseFloat(item.unitCost) || 0).toFixed(2)} = ${(parseFloat(item.totalCost) || 0).toFixed(2)}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setItems(items.filter((_, i) => i !== index))}
                          className="text-red-600 hover:text-red-800 p-1"
                        >
                          <FaTrash size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                  
                  {/* Discount section */}
                  <div className="mt-4 p-3 bg-blue-50 rounded">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Descuento (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={discountPercentage}
                      onChange={(e) => setDiscountPercentage(parseFloat(e.target.value) || 0)}
                      className="w-20 px-2 py-1 border border-gray-300 rounded text-center"
                    />
                    <span className="ml-2 text-sm text-gray-600">
                      Total: ${items.reduce((sum, item) => {
                        const itemTotal = parseFloat(item.totalCost) || 0;
                        return sum + itemTotal;
                      }, 0).toFixed(2)}
                      {discountPercentage > 0 && (
                        <span className="ml-2 text-green-600">
                          (Con descuento: ${(items.reduce((sum, item) => {
                            const itemTotal = parseFloat(item.totalCost) || 0;
                            return sum + itemTotal;
                          }, 0) * (1 - discountPercentage/100)).toFixed(2)})
                        </span>
                      )}
                    </span>
                  </div>

                  {/* Payment Percentage section - like Budget */}
                  <div className="mt-4 p-3 bg-green-50 rounded">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Porcentaje de Pago Inicial (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={initialPaymentPercentage}
                      onChange={(e) => setInitialPaymentPercentage(parseFloat(e.target.value) || 100)}
                      className="w-20 px-2 py-1 border border-gray-300 rounded text-center"
                    />
                    <span className="ml-2 text-sm text-gray-600">
                      {(() => {
                        const itemsTotal = items.reduce((sum, item) => {
                          const itemTotal = parseFloat(item.totalCost) || 0;
                          return sum + itemTotal;
                        }, 0);
                        const totalAfterDiscount = itemsTotal * (1 - discountPercentage/100);
                        const initialPayment = totalAfterDiscount * (initialPaymentPercentage/100);
                        const remainingAmount = totalAfterDiscount - initialPayment;
                        
                        return (
                          <>
                            {initialPaymentPercentage === 100 
                              ? `Pago completo: $${totalAfterDiscount.toFixed(2)}`
                              : (
                                <>
                                  Pago inicial: ${initialPayment.toFixed(2)}
                                  <span className="ml-2 text-orange-600">
                                    (Restante: ${remainingAmount.toFixed(2)})
                                  </span>
                                </>
                              )
                            }
                          </>
                        );
                      })()}
                    </span>
                  </div>
                </div>
              )}
              
              {errors.items && (
                <p className="text-red-500 text-xs mt-1">{errors.items}</p>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descripción del Trabajo *
            </label>
            <textarea
              placeholder="Describe el trabajo a realizar..."
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={4}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.description ? 'border-red-500' : 'border-gray-300'
              }`}
              required
            />
            {errors.description && (
              <p className="text-red-500 text-xs mt-1">{errors.description}</p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notas Adicionales
            </label>
            <textarea
              placeholder="Notas adicionales (opcional)..."
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Attachments Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              📎 Archivos Adjuntos (Planos, Documentos)
            </label>
            
            {/* Upload button */}
            <div className="mb-4">
              <label className="cursor-pointer bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 inline-block">
                {isUploadingAttachment ? 'Subiendo...' : 'Subir Archivo'}
                <input
                  type="file"
                  onChange={handleFileUpload}
                  className="hidden"
                  accept=".jpg,.jpeg,.png,.gif,.pdf"
                  disabled={isUploadingAttachment}
                />
              </label>
              <p className="text-xs text-gray-500 mt-1">
                Formatos permitidos: JPG, PNG, GIF, PDF (máx. 10MB)
              </p>
            </div>

              {/* Attachments list */}
              {attachments.length > 0 && (
                <div className="space-y-2">
                  {attachments.map((attachment) => (
                    <div key={attachment.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-md">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          {attachment.type?.includes('image') ? (
                            <img
                              src={attachment.url}
                              alt={attachment.filename}
                              className="w-10 h-10 object-cover rounded"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-blue-100 rounded flex items-center justify-center">
                              <span className="text-blue-600 text-xs font-bold">
                                {attachment.filename?.split('.').pop()?.toUpperCase() || 'DOC'}
                              </span>
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{attachment.filename}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(attachment.uploadedAt).toLocaleDateString()} - 
                            {attachment.size ? ` ${(attachment.size / 1024).toFixed(0)}KB` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <a
                          href={attachment.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Ver
                        </a>
                        <button
                          type="button"
                          onClick={() => handleDeleteAttachment(attachment.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {attachments.length === 0 && (
                <p className="text-gray-500 text-sm italic">No hay archivos adjuntos</p>
              )}
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
            >
              <FaCheck />
              {editingWork ? 'Actualizar Trabajo' : 'Crear Trabajo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdvancedCreateSimpleWorkModal;