import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { recordOrUpdateChangeOrderDetails, updateWork, fetchWorkById } from '../../Redux/Actions/workActions';

// --- Opciones predefinidas para el selector ---
const PREDEFINED_OPTIONS = {
  SAND: {
    label: 'Sand',
    itemDescription: 'ADDITIONAL SAND'
  },
  DIRT: {
    label: 'Dirt',
    itemDescription: 'ADDITIONAL DIRT'
  },
  ROCK_REMOVAL: {
    label: 'Rock Removal',
    itemDescription: 'ROCKS BROKEN WITH CHIPPING HAMMER AND EXTRACTED FROM THE SEPTIC TANK EXCAVATION'
  }
};

const CreateChangeOrderModal = ({ idWork, workPropertyAddress, isOpen, onClose }) => {
  const dispatch = useDispatch();
  
  // Estados existentes
  const [description, setDescription] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [hours, setHours] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [totalCost, setTotalCost] = useState('');
  const [clientMessage, setClientMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // --- Nuevo estado para controlar el modo del formulario ---
  const [entryMode, setEntryMode] = useState('predefined'); // 'predefined' o 'manual'

  // Efecto para resetear el modal al abrirlo
  useEffect(() => {
    if (isOpen) {
      // --- Lógica de inicialización mejorada ---
      setEntryMode('predefined');
      // Por defecto, inicializa con Rock Removal
      setDescription('ROCK_REMOVAL'); 
      setItemDescription(PREDEFINED_OPTIONS.ROCK_REMOVAL.itemDescription);
      
      // Resetea el resto de los campos
      setHours('');
      setUnitCost('');
      setTotalCost('');
      setClientMessage('');
      setError('');
      setIsLoading(false);
    }
  }, [isOpen, idWork]);

  // Efecto para calcular el costo total
  useEffect(() => {
    const h = parseFloat(hours);
    const uc = parseFloat(unitCost);
    if (!isNaN(h) && !isNaN(uc) && h > 0 && uc > 0) {
      setTotalCost((h * uc).toFixed(2));
    } else if (hours === '' && unitCost === '') {
         setTotalCost('');
    }
  }, [hours, unitCost]);

  // --- Nuevo manejador para el selector de tipo ---
  const handleTypeChange = (e) => {
    const { value } = e.target;

    if (value === 'MANUAL') {
      setEntryMode('manual');
      setDescription('');
      setItemDescription('');
    } else {
      setEntryMode('predefined');
      setDescription(value); // Guardamos la clave, ej: "ROCK_REMOVAL"
      setItemDescription(PREDEFINED_OPTIONS[value].itemDescription);
    }
  };

  // Manejador para el envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!idWork) {
      setError('Error crítico: No se pudo identificar la obra.');
      return;
    }
    if (!description.trim() || !totalCost.trim() || parseFloat(totalCost) <= 0) {
      setError('La descripción y un costo total válido son requeridos.');
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
      status: 'draft',
    };

    try {
      const resultAction = await dispatch(recordOrUpdateChangeOrderDetails(idWork, null, coData));
      if (resultAction && resultAction.changeOrder) {
        await dispatch(updateWork(idWork, { stoneExtractionCONeeded: false }));
        dispatch(fetchWorkById(idWork));
        onClose();
      } else {
        setError(resultAction.message || 'Error al crear la Orden de Cambio.');
      }
    } catch (err) {
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
        <p className="text-sm text-gray-500 mb-4">Obra: {workPropertyAddress}</p>
        
        {error && <p className="text-red-600 bg-red-100 p-2 rounded mb-3 text-sm">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* --- SELECTOR DE TIPO --- */}
          <div>
            <label htmlFor="changeOrderType" className="block text-sm font-medium text-gray-700">Tipo de Orden de Cambio</label>
            <select
              id="changeOrderType"
              onChange={handleTypeChange}
              defaultValue="ROCK_REMOVAL"
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2"
            >
              {Object.entries(PREDEFINED_OPTIONS).map(([key, { label }]) => (
                <option key={key} value={key}>{label}</option>
              ))}
              <option value="MANUAL">Entrada Manual</option>
            </select>
          </div>

          {/* --- CAMPO CONDICIONAL PARA DESCRIPCIÓN MANUAL --- */}
          {entryMode === 'manual' && (
            <div>
              <label htmlFor="co-description" className="block text-sm font-medium text-gray-700">Descripción Principal</label>
              <textarea id="co-description" value={description} onChange={(e) => setDescription(e.target.value)} required rows="2"
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2"/>
            </div>
          )}

          {/* --- CAMPO DE DETALLE (TEXTAREA Y CONDICIONALMENTE READONLY) --- */}
          <div>
            <label htmlFor="co-itemDescription" className="block text-sm font-medium text-gray-700">Detalle del Ítem</label>
            <textarea id="co-itemDescription" value={itemDescription} onChange={(e) => setItemDescription(e.target.value)}
              readOnly={entryMode === 'predefined'}
              rows="3"
              className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2 ${entryMode === 'predefined' ? 'bg-gray-100' : ''}`}
            />
          </div>

          {/* --- CAMPOS DE COSTOS --- */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="co-hours" className="block text-sm font-medium text-gray-700">Horas / Qty</label>
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
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2 bg-gray-100"
              readOnly
            />
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