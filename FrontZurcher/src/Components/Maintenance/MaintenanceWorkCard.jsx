import React from 'react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';

const MaintenanceWorkCard = ({ work, onSelect }) => {
  // Calcular próxima visita (esto debería venir del backend idealmente)
  const getNextVisitInfo = () => {
    if (!work.maintenanceStartDate) return null;
    
    const startDate = parseISO(work.maintenanceStartDate);
    const today = new Date();
    
    // Calcular próximas fechas de visita (cada 6 meses)
    const visits = [];
    for (let i = 1; i <= 4; i++) {
      const visitDate = new Date(startDate);
      visitDate.setMonth(startDate.getMonth() + (i * 6));
      visits.push({
        number: i,
        date: visitDate,
        isPast: visitDate < today
      });
    }
    
    const nextVisit = visits.find(v => !v.isPast);
    return nextVisit;
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      maintenance: {
        color: 'bg-blue-100 text-blue-800',
        text: 'En Mantenimiento'
      },
      maintenance_completed: {
        color: 'bg-green-100 text-green-800',
        text: 'Completado'
      }
    };
    
    return statusConfig[status] || {
      color: 'bg-gray-100 text-gray-800',
      text: status
    };
  };

  const getPriorityBadge = (daysUntilVisit) => {
    if (daysUntilVisit < 0) {
      return { color: 'bg-red-100 text-red-800', text: 'Atrasado' };
    } else if (daysUntilVisit <= 7) {
      return { color: 'bg-orange-100 text-orange-800', text: 'Urgente' };
    } else if (daysUntilVisit <= 30) {
      return { color: 'bg-yellow-100 text-yellow-800', text: 'Próximo' };
    } else {
      return { color: 'bg-green-100 text-green-800', text: 'Programado' };
    }
  };

  const nextVisit = getNextVisitInfo();
  const statusBadge = getStatusBadge(work.status);
  
  let daysUntilVisit = null;
  let priorityBadge = null;
  
  if (nextVisit) {
    daysUntilVisit = differenceInDays(nextVisit.date, new Date());
    priorityBadge = getPriorityBadge(daysUntilVisit);
  }

  return (
    <div 
      className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200 cursor-pointer"
      onClick={onSelect}
    >
      <div className="p-6">
        {/* Header con estado */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {work.propertyAddress}
            </h3>
            <p className="text-sm text-gray-600">
              {work.budget?.applicantName || 'Sin nombre'}
            </p>
          </div>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusBadge.color}`}>
            {statusBadge.text}
          </span>
        </div>

        {/* Información de mantenimiento */}
        <div className="space-y-3">
          {/* Fecha de inicio */}
          <div className="flex items-center text-sm text-gray-600">
            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>
              Inicio: {work.maintenanceStartDate 
                ? format(parseISO(work.maintenanceStartDate), 'dd/MM/yyyy', { locale: es })
                : 'No definido'
              }
            </span>
          </div>

          {/* Próxima visita */}
          {nextVisit && (
            <div className="flex items-center justify-between">
              <div className="flex items-center text-sm text-gray-600">
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>
                  Visita #{nextVisit.number}: {format(nextVisit.date, 'dd/MM/yyyy', { locale: es })}
                </span>
              </div>
              {priorityBadge && (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityBadge.color}`}>
                  {priorityBadge.text}
                </span>
              )}
            </div>
          )}

          {/* Días hasta próxima visita */}
          {daysUntilVisit !== null && (
            <div className="text-sm text-gray-600">
              {daysUntilVisit < 0 
                ? `Atrasado ${Math.abs(daysUntilVisit)} días`
                : daysUntilVisit === 0 
                  ? 'Visita programada para hoy'
                  : `Próxima visita en ${daysUntilVisit} días`
              }
            </div>
          )}

          {/* Información adicional */}
          <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
            <span>ID: {work.idWork.slice(0, 8)}...</span>
            <span>
              {work.createdAt 
                ? format(parseISO(work.createdAt), 'dd/MM/yyyy', { locale: es })
                : 'Sin fecha'
              }
            </span>
          </div>
        </div>

        {/* Botón de acción */}
        <div className="mt-4">
          <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors duration-200 text-sm font-medium">
            Ver Visitas de Mantenimiento
          </button>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceWorkCard;
