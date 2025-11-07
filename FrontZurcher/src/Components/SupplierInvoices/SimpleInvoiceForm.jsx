import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { FaSave, FaTimes, FaFileUpload, FaEye } from 'react-icons/fa';

// Lista de proveedores frecuentes
const COMMON_VENDORS = [
  'ACELIO GARCIA',
  'Arian transport Inc',
  'DRAKE',
  'H P TRUCKING, INC.',
  'HAJOCA',
  'Hugo & AY Professional Pavers',
  'JY&Trucking Transportation LLC',
  'Kye motors llc',
  'Lopez-Concrete Services LLC',
  'VCCG Partner corp',
  'Otro (Escribir manualmente)'
];

const SimpleInvoiceForm = ({ invoice, onClose, onSuccess }) => {
  const token = useSelector((state) => state.auth.token);
  const isEditing = !!invoice;

  const [formData, setFormData] = useState({
    invoiceNumber: invoice?.invoiceNumber || '',
    vendor: invoice?.vendor || '',
    issueDate: invoice?.issueDate?.split('T')[0] || new Date().toISOString().split('T')[0],
    dueDate: invoice?.dueDate?.split('T')[0] || '',
    totalAmount: invoice?.totalAmount || '',
    notes: invoice?.notes || ''
  });

  const [selectedVendor, setSelectedVendor] = useState(
    COMMON_VENDORS.slice(0, -1).includes(invoice?.vendor) 
      ? invoice?.vendor 
      : invoice?.vendor 
        ? 'Otro (Escribir manualmente)' 
        : ''
  );
  const [customVendor, setCustomVendor] = useState(
    COMMON_VENDORS.slice(0, -1).includes(invoice?.vendor) ? '' : invoice?.vendor || ''
  );

  const [invoiceFile, setInvoiceFile] = useState(null);
  const [invoicePreview, setInvoicePreview] = useState(invoice?.invoicePdfPath || null);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const handleVendorChange = (e) => {
    const value = e.target.value;
    setSelectedVendor(value);
    
    if (value !== 'Otro (Escribir manualmente)') {
      setFormData({ ...formData, vendor: value });
      setCustomVendor('');
    } else {
      setFormData({ ...formData, vendor: '' });
    }
  };

  const handleCustomVendorChange = (e) => {
    const value = e.target.value;
    setCustomVendor(value);
    setFormData({ ...formData, vendor: value });
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      setSubmitting(true);

      // Crear FormData
      const data = new FormData();
      data.append('invoiceNumber', formData.invoiceNumber);
      data.append('vendor', formData.vendor);
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
            <select
              value={selectedVendor}
              onChange={handleVendorChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                errors.vendor ? 'border-red-500' : 'border-gray-300'
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
                placeholder="Escribir nombre del proveedor"
                className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            )}
            
            {errors.vendor && (
              <p className="text-red-500 text-sm mt-1">{errors.vendor}</p>
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
