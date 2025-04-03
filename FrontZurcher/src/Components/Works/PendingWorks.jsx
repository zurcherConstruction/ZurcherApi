import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { updateWork } from "../../Redux/Actions/workActions"; // Acción para actualizar una obra
import { fetchStaff } from "../../Redux/Actions/adminActions"; // Acción para obtener el staff
import Calendar from "react-calendar"; // Para seleccionar fechas
import "react-calendar/dist/Calendar.css";
import { Calendar as BigCalendar, momentLocalizer } from "react-big-calendar"; // Para mostrar el calendario
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";

const PendingWorks = () => {
  const dispatch = useDispatch();
  const { works } = useSelector((state) => state.work); // Obtener trabajos desde Redux
  const { staff, loading: staffLoading, error: staffError } = useSelector((state) => state.admin); // Obtener staff desde Redux
console.log(staff, "staff"); // Verificar el contenido del staff
  const [selectedWork, setSelectedWork] = useState(null);
  const [startDate, setStartDate] = useState(new Date());
  const [selectedStaff, setSelectedStaff] = useState("");

  const localizer = momentLocalizer(moment);

  // Filtrar trabajos con estado "pending"
  const pendingWorks = works.filter((work) => work.status === "pending");

  // Cargar el staff al montar el componente
  useEffect(() => {
    dispatch(fetchStaff());
  }, [dispatch]);

  const handleAssign = () => {
    if (!selectedWork || !selectedStaff) {
      alert("Por favor selecciona un trabajo y un miembro del staff.");
      return;
    }

    // Convertir la fecha al formato YYYY-MM-DD
    const formattedDate = startDate.toISOString().split("T")[0];

    // Enviar idWork al backend con la fecha formateada
    dispatch(
      updateWork(selectedWork.idWork, {
        startDate: formattedDate, // Fecha en formato YYYY-MM-DD
        staffId: selectedStaff, // ID del miembro del staff 
      })
    );

    alert("Trabajo asignado correctamente.");
    setSelectedWork(null);
    setSelectedStaff("");
  };

  // Convertir trabajos en eventos para el calendario
  const events = works
    .filter((work) => work.startDate) // Solo trabajos con fecha asignada
    .map((work) => ({
      title: `${work.propertyAddress} - ${work.notes || "Sin notas"}`,
      start: new Date(work.startDate),
      end: new Date(work.startDate), // Puedes ajustar la duración si es necesario
      work, // Pasar el objeto completo para usarlo en el tooltip
    }));

  // Renderizar eventos con un color llamativo
  const eventStyleGetter = (event) => {
    return {
      style: {
        backgroundColor: "#ff6347", // Color llamativo
        color: "white",
        borderRadius: "5px",
        border: "none",
        padding: "5px",
      },
    };
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Trabajos Pendientes</h1>

      {/* Lista de trabajos pendientes */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Selecciona un trabajo:</h2>
        <ul className="space-y-2">
          {pendingWorks.map((work) => (
            <li
              key={work.idWork}
              className={`p-2 border rounded cursor-pointer ${
                selectedWork?.idWork === work.idWork ? "bg-blue-200" : ""
              } ${work.startDate ? "bg-gray-300 cursor-not-allowed" : ""}`} // Si ya tiene fecha, deshabilitar
              onClick={() => {
                if (!work.startDate) setSelectedWork(work); // Solo permitir seleccionar si no tiene fecha
              }}
            >
              {work.propertyAddress} - {work.status}
              {work.startDate && (
                <span className="text-red-500 ml-2">(Ya asignado)</span>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Seleccionar fecha */}
      {selectedWork && (
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Selecciona una fecha:</h2>
          <Calendar onChange={setStartDate} value={startDate} />
        </div>
      )}

      {/* Seleccionar miembro del staff */}
      {selectedWork && (
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Asignar a un miembro del staff:</h2>
          {staffLoading && <p>Cargando miembros del staff...</p>}
          {staffError && <p className="text-red-500">Error: {staffError}</p>}
          {!staffLoading && !staffError && (
            <select
              value={selectedStaff}
              onChange={(e) => setSelectedStaff(e.target.value)}
              className="border p-2 rounded w-full"
            >
              <option value="">Selecciona un miembro del staff</option>
              {staff.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Botón para asignar */}
      {selectedWork && (
        <button
          onClick={handleAssign}
          className="px-4 py-2 bg-blue-950 text-white rounded hover:bg-blue-600"
        >
          Asignar Trabajo
        </button>
      )}

    {/* Calendario */}
<div className="mt-8">
  <h2 className="text-lg font-semibold mb-4">Calendario de Trabajos</h2>
  <BigCalendar
    localizer={localizer}
    events={events}
    startAccessor="start"
    endAccessor="end"
    style={{ height: 400, width: "100%" }} // Reducir la altura y el ancho
    eventPropGetter={eventStyleGetter} // Aplicar estilo personalizado
    tooltipAccessor={(event) =>
      `Dirección: ${event.work.propertyAddress}\nStaff: ${event.work.notes}`
    } // Mostrar tooltip con información
  />
</div>
    </div>
  );
};

export default PendingWorks;