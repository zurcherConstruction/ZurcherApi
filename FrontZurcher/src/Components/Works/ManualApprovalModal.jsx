import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { approveChangeOrderManually, fetchWorkById } from '../../Redux/Actions/workActions';

const ManualApprovalModal = ({ isOpen, onClose, changeOrder, workId }) => {
  const dispatch = useDispatch();

  const [clientNotifiedAt, setClientNotifiedAt] = useState('');
  const [clientNotificationMethod, setClientNotificationMethod] = useState('Teléfono');
  const [manualApprovalNotes, setManualApprovalNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Resetear formulario al abrir
  useEffect(() => {
    if (isOpen) {
      // Inicializar con fecha/hora actual
      const now = new Date();
      const localDateTime = new Date(now.getTime() - (now.getTimezoneOffset() * 60000))
        .toISOString()
        .slice(0, 16);
      setClientNotifiedAt(localDateTime);
      setClientNotificationMethod('Teléfono');
      setManualApprovalNotes('');
      setError('');
      setIsLoading(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validaciones
    if (!clientNotificationMethod.trim()) {
      setError('Debe especificar el método de contacto con el cliente.');
      return;
    }

    if (!manualApprovalNotes.trim()) {
      setError('Debe ingresar notas sobre la aprobación (fecha/hora de la llamada, detalles, etc.).');
      return;
    }

    if (!changeOrder?.id) {
      setError('Error: No se pudo identificar el Change Order.');
      return;
    }

    setIsLoading(true);

    const approvalData = {
      clientNotifiedAt: clientNotifiedAt ? new Date(clientNotifiedAt).toISOString() : new Date().toISOString(),
      clientNotificationMethod: clientNotificationMethod.trim(),
      manualApprovalNotes: manualApprovalNotes.trim(),
    };

    try {
      const result = await dispatch(approveChangeOrderManually(changeOrder.id, approvalData));

      if (result && !result.error) {
        // Éxito - recargar datos del work
        await dispatch(fetchWorkById(workId));
        
        // Mostrar mensaje de éxito
        alert(`✅ Change Order #${changeOrder.changeOrderNumber || changeOrder.id.substring(0, 8)} aprobado manualmente.\n\nEl CO está ahora marcado como APROBADO y listo para facturar.`);
        
        onClose();
      } else {
        setError(result.message || 'Error desconocido al aprobar el Change Order.');
      }
    } catch (err) {
      console.error('Error al aprobar Change Order manualmente:', err);
      setError('Error interno al procesar la aprobación manual.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !changeOrder) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-green-600 text-white px-6 py-4 rounded-t-lg">
          <h2 className="text-xl font-bold">✓ Aprobación Manual de Change Order</h2>
          <p className="text-sm mt-1 opacity-90">
            CO #{changeOrder.changeOrderNumber || changeOrder.id.substring(0, 8)}
          </p>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Información del CO */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Información del Change Order</h3>
            <div className="text-sm space-y-1 text-gray-700">
              <p><strong>Descripción:</strong> {changeOrder.description}</p>
              {changeOrder.itemDescription && (
                <p><strong>Detalle:</strong> {changeOrder.itemDescription}</p>
              )}
              <p><strong>Costo Total:</strong> ${parseFloat(changeOrder.totalCost || 0).toFixed(2)}</p>
              <p><strong>Estado Actual:</strong> <span className="font-semibold text-blue-600">{changeOrder.status}</span></p>
            </div>
          </div>

          {/* Fecha/Hora de Notificación al Cliente */}
          <div>
            <label htmlFor="clientNotifiedAt" className="block text-sm font-medium text-gray-700 mb-1">
              Fecha y Hora de Contacto con Cliente <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              id="clientNotifiedAt"
              value={clientNotifiedAt}
              onChange={(e) => setClientNotifiedAt(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Indique cuándo se contactó al cliente para informarle sobre este CO
            </p>
          </div>

          {/* Método de Notificación */}
          <div>
            <label htmlFor="clientNotificationMethod" className="block text-sm font-medium text-gray-700 mb-1">
              Método de Contacto <span className="text-red-500">*</span>
            </label>
            <select
              id="clientNotificationMethod"
              value={clientNotificationMethod}
              onChange={(e) => setClientNotificationMethod(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            >
              <option value="Teléfono">Teléfono</option>
              <option value="WhatsApp">WhatsApp</option>
              <option value="Presencial">Presencial</option>
              <option value="Video Llamada">Video Llamada</option>
              <option value="Mensaje de Texto">Mensaje de Texto</option>
              <option value="Otro">Otro</option>
            </select>
          </div>

          {/* Notas de Aprobación */}
          <div>
            <label htmlFor="manualApprovalNotes" className="block text-sm font-medium text-gray-700 mb-1">
              Notas de Aprobación <span className="text-red-500">*</span>
            </label>
            <textarea
              id="manualApprovalNotes"
              value={manualApprovalNotes}
              onChange={(e) => setManualApprovalNotes(e.target.value)}
              placeholder="Ejemplo: &#10;Cliente llamado el 29/10/2025 a las 14:30.&#10;Se le explicó el trabajo adicional de extracción de piedras.&#10;Cliente aprobó verbalmente y autorizó continuar con el trabajo.&#10;Confirmó que no necesita firma por email."
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 font-mono text-sm"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Incluya: día/hora exacta, quién habló con el cliente, qué se discutió, confirmación verbal recibida
            </p>
          </div>

          {/* Mensaje de Error */}
          {error && (
            <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded relative">
              <strong className="font-bold">Error: </strong>
              <span className="block sm:inline">{error}</span>
            </div>
          )}

          {/* Warning sobre el cambio de estado */}
          <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">Importante</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>Al aprobar manualmente este Change Order:</p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>El estado cambiará a <strong>APROBADO</strong></li>
                    <li>Quedará registrado que fue aprobación <strong>MANUAL</strong> (no por email)</li>
                    <li>Se guardará quién lo aprobó y cuándo</li>
                    <li>Estará listo para incluirse en la factura final</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Procesando...
                </span>
              ) : (
                '✓ Aprobar Manualmente'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ManualApprovalModal;
