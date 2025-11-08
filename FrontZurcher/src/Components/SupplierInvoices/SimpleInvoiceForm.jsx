import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { FaSave, FaTimes, FaFileUpload, FaEye } from 'react-icons/fa';
import axios from 'axios';

const SimpleInvoiceForm = ({ invoice, onClose, onSuccess }) => {
  const token = useSelector((state) => state.auth.token);
  const isEditing = !!invoice;

  // Estado para vendors dinámicos
  const [vendorsList, setVendorsList] = useState([]);
  const [loadingVendors, setLoadingVendors] = useState(true);

  const [formData, setFormData] = useState({
    invoiceNumber: invoice?.invoiceNumber || '',
    vendor: invoice?.vendor || '',
    issueDate: invoice?.issueDate?.split('T')[0] || new Date().toISOString().split('T')[0],
    dueDate: invoice?.dueDate?.split('T')[0] || '',
    totalAmount: invoice?.totalAmount || '',
    notes: invoice?.notes || ''
  });

  const [selectedVendor, setSelectedVendor] = useState(
    invoice?.vendor || ''
  );
  const [customVendor, setCustomVendor] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  const [invoiceFile, setInvoiceFile] = useState(null);
  const [invoicePreview, setInvoicePreview] = useState(invoice?.invoicePdfPath || null);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // 🆕 Cargar vendors desde el backend
  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/supplier-invoices/vendors/list`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        
        if (response.data.success && response.data.vendors.length > 0) {
          const finalList = [...response.data.vendors, 'Otro (Escribir manualmente)'];
          setVendorsList(finalList);
        } else {
          // Fallback si no hay vendors en BD
          setVendorsList([
            'ACELIO GARCIA',
            'ACK Environmental Solutions LLC',
            'Arian transport Inc',
            'DRAKE',
            'GDG Trucking Services Corp',
            'H P TRUCKING, INC.',
            'HAJOCA',
            'Hugo & AY Professional Pavers',
            'JY&Trucking Transportation LLC',
            'Kye motors llc',
            'Lopez-Concrete Services LLC',
            'Master Professional Taxes',
            'VCCG Partner corp',
            'Otro (Escribir manualmente)'
          ]);
        }
      } catch (error) {
        console.error('Error cargando vendors:', error);
        // Fallback a lista predeterminada si falla la petición
        setVendorsList([
          'ACELIO GARCIA',
          'ACK Environmental Solutions LLC',
          'Arian transport Inc',
          'DRAKE',
          'GDG Trucking Services Corp',
          'H P TRUCKING, INC.',
          'HAJOCA',
          'Hugo & AY Professional Pavers',
          'JY&Trucking Transportation LLC',
          'Kye motors llc',
          'Lopez-Concrete Services LLC',
          'Master Professional Taxes',
          'VCCG Partner corp',
          'Otro (Escribir manualmente)'
        ]);
      } finally {
        setLoadingVendors(false);
      }
    };

    fetchVendors();
  }, [token]);

  // 🆕 Determinar si mostrar input personalizado al cargar
  useEffect(() => {
    if (invoice?.vendor && !loadingVendors) {
      const vendorExists = vendorsList.includes(invoice.vendor);
      if (!vendorExists && vendorsList.length > 1) {
        setShowCustomInput(true);
        setSelectedVendor('Otro (Escribir manualmente)');
        setCustomVendor(invoice.vendor);
      }
    }
  }, [invoice, vendorsList, loadingVendors]);

  const handleVendorChange = (e) => {
    const value = e.target.value;
    setSelectedVendor(value);
    
    if (value === 'Otro (Escribir manualmente)') {
      setShowCustomInput(true);
      setFormData({ ...formData, vendor: customVendor });
    } else {
      setShowCustomInput(false);
      setFormData({ ...formData, vendor: value });
      setCustomVendor('');
    }
  };

  const handleCustomVendorChange = (e) => {
    const value = e.target.value;
    setCustomVendor(value);
    setFormData({ ...formData, vendor: value });
  };

  // 🆕 Normalizar nombre de vendor (capitalizar primera letra de cada palabra)
  const normalizeVendorName = (name) => {
    return name
      .trim()
      .split(' ')
      .filter(word => word.length > 0)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setInvoiceFile(file);
      
      // Crear preview
      if (file.type === 'application/pdf') {
        setInvoicePreview('PDF');
      } else {
        const reader = new FileReader();
        reader.onloadend = () => {
          setInvoicePreview(reader.result);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.invoiceNumber.trim()) {
      newErrors.invoiceNumber = 'Número de invoice requerido';
    }
    
    if (!formData.vendor.trim()) {
      newErrors.vendor = 'Proveedor requerido';
    }
    
    if (!formData.totalAmount || parseFloat(formData.totalAmount) <= 0) {
      newErrors.totalAmount = 'Total debe ser mayor a 0';
    }
    
    if (!isEditing && !invoiceFile && !invoice?.invoicePdfPath) {
      newErrors.invoiceFile = 'Debe adjuntar el comprobante del invoice';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // 🆕 Normalizar vendor solo al momento del submit
  const normalizeVendorBeforeSubmit = () => {
    // Si el usuario escribió manualmente, normalizar y buscar match
    if (showCustomInput && customVendor) {
      const normalizedInput = normalizeVendorName(customVendor);
      
      // Buscar vendor existente (case-insensitive)
      const existingVendor = vendorsList.find(
        v => v.toLowerCase().trim() === normalizedInput.toLowerCase().trim() && 
             v !== 'Otro (Escribir manualmente)'
      );
      
      if (existingVendor) {
        console.log(`✅ Usando vendor existente: "${existingVendor}" (escribiste: "${customVendor}")`);
        return existingVendor;
      } else {
        console.log(`✅ Creando vendor nuevo: "${normalizedInput}" (escribiste: "${customVendor}")`);
        return normalizedInput;
      }
    }
    
    return formData.vendor;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    // 🆕 Normalizar vendor justo antes de enviar
    const finalVendor = normalizeVendorBeforeSubmit();

    try {
      setSubmitting(true);

      // Crear FormData
      const data = new FormData();
      data.append('invoiceNumber', formData.invoiceNumber);
      data.append('vendor', finalVendor); // Usar el vendor normalizado
      data.append('issueDate', formData.issueDate);
      data.append('totalAmount', formData.totalAmount);
      
      if (formData.dueDate) {
        data.append('dueDate', formData.dueDate);
      }
      
      if (formData.notes) {
        data.append('notes', formData.notes);
      }

      // Agregar archivo si existe
      if (invoiceFile) {
        data.append('invoiceFile', invoiceFile);
      }

      let response;
      if (isEditing) {
        // Actualizar
        response = await fetch(
          `${import.meta.env.VITE_API_URL}/supplier-invoices/${invoice.idSupplierInvoice}`,
          {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${token}`
            },
            body: data
          }
        );
      } else {
        // Crear
        response = await fetch(
          `${import.meta.env.VITE_API_URL}/supplier-invoices/simple`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`
            },
            body: data
          }
        );
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al guardar el invoice');
      }

      const result = await response.json();
      alert(`✅ Invoice ${isEditing ? 'actualizado' : 'creado'} exitosamente!`);
      
      if (onSuccess) {
        onSuccess(result);
      }
      
      onClose();
    } catch (error) {
      console.error('Error:', error);
      alert(`❌ Error: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800">
            {isEditing ? 'Editar Invoice' : 'Nueva Cuenta por Pagar'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FaTimes className="text-xl" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Invoice Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Número de Invoice *
            </label>
            <input
              type="text"
              value={formData.invoiceNumber}
              onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                errors.invoiceNumber ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Ej: INV-2024-001"
            />
            {errors.invoiceNumber && (
              <p className="text-red-500 text-sm mt-1">{errors.invoiceNumber}</p>
            )}
          </div>

          {/* Vendor */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Proveedor *
            </label>
            {loadingVendors ? (
              <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500">
                Cargando proveedores...
              </div>
            ) : (
              <>
                <select
                  value={selectedVendor}
                  onChange={handleVendorChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                    errors.vendor ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Seleccionar proveedor...</option>
                  {vendorsList.map((vendor, index) => (
                    <option key={`${vendor}-${index}`} value={vendor}>
                      {vendor}
                    </option>
                  ))}
                </select>
                
                {showCustomInput && (
                  <input
                    type="text"
                    value={customVendor}
                    onChange={handleCustomVendorChange}
                    placeholder="Escribir nombre del proveedor"
                    className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                )}
                
                {errors.vendor && (
                  <p className="text-red-500 text-sm mt-1">{errors.vendor}</p>
                )}
              </>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha de Emisión *
              </label>
              <input
                type="date"
                value={formData.issueDate}
                onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha de Vencimiento
              </label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Total Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Total *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.totalAmount}
              onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                errors.totalAmount ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="0.00"
            />
            {errors.totalAmount && (
              <p className="text-red-500 text-sm mt-1">{errors.totalAmount}</p>
            )}
          </div>

          {/* Notes/Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descripción
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Ej: Materiales para obra X, Servicio de Y, etc."
            />
          </div>

          {/* Invoice File */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Comprobante (PDF o Imagen) {!isEditing && '*'}
            </label>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100 ${
                errors.invoiceFile ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.invoiceFile && (
              <p className="text-red-500 text-sm mt-1">{errors.invoiceFile}</p>
            )}
            
            {/* Preview */}
            {invoicePreview && (
              <div className="mt-3">
                {invoicePreview === 'PDF' ? (
                  <p className="text-sm text-green-600 flex items-center">
                    <FaFileUpload className="mr-2" />
                    PDF seleccionado: {invoiceFile?.name}
                  </p>
                ) : invoicePreview.startsWith('http') ? (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Comprobante actual:</p>
                    <a
                      href={invoicePreview}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 flex items-center text-sm"
                    >
                      <FaEye className="mr-2" />
                      Ver comprobante
                    </a>
                  </div>
                ) : (
                  <img
                    src={invoicePreview}
                    alt="Preview"
                    className="max-w-full h-40 object-contain border border-gray-200 rounded"
                  />
                )}
              </div>
            )}
          </div>

          {/* Buttons */}
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
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <FaSave />
                  <span>{isEditing ? 'Actualizar' : 'Crear Invoice'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SimpleInvoiceForm;
