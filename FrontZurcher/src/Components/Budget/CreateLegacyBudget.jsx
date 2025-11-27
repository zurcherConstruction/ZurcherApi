import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import api from '../../utils/axios';

const CreateLegacyBudget = () => {
  const navigate = useNavigate();
  const { user } = useSelector(state => state.auth);
  
  const [formData, setFormData] = useState({
    // Datos del Cliente/Permit
    permitNumber: '',
    applicantName: '',
    applicantEmail: '',
    applicantPhone: '',
    propertyAddress: '',
    lot: '',
    block: '',
    systemType: '',
    
    // Datos del Budget
    status: 'approved', // ✅ Legacy budgets ya tienen firma + pago completo del sistema anterior
    totalPrice: '',
    initialPayment: '',
    initialPaymentPercentage: 60,
    discountAmount: 0,
    discountDescription: '',
    generalNotes: '',
    
    // Estado del trabajo (opcional)
    workStatus: '', // vacío = no crear trabajo aún
    workStartDate: '',
    workEndDate: ''
  });

  // Estado para archivos
  const [files, setFiles] = useState({
    signedBudget: null,    // PDF del presupuesto firmado
    permitPdf: null,       // PDF del permit
    optionalDocs: null     // Documentos opcionales
  });

  const [filePreviews, setFilePreviews] = useState({
    signedBudget: '',
    permitPdf: '',
    optionalDocs: ''
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Función para calcular el total después del descuento
  const calculateFinalTotal = () => {
    const total = parseFloat(formData.totalPrice || 0);
    const discount = parseFloat(formData.discountAmount || 0);
    return Math.max(0, total - discount);
  };

  // Función para calcular el pago inicial
  const calculateInitialPayment = () => {
    const finalTotal = calculateFinalTotal();
    const percentage = parseFloat(formData.initialPaymentPercentage || 60);
    return (finalTotal * percentage) / 100;
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    let newFormData = {
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    };

    // Auto-calcular pago inicial cuando cambia el total, descuento o porcentaje
    if (name === 'totalPrice' || name === 'discountAmount' || name === 'initialPaymentPercentage') {
      const total = parseFloat(name === 'totalPrice' ? value : formData.totalPrice || 0);
      const discount = parseFloat(name === 'discountAmount' ? value : formData.discountAmount || 0);
      const percentage = parseFloat(name === 'initialPaymentPercentage' ? value : formData.initialPaymentPercentage || 60);
      
      const finalTotal = Math.max(0, total - discount);
      const calculatedInitialPayment = (finalTotal * percentage) / 100;
      
      newFormData.initialPayment = calculatedInitialPayment.toFixed(2);
    }

    setFormData(newFormData);
  };



  // Funciones para manejar archivos
  const handleFileUpload = (fileType, event) => {
    const file = event.target.files[0];
    if (file) {
      setFiles(prev => ({ ...prev, [fileType]: file }));
      setFilePreviews(prev => ({ ...prev, [fileType]: file.name }));
    }
  };

  const removeFile = (fileType) => {
    setFiles(prev => ({ ...prev, [fileType]: null }));
    setFilePreviews(prev => ({ ...prev, [fileType]: '' }));
  };



  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    // Validación de campos requeridos
    const requiredFields = {
      'Número de Permiso': formData.permitNumber,
      'Nombre del Solicitante': formData.applicantName,
      'Dirección de la Propiedad': formData.propertyAddress,
      'Tipo de Sistema': formData.systemType,
      'Precio Total': formData.totalPrice
    };

    const emptyFields = Object.entries(requiredFields)
      .filter(([key, value]) => !value || value.toString().trim() === '')
      .map(([key]) => key);

    if (emptyFields.length > 0) {
      setMessage(`❌ Por favor completa los siguientes campos requeridos:\n• ${emptyFields.join('\n• ')}`);
      setLoading(false);
      return;
    }

    // Validación del presupuesto firmado (requerido)
    if (!files.signedBudget) {
      setMessage('❌ El archivo del presupuesto firmado es requerido.');
      setLoading(false);
      return;
    }

    try {
      console.log('🔍 DEBUG Frontend enviando:', {
        totalPrice: formData.totalPrice,
        initialPayment: formData.initialPayment,
        hasFiles: {
          signedBudget: !!files.signedBudget,
          permitPdf: !!files.permitPdf,
          optionalDocs: !!files.optionalDocs
        }
      });
      
      // Validar campos de precio
      if (!formData.totalPrice || parseFloat(formData.totalPrice) <= 0) {
        setMessage('❌ Error: El total del presupuesto debe ser mayor a 0');
        setLoading(false);
        return;
      }

      if (!formData.initialPayment || parseFloat(formData.initialPayment) <= 0) {
        setMessage('❌ Error: El pago inicial debe ser mayor a 0');
        setLoading(false);
        return;
      }

      // Validar campos requeridos
      if (!formData.permitNumber.trim()) {
        setMessage('❌ Error: Número de permit es requerido');
        setLoading(false);
        return;
      }

      if (!formData.applicantName.trim()) {
        setMessage('❌ Error: Nombre del cliente es requerido');
        setLoading(false);
        return;
      }

      if (!formData.propertyAddress.trim()) {
        setMessage('❌ Error: Dirección de la propiedad es requerida');
        setLoading(false);
        return;
      }
      
      // Crear FormData para enviar archivos
      const formDataToSend = new FormData();
      
      // Agregar todos los datos del formulario
      formDataToSend.append('permitNumber', formData.permitNumber);
      formDataToSend.append('applicantName', formData.applicantName);
      formDataToSend.append('applicantEmail', formData.applicantEmail || '');
      formDataToSend.append('applicantPhone', formData.applicantPhone || '');
      formDataToSend.append('propertyAddress', formData.propertyAddress);
      formDataToSend.append('lot', formData.lot || '');
      formDataToSend.append('block', formData.block || '');
      formDataToSend.append('systemType', formData.systemType);
      formDataToSend.append('status', formData.status);
      formDataToSend.append('totalPrice', formData.totalPrice.toString());
      formDataToSend.append('initialPayment', formData.initialPayment.toString());
      formDataToSend.append('discountAmount', formData.discountAmount || 0);
      formDataToSend.append('discountDescription', formData.discountDescription || '');
      formDataToSend.append('generalNotes', formData.generalNotes || '');
      formDataToSend.append('workStatus', formData.workStatus || '');
      formDataToSend.append('workStartDate', formData.workStartDate || '');
      formDataToSend.append('workEndDate', formData.workEndDate || '');
      
      // Agregar archivos si existen (usando los nombres exactos que espera el backend)
      if (files.signedBudget) {
        formDataToSend.append('signedBudget', files.signedBudget);
        console.log('📎 Presupuesto firmado:', files.signedBudget.name);
      }
      if (files.permitPdf) {
        formDataToSend.append('permitPdf', files.permitPdf);
        console.log('📎 PDF del permiso:', files.permitPdf.name);
      }
      if (files.optionalDocs) {
        formDataToSend.append('optionalDocs', files.optionalDocs);
        console.log('📎 Documentos opcionales:', files.optionalDocs.name);
      }
      
      // Debug: verificar datos antes del envío
      console.log('📊 Datos del formulario a enviar:');
      console.log('- Número de permiso:', formData.permitNumber);
      console.log('- Cliente:', formData.applicantName);
      console.log('- Sistema:', formData.systemType);
      console.log('- Precio total:', formData.totalPrice);
      console.log('- Pago inicial:', formData.initialPayment);
      console.log('- Descuento:', formData.discountAmount);

      console.log('🚀 Enviando solicitud a:', 'import/work');
      
      const response = await api.post('import/work', formDataToSend);

      console.log('📡 Respuesta del servidor:', response.status, response.statusText);

      // Con axios, los datos están directamente en response.data
      const result = response.data;
      console.log('✅ Resultado completo:', result);
        
      let successMessage = '✅ Trabajo legacy importado exitosamente!\n\n';
      
      if (result.data) {
        if (result.data.budget) {
          successMessage += `📊 Presupuesto ID: ${result.data.budget.idBudget}\n`;
        }
        if (result.data.permit) {
          successMessage += `📋 Permit ID: ${result.data.permit.idPermit}\n`;
        }
        if (result.data.work) {
          successMessage += `🔨 Trabajo ID: ${result.data.work.idWork}\n`;
        }
      } else {
        successMessage += `ID: ${result.id || result.workId || 'Generado exitosamente'}\n`;
      }
      
      successMessage += '\n🔄 Redirigiendo a la lista de presupuestos...';
      setMessage(successMessage);
        
        // Resetear formulario
        setFormData({
          permitNumber: '',
          applicantName: '',
          applicantEmail: '',
          applicantPhone: '',
          propertyAddress: '',
          lot: '',
          block: '',
          systemType: '',
          status: 'APPROVED',
          totalPrice: '',
          initialPayment: '',
          discountAmount: '',
          discountDescription: '',
          finalTotal: '',
          initialPaymentPercentage: '30',
          generalNotes: '',
          workStatus: 'IN_PROGRESS',
          workStartDate: '',
          workEndDate: ''
        });
        
        setFiles({ signedBudget: null, permitPdf: null, optionalDocs: null });
        setFilePreviews({ signedBudget: '', permitPdf: '', optionalDocs: '' });

        // Limpiar inputs de archivo
        const fileInputs = document.querySelectorAll('input[type="file"]');
        fileInputs.forEach(input => input.value = '');

      setTimeout(() => {
        navigate('/progress-tracker');
      }, 3000);
    } catch (error) {
      console.error('❌ Error completo:', error);
      
      let errorMessage = 'Error de conexión';
      
      if (error.response) {
        // Error del servidor
        const status = error.response.status;
        const data = error.response.data;
        
        // Verificar si es un error de tamaño de archivo
        if (data?.error && data?.sizeMB) {
          errorMessage = `❌ ${data.message}`;
        } else {
          errorMessage = `Error ${status}: ${data?.message || data?.error || error.response.statusText}`;
        }
        console.error('❌ Error del servidor:', data);
      } else if (error.request) {
        // No hubo respuesta
        errorMessage = 'No se pudo conectar al servidor. Verifica que el backend esté ejecutándose.';
        console.error('❌ Sin respuesta del servidor:', error.request);
      } else {
        // Error en la configuración
        errorMessage = error.message;
        console.error('❌ Error de configuración:', error.message);
      }
      
      setMessage(`❌ ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        📁 Importar Trabajo Legacy
      </h2>
      
      <p className="mb-6 text-gray-600 bg-blue-50 p-4 rounded-lg">
        💡 <strong>Importante:</strong> Importa trabajos ya iniciados con todos sus documentos. 
        El sistema continuará el flujo desde el punto donde lo dejes.
      </p>

      {message && (
        <div className={`mb-4 p-4 rounded-lg ${
          message.includes('❌') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
        }`}>
          <pre className="whitespace-pre-wrap">{message}</pre>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Información del Cliente y Permit */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">👤 Información del Cliente y Permit</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Número de Permit *</label>
              <input
                type="text"
                name="permitNumber"
                value={formData.permitNumber}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-lg"
                placeholder="P2024-001"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Nombre del Cliente *</label>
              <input
                type="text"
                name="applicantName"
                value={formData.applicantName}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-lg"
                placeholder="Juan Pérez"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Email del Cliente</label>
              <input
                type="email"
                name="applicantEmail"
                value={formData.applicantEmail}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-lg"
                placeholder="juan@email.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Teléfono del Cliente</label>
              <input
                type="tel"
                name="applicantPhone"
                value={formData.applicantPhone}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-lg"
                placeholder="(555) 123-4567"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Dirección de la Propiedad *</label>
              <input
                type="text"
                name="propertyAddress"
                value={formData.propertyAddress}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-lg"
                placeholder="123 Main St, City, State"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Tipo de Sistema</label>
              <input
                type="text"
                name="systemType"
                value={formData.systemType}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-lg"
                placeholder="Ej: Sistema Séptico, Solar, Pozo, etc."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Lote</label>
              <input
                type="text"
                name="lot"
                value={formData.lot}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-lg"
                placeholder="15"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Block</label>
              <input
                type="text"
                name="block"
                value={formData.block}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-lg"
                placeholder="A"
              />
            </div>
          </div>
        </div>

        {/* Archivos de Documentos */}
        <div className="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-400">
          <h3 className="text-lg font-semibold mb-4">📎 Cargar Documentos</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Presupuesto Firmado */}
            <div className="bg-white p-4 rounded-lg border-2 border-dashed border-gray-300">
              <h4 className="font-medium mb-2">📋 Presupuesto Firmado</h4>
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => handleFileUpload('signedBudget', e)}
                className="w-full p-2 text-sm border rounded-lg"
              />
              {filePreviews.signedBudget && (
                <div className="mt-2 flex items-center justify-between bg-gray-100 p-2 rounded">
                  <span className="text-sm truncate">{filePreviews.signedBudget}</span>
                  <button
                    type="button"
                    onClick={() => removeFile('signedBudget')}
                    className="text-red-500 hover:text-red-700 ml-2"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            {/* PDF del Permit */}
            <div className="bg-white p-4 rounded-lg border-2 border-dashed border-gray-300">
              <h4 className="font-medium mb-2">📜 PDF del Permit</h4>
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => handleFileUpload('permitPdf', e)}
                className="w-full p-2 text-sm border rounded-lg"
              />
              {filePreviews.permitPdf && (
                <div className="mt-2 flex items-center justify-between bg-gray-100 p-2 rounded">
                  <span className="text-sm truncate">{filePreviews.permitPdf}</span>
                  <button
                    type="button"
                    onClick={() => removeFile('permitPdf')}
                    className="text-red-500 hover:text-red-700 ml-2"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            {/* Documentos Opcionales */}
            <div className="bg-white p-4 rounded-lg border-2 border-dashed border-gray-300">
              <h4 className="font-medium mb-2">📁 Documentos Opcionales</h4>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => handleFileUpload('optionalDocs', e)}
                className="w-full p-2 text-sm border rounded-lg"
              />
              {filePreviews.optionalDocs && (
                <div className="mt-2 flex items-center justify-between bg-gray-100 p-2 rounded">
                  <span className="text-sm truncate">{filePreviews.optionalDocs}</span>
                  <button
                    type="button"
                    onClick={() => removeFile('optionalDocs')}
                    className="text-red-500 hover:text-red-700 ml-2"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Información del Presupuesto */}
        <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-400">
          <h3 className="text-lg font-semibold mb-4">💰 Información del Presupuesto</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Estado del Presupuesto</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-lg"
              >
                <option value="signed">Firmado</option>
                <option value="approved">Aprobado</option>
                <option value="pending">Pendiente</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Total del Presupuesto ($) *</label>
              <input
                type="number"
                name="totalPrice"
                value={formData.totalPrice}
                onChange={handleInputChange}
                min="0"
                step="0.01"
                className="w-full p-2 border rounded-lg"
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Descuento ($)</label>
              <input
                type="number"
                name="discountAmount"
                value={formData.discountAmount}
                onChange={handleInputChange}
                min="0"
                step="0.01"
                className="w-full p-2 border rounded-lg"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">% Pago Inicial</label>
              <input
                type="number"
                name="initialPaymentPercentage"
                value={formData.initialPaymentPercentage}
                onChange={handleInputChange}
                min="0"
                max="100"
                className="w-full p-2 border rounded-lg"
                placeholder="60"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium mb-2">Descripción del Descuento</label>
              <input
                type="text"
                name="discountDescription"
                value={formData.discountDescription}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-lg"
                placeholder="Descuento por pronto pago"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Notas Generales</label>
              <textarea
                name="generalNotes"
                value={formData.generalNotes}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-lg"
                rows="2"
                placeholder="Notas adicionales sobre el presupuesto..."
              />
            </div>
          </div>
          
          {/* Resumen Visual */}
          <div className="mt-4 p-4 bg-white rounded-lg border-2 border-green-200">
            <h4 className="font-medium mb-2">📊 Resumen del Presupuesto</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-sm text-gray-600">Total Original</p>
                <p className="text-xl font-bold text-gray-900">${parseFloat(formData.totalPrice || 0).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Descuento</p>
                <p className="text-xl font-bold text-red-600">-${parseFloat(formData.discountAmount || 0).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Final</p>
                <p className="text-xl font-bold text-blue-600">${calculateFinalTotal().toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Pago Inicial ({formData.initialPaymentPercentage}%)</p>
                <p className="text-xl font-bold text-green-600">${calculateInitialPayment().toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Estado del Trabajo (Opcional) */}
        <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400">
          <h3 className="text-lg font-semibold mb-4">🔧 Estado del Trabajo (Opcional)</h3>
          <p className="text-sm text-gray-600 mb-4">
            Si ya hay trabajo iniciado, puedes configurar el estado actual. Si no, deja en blanco para crear solo el presupuesto y permit.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Estado del Trabajo</label>
              <select
                name="workStatus"
                value={formData.workStatus}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-lg"
              >
                <option value="">No crear trabajo aún</option>
                <option value="pending">Pendiente</option>
                <option value="assigned">Asignado</option>
                <option value="inProgress">En Progreso</option>
                <option value="installed">Instalado</option>
                <option value="firstInspectionPending">Pendiente Primera Inspección</option>
                <option value="approvedInspection">Inspección Aprobada</option>
                <option value="rejectedInspection">Inspección Rechazada</option>
                <option value="coverPending">Pendiente de Cubrir</option>
                <option value="covered">Cubierto</option>
                <option value="invoiceFinal">Invoice Final</option>
                <option value="paymentReceived">Pago Final Recibido</option>
                <option value="finalInspectionPending">Pendiente Inspección Final</option>
                <option value="finalApproved">Final Aprobada</option>
                <option value="finalRejected">Final Rechazada</option>
                <option value="maintenance">🔧 Mantenimiento</option>
                <option value="cancelled">Cancelado</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Fecha de Inicio</label>
              <input
                type="date"
                name="workStartDate"
                value={formData.workStartDate}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Fecha de Finalización</label>
              <input
                type="date"
                name="workEndDate"
                value={formData.workEndDate}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-lg"
              />
            </div>
          </div>
        </div>



        {/* Botones de Acción */}
        <div className="flex justify-between items-center pt-6 border-t">
          <div className="text-sm text-gray-600">
            Los campos marcados con * son obligatorios
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
          >
            {loading ? '⏳ Importando...' : '📁 Importar Trabajo Legacy'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateLegacyBudget;