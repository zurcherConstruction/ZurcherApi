import React, { useState, useEffect } from "react";
import { useDispatch, useSelector }  from "react-redux";
import { fetchWorks, updateWork } from "../../Redux/Actions/workActions";
import { fetchStaff } from "../../Redux/Actions/adminActions";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { Calendar as BigCalendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "moment-timezone";
import "react-big-calendar/lib/css/react-big-calendar.css";
import socket from "../../utils/io";
import logo from "../../assets/logoseptic.png";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { UserIcon, CalendarDaysIcon, ArrowPathIcon, CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/outline";
import { XMarkIcon, CalendarDaysIcon as CalendarIcon } from "@heroicons/react/24/outline";

const PendingWorks = () => {
  const dispatch = useDispatch();
  const { works } = useSelector((state) => state.work);
  const { staffList: staff, loading: staffLoading, error: staffError } = useSelector((state) => state.admin);
  
  // ✅ Obtener el rol del usuario para permisos
  const { user, currentStaff } = useSelector((state) => state.auth);
  const authStaff = currentStaff || user;
  const userRole = authStaff?.role || '';
  
  // ✅ Solo owner y recept pueden editar, admin solo ve
  const canEdit = userRole === 'owner' || userRole === 'recept';
  const isReadOnly = !canEdit;

  const [selectedWork, setSelectedWork] = useState(null);
  const [startDate, setStartDate] = useState(new Date());
  const [selectedStaff, setSelectedStaff] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const localizer = momentLocalizer(moment);

  // Filtrar trabajos
  const pendingWorks = works.filter((work) => work.status === "pending");
  const assignedWorks = works.filter((work) => work.status === "assigned");
  const inProgressWorks = works.filter((work) => work.status === "inProgress");

  useEffect(() => {
    dispatch(fetchStaff());
    dispatch(fetchWorks());
  }, [dispatch]);

  // Cuando seleccionas un trabajo, carga sus datos actuales
  useEffect(() => {
    if (selectedWork) {
      setStartDate(selectedWork.startDate ? moment(selectedWork.startDate).toDate() : new Date());
      setSelectedStaff(selectedWork.staffId || "");
      setEditMode(['pending', 'assigned', 'inProgress'].includes(selectedWork.status));
    } else {
      setEditMode(false);
    }
  }, [selectedWork]);

  const handleAssignOrUpdate = async () => {
    if (!selectedWork || !selectedStaff) {
      toast.error("Por favor selecciona un trabajo y un miembro del staff.");
      return;
    }
    // Tomar la fecha seleccionada del calendario y enviarla como string YYYY-MM-DD sin conversión de zona horaria
    let rawDate;
    if (startDate instanceof Date) {
      // Si es un objeto Date, formatear a YYYY-MM-DD
      rawDate = startDate.toISOString().split('T')[0];
    } else if (typeof startDate === 'string') {
      // Si ya es string (de react-calendar), usar tal cual
      rawDate = startDate;
    } else {
      // Fallback: usar moment
      rawDate = moment(startDate).format('YYYY-MM-DD');
    }
    try {
      await dispatch(
        updateWork(selectedWork.idWork, {
          startDate: rawDate,
          staffId: selectedStaff,
          status: "assigned",
        })
      );
      toast.success(editMode ? "Asignación modificada correctamente." : "Trabajo asignado correctamente.");
      setSelectedWork(null);
      setSelectedStaff("");
    } catch (error) {
      console.error("Error al asignar/modificar el trabajo:", error);
      toast.error("Hubo un error al guardar la asignación.");
    }
  };

  // Nueva función para suspender/cancelar trabajo
  const handleCancelWork = async () => {
    if (!selectedWork) return;
    if (!window.confirm("¿Seguro que deseas suspender/cancelar este trabajo?")) return;
    try {
      await dispatch(
        updateWork(selectedWork.idWork, {
          ...selectedWork,
          status: "cancelled",
        })
      );
      toast.success("Trabajo suspendido/cancelado correctamente.");
      setSelectedWork(null);
      setSelectedStaff("");
    } catch (error) {
      console.error("Error al cancelar el trabajo:", error);
      toast.error("Hubo un error al cancelar el trabajo.");
    }
  };

  const events = works
    .filter((work) => work.startDate)
    .map((work) => {
      const staffMember = staff.find((member) => member.id === work.staffId);
      const staffName = staffMember ? staffMember.name : "Sin asignar";
      // Mostrar siempre en horario de Miami
      const startMiami = moment.tz(work.startDate, "America/New_York").toDate();
      return {
        title: `${work.propertyAddress} - (${staffName})`,
        start: startMiami,
        end: startMiami,
        work,
      };
    });

  const eventStyleGetter = (event) => {
    return {
      style: {
        backgroundColor: event.work.status === "assigned" ? "#2563eb" : "#4CAF50",
        color: "white",
        borderRadius: "5px",
        padding: "5px",
        textAlign: "center",
        border: event.work.status === "assigned" ? "2px solid #1d4ed8" : "2px solid #22c55e",
      },
    };
  };
  const getToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  };

  return (
    <div className="p-4 min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <h1 className="text-2xl font-bold mb-6 text-blue-900 flex items-center gap-2">
        <CalendarDaysIcon className="h-7 w-7 text-blue-500" />
        Gestión de Asignaciones de Instalación
      </h1>
      <div className="flex flex-col md:flex-row gap-6">
        {/* Panel izquierdo: Trabajos pendientes y asignados */}
        <div className="w-full md:w-1/3 bg-white shadow-xl rounded-xl p-4 flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Trabajos Pendientes</h2>
          {pendingWorks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40">
              <img src={logo} alt="No pending works" className="w-24 h-24 mb-2" />
              <p className="text-md font-medium text-gray-400">No hay trabajos pendientes</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {pendingWorks.map((work) => (
                <li
                  key={work.idWork}
                  className={`p-3 border rounded-lg cursor-pointer transition-all hover:bg-blue-50 ${selectedWork?.idWork === work.idWork ? "bg-blue-100 border-blue-400" : "bg-gray-50"}`}
                  onClick={() => setSelectedWork(work)}
                >
                  <span className="font-semibold text-blue-700">{work.propertyAddress}</span>
                  <span className="ml-2 text-xs px-2 py-0.5 rounded bg-yellow-100 text-yellow-800">Pendiente</span>
                </li>
              ))}
            </ul>
          )}
          <h2 className="text-lg font-semibold text-gray-800 mt-6 mb-2">Trabajos Asignados</h2>
          {assignedWorks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-20">
              <XCircleIcon className="h-8 w-8 text-gray-300 mb-1" />
              <p className="text-md font-medium text-gray-400">No hay trabajos asignados</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {assignedWorks.map((work) => (
                <li
                  key={work.idWork}
                  className={`p-3 border rounded-lg cursor-pointer transition-all hover:bg-blue-50 ${selectedWork?.idWork === work.idWork ? "bg-blue-100 border-blue-400" : "bg-gray-50"}`}
                  onClick={() => setSelectedWork(work)}
                >
                  <span className="font-semibold text-blue-700">{work.propertyAddress}</span>
                  <span className="ml-2 text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800">Asignado</span>
                  <span className="ml-2 text-xs text-gray-500">{work.startDate ? moment.tz(work.startDate, "America/New_York").format("MM-DD-YYYY HH:mm") : "Sin fecha"}</span>
                </li>
              ))}
            </ul>
          )}
          <h2 className="text-lg font-semibold text-gray-800 mt-6 mb-2">Trabajos En Progreso</h2>
          {inProgressWorks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-20">
              <XCircleIcon className="h-8 w-8 text-gray-300 mb-1" />
              <p className="text-md font-medium text-gray-400">No hay trabajos en progreso</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {inProgressWorks.map((work) => (
                <li
                  key={work.idWork}
                  className={`p-3 border rounded-lg cursor-pointer transition-all hover:bg-blue-50 ${selectedWork?.idWork === work.idWork ? "bg-blue-100 border-blue-400" : "bg-gray-50"}`}
                  onClick={() => setSelectedWork(work)}
                >
                  <span className="font-semibold text-blue-700">{work.propertyAddress}</span>
                  <span className="ml-2 text-xs px-2 py-0.5 rounded bg-green-100 text-green-800">En Progreso</span>
                  <span className="ml-2 text-xs text-gray-500">{work.startDate ? moment.tz(work.startDate, "America/New_York").format("MM-DD-YYYY HH:mm") : "Sin fecha"}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        {/* Panel central: Detalle y asignación/modificación */}
        <div className="flex-1 bg-white shadow-xl rounded-xl p-6 flex flex-col gap-4">
          {!selectedWork ? (
            <div className="flex flex-col items-center justify-center h-full py-16">
              <UserIcon className="h-16 w-16 text-blue-200 mb-4" />
              <p className="text-lg text-gray-500 font-medium">Selecciona un trabajo para asignar o modificar</p>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-blue-800 mb-2 flex items-center gap-2">
                {selectedWork.propertyAddress}
                {selectedWork.status === "assigned" ? (
                  <CheckCircleIcon className="h-5 w-5 text-green-500" />
                ) : (
                  <ArrowPathIcon className="h-5 w-5 text-yellow-500" />
                )}
              </h2>
              <div className="flex flex-col md:flex-row gap-4 items-start">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Fecha de instalación</label>
                  <Calendar
                    onChange={setStartDate}
                    value={startDate}
                    minDate={getToday()}
                    className={`rounded-lg border border-gray-200 shadow-sm ${
                      isReadOnly ? 'opacity-60 pointer-events-none' : ''
                    }`}
                    tileDisabled={isReadOnly ? () => true : undefined}
                  />
                  {isReadOnly && (
                    <p className="text-xs text-gray-500 mt-2">⚠️ View only - No edit permissions</p>
                  )}
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Miembro del staff asignado</label>
                  {staffLoading && <p>Cargando miembros del staff...</p>}
                  {staffError && <p className="text-red-500">Error: {staffError}</p>}
                  {!staffLoading && !staffError && (
                    <>
                      <select
                        value={selectedStaff}
                        onChange={(e) => setSelectedStaff(e.target.value)}
                        disabled={isReadOnly}
                        className={`border p-2 rounded w-full focus:ring-2 focus:ring-blue-400 ${
                          isReadOnly ? 'bg-gray-100 cursor-not-allowed' : 'bg-gray-50'
                        }`}
                      >
                        <option value="">Selecciona un miembro del staff</option>
                        {staff.filter(member => member.role === 'worker').map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.name}
                          </option>
                        ))}
                      </select>
                      {isReadOnly && (
                        <p className="text-xs text-gray-500 mt-2">⚠️ View only - No edit permissions</p>
                      )}
                    </>
                  )}
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleAssignOrUpdate}
                  className={`flex-1 py-3 rounded-lg font-semibold text-white transition-all duration-200 ${
                    !selectedWork || !selectedStaff || isReadOnly
                      ? "bg-gray-300 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700 shadow-md hover:scale-[1.02]"
                  }`}
                  disabled={!selectedWork || !selectedStaff || isReadOnly}
                  title={isReadOnly ? "View only - No edit permissions" : ""}
                >
                  {editMode ? "Guardar cambios" : "Asignar trabajo"}
                </button>
                <button
                  onClick={() => setSelectedWork(null)}
                  className="flex-1 py-3 rounded-lg font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 transition-all duration-200"
                >
                  Cancelar
                </button>
                {/* Botón para suspender/cancelar trabajo */}
                {selectedWork && selectedWork.status !== "cancelled" && (
                  <button
                    onClick={handleCancelWork}
                    disabled={isReadOnly}
                    className={`flex-1 py-3 text-xs rounded-lg font-semibold border transition-all duration-200 ${
                      isReadOnly
                        ? 'bg-gray-300 text-gray-500 border-gray-400 cursor-not-allowed'
                        : 'bg-red-500 hover:bg-red-600 text-white border-red-600'
                    }`}
                    title={isReadOnly ? "View only - No edit permissions" : "Cancelar trabajo"}
                  >
                    Cancelar trabajo
                  </button>
                )}
              </div>
            </>
          )}
        </div>
        {/* Botón para abrir el calendario en modal */}
        <div className="flex flex-col justify-center items-center md:items-end md:justify-start">
          <button
            onClick={() => setCalendarOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md font-semibold transition-all duration-200"
          >
            <CalendarIcon className="h-5 w-5" />
            Ver calendario
          </button>
        </div>
      </div>
      {/* Modal del calendario (React puro) */}
      {calendarOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-5xl mx-auto p-6">
            <button
              onClick={() => setCalendarOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"
              aria-label="Cerrar calendario"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
            <h2 className="text-xl font-bold text-blue-800 mb-4 flex items-center gap-2">
              <CalendarIcon className="h-6 w-6 text-blue-500" />
              Calendario de trabajos
            </h2>
            <div className="overflow-x-auto">
              <BigCalendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: 600, minWidth: 600 }}
                eventPropGetter={eventStyleGetter}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default PendingWorks;