import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { updateWork } from "../../Redux/Actions/workActions";
import { fetchStaff } from "../../Redux/Actions/adminActions";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { Calendar as BigCalendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import socket from "../../utils/io"; // Importar Socket.IO
import api from "../../utils/axios"; // Importar Axios para notificaciones

const PendingWorks = () => {
  const dispatch = useDispatch();
  const { works } = useSelector((state) => state.work);
  const { staff, loading: staffLoading, error: staffError } = useSelector((state) => state.admin);

  const [selectedWork, setSelectedWork] = useState(null);
  const [startDate, setStartDate] = useState(new Date());
  const [selectedStaff, setSelectedStaff] = useState("");

  const localizer = momentLocalizer(moment);

  // Filtrar trabajos con estado "pending"
  const pendingWorks = works.filter((work) => work.status === "pending");

  useEffect(() => {
    dispatch(fetchStaff());
  }, [dispatch]);

  const handleAssign = async () => {
    if (!selectedWork || !selectedStaff) {
      alert("Por favor selecciona un trabajo y un miembro del staff.");
      return;
    }

    const formattedDate = startDate.toISOString().split("T")[0];

    try {
      // Actualizar el trabajo en el backend
      await dispatch(
        updateWork(selectedWork.idWork, {
          startDate: formattedDate,
          staffId: selectedStaff,
          status: "assigned",
        })
      );

      // Enviar notificación por correo al miembro del staff asignado
      const assignedStaff = staff.find((member) => member.id === selectedStaff);
      if (assignedStaff) {
        await api.post("/notification/email", {
          email: assignedStaff.email,
          subject: "Trabajo Asignado",
          message: `Se te ha asignado el trabajo en ${selectedWork.propertyAddress} para la fecha ${formattedDate}.`,
        });

        // Enviar notificación por Socket.IO al miembro del staff
        socket.emit("notification", {
          recipientId: selectedStaff,
          message: `Se te ha asignado un trabajo en ${selectedWork.propertyAddress}.`,
        });
      }

      // Obtener correos del staff con rol "recept"
    const receptStaff = staff.filter((member) => member.role === "recept");
    const receptEmails = receptStaff.map((member) => member.email);

    if (receptEmails.length > 0) {
      // Enviar correo a los receptores
      await api.post("/notification/email", {
        email: receptEmails.join(","),
        subject: "Compra de Materiales Pendiente",
        message: `Hay una compra de materiales pendiente para el trabajo en ${selectedWork.propertyAddress}. Los materiales se necesitan para la fecha ${formattedDate}.`,
      });

      // Notificar a los receptores por Socket.IO
      socket.emit("notification", {
        role: "recept",
        message: `Hay una compra de materiales pendiente para el trabajo en ${selectedWork.propertyAddress}. Los materiales se necesitan para la fecha ${formattedDate}.`,
      });
    }

      alert("Trabajo asignado correctamente.");
      setSelectedWork(null);
      setSelectedStaff("");
    } catch (error) {
      console.error("Error al asignar el trabajo:", error);
      alert("Hubo un error al asignar el trabajo.");
    }
  };

  const events = works
    .filter((work) => work.startDate)
    .map((work) => {
      const staffMember = staff.find((member) => member.id === work.staffId);
      const staffName = staffMember ? staffMember.name : "Sin asignar";

      return {
        title: `${work.propertyAddress} - (${staffName})`,
        start: new Date(work.startDate),
        end: new Date(work.startDate),
        work,
      };
    });

  const eventStyleGetter = (event) => {
    return {
      style: {
        backgroundColor: "#1E90FF",
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

      <div className="mb-4">
        <h2 className="text-lg font-semibold">Selecciona un trabajo:</h2>
        <ul className="space-y-2">
          {pendingWorks.map((work) => (
            <li
              key={work.idWork}
              className={`p-2 border rounded cursor-pointer ${
                selectedWork?.idWork === work.idWork ? "bg-blue-200" : ""
              }`}
              onClick={() => setSelectedWork(work)}
            >
              {work.propertyAddress} - {work.status}
            </li>
          ))}
        </ul>
      </div>

      {selectedWork && (
        <>
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Selecciona una fecha:</h2>
            <Calendar onChange={setStartDate} value={startDate} />
          </div>

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

          <button
            onClick={handleAssign}
            className="px-4 py-2 bg-blue-950 text-white rounded hover:bg-blue-600"
          >
            Asignar Trabajo
          </button>
        </>
      )}

      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4">Calendario de Trabajos</h2>
        <BigCalendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: 400, width: "100%" }}
          eventPropGetter={eventStyleGetter}
          tooltipAccessor={(event) =>
            `Dirección: ${event.work.propertyAddress}\nStaff: ${event.work.staffId}`
          }
        />
      </div>
    </div>
  );
};

export default PendingWorks;