import React, { useState, useEffect } from 'react';
import { FiCopy, FiExternalLink, FiLink, FiEye, FiRefreshCw } from 'react-icons/fi';
import { toast } from 'react-toastify';
import axios from 'axios';

// URL de la API desde variables de entorno
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Componente para mostrar y copiar el enlace del portal de cliente
 * Se incluye en WorkDetail para facilitar el compartir con clientes
 */
const ClientPortalLink = ({ work, budget }) => {
  const [portalUrl, setPortalUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Verificar si hay información de cliente
  const hasClientInfo = budget?.applicantEmail;
  
  // Cargar URL del portal al montar y cuando cambie el budget
  useEffect(() => {
    if (hasClientInfo) {
      fetchPortalUrl();
    }
  }, [budget?.clientPortalToken, budget?.applicantEmail]);

  // Obtener URL del portal existente
  const fetchPortalUrl = async () => {
    if (!budget?.clientPortalToken) return;
    
    try {
      setLoading(true);
      const baseUrl = window.location.origin;
      const url = `${baseUrl}/client-portal/${budget.clientPortalToken}`;
      setPortalUrl(url);
    } catch (error) {
      console.error('Error obteniendo URL del portal:', error);
    } finally {
      setLoading(false);
    }
  };

  // Generar token del portal para el cliente
  const generatePortalToken = async () => {
    if (!hasClientInfo) {
      toast.error('El presupuesto debe tener email del cliente');
      return;
    }

    try {
      setGenerating(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.post(`${API_URL}/client-portal/generate-token`, {
        applicantEmail: budget.applicantEmail,
        contactCompany: budget.contactCompany || null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const { clientToken } = response.data.data;
      const baseUrl = window.location.origin;
      const url = `${baseUrl}/client-portal/${clientToken}`;
      
      setPortalUrl(url);
      toast.success('Portal de cliente generado correctamente');
      
    } catch (error) {
      console.error('Error generando token:', error);
      toast.error(error.response?.data?.message || 'Error generando portal de cliente');
    } finally {
      setGenerating(false);
    }
  };

  // Copiar enlace al portapapeles
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(portalUrl);
      toast.success('Enlace copiado al portapapeles');
    } catch (error) {
      console.error('Error copiando enlace:', error);
      toast.error('Error copiando enlace al portapapeles');
    }
  };

  // Abrir portal en nueva pestaña
  const openPortal = () => {
    window.open(portalUrl, '_blank');
  };

  if (!hasClientInfo) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center">
          <FiLink className="h-5 w-5 text-yellow-600 mr-2" />
          <div>
            <h4 className="text-sm font-medium text-yellow-800">Portal de Cliente</h4>
            <p className="text-sm text-yellow-700 mt-1">
              Este presupuesto no tiene email del cliente configurado
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center">
          <FiEye className="h-5 w-5 text-blue-600 mr-2" />
          <div>
            <h4 className="text-sm font-medium text-blue-900">Portal de Seguimiento</h4>
            <p className="text-xs text-blue-700 mt-1">
              Cliente: {budget.applicantName || budget.applicantEmail}
            </p>
            {budget.contactCompany && (
              <p className="text-xs text-blue-600">
                Empresa: {budget.contactCompany}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {loading && (
            <FiRefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
          )}
          
          {portalUrl ? (
            <>
              <button
                onClick={copyToClipboard}
                className="inline-flex items-center px-2 py-1 border border-blue-300 text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                title="Copiar enlace"
              >
                <FiCopy className="h-3 w-3 mr-1" />
                Copiar
              </button>
              
              <button
                onClick={openPortal}
                className="inline-flex items-center px-2 py-1 border border-green-300 text-xs font-medium rounded text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-green-500"
                title="Abrir portal"
              >
                <FiExternalLink className="h-3 w-3 mr-1" />
                Ver
              </button>
            </>
          ) : (
            <button
              onClick={generatePortalToken}
              disabled={generating}
              className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <FiLink className="h-3 w-3 mr-1" />
              {generating ? 'Generando...' : 'Generar Portal'}
            </button>
          )}
        </div>
      </div>
      
      {portalUrl && (
        <div className="mt-3 p-2 bg-blue-100 rounded text-xs font-mono text-blue-800 break-all">
          {portalUrl}
        </div>
      )}
    </div>
  );
};

export default ClientPortalLink;