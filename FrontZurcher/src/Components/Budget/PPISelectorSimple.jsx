import React, { useState } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { AiOutlineEdit } from 'react-icons/ai';

/**
 * Componente simple para generar PPI (plantilla única)
 * Integrado en CreateBudget para mostrar el PPI en el visor principal
 */
const PPISelectorSimple = ({ permitId, onPPIGenerated, onEditPermit }) => {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  const token = useSelector((state) => state.auth.token);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Generar PPI con plantilla única
  const handleGeneratePPI = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(
        `${API_URL}/permit/${permitId}/ppi/generate`,
        {}, // Sin parámetros, el backend usa plantilla por defecto
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        // Descargar el PDF con autenticación y crear un blob URL
        const pdfResponse = await axios.get(
          `${API_URL}/permit/${permitId}/ppi/view`,
          {
            headers: { Authorization: `Bearer ${token}` },
            responseType: 'blob'
          }
        );

        // Crear URL del blob para el visor
        const pdfBlob = new Blob([pdfResponse.data], { type: 'application/pdf' });
        const pdfUrl = URL.createObjectURL(pdfBlob);

        // Notificar al componente padre
        if (onPPIGenerated) {
          onPPIGenerated(pdfUrl);
        }
        alert('✅ PPI generado exitosamente! Haz clic en la pestaña PPI para verlo.');
      }
    } catch (err) {
      console.error('Error generando PPI:', err);
      setError(err.response?.data?.error || 'Error generando PPI. Verifica que el Permit tenga datos completos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-lg">
      <h5 className="text-sm font-semibold text-blue-800 mb-3">Pre-Permit Inspection (PPI)</h5>
      
      <div className="space-y-3">
        <div className="p-3 bg-white border border-blue-200 rounded-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <div>
                <p className="text-xs text-gray-600">Documento:</p>
                <p className="text-sm font-semibold text-gray-800">PPI - Plantilla Estándar</p>
              </div>
            </div>
            
            {/* Botón para editar datos del Permit */}
            {onEditPermit && (
              <button
                onClick={onEditPermit}
                className="flex items-center gap-1 px-3 py-1.5 text-xs text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
              >
                <AiOutlineEdit size={14} />
                <span>Editar Datos</span>
              </button>
            )}
          </div>
        </div>

        <button
          onClick={handleGeneratePPI}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '⏳ Generando...' : '🔄 Generar Vista Previa del PPI'}
        </button>

        {error && (
          <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
            {error}
          </div>
        )}

        <p className="text-xs text-gray-500 text-center">
          Los campos del inspector quedarán vacíos para ser completados por el inspector asignado.
        </p>
      </div>
    </div>
  );
};

export default PPISelectorSimple;
 
