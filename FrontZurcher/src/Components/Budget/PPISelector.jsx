import React, { useState } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { 
  AiOutlineAlert, 
  AiOutlineCheckCircle, 
  AiOutlineDownload, 
  AiOutlineEye, 
  AiOutlineFileText, 
  AiOutlineLoading3Quarters 
} from 'react-icons/ai';

/**
 * Componente para generar PPI (plantilla única)
 * @param {string} permitId - ID del Permit
 */
const PPISelector = ({ permitId }) => {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  const token = useSelector((state) => state.auth.token);

  const [loading, setLoading] = useState(false);
  const [ppiGenerated, setPpiGenerated] = useState(false);
  const [ppiInfo, setPpiInfo] = useState(null);
  const [error, setError] = useState(null);

  // Generar PPI con plantilla única
  const handleGeneratePPI = async () => {
    if (!permitId || permitId === 'null' || permitId === null) {
      setError('⚠️ Debes guardar el Permit primero antes de generar la vista previa del PPI');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(
        `${API_URL}/permit/${permitId}/ppi/generate`,
        {}, // Sin parámetros, usa plantilla por defecto
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setPpiGenerated(true);
        setPpiInfo(response.data);
        
        // Notificar éxito
        alert('✅ PPI generado exitosamente! Ahora puedes verlo o descargarlo.');
      }
    } catch (err) {
      console.error('Error generando PPI:', err);
      setError(err.response?.data?.error || 'Error generando PPI. Verifica que el Permit tenga datos completos.');
    } finally {
      setLoading(false);
    }
  };

  // Ver PPI en nueva pestaña
  const handleViewPPI = () => {
    if (ppiInfo?.viewUrl) {
      window.open(ppiInfo.viewUrl, '_blank');
    } else {
      window.open(`${API_URL}/permit/${permitId}/ppi/view`, '_blank');
    }
  };

  // Descargar PPI
  const handleDownloadPPI = () => {
    if (ppiInfo?.downloadUrl) {
      window.location.href = ppiInfo.downloadUrl;
    } else {
      window.location.href = `${API_URL}/permit/${permitId}/ppi/download`;
    }
  };

  return (
    <div className="ppi-selector-section mt-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-lg">
    

      {/* Botón para generar PPI */}
      {!ppiGenerated && (
        <>
          {(!permitId || permitId === 'null' || permitId === null) ? (
            <div className="p-3 bg-yellow-50 border border-yellow-300 rounded-md">
             
            </div>
          ) : (
            <button
              onClick={handleGeneratePPI}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <AiOutlineLoading3Quarters className="animate-spin" size={18} />
                  <span>Generando...</span>
                </>
              ) : (
                <>
                  <AiOutlineEye size={18} />
                  <span>Generar Vista Previa del PPI</span>
                </>
              )}
            </button>
          )}
        </>
      )}

      {/* Mensaje de error */}
      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
          <AiOutlineAlert className="text-red-600 flex-shrink-0 mt-0.5" size={18} />
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      {/* Mensaje de éxito y acciones */}
      {ppiGenerated && (
        <div className="mt-3 p-4 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-center gap-2 mb-3">
            <AiOutlineCheckCircle className="text-green-600" size={20} />
            <h6 className="font-semibold text-green-800">PPI Generado Exitosamente</h6>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={handleViewPPI}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md flex items-center justify-center gap-2"
            >
              <AiOutlineEye size={18} />
              <span>Ver PPI</span>
            </button>
            <button
              onClick={handleDownloadPPI}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-md flex items-center justify-center gap-2"
            >
              <AiOutlineDownload size={18} />
              <span>Descargar</span>
            </button>
          </div>
          
          <div className="mt-3 pt-3 border-t border-green-300">
            <p className="text-xs text-gray-600">
              <strong className="text-green-700">💡 Importante:</strong> Revisa el PPI para verificar que todos los datos estén correctos. 
              Una vez que el cliente apruebe el presupuesto, este PPI se enviará automáticamente junto con el Invoice a DocuSign.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PPISelector;
