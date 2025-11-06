import React from 'react';
import { ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

/**
 * Componente para mostrar errores de carga en WorkDetail
 */
const WorkDetailError = ({ error, onRetry, retryCount = 0 }) => {
  const maxRetries = 3;
  const canRetry = retryCount < maxRetries;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          {/* Icono de error */}
          <div className="mb-6">
            <ExclamationTriangleIcon className="h-16 w-16 text-red-500 mx-auto" />
          </div>

          {/* Título */}
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Error al Cargar los Datos
          </h2>

          {/* Mensaje de error */}
          <div className="mb-6">
            <p className="text-gray-600 mb-2">
              {error || 'Ocurrió un error inesperado al cargar la información de la obra.'}
            </p>
            {retryCount > 0 && (
              <p className="text-sm text-gray-500">
                Intentos fallidos: {retryCount}/{maxRetries}
              </p>
            )}
          </div>

          {/* Acciones */}
          <div className="space-y-3">
            {canRetry ? (
              <button
                onClick={onRetry}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
              >
                <ArrowPathIcon className="h-5 w-5" />
                Reintentar
              </button>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">
                  Se alcanzó el número máximo de reintentos.
                </p>
                <p className="text-sm text-red-600 mt-2">
                  Por favor, verifica tu conexión a internet o contacta al soporte técnico.
                </p>
              </div>
            )}

            <button
              onClick={() => window.location.href = '/dashboard'}
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
            >
              Volver al Dashboard
            </button>
          </div>

          {/* Tips de troubleshooting */}
          <div className="mt-8 text-left bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">
              Posibles soluciones:
            </h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Verifica tu conexión a internet</li>
              <li>• Recarga la página (F5)</li>
              <li>• Limpia el caché del navegador</li>
              <li>• Intenta en una ventana de incógnito</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkDetailError;
