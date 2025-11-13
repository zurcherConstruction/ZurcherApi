import React from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { parseDateOnly } from '../../utils/dateHelpers';

function getStatusConfig(status) {
  const statusConfig = {
    pending_scheduling: {
      color: 'bg-gray-100 text-gray-800 border-gray-200',
      icon: '⏳',
      text: 'Pendiente'
    },
    scheduled: {
      color: 'bg-blue-100 text-blue-800 border-blue-200',
      icon: '📅',
      text: 'Programada'
    },
    assigned: {
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      icon: '👤',
      text: 'Asignada'
    },
    completed: {
      color: 'bg-green-100 text-green-800 border-green-200',
      icon: '✅',
      text: 'Completada'
    },
    skipped: {
      color: 'bg-red-100 text-red-800 border-red-200',
      icon: '⏭️',
      text: 'Omitida'
    }
  };

  return statusConfig[status] || statusConfig.pending_scheduling;
}

const VisitCard = ({ visit, onClick }) => {
  const statusConfig = getStatusConfig(visit.status);
  const hasMedia = visit.mediaFiles && visit.mediaFiles.length > 0;

  return (
    <div 
      className={`bg-white rounded-lg border-2 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer ${statusConfig.color.split(' ')[2]} hover:scale-[1.02]`}
      onClick={onClick}
    >
      <div className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <span className="text-lg">{statusConfig.icon}</span>
            <h3 className="text-lg font-semibold text-gray-900">
              Visita #{visit.visitNumber}
            </h3>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
            {statusConfig.text}
          </span>
        </div>

        {/* Fechas */}
        <div className="space-y-3 mb-4">
          {/* Fecha programada */}
          <div className="flex items-center text-sm text-gray-600">
            <svg className="h-4 w-4 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="font-medium">Programada:</span>
            <span className="ml-2">
              {visit.scheduledDate 
                ? format(parseDateOnly(visit.scheduledDate), 'dd/MM/yyyy', { locale: es })
                : 'No programada'
              }
            </span>
          </div>

          {/* Fecha real de visita */}
          {visit.actualVisitDate && (
            <div className="flex items-center text-sm text-gray-600">
              <svg className="h-4 w-4 mr-2 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">Realizada:</span>
              <span className="ml-2">
                {format(parseDateOnly(visit.actualVisitDate), 'dd/MM/yyyy', { locale: es })}
              </span>
            </div>
          )}
        </div>

        {/* Staff asignado */}
        {visit.assignedStaff && (
          <div className="flex items-center text-sm text-gray-600 mb-3">
            <svg className="h-4 w-4 mr-2 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="font-medium">Asignado a:</span>
            <span className="ml-2">{visit.assignedStaff.name}</span>
          </div>
        )}

        {/* Notas (preview) */}
        {visit.notes && (
          <div className="mb-3">
            <p className="text-sm text-gray-600 line-clamp-2">
              <span className="font-medium">Notas:</span> {visit.notes}
            </p>
          </div>
        )}

        {/* Multimedia y acciones */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          {/* Indicador de multimedia */}
          <div className="flex items-center space-x-2">
            {hasMedia && (
              <div className="flex items-center text-xs text-gray-500">
                <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>{visit.mediaFiles.length} archivo(s)</span>
              </div>
            )}
          </div>

          {/* Botón de acción */}
          <button className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors">
            {visit.status === 'completed' ? 'Ver detalles' : 'Gestionar visita'}
            <svg className="h-4 w-4 ml-1 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Información adicional para visitas completadas */}
        {visit.status === 'completed' && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
              <svg className="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Visita completada correctamente
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VisitCard;
