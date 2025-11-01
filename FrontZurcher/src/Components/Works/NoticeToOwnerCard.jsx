import React, { useState } from 'react';
import { 
  ExclamationTriangleIcon, 
  CheckCircleIcon, 
  ClockIcon,
  DocumentTextIcon,
  LinkIcon
} from '@heroicons/react/24/outline';

const NoticeToOwnerCard = ({ work, onUpdate, isOpen, onToggle }) => {
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    noticeToOwnerFiled: work.noticeToOwnerFiled || false,
    noticeToOwnerDocumentUrl: work.noticeToOwnerDocumentUrl || '',
    lienFiled: work.lienFiled || false,
    lienDocumentUrl: work.lienDocumentUrl || '',
    noticeToOwnerNotes: work.noticeToOwnerNotes || ''
  });

  // ✅ Función para formatear fechas de YYYY-MM-DD a MM-DD-YYYY
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    
    // dateString viene como "YYYY-MM-DD" del backend
    const [year, month, day] = dateString.split('-');
    
    if (!year || !month || !day) {
      return "Invalid Date";
    }
    
    // Retornar en formato MM-DD-YYYY
    return `${month}-${day}-${year}`;
  };

  // ✅ Calcular días restantes usando strings para evitar cambios de zona horaria
  const calculateDaysRemaining = () => {
    if (!work.installationStartDate) return null;
    
    // Parsear la fecha como string YYYY-MM-DD
    const [year, month, day] = work.installationStartDate.split('-');
    const startDate = new Date(year, month - 1, day); // month - 1 porque enero es 0
    
    const deadline = new Date(startDate);
    deadline.setDate(deadline.getDate() + 45); // Florida: 45 días
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalizar a medianoche
    
    const diffTime = deadline - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Formatear deadline a MM-DD-YYYY
    const deadlineMonth = String(deadline.getMonth() + 1).padStart(2, '0');
    const deadlineDay = String(deadline.getDate()).padStart(2, '0');
    const deadlineYear = deadline.getFullYear();
    const deadlineFormatted = `${deadlineMonth}-${deadlineDay}-${deadlineYear}`;
    
    return {
      days: diffDays,
      deadline: deadlineFormatted,
      isUrgent: diffDays <= 7,
      isPastDue: diffDays < 0
    };
  };

  const daysInfo = calculateDaysRemaining();

  // Si no ha empezado instalación, no mostrar
  if (!work.installationStartDate) {
    return null;
  }

  const handleSave = async () => {
    try {
      await onUpdate(formData);
      setEditing(false);
    } catch (error) {
      console.error('Error updating Notice to Owner:', error);
    }
  };

  const getAlertColor = () => {
    if (!daysInfo) return 'border-gray-500';
    if (daysInfo.isPastDue) return 'border-red-500';
    if (daysInfo.isUrgent) return 'border-yellow-500';
    if (formData.noticeToOwnerFiled && formData.lienFiled) return 'border-green-500';
    return 'border-blue-500';
  };

  const getBackgroundColor = () => {
    if (!daysInfo) return 'bg-gray-50';
    if (daysInfo.isPastDue) return 'bg-red-50';
    if (daysInfo.isUrgent) return 'bg-yellow-50';
    if (formData.noticeToOwnerFiled && formData.lienFiled) return 'bg-green-50';
    return 'bg-blue-50';
  };

  return (
    <div className={`bg-white shadow-md rounded-lg p-4 md:p-6 border-l-4 ${getAlertColor()}`}>
      {/* Header colapsable */}
      <h2
        className="text-lg md:text-xl font-semibold mb-4 cursor-pointer flex justify-between items-center"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2">
          <DocumentTextIcon className="h-6 w-6 text-blue-600" />
          <span>Notice to Owner & Lien</span>
          {/* Days remaining badge en el título */}
          {daysInfo && !formData.noticeToOwnerFiled && (
            <span className={`ml-2 px-2 py-1 rounded-full text-xs font-semibold ${
              daysInfo.isPastDue 
                ? 'bg-red-100 text-red-800' 
                : daysInfo.isUrgent 
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-blue-100 text-blue-800'
            }`}>
              {daysInfo.isPastDue ? (
                <span>⚠️ {Math.abs(daysInfo.days)} días vencido</span>
              ) : (
                <span>⏰ {daysInfo.days} días restantes</span>
              )}
            </span>
          )}
        </div>
        <span>{isOpen ? "▲" : "▼"}</span>
      </h2>

      {isOpen && (
        <>
          {/* Installation Start Info */}
          <div className={`mb-4 p-3 rounded border ${getBackgroundColor()}`}>
            <div className="flex items-center gap-2 text-sm">
              <ClockIcon className="h-4 w-4 text-gray-500" />
              <span className="text-gray-600">Instalación iniciada:</span>
              <span className="font-semibold">
                {formatDate(work.installationStartDate)}
              </span>
            </div>
            {daysInfo && (
              <div className="mt-2 text-sm text-gray-600">
                📅 Deadline para Notice to Owner: <span className="font-semibold">{daysInfo.deadline}</span>
              </div>
            )}
          </div>

          {/* Notice to Owner Section */}
          <div className={`mb-4 p-3 rounded border ${getBackgroundColor()}`}>
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold text-gray-700">📋 Notice to Owner</h4>
          {formData.noticeToOwnerFiled ? (
            <CheckCircleIcon className="h-5 w-5 text-green-600" />
          ) : (
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />
          )}
        </div>

        {editing ? (
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.noticeToOwnerFiled}
                onChange={(e) => setFormData({
                  ...formData,
                  noticeToOwnerFiled: e.target.checked,
                  noticeToOwnerFiledDate: e.target.checked ? new Date().toISOString().split('T')[0] : null
                })}
                className="rounded"
              />
              <span className="text-sm">Documento archivado</span>
            </label>
            
            {formData.noticeToOwnerFiled && (
              <input
                type="url"
                value={formData.noticeToOwnerDocumentUrl}
                onChange={(e) => setFormData({...formData, noticeToOwnerDocumentUrl: e.target.value})}
                placeholder="URL del documento"
                className="w-full p-2 border rounded text-sm"
              />
            )}
          </div>
        ) : (
          <div className="text-sm">
            {formData.noticeToOwnerFiled ? (
              <div className="space-y-1">
                <div className="text-green-700 font-medium">✓ Archivado</div>
                {formData.noticeToOwnerDocumentUrl && (
                  <a 
                    href={formData.noticeToOwnerDocumentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-blue-600 hover:underline"
                  >
                    <LinkIcon className="h-4 w-4" />
                    Ver documento
                  </a>
                )}
              </div>
            ) : (
              <div className="text-yellow-700">⚠ Pendiente de archivar</div>
            )}
          </div>
        )}
      </div>

      {/* Lien Section */}
      <div className={`mb-4 p-3 rounded border ${getBackgroundColor()}`}>
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold text-gray-700">🔗 Lien (Derecho de Cobro)</h4>
          {formData.lienFiled ? (
            <CheckCircleIcon className="h-5 w-5 text-green-600" />
          ) : (
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />
          )}
        </div>

        {editing ? (
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.lienFiled}
                onChange={(e) => setFormData({
                  ...formData,
                  lienFiled: e.target.checked,
                  lienFiledDate: e.target.checked ? new Date().toISOString().split('T')[0] : null
                })}
                className="rounded"
              />
              <span className="text-sm">Lien archivado</span>
            </label>
            
            {formData.lienFiled && (
              <input
                type="url"
                value={formData.lienDocumentUrl}
                onChange={(e) => setFormData({...formData, lienDocumentUrl: e.target.value})}
                placeholder="URL del lien"
                className="w-full p-2 border rounded text-sm"
              />
            )}
          </div>
        ) : (
          <div className="text-sm">
            {formData.lienFiled ? (
              <div className="space-y-1">
                <div className="text-green-700 font-medium">✓ Archivado</div>
                {formData.lienDocumentUrl && (
                  <a 
                    href={formData.lienDocumentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-blue-600 hover:underline"
                  >
                    <LinkIcon className="h-4 w-4" />
                    Ver lien
                  </a>
                )}
              </div>
            ) : (
              <div className="text-yellow-700">⚠ Pendiente de archivar</div>
            )}
          </div>
        )}
      </div>

      {/* Notes */}
      {editing && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notas
          </label>
          <textarea
            value={formData.noticeToOwnerNotes}
            onChange={(e) => setFormData({...formData, noticeToOwnerNotes: e.target.value})}
            className="w-full p-2 border rounded text-sm"
            rows="3"
            placeholder="Notas sobre Notice to Owner y Lien..."
          />
        </div>
      )}

      {!editing && work.noticeToOwnerNotes && (
        <div className={`mb-4 p-3 rounded border ${getBackgroundColor()}`}>
          <div className="text-sm font-medium text-gray-700 mb-1">📝 Notas:</div>
          <div className="text-sm text-gray-600 whitespace-pre-wrap">{work.noticeToOwnerNotes}</div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        {editing ? (
          <>
            <button
              onClick={handleSave}
              className="flex-1 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm font-medium"
            >
              💾 Guardar
            </button>
            <button
              onClick={() => {
                setEditing(false);
                setFormData({
                  noticeToOwnerFiled: work.noticeToOwnerFiled || false,
                  noticeToOwnerDocumentUrl: work.noticeToOwnerDocumentUrl || '',
                  lienFiled: work.lienFiled || false,
                  lienDocumentUrl: work.lienDocumentUrl || '',
                  noticeToOwnerNotes: work.noticeToOwnerNotes || ''
                });
              }}
              className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 text-sm font-medium"
            >
              ✕ Cancelar
            </button>
          </>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm font-medium"
          >
            ✏️ Editar
          </button>
        )}
      </div>

      {/* Info box */}
      <div className={`mt-4 p-3 rounded text-xs text-gray-600 ${getBackgroundColor()}`}>
        💡 <strong>Florida Law:</strong> El Notice to Owner debe archivarse dentro de 45 días del inicio de la instalación para proteger el derecho de cobro.
      </div>
        </>
      )}
    </div>
  );
};

export default NoticeToOwnerCard;
