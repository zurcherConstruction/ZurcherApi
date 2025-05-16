import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { recordOrUpdateChangeOrderDetails, updateWork, fetchWorkById } from '../../Redux/Actions/workActions';

const CreateChangeOrderModal = ({ idWork, workPropertyAddress, isOpen, onClose, mode = "generic",  }) => {
  // Log #1: Ver qué props recibe el modal cada vez que se renderiza
  console.log('[CreateCOModal] Component Rendered/Re-rendered. Props - idWork:', idWork, 'isOpen:', isOpen, 'workPropertyAddress:', workPropertyAddress);
  
  const dispatch = useDispatch();
  const [description, setDescription] = useState('Costos adicionales por extracción de piedras.');
  const [itemDescription, setItemDescription] = useState('Detalle de extracción de piedras.');
  const [hours, setHours] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [totalCost, setTotalCost] = useState('');
  const [clientMessage, setClientMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

   useEffect(() => {
    if (isOpen) {
      if (mode === "stoneExtraction") {
        setDescription('Costos adicionales por extracción de piedras.');
        setItemDescription('Detalle de extracción de piedras.');
      } else {
        setDescription('');
        setItemDescription('');
      }
      setHours('');
      setUnitCost('');
      setTotalCost('');
      setClientMessage('');
      setError('');
      setIsLoading(false);
    }
  }, [isOpen, idWork, mode]);// <--- Asegúrate que idWork esté aquí si el efecto depende de él

  useEffect(() => {
    const h = parseFloat(hours);
    const uc = parseFloat(unitCost);
    if (!isNaN(h) && !isNaN(uc) && h > 0 && uc > 0) {
      setTotalCost((h * uc).toFixed(2));
    } else if (hours === '' && unitCost === '') { // Opcional: limpiar totalCost si horas y costo unitario se borran
         setTotalCost(''); // Descomenta si quieres este comportamiento
    }
  }, [hours, unitCost]);

   const handleSubmit = async (e) => {
    e.preventDefault();
    // Log #3: Ver el idWork justo antes de intentar usarlo.
    console.log('[CreateCOModal] handleSubmit - START. Current prop idWork:', idWork);
    setError('');

    if (!idWork) { // <--- Verificación crucial
      console.error('[CreateCOModal] handleSubmit - CRITICAL ERROR: idWork is undefined or null before dispatching.');
      setError('Error crítico: No se pudo identificar la obra para la Orden de Cambio. Falta el ID de la obra.');
      setIsLoading(false);
      return;
    }

    if (!description.trim() || !totalCost.trim() || parseFloat(totalCost) <= 0) {
      const validationError = 'La descripción y un costo total válido son requeridos.';
      console.log('[CreateCOModal] handleSubmit - Validation Error:', validationError);
      setError(validationError);
      return;
    }
    setIsLoading(true);
    const coData = {
      description,
      itemDescription: itemDescription.trim() || description,
      hours: parseFloat(hours) || null,
      unitCost: parseFloat(unitCost) || null,
      totalCost: parseFloat(totalCost),
      clientMessage: clientMessage.trim(),
      status: 'draft', // O el estado inicial que necesites
    };
    console.log('[CreateCOModal] handleSubmit - CO Data to be sent:', coData);
    console.log(`[CreateCOModal] handleSubmit - Calling dispatch(recordOrUpdateChangeOrderDetails) with idWork: ${idWork}`);

    try {
      const resultAction = await dispatch(recordOrUpdateChangeOrderDetails(idWork, null, coData));
      console.log('[CreateCOModal] handleSubmit - Result from recordOrUpdateChangeOrderDetails:', resultAction);
      
      if (resultAction && (resultAction.error === true || (resultAction.type && resultAction.type.endsWith('FAILURE')))) {
        const errorMessage = resultAction.message || 'Error al crear la Orden de Cambio.';
        console.error('[CreateCOModal] handleSubmit - Error creating CO:', errorMessage, resultAction.details);
        setError(errorMessage);
      } else if (resultAction && resultAction.changeOrder) {
        console.log('[CreateCOModal] handleSubmit - CO created successfully. Now updating work...');
        await dispatch(updateWork(idWork, { stoneExtractionCONeeded: false }));
        console.log('[CreateCOModal] handleSubmit - Work updated. Now fetching work by ID...');
        dispatch(fetchWorkById(idWork)); // Para refrescar los datos de la obra, incluyendo la nueva CO
        console.log('[CreateCOModal] handleSubmit - fetchWorkById dispatched. Closing modal.');
        onClose(); // Cerrar el modal
      } else {
        const unexpectedError = 'Respuesta inesperada del servidor al crear la Orden de Cambio.';
        console.error('[CreateCOModal] handleSubmit - Unexpected response:', resultAction);
        setError(unexpectedError);
      }
    } catch (err) {
      console.error('[CreateCOModal] handleSubmit - CATCH block error:', err);
      setError(err.message || 'Ocurrió un error inesperado.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
  <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex justify-center items-center z-50 p-4">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Generar Orden de Cambio</h2>
        <p className="text-sm text-gray-500 mb-1">Obra: {workPropertyAddress}</p>
        {mode === "stoneExtraction" && (
          <p className="text-sm text-gray-500 mb-4">Motivo: Extracción de Piedras</p>
        )}
        
        {error && <p className="text-red-600 bg-red-100 p-2 rounded mb-3 text-sm">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="co-description" className="block text-sm font-medium text-gray-700">Descripción Principal</label>
            <textarea id="co-description" value={description} onChange={(e) => setDescription(e.target.value)} required rows="2"
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2"/>
          </div>
          <div>
            <label htmlFor="co-itemDescription" className="block text-sm font-medium text-gray-700">Detalle del Ítem (Opcional)</label>
            <input type="text" id="co-itemDescription" value={itemDescription} onChange={(e) => setItemDescription(e.target.value)}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2"/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="co-hours" className="block text-sm font-medium text-gray-700">Horas</label>
              <input type="number" id="co-hours" value={hours} onChange={(e) => setHours(e.target.value)} step="0.1"
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2"/>
            </div>
            <div>
              <label htmlFor="co-unitCost" className="block text-sm font-medium text-gray-700">Costo/Hora</label>
              <input type="number" id="co-unitCost" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} step="0.01"
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2"/>
            </div>
          </div>
          <div>
            <label htmlFor="co-totalCost" className="block text-sm font-medium text-gray-700">Costo Total</label>
            <input type="number" id="co-totalCost" value={totalCost} onChange={(e) => setTotalCost(e.target.value)} required step="0.01" min="0.01"
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2"/>
          </div>
          <div>
            <label htmlFor="co-clientMessage" className="block text-sm font-medium text-gray-700">Mensaje para Cliente (Opcional)</label>
            <textarea id="co-clientMessage" value={clientMessage} onChange={(e) => setClientMessage(e.target.value)} rows="2"
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2"/>
          </div>
          <div className="flex justify-end gap-3 pt-3">
            <button type="button" onClick={onClose} disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md shadow-sm">
              Cancelar
            </button>
            <button type="submit" disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm disabled:bg-gray-400">
              {isLoading ? 'Guardando...' : 'Crear Orden de Cambio'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateChangeOrderModal;