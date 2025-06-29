import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
  fetchWorks, 
  changeWorkStatus, 
  validateStatusChange,
  
} from '../../Redux/Actions/workActions';
import {clearStatusChangeError,
  clearStatusValidationError } from '../../Redux/Reducer/workReducer';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const WorkStatusManager = () => {
  const dispatch = useDispatch();
  
  // Estados de Redux
  const works = useSelector((state) => state.work.works);
  const loading = useSelector((state) => state.work.loading);
  const error = useSelector((state) => state.work.error);
  const loadingStatusChange = useSelector((state) => state.work.loadingStatusChange);
  const errorStatusChange = useSelector((state) => state.work.errorStatusChange);
  const statusChangeConflicts = useSelector((state) => state.work.statusChangeConflicts);
  const loadingStatusValidation = useSelector((state) => state.work.loadingStatusValidation);
  const statusValidationResult = useSelector((state) => state.work.statusValidationResult);

  // Estados locales
  const [selectedWork, setSelectedWork] = useState(null);
  const [targetStatus, setTargetStatus] = useState('');
  const [reason, setReason] = useState('');
  const [force, setForce] = useState(false);
  const [showStatusChangeModal, setShowStatusChangeModal] = useState(false);
  const [showValidationResults, setShowValidationResults] = useState(false);

  // Orden completo de estados (actualizado)
  const statusOrder = [
    'pending',
    'assigned', 
    'inProgress',
    'installed',
    'firstInspectionPending',
    'approvedInspection',
    'rejectedInspection',
    'coverPending',
    'covered',
    'finalInspectionPending',
    'finalApproved',
    'finalRejected',
    'invoiceFinal',
    'paymentReceived',
    'maintenance'
  ];

  // Etiquetas en español para los estados
  const statusLabels = {
    pending: 'Pendiente',
    assigned: 'Asignado',
    inProgress: 'En Progreso',
    installed: 'Instalado',
    firstInspectionPending: 'Primera Inspección Pendiente',
    approvedInspection: 'Inspección Aprobada',
    rejectedInspection: 'Inspección Rechazada',
    coverPending: 'Listo Para Cubrir',
    covered: 'Cubierto',
    finalInspectionPending: 'Inspección Final Pendiente',
    finalApproved: 'Aprobado Final',
    finalRejected: 'Rechazado Final',
    invoiceFinal: 'Factura Final',
    paymentReceived: 'Pago Recibido',
    maintenance: 'Mantenimiento'
  };

  useEffect(() => {
    dispatch(fetchWorks());
  }, [dispatch]);

  useEffect(() => {
    // Limpiar errores cuando se cambia de trabajo
    if (selectedWork) {
      dispatch(clearStatusChangeError());
      dispatch(clearStatusValidationError());
      setShowValidationResults(false);
      setForce(false);
    }
  }, [selectedWork, dispatch]);

  const handleWorkSelect = (e) => {
    const workId = e.target.value;
    const work = works.find((w) => w.idWork === workId);
    setSelectedWork(work);
    setTargetStatus('');
    setReason('');
    setShowStatusChangeModal(false);
  };

  const openStatusChangeModal = (newStatus) => {
    setTargetStatus(newStatus);
    setShowStatusChangeModal(true);
    setShowValidationResults(false);
    setForce(false);
    dispatch(clearStatusChangeError());
    dispatch(clearStatusValidationError());
  };

  const handleValidateChange = async () => {
    if (!selectedWork || !targetStatus) return;

    try {
      await dispatch(validateStatusChange(selectedWork.idWork, targetStatus));
      setShowValidationResults(true);
    } catch (error) {
      toast.error('Error al validar el cambio de estado');
    }
  };

  const handleConfirmStatusChange = async () => {
    if (!selectedWork || !targetStatus || !reason.trim()) {
      toast.error('Por favor complete todos los campos requeridos');
      return;
    }

    try {
      await dispatch(changeWorkStatus(selectedWork.idWork, targetStatus, reason, force));
      toast.success(`Estado cambiado exitosamente a "${statusLabels[targetStatus]}"`);
      
      // Actualizar trabajo seleccionado
      const updatedWork = { ...selectedWork, status: targetStatus };
      setSelectedWork(updatedWork);
      
      // Cerrar modal
      setShowStatusChangeModal(false);
      setReason('');
      setTargetStatus('');
      setForce(false);
      
    } catch (error) {
      // El error ya se maneja en el reducer, solo mostrar toast
      toast.error('Error al cambiar el estado del trabajo');
    }
  };

  const getStatusProgressInfo = (work) => {
    const currentIndex = statusOrder.indexOf(work.status);
    const progress = ((currentIndex + 1) / statusOrder.length) * 100;
    return { currentIndex, progress };
  };

  const canMoveToStatus = (work, targetStatusIndex) => {
    const currentIndex = statusOrder.indexOf(work.status);
    // Permitir movimiento hacia adelante o atrás (con validación)
    return targetStatusIndex !== currentIndex;
  };

  const getDirectionIcon = (currentStatus, targetStatus) => {
    const currentIndex = statusOrder.indexOf(currentStatus);
    const targetIndex = statusOrder.indexOf(targetStatus);
    
    if (targetIndex > currentIndex) {
      return '⏩'; // Adelante
    } else if (targetIndex < currentIndex) {
      return '⏪'; // Atrás
    }
    return '◯'; // Mismo
  };

  // Filtrar estados a los que se puede reactivar desde cancelado
  const reactivationTargets = statusOrder.filter(s => s !== 'cancelled');

  return (
    <div className="container mx-auto p-4 md:p-8 lg:p-12">
      <h2 className="text-3xl font-bold mb-6 text-gray-800">
        🔄 Gestión de Estados de Obra
      </h2>

      {/* Select para elegir la obra */}
      <div className="mb-6">
        <label htmlFor="workSelect" className="block text-gray-700 text-sm font-bold mb-2">
          Seleccione una obra:
        </label>
        {loading && <p className="text-blue-600">Cargando obras...</p>}
        {error && <p className="text-red-600">Error: {error}</p>}
        <select
          id="workSelect"
          onChange={handleWorkSelect}
          className="shadow-lg border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Seleccione una dirección</option>
          {works.map((work) => (
            <option key={work.idWork} value={work.idWork} className={work.status === 'cancelled' ? 'text-red-600 font-bold' : ''}>
              {work.propertyAddress} - {statusLabels[work.status] || work.status}{work.status === 'cancelled' ? ' (Cancelado)' : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Detalle de la obra seleccionada */}
  {selectedWork && (
  <div className="p-6 bg-white shadow-lg rounded-lg mb-6 border-l-4 border-blue-500">
    <h3 className="text-xl font-bold mb-4 text-gray-800">📋 Detalle del Trabajo</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <p><strong>Dirección:</strong> {selectedWork.propertyAddress}</p>
        <p><strong>Estado Actual:</strong> 
          <span className={`ml-2 px-3 py-1 rounded-full text-sm ${selectedWork.status === 'cancelled' ? 'bg-red-100 text-red-700 border border-red-300' : 'bg-blue-100 text-blue-800'}`}>
            {statusLabels[selectedWork.status] || selectedWork.status}
          </span>
        </p>
      </div>
      <div>
        <p><strong>ID del Trabajo:</strong> {selectedWork.idWork}</p>
        <p><strong>Fecha de Inicio:</strong> {selectedWork.startDate ? new Date(selectedWork.startDate).toLocaleDateString() : 'No definida'}</p>
      </div>
    </div>
    {/* Si está cancelado, mostrar botón de reactivación */}
    {selectedWork.status === 'cancelled' && (
      <div className="mt-6 flex flex-col items-center">
        <p className="mb-2 text-red-700 font-semibold">Este trabajo está cancelado. Puedes reactivarlo cambiando su estado.</p>
        <button
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg shadow-lg mb-2"
          onClick={() => setShowStatusChangeModal(true)}
        >
          🔄 Reactivar trabajo
        </button>
      </div>
    )}
    {/* AGREGAR INDICADORES DE DOCUMENTACIÓN FALTANTE */}
    {selectedWork.status === 'paymentReceived' && selectedWork.finalInvoice?.status !== 'paid' && (
      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
        <div className="flex items-center">
          <svg className="w-5 h-5 text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-sm font-medium text-yellow-800">
              ⚠️ Acción pendiente: Comprobante de pago final
            </p>
            <p className="text-xs text-yellow-700">
              El trabajo está marcado como "Pago Recibido" pero falta el comprobante del pago final.
            </p>
          </div>
        </div>
      </div>
    )}

    {selectedWork.status === 'inProgress' && (!selectedWork.receipts || selectedWork.receipts.filter(r => r.type === 'Materiales Iniciales').length === 0) && (
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
        <div className="flex items-center">
          <svg className="w-5 h-5 text-blue-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-sm font-medium text-blue-800">
              💡 Recordatorio: Comprobante de materiales iniciales
            </p>
            <p className="text-xs text-blue-700">
              Puedes cargar el comprobante de materiales iniciales desde la sección de Materiales.
            </p>
          </div>
        </div>
      </div>
    )}
          
          {/* Barra de progreso */}
          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Progreso del trabajo</span>
              <span>{Math.round(getStatusProgressInfo(selectedWork).progress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${getStatusProgressInfo(selectedWork).progress}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {/* Grid de estados como botones */}
      {selectedWork && selectedWork.status !== 'cancelled' && (
        <div className="bg-white shadow-lg rounded-lg p-6">
          <h3 className="text-xl font-bold mb-4 text-gray-800">🎯 Cambiar Estado</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {statusOrder.map((status, index) => {
              const currentIndex = statusOrder.indexOf(selectedWork.status);
              const isCurrent = status === selectedWork.status;
              const isCompleted = index < currentIndex;
              const canMove = canMoveToStatus(selectedWork, index);
              
              return (
                <button
                  key={status}
                  onClick={() => canMove ? openStatusChangeModal(status) : null}
                  disabled={!canMove || loadingStatusChange}
                  className={`
                    relative p-4 rounded-lg border-2 transition-all duration-200 text-left
                    ${isCurrent 
                      ? 'bg-blue-500 text-white border-blue-600 shadow-lg' 
                      : isCompleted 
                        ? 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200' 
                        : canMove 
                          ? 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100 hover:border-gray-400 cursor-pointer'
                          : 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed'
                    }
                  `}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{statusLabels[status]}</span>
                    <span className="text-lg">
                      {isCurrent ? '🎯' : isCompleted ? '✅' : canMove ? getDirectionIcon(selectedWork.status, status) : '⭕'}
                    </span>
                  </div>
                  <div className="text-sm opacity-75 mt-1">
                    {isCurrent ? 'Estado actual' : isCompleted ? 'Completado' : canMove ? 'Disponible' : 'No disponible'}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal de cambio de estado */}
      {showStatusChangeModal && selectedWork && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-xl font-bold mb-4 text-gray-800">
                {selectedWork.status === 'cancelled' ? '🔄 Reactivar trabajo' : '🔄 Cambiar Estado de Trabajo'}
              </h3>
              <div className="space-y-4">
                <div>
                  <p><strong>Estado actual:</strong> 
                    <span className={`ml-2 px-2 py-1 rounded text-sm ${selectedWork.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-800'}`}>
                      {statusLabels[selectedWork.status] || selectedWork.status}
                    </span>
                  </p>
                  <p><strong>Nuevo estado:</strong> 
                    <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 rounded text-sm">
                      {statusLabels[targetStatus] || targetStatus}
                    </span>
                  </p>
                  <p className="text-sm text-gray-600 mt-2">
                    Dirección: <strong>{getDirectionIcon(selectedWork.status, targetStatus)}</strong>
                  </p>
                </div>
                {/* Si está cancelado, mostrar select de reactivación */}
                {selectedWork.status === 'cancelled' && (
                  <div>
                    <label className="block text-gray-700 text-sm font-bold mb-2">
                      Seleccione nuevo estado para reactivar: *
                    </label>
                    <select
                      value={targetStatus}
                      onChange={e => setTargetStatus(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="">Seleccione un estado</option>
                      {reactivationTargets.map(s => (
                        <option key={s} value={s}>{statusLabels[s]}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    Razón del cambio: *
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Explique por qué se cambia el estado..."
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="3"
                    required
                  />
                </div>

                {/* Botón de validación */}
                <button
                  onClick={handleValidateChange}
                  disabled={loadingStatusValidation || !targetStatus}
                  className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded-lg disabled:opacity-50"
                >
                  {loadingStatusValidation ? '🔄 Validando...' : '🔍 Validar Cambio'}
                </button>

                {/* Resultados de validación */}
                {showValidationResults && statusValidationResult && (
                  <div className={`p-4 rounded-lg ${statusValidationResult.isValid ? 'bg-green-100 border border-green-300' : 'bg-red-100 border border-red-300'}`}>
                    <h4 className="font-bold mb-2">
                      {statusValidationResult.isValid ? '✅ Cambio válido' : '⚠️ Conflictos detectados'}
                    </h4>
                    {!statusValidationResult.isValid && statusValidationResult.conflicts?.length > 0 && (
                      <div>
                        <p className="text-sm text-red-700 mb-2">Este cambio eliminará:</p>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          {statusValidationResult.conflicts.map((conflict, index) => (
                            <li key={index} className="text-red-700">
                              {conflict.message} ({conflict.count} elemento{conflict.count > 1 ? 's' : ''})
                            </li>
                          ))}
                        </ul>
                        <label className="flex items-center mt-3">
                          <input
                            type="checkbox"
                            checked={force}
                            onChange={(e) => setForce(e.target.checked)}
                            className="mr-2"
                          />
                          <span className="text-sm text-red-700">
                            Entiendo y acepto eliminar estos datos
                          </span>
                        </label>
                      </div>
                    )}
                  </div>
                )}

                {/* Errores */}
                {errorStatusChange && (
                  <div className="p-4 bg-red-100 border border-red-300 rounded-lg">
                    <p className="text-red-700 font-medium">{errorStatusChange}</p>
                    {statusChangeConflicts.length > 0 && (
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        {statusChangeConflicts.map((conflict, index) => (
                          <li key={index} className="text-red-600 text-sm">{conflict.message}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>

              {/* Botones del modal */}
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={handleConfirmStatusChange}
                  disabled={
                    loadingStatusChange || 
                    !reason.trim() || 
                    (!statusValidationResult?.isValid && !force && showValidationResults)
                  }
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg disabled:opacity-50"
                >
                  {loadingStatusChange ? '🔄 Cambiando...' : '✅ Confirmar Cambio'}
                </button>
                <button
                  onClick={() => {
                    setShowStatusChangeModal(false);
                    setReason('');
                    setTargetStatus('');
                    setForce(false);
                    setShowValidationResults(false);
                    dispatch(clearStatusChangeError());
                    dispatch(clearStatusValidationError());
                  }}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg"
                >
                  ❌ Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkStatusManager;