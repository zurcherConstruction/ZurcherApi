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
import logo from "../../assets/logoseptic.png"; // Cambia esta ruta al logo que quieras usar
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const PendingWorks = () => {
  const dispatch = useDispatch();
  const { works } = useSelector((state) => state.work);
  const { staffList: staff, loading: staffLoading, error: staffError } = useSelector((state) => state.admin);

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
      toast.error("Por favor selecciona un trabajo y un miembro del staff.");
      return;
    }

    const formattedDate = moment(startDate).format("YYYY-MM-DD"); // Asegúrate de usar la zona horaria local

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

      toast.success("Trabajo asignado correctamente.");
      setSelectedWork(null);
      setSelectedStaff("");
    } catch (error) {
      console.error("Error al asignar el trabajo:", error);
      toast.error("Hubo un error al asignar el trabajo.");
    }
  };

  const events = works
    .filter((work) => work.startDate)
    .map((work) => {
      const staffMember = staff.find((member) => member.id === work.staffId);
      const staffName = staffMember ? staffMember.name : "Sin asignar";

      return {
        title: `${work.propertyAddress} - (${staffName})`,
        start: moment(work.startDate).toDate(),
        end: moment(work.startDate).toDate(),
        work,
      };
    });

  const eventStyleGetter = (event) => {
    return {
      style: {
        backgroundColor: "#4CAF50", // Cambia el color de fondo
        color: "white", // Cambia el color del texto
        borderRadius: "5px", // Bordes redondeados
        padding: "5px",
        textAlign: "center", // Centra el texto
      },
    };
  };
  const getToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Establece la hora a las 00:00:00
    return today;
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-nunito mb-4 font-semibold">Assign Installation Date</h1>
      <div className="flex flex-col md:flex-row gap-4">
        {/* Sección izquierda: Selección de trabajos o logo */}
        <div className="w-full md:w-1/3 bg-gray-100 shadow-md rounded-md p-4">
          {pendingWorks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <img
                src={logo} // Cambia esta ruta al logo que quieras usar
                alt="No pending works"
                className="w-32 h-32 mb-4"
              />
              <p className="text-lg font-semibold text-gray-500">No pending works</p>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-semibold font-nunito mb-4">Select an address:</h2>
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
  
              {selectedWork && (
                <>
                  <h2 className="text-lg font-semibold mt-4 mb-2">Selecciona una fecha:</h2>
                  <Calendar 
                    onChange={setStartDate} 
                    value={startDate} 
                    minDate={getToday()} // Restringe la selección a partir del día actual
                  />
                  <h2 className="text-lg font-semibold mt-4 mb-2">Asignar a un miembro del staff:</h2>
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
  
                  <button
                    onClick={handleAssign}
                    className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Asignar Trabajo
                  </button>
                </>
              )}
            </>
          )}
        </div>
  
        {/* Sección derecha: BigCalendar */}
        <div className="flex-1 bg-white shadow-md rounded-md p-4">
          <BigCalendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: 500, width: "100%" }}
            eventPropGetter={eventStyleGetter}
          />
        </div>
      </div>
    </div>
  );}
export default PendingWorks;