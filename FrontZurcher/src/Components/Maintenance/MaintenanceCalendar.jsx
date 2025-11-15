import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Calendar as BigCalendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'moment-timezone';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { fetchWorksInMaintenance } from '../../Redux/Actions/maintenanceActions.jsx';
import { CalendarDaysIcon, XMarkIcon, UserIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';

const MaintenanceCalendar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { worksInMaintenance, loading } = useSelector((state) => state.maintenance);
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const localizer = momentLocalizer(moment);

  useEffect(() => {
    dispatch(fetchWorksInMaintenance());
  }, [dispatch]);

  // Crear eventos del calendario a partir de las visitas programadas
  const events = worksInMaintenance.flatMap((work) => {
    if (!work.maintenanceVisits || work.maintenanceVisits.length === 0) {
      return [];
    }

    return work.maintenanceVisits
      .filter(visit => visit.scheduledDate) // Solo visitas con fecha programada
      .map((visit) => {
        // Parse DATEONLY como fecha local sin conversión de timezone
        const visitDate = moment(visit.scheduledDate, 'YYYY-MM-DD').toDate();
        
        // Determinar el color según el estado
        let statusColor = '#6B7280'; // gray por defecto
        if (visit.status === 'completed') {
          statusColor = '#10B981'; // green
        } else if (visit.status === 'scheduled' || visit.status === 'assigned') {
          statusColor = '#3B82F6'; // blue
        } else if (visit.status === 'pending_scheduling') {
          statusColor = '#F59E0B'; // amber
        } else if (visit.status === 'skipped') {
          statusColor = '#EF4444'; // red
        }

        return {
          id: visit.id,
          title: `${work.propertyAddress} - Visita #${visit.visitNumber}`,
          start: visitDate,
          end: visitDate,
          resource: {
            visit,
            work,
            statusColor
          }
        };
      });
  });

  const eventStyleGetter = (event) => {
    return {
      style: {
        backgroundColor: event.resource.statusColor,
        color: 'white',
        borderRadius: '5px',
        padding: '5px',
        textAlign: 'center',
        border: `2px solid ${event.resource.statusColor}`,
        fontSize: '0.875rem'
      }
    };
  };

  const handleSelectEvent = (event) => {
    setSelectedVisit(event.resource);
    setShowDetailModal(true);
  };

  const getStatusLabel = (status) => {
    const labels = {
      'pending_scheduling': 'Pendiente Programación',
      'scheduled': 'Programada',
      'assigned': 'Asignada',
      'completed': 'Completada',
      'skipped': 'Omitida'
    };
    return labels[status] || status;
  };

  const getStatusBadgeColor = (status) => {
    const colors = {
      'pending_scheduling': 'bg-amber-100 text-amber-800',
      'scheduled': 'bg-blue-100 text-blue-800',
      'assigned': 'bg-purple-100 text-purple-800',
      'completed': 'bg-green-100 text-green-800',
      'skipped': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-4 min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2 text-blue-900 flex items-center gap-2">
          <CalendarDaysIcon className="h-7 w-7 text-blue-500" />
          Calendario de Visitas de Mantenimiento
        </h1>
        <p className="text-gray-600">
          Visualiza y gestiona las visitas programadas para obras en mantenimiento
        </p>
      </div>

      {/* Leyenda de colores */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-4">
        <h3 className="font-semibold text-gray-700 mb-2">Leyenda:</h3>
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-amber-500 rounded"></div>
            <span className="text-sm text-gray-600">Pendiente Programación</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span className="text-sm text-gray-600">Programada</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-purple-500 rounded"></div>
            <span className="text-sm text-gray-600">Asignada</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span className="text-sm text-gray-600">Completada</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span className="text-sm text-gray-600">Omitida</span>
          </div>
        </div>
      </div>

      {/* Calendario */}
      <div className="bg-white rounded-lg shadow-xl p-4" style={{ height: '700px' }}>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Cargando visitas...</p>
            </div>
          </div>
        ) : (
          <BigCalendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: '100%' }}
            eventPropGetter={eventStyleGetter}
            onSelectEvent={handleSelectEvent}
            views={['month', 'week', 'day', 'agenda']}
            messages={{
              next: 'Siguiente',
              previous: 'Anterior',
              today: 'Hoy',
              month: 'Mes',
              week: 'Semana',
              day: 'Día',
              agenda: 'Agenda',
              date: 'Fecha',
              time: 'Hora',
              event: 'Visita',
              noEventsInRange: 'No hay visitas programadas en este rango.',
              showMore: (total) => `+ Ver ${total} más`
            }}
          />
        )}
      </div>

      {/* Modal de detalle de visita */}
      {showDetailModal && selectedVisit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-800">
                Detalles de la Visita #{selectedVisit.visit.visitNumber}
              </h3>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Información del trabajo */}
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                <h4 className="font-semibold text-blue-900 mb-2">Información de la Obra</h4>
                <p className="text-sm text-blue-800">
                  <strong>Dirección:</strong> {selectedVisit.work.propertyAddress}
                </p>
                <p className="text-sm text-blue-800">
                  <strong>Cliente:</strong> {selectedVisit.work.budget?.applicantName || 'N/A'}
                </p>
              </div>

              {/* Información de la visita */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número de Visita
                  </label>
                  <p className="text-lg font-semibold text-gray-900">
                    Visita #{selectedVisit.visit.visitNumber}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estado
                  </label>
                  <span className={`inline-block px-3 py-1 text-sm font-semibold rounded-full ${getStatusBadgeColor(selectedVisit.visit.status)}`}>
                    {getStatusLabel(selectedVisit.visit.status)}
                  </span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha Programada
                  </label>
                  <p className="text-gray-900">
                    {moment(selectedVisit.visit.scheduledDate, 'YYYY-MM-DD').format('DD/MM/YYYY')}
                  </p>
                </div>

                {selectedVisit.visit.actualVisitDate && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha Real
                    </label>
                    <p className="text-gray-900">
                      {moment(selectedVisit.visit.actualVisitDate, 'YYYY-MM-DD').format('DD/MM/YYYY')}
                    </p>
                  </div>
                )}

                {selectedVisit.visit.staffId && (
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <UserIcon className="h-4 w-4 inline mr-1" />
                      Asignado a
                    </label>
                    <p className="text-gray-900">
                      {selectedVisit.visit.Staff?.name || 'N/A'}
                    </p>
                  </div>
                )}
              </div>

              {/* Notas */}
              {selectedVisit.visit.notes && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notas
                  </label>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                    {selectedVisit.visit.notes}
                  </p>
                </div>
              )}

              {/* Botón para ver detalle completo */}
              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={() => {
                    navigate(`/maintenance/${selectedVisit.work.idWork}`);
                    setShowDetailModal(false);
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-semibold transition-colors"
                >
                  Ver Detalles Completos
                </button>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 px-4 rounded-lg font-semibold transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaintenanceCalendar;
