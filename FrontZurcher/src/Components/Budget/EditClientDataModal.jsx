import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useDispatch } from 'react-redux';
import { fetchContactCompanies } from '../../Redux/Actions/budgetActions';
import api from '../../utils/axios';

// 🆕 Helper para normalizar contactCompany a Title Case
const normalizeCompanyName = (name) => {
  if (!name || typeof name !== 'string') return '';
  
  return name
    .trim()
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const EditClientDataModal = ({ isOpen, onClose, budgetId, onDataUpdated }) => {
  const dispatch = useDispatch();
  
  const [clientData, setClientData] = useState({
    applicantName: '',
    applicantEmail: '',
    applicantPhone: '',
    propertyAddress: '',
    contactCompany: '' 
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  // 🆕 Estados para autocomplete de contactCompany
  const [contactCompanies, setContactCompanies] = useState([]);
  const [showContactDropdown, setShowContactDropdown] = useState(false);
  const [contactSearchTerm, setContactSearchTerm] = useState('');

  // Cargar datos actuales cuando se abre el modal
  useEffect(() => {
    if (isOpen && budgetId) {
      loadClientData();
      loadContactCompanies(); // 🆕 Cargar lista de empresas
    }
  }, [isOpen, budgetId]);

  // 🆕 Cargar lista de contactCompanies
  const loadContactCompanies = async () => {
    try {
      const result = await dispatch(fetchContactCompanies());
      if (result.payload) {
        setContactCompanies(result.payload);
      }
    } catch (error) {
      console.error('❌ Error cargando contactCompanies:', error);
    }
  };

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
          propertyAddress: permit?.propertyAddress || budget?.propertyAddress || '',
          contactCompany: budget?.contactCompany || '' 
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
      // 🆕 Normalizar contactCompany antes de enviar
      const dataToSend = {
        ...clientData,
        contactCompany: normalizeCompanyName(clientData.contactCompany)
      };
      
      const response = await api.patch(`/budget/${budgetId}/client-data`, dataToSend);
      
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
      propertyAddress: '',
      contactCompany: '' 
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

              {/* 🆕 Contact/Company con autocomplete */}
              <div className="relative">
                <label htmlFor="contactCompany" className="block text-sm font-medium text-gray-700 mb-1">
                  Contact/Company
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="contactCompany"
                    name="contactCompany"
                    value={clientData.contactCompany || ''}
                    onChange={(e) => {
                      handleInputChange(e);
                      setContactSearchTerm(e.target.value);
                      setShowContactDropdown(true);
                    }}
                    onFocus={() => {
                      setContactSearchTerm(clientData.contactCompany || '');
                      setShowContactDropdown(true);
                    }}
                    onBlur={() => setTimeout(() => setShowContactDropdown(false), 200)}
                    placeholder="Select existing or type new company"
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 pr-8 text-sm sm:text-base border border-gray-300 rounded-md shadow-sm 
                             focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                             transition-colors bg-white"
                  />
                  <svg className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                
                {/* Dropdown con opciones existentes */}
                {showContactDropdown && contactCompanies.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                    <div className="px-3 py-2 text-xs font-semibold text-gray-500 bg-gray-50 border-b sticky top-0">
                      Existing Companies ({contactCompanies.filter(c => 
                        c.toLowerCase().includes((contactSearchTerm || '').toLowerCase())
                      ).length})
                    </div>
                    {contactCompanies
                      .filter(company => 
                        company.toLowerCase().includes((contactSearchTerm || '').toLowerCase())
                      )
                      .slice(0, 10)
                      .map((company, idx) => (
                        <div
                          key={idx}
                          onClick={() => {
                            setClientData(prev => ({ ...prev, contactCompany: company }));
                            setShowContactDropdown(false);
                          }}
                          className="px-3 py-2 text-sm hover:bg-indigo-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                        >
                          {company}
                        </div>
                      ))
                    }
                    {contactCompanies.filter(c => 
                      c.toLowerCase().includes((contactSearchTerm || '').toLowerCase())
                    ).length === 0 && (
                      <div className="px-3 py-2 text-sm text-gray-500 italic">No matches - type to add new</div>
                    )}
                  </div>
                )}
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