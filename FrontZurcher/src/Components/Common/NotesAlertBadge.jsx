import React from 'react';
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';

/**
 * Badge de alertas para notas de un budget específico
 * Recibe los datos pre-cargados desde el componente padre
 * Muestra:
 * - 🔴 Rojo pulsante: Si hay recordatorios vencidos
 * - 🟡 Amarillo: Si hay notas no leídas
 * - 🟢 Verde: Si hay recordatorios próximos (sin vencer)
 * - Sin badge: Si no hay alertas
 */
const NotesAlertBadge = ({ budgetId, alertData, className = "h-4 w-4", onClick }) => {
  
  if (!alertData) {
    return (
      <div className="relative inline-block" onClick={onClick}>
        <ChatBubbleLeftRightIcon className={className} />
      </div>
    );
  }

  const { unread, overdue, upcoming, hasOverdue, hasUnread, hasUpcoming, total } = alertData;

  // Determinar color del badge según prioridad
  let badgeColor = 'bg-gray-400';
  let shouldPulse = false;

  if (hasOverdue) {
    badgeColor = 'bg-red-500';
    shouldPulse = true; // Pulsar si hay recordatorios vencidos
  } else if (hasUnread) {
    badgeColor = 'bg-yellow-500';
    shouldPulse = false;
  } else if (hasUpcoming) {
    badgeColor = 'bg-green-500';
    shouldPulse = false;
  }

  const hasAnyAlert = hasUnread || hasOverdue || hasUpcoming;

  return (
    <div className="relative inline-block" onClick={onClick}>
      <ChatBubbleLeftRightIcon className={className} />
      {hasAnyAlert && (
        <span
          className={`absolute -top-2 -right-2 ${badgeColor} text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center ${
            shouldPulse ? 'animate-pulse' : ''
          }`}
          title={
            hasOverdue 
              ? '¡Recordatorio vencido!' 
              : hasUnread 
              ? 'Notas no leídas' 
              : 'Recordatorio próximo'
          }
        >
          {total > 0 ? (total > 9 ? '9+' : total) : '!'}
        </span>
      )}
    </div>
  );
};

export default NotesAlertBadge;
