import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { expenseActions } from '../../Redux/Actions/balanceActions';
import { 
  ArrowLeftIcon,
  PhotoIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

const WorkerGeneralExpense = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { currentStaff } = useSelector((state) => state.auth);
  
  const [formData, setFormData] = useState({
    amount: '',
    notes: '',
    image: null
  });
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validar tamaño (máx 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('La imagen no puede ser mayor a 5MB');
        return;
      }

      // Validar tipo
      if (!file.type.startsWith('image/')) {
        setError('Solo se permiten archivos de imagen');
        return;
      }

      setFormData(prev => ({
        ...prev,
        image: file
      }));

      // Crear preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
      setError('');
    }
  };

  const handleRemoveImage = () => {
    setFormData(prev => ({
      ...prev,
      image: null
    }));
    setImagePreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validaciones
    const numericAmount = parseFloat(formData.amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError('Por favor, ingresa un monto válido');
      return;
    }

    if (!formData.notes.trim() && !formData.image) {
      setError('Por favor, añade una descripción o una imagen');
      return;
    }

    setLoading(true);

    try {
      // Crear FormData para enviar archivo
      const data = new FormData();
      data.append('amount', numericAmount);
      data.append('notes', formData.notes.trim());
      data.append('staffId', currentStaff?.idStaff || currentStaff?.id);
      
      if (formData.image) {
        data.append('receipt', formData.image);
      }

      // Llamar a la acción Redux
      const result = await expenseActions.createGeneralExpenseWithReceipt(data);
      
      if (result.error) {
        throw new Error(result.message);
      }

      setSuccess(true);
      
      // Limpiar formulario
      setFormData({
        amount: '',
        notes: '',
        image: null
      });
      setImagePreview(null);

      // Mostrar mensaje y regresar después de 2 segundos
      setTimeout(() => {
        navigate('/worker');
      }, 2000);

    } catch (err) {
      setError(err.message || 'Error al guardar el gasto');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
            <CheckCircleIcon className="h-10 w-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Gasto Guardado!</h2>
          <p className="text-gray-600 mb-4">
            El gasto general ha sido registrado correctamente
          </p>
          <div className="animate-pulse text-sm text-gray-500">
            Redirigiendo...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-4 sm:p-6 shadow-lg">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={() => navigate('/worker')}
            className="flex items-center text-white hover:text-green-100 mb-4 transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            <span>Volver</span>
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold">Registrar Gasto General</h1>
          <p className="text-green-100 mt-2">Completa el formulario para registrar un gasto</p>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-3xl mx-auto p-4 sm:p-6">
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start">
              <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Amount Field */}
          <div className="mb-6">
            <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
              <CurrencyDollarIcon className="h-5 w-5 mr-2 text-green-600" />
              Monto ($)
            </label>
            <input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleInputChange}
              step="0.01"
              min="0"
              placeholder="Ej: 50.75"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg"
              required
            />
          </div>

          {/* Notes Field */}
          <div className="mb-6">
            <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
              <DocumentTextIcon className="h-5 w-5 mr-2 text-green-600" />
              Descripción / Notas
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows="4"
              placeholder="Describe el gasto..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              Opcional si subes una imagen del recibo
            </p>
          </div>

          {/* Image Upload */}
          <div className="mb-6">
            <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
              <PhotoIcon className="h-5 w-5 mr-2 text-green-600" />
              Imagen del Recibo (Opcional)
            </label>
            
            {!imagePreview ? (
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  id="image-upload"
                />
                <label
                  htmlFor="image-upload"
                  className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-green-500 hover:bg-green-50 transition-colors"
                >
                  <PhotoIcon className="h-12 w-12 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-600">
                    Click para seleccionar imagen
                  </span>
                  <span className="text-xs text-gray-500 mt-1">
                    PNG, JPG hasta 5MB
                  </span>
                </label>
              </div>
            ) : (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-64 object-contain bg-gray-100 rounded-lg"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-colors shadow-lg"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate('/worker')}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold px-6 py-3 rounded-lg hover:from-green-700 hover:to-green-800 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Guardando...
                </div>
              ) : (
                'Guardar Gasto'
              )}
            </button>
          </div>
        </form>

        {/* Info Card */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">Información importante:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-700">
                <li>El monto debe ser mayor a 0</li>
                <li>Puedes agregar una descripción, una imagen, o ambos</li>
                <li>Las imágenes no deben superar los 5MB</li>
                <li>El gasto quedará registrado con tu nombre de usuario</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkerGeneralExpense;
