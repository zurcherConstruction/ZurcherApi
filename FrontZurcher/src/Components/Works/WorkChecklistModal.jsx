import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { FaTimes, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import { fetchChecklistByWorkId, updateChecklist } from '../../Redux/Actions/checklistActions'; // 🆕 Redux actions

const WorkChecklistModal = ({ work, onClose, onUpdate }) => {
  const dispatch = useDispatch();
  const { checklists, loading: loadingRedux } = useSelector((state) => state.checklist); // 🆕 Desde Redux
  const { user, currentStaff } = useSelector((state) => state.auth); // 🆕 Obtener usuario
  const staff = currentStaff || user;
  const userRole = staff?.role || '';
  const isOwner = userRole === 'owner'; // 🆕 Solo owner puede editar
  
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState('');
  const fetchedRef = React.useRef(false); // 🆕 Prevenir múltiples cargas

  // 🆕 Obtener checklist desde Redux store
  const checklist = checklists[work.idWork];

  // 📋 DEFINICIÓN DE ITEMS A VERIFICAR (ordenados por flujo del proceso)
  const checklistItems = [
    {
      key: 'materialesInicialesUploaded',
      label: 'Comprobante de Materiales Iniciales',
      description: 'Se subió el receipt de materiales iniciales'
    },
    {
      key: 'initialInspectionPaid',
      label: 'Inspección Inicial Pagada',
      description: 'Se pagó la inspección inicial'
    },
    {
      key: 'feeInspectionPaid',
      label: 'Fee de Inspección Pagado',
      description: 'Se pagó el fee de inspección correspondiente'
    },
    {
      key: 'arenaExpenseReviewed',
      label: 'Gasto de Arena Revisado',
      description: 'Se verificó que el gasto de arena esté correcto'
    },
    {
      key: 'finalInvoiceSent',
      label: 'Invoice Final Enviado',
      description: 'Se envió el invoice final al cliente'
    },
    {
      key: 'finalInspectionPaid',
      label: 'Inspección Final Pagada',
      description: 'Se pagó la inspección final'
    }
  ];

  useEffect(() => {
    if (!fetchedRef.current && !checklist) {
      fetchedRef.current = true;
      fetchChecklist();
    } else if (checklist) {
      // Actualizar notas cuando se carga el checklist
      setNotes(checklist.notes || '');
    }
  }, [work.idWork, checklist]);

  const fetchChecklist = async () => {
    try {
      await dispatch(fetchChecklistByWorkId(work.idWork));
    } catch (error) {
      console.error('Error al cargar checklist:', error);
      alert('Error al cargar el checklist');
    }
  };

  const handleCheckboxChange = async (key, value) => {
    try {
      setSaving(true);
      await dispatch(updateChecklist(work.idWork, { [key]: value }));
      
      // Callback opcional al componente padre
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error al actualizar checklist:', error);
      alert('Error al actualizar el checklist');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotes = async () => {
    try {
      setSaving(true);
      await dispatch(updateChecklist(work.idWork, { notes }));
      
      alert('✅ Notas guardadas');
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error al guardar notas:', error);
      alert('Error al guardar las notas');
    } finally {
      setSaving(false);
    }
  };

  const handleFinalReview = async () => {
    // Verificar que todos los items estén marcados
    const allItemsChecked = checklistItems.every(item => checklist[item.key]);
    
    if (!allItemsChecked) {
      const confirmation = window.confirm(
        '⚠️ No todos los items están marcados. ¿Deseas marcar como revisado de todas formas?'
      );
      if (!confirmation) return;
    }

    try {
      setSaving(true);
      const updatedChecklist = await dispatch(
        updateChecklist(work.idWork, { 
          finalReviewCompleted: !checklist.finalReviewCompleted 
        })
      );

      if (onUpdate) onUpdate();
      
      if (updatedChecklist.finalReviewCompleted) {
        alert('✅ Revisión final completada. Este work está OK para cerrar.');
      } else {
        alert('⚠️ Revisión final desmarcada');
      }
    } catch (error) {
      console.error('Error al marcar revisión final:', error);
      alert('Error al actualizar la revisión final');
    } finally {
      setSaving(false);
    }
  };

  // 🆕 Mostrar loading mientras carga desde Redux
  if (loadingRedux || !checklist) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <p className="text-gray-600">Cargando checklist...</p>
        </div>
      </div>
    );
  }

  const completedItems = checklistItems.filter(item => checklist[item.key]).length;
  const totalItems = checklistItems.length;
  const progressPercentage = (completedItems / totalItems) * 100;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              Checklist de Verificación
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {work.propertyAddress}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FaTimes className="text-xl" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          {/* 🆕 Mensaje de permisos para no-owners */}
          {!isOwner && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start">
              <FaExclamationTriangle className="text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
              <p className="text-sm text-yellow-800">
                <strong>Solo lectura:</strong> Solo el Owner puede modificar este checklist.
              </p>
            </div>
          )}
          
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Progreso: {completedItems}/{totalItems}
            </span>
            <span className="text-sm font-medium text-gray-700">
              {Math.round(progressPercentage)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all duration-300 ${
                progressPercentage === 100 ? 'bg-green-500' : 'bg-blue-500'
              }`}
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>

        {/* Checklist Items */}
        <div className="p-6 space-y-4">
          {checklistItems.map((item) => (
            <div
              key={item.key}
              className={`flex items-start p-4 rounded-lg border-2 transition-all ${
                checklist[item.key]
                  ? 'bg-green-50 border-green-300'
                  : 'bg-white border-gray-200 hover:border-gray-300'
              } ${!isOwner ? 'opacity-60' : ''}`}
            >
              <input
                type="checkbox"
                checked={checklist[item.key] || false}
                onChange={(e) => handleCheckboxChange(item.key, e.target.checked)}
                disabled={saving || !isOwner}
                className={`mt-1 h-5 w-5 text-green-600 focus:ring-green-500 border-gray-300 rounded ${
                  isOwner ? 'cursor-pointer' : 'cursor-not-allowed'
                }`}
                title={!isOwner ? 'Solo el owner puede modificar el checklist' : ''}
              />
              <div className="ml-4 flex-1">
                <label className={`block text-sm font-medium text-gray-900 ${
                  isOwner ? 'cursor-pointer' : 'cursor-not-allowed'
                }`}>
                  {item.label}
                </label>
                <p className="text-xs text-gray-600 mt-1">{item.description}</p>
              </div>
              {checklist[item.key] && (
                <FaCheckCircle className="text-green-500 text-xl ml-2" />
              )}
            </div>
          ))}
        </div>

        {/* Notas */}
        <div className="px-6 pb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notas Adicionales (opcional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={isOwner ? "Agregar notas sobre esta revisión..." : "Solo el owner puede agregar notas"}
            rows={3}
            disabled={!isOwner}
            className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              !isOwner ? 'bg-gray-100 cursor-not-allowed' : ''
            }`}
          />
          <button
            onClick={handleSaveNotes}
            disabled={saving || !isOwner}
            className="mt-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-400 transition-colors text-sm"
          >
            {saving ? 'Guardando...' : 'Guardar Notas'}
          </button>
        </div>

        {/* Revisión Final */}
        <div className="px-6 pb-6">
          <div
            className={`p-4 rounded-lg border-2 ${
              checklist.finalReviewCompleted
                ? 'bg-green-100 border-green-400'
                : 'bg-yellow-50 border-yellow-400'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center">
                  {checklist.finalReviewCompleted ? (
                    <FaCheckCircle className="text-green-600 text-2xl mr-3" />
                  ) : (
                    <FaExclamationTriangle className="text-yellow-600 text-2xl mr-3" />
                  )}
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {checklist.finalReviewCompleted
                        ? '✅ Revisión Completada'
                        : 'Aprobación Final'}
                    </h3>
                    {checklist.finalReviewCompleted && checklist.reviewer && (
                      <p className="text-sm text-gray-600 mt-1">
                        Revisado por: {checklist.reviewer.name}
                        {checklist.reviewedAt && (
                          <span className="ml-2">
                            ({new Date(checklist.reviewedAt).toLocaleDateString()})
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={handleFinalReview}
                disabled={saving || !isOwner}
                className={`px-6 py-3 rounded-lg font-bold transition-all ${
                  !isOwner
                    ? 'bg-gray-400 cursor-not-allowed text-white'
                    : checklist.finalReviewCompleted
                    ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
                title={!isOwner ? 'Solo el owner puede marcar la revisión final' : ''}
              >
                {checklist.finalReviewCompleted ? 'Desmarcar OK' : 'Marcar OK Final'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkChecklistModal;
