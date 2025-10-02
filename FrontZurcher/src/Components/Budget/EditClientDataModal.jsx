import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import api from '../../utils/axios';

const EditClientDataModal = ({ isOpen, onClose, budgetId, onDataUpdated }) => {
  const [clientData, setClientData] = useState({
    applicantName: '',
    applicantEmail: '',
    applicantPhone: '',
    propertyAddress: ''
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Cargar datos actuales cuando se abre el modal
  useEffect(() => {
    if (isOpen && budgetId) {
      loadClientData();
    }
  }, [isOpen, budgetId]);

  const loadClientData = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get(`/budget/${budgetId}/client-data`);
      if (response.data.success) {
        const { budget, permit } = response.data.data;
        setClientData({
          applicantName: permit?.applicantName || budget?.applicantName || '',
          applicantEmail: permit?.applicantEmail || '',
          applicantPhone: permit?.applicantPhone || '',
          propertyAddress: permit?.propertyAddress || budget?.propertyAddress || ''
        });
      }
    } catch (error) {
      console.error('Error al cargar datos de cliente:', error);
      setError('Error al cargar los datos del cliente');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setClientData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const response = await api.patch(`/budget/${budgetId}/client-data`, clientData);
      
      if (response.data.success) {
        // Llamar callback para notificar que los datos se actualizaron
        if (onDataUpdated) {
          onDataUpdated(response.data.data);
        }
        onClose();
      }
    } catch (error) {
      console.error('Error al actualizar datos de cliente:', error);
      setError(error.response?.data?.message || 'Error al actualizar los datos');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setError('');
    setClientData({
      applicantName: '',
      applicantEmail: '',
      applicantPhone: '',
      propertyAddress: ''
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-60 overflow-y-auto h-full w-full z-[9999] flex items-center justify-center p-2 sm:p-4 md:p-6">
      <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-[95vw] sm:max-w-[90vw] md:max-w-lg lg:max-w-xl 
                      max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header - responsive */}
        <div className="flex items-center justify-between p-4 sm:p-5 md:p-6 border-b border-gray-200 bg-gray-50 flex-shrink-0">
          <h3 className="text-base sm:text-lg md:text-xl font-medium text-gray-900 truncate pr-2">
            Editar Datos del Cliente
          </h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-200 p-1.5 sm:p-2 rounded-full transition-colors flex-shrink-0"
          >
            <XMarkIcon className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </div>

        {/* Content - responsive scrollable area */}
        <div className="p-4 sm:p-5 md:p-6 overflow-y-auto flex-grow">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="text-center py-6 sm:py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <p className="mt-2 text-sm text-gray-500">Cargando datos...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nombre del Solicitante */}
              <div>
                <label htmlFor="applicantName" className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre del Solicitante *
                </label>
                <input
                  type="text"
                  id="applicantName"
                  name="applicantName"
                  value={clientData.applicantName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-md shadow-sm 
                           focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                           transition-colors bg-white"
                />
              </div>

              {/* Email */}
              <div>
                <label htmlFor="applicantEmail" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  id="applicantEmail"
                  name="applicantEmail"
                  value={clientData.applicantEmail}
                  onChange={handleInputChange}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-md shadow-sm 
                           focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                           transition-colors bg-white"
                />
              </div>

              {/* Teléfono */}
              <div>
                <label htmlFor="applicantPhone" className="block text-sm font-medium text-gray-700 mb-1">
                  Teléfono
                </label>
                <input
                  type="tel"
                  id="applicantPhone"
                  name="applicantPhone"
                  value={clientData.applicantPhone}
                  onChange={handleInputChange}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-md shadow-sm 
                           focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                           transition-colors bg-white"
                />
              </div>

              {/* Dirección de la Propiedad */}
              <div>
                <label htmlFor="propertyAddress" className="block text-sm font-medium text-gray-700 mb-1">
                  Dirección de la Propiedad *
                </label>
                <textarea
                  id="propertyAddress"
                  name="propertyAddress"
                  value={clientData.propertyAddress}
                  onChange={handleInputChange}
                  required
                  rows={3}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-md shadow-sm 
                           focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                           transition-colors bg-white resize-none"
                />
              </div>

              {/* Botones - responsive */}
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 sm:space-x-3 pt-4 mt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={saving}
                  className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base font-medium text-gray-700 bg-gray-100 
                           border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 
                           focus:ring-gray-500 disabled:opacity-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base font-medium text-white bg-indigo-600 
                           border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 
                           focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center
                           transition-colors"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Guardando...
                    </>
                  ) : (
                    'Guardar Cambios'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditClientDataModal;