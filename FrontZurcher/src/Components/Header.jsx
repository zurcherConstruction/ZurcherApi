import React, { useState, useEffect } from "react";
import logo from "../assets/logoseptic.png";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { logoutStaff } from "../Redux/Actions/authActions";
import { fetchNotifications } from "../Redux/Actions/notificationAction";
import { addNotification } from "../Redux/Reducer/notificationReducer";
import socket from "../utils/io"; // Asegúrate de importar tu instancia de socket
import api from "../utils/axios";

const Header = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, staff } = useSelector((state) => state.auth); // Obtén el usuario autenticado
  const { notifications } = useSelector((state) => state.notifications); // Obtén las notificaciones del estado global

  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null); // Notificación seleccionada
  const [responseMessage, setResponseMessage] = useState(""); // Mensaje de respuesta

  // Cargar notificaciones desde el backend al iniciar sesión
  useEffect(() => {
    if (staff) {
      console.log("Cargando notificaciones para el staff ID:", staff.id);
      dispatch(fetchNotifications(staff.id)); // Llama a la acción para cargar notificaciones desde el backend
    }
  }, [staff, dispatch]);

  // Manejar notificaciones en tiempo real con Socket.IO
  useEffect(() => {
    if (staff) {
      socket.emit("join", staff.id); // Asociar el staffId con el socket.id

      socket.on("newNotification", (notification) => {
        if (notification.staffId === staff.id) {
          console.log("Nueva notificación recibida:", notification);
          dispatch(addNotification(notification)); // Agregar la notificación al estado global
        } else {
          console.log("Notificación ignorada, no es para este usuario:", notification);
        }
      });

      return () => {
        socket.off("newNotification");
      };
    }
  }, [staff, dispatch]);

  const handleLogout = () => {
    if (window.confirm("¿Estás seguro de que deseas cerrar sesión?")) {
      dispatch(logoutStaff());
      navigate("/login");
    }
  };

  const handleOpenNotification = (notification) => {
    if (!notification.senderId) {
      console.error("La notificación no contiene senderId:", notification);
      alert("No se puede abrir esta notificación porque falta información del remitente.");
      return;
    }

    setSelectedNotification(notification); // Abrir la notificación seleccionada
  };

  const handleCloseNotification = () => {
    setSelectedNotification(null); // Cerrar la notificación
  };

  const handleResponseSubmit = async (e) => {
    e.preventDefault();

    if (!responseMessage) {
      alert("Por favor, escribe una respuesta antes de enviarla.");
      return;
    }

    if (!selectedNotification || !selectedNotification.senderId) {
      alert("No se puede enviar la respuesta porque no se encontró el remitente.");
      console.error("selectedNotification:", selectedNotification);
      return;
    }

    try {
      console.log("Datos enviados al backend:", {
        staffId: selectedNotification.senderId, // Asegúrate de enviar el senderId como staffId
        message: responseMessage,
        type: "respuesta",
      });

      // Enviar la respuesta al backend
      await api.post("/notification", {
        staffId: selectedNotification.senderId, // ID del remitente (quien envió la notificación)
        message: responseMessage,
        type: "respuesta", // Tipo de notificación
      });

      alert("Respuesta enviada con éxito.");
      setResponseMessage(""); // Limpiar el formulario
      handleCloseNotification(); // Cerrar el modal
    } catch (error) {
      console.error("Error al enviar la respuesta:", error);
      alert("Hubo un error al enviar la respuesta.");
    }
  };

  const unreadCount = notifications.filter((notification) => !notification.isRead).length;

  return (
    <div className="bg-blue-950 text-white p-4 flex items-center justify-between shadow-lg fixed top-0 left-0 w-full z-10 lg:pl-40">
      {/* Logo y nombre */}
      <div className="flex items-center gap-2">
        <img src={logo} alt="Logo" className="w-10 h-10 md:w-12 md:h-12" />
        <span className="hidden sm:block text-sm md:text-lg">ZURCHER CONSTRUCTION</span>
      </div>

      {/* Acciones rápidas */}
      <div className="flex gap-4 items-center">
        {/* Ícono de notificaciones */}
        {isAuthenticated && (
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative hover:text-blue-300 text-sm md:text-base"
            >
              <span className="material-icons">notifications</span>
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 bg-red-500 text-white rounded-full text-xs w-5 h-5 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Menú desplegable de notificaciones */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-64 bg-white text-black shadow-lg rounded-lg z-20">
                <ul className="divide-y divide-gray-200">
                  {notifications.length > 0 ? (
                    notifications.map((notification) => (
                      <li
                        key={notification.id}
                        className={`p-2 ${notification.isRead ? "bg-gray-100" : "bg-blue-100"}`}
                      >
                        <p className="font-semibold">{notification.message}</p>
                        <p className="text-sm text-gray-500">
                          Tipo: {notification.type} | Enviado por: {notification.senderName || "Desconocido"}
                        </p>
                        <button
                          onClick={() => handleOpenNotification(notification)}
                          className="mt-2 text-blue-500 hover:underline"
                        >
                          Ver detalles
                        </button>
                      </li>
                    ))
                  ) : (
                    <li className="p-2 text-center text-gray-500">No hay notificaciones</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Botón de login/logout */}
        {isAuthenticated ? (
          <button onClick={handleLogout} className="hover:text-blue-300 text-sm md:text-base">
            Logout
          </button>
        ) : (
          <a href="/login" className="hover:text-blue-300 text-sm md:text-base">
            Login
          </a>
        )}

        {/* Enlace de seguimiento */}
        <a
          href="/progress-tracker"
          className="hidden md:block hover:text-blue-300 text-sm md:text-base"
        >
          Seguimiento
        </a>
      </div>

      {/* Modal para ver detalles de la notificación */}
      {selectedNotification && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <h2 className="text-lg font-bold mb-2">Detalles de la Notificación</h2>
            <p className="mb-2">
              <strong>Mensaje:</strong> {selectedNotification.message}
            </p>
            <p className="mb-2">
              <strong>Tipo:</strong> {selectedNotification.type}
            </p>
            <p className="mb-4">
              <strong>Enviado por:</strong> {selectedNotification.senderName}
            </p>

            {/* Formulario para responder */}
            <form onSubmit={handleResponseSubmit}>
              <textarea
                value={responseMessage}
                onChange={(e) => setResponseMessage(e.target.value)}
                placeholder="Escribe tu respuesta aquí..."
                className="w-full border rounded-lg p-2 mb-4"
                rows="3"
              ></textarea>
              <button
                type="submit"
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
              >
                Enviar respuesta
              </button>
            </form>

            <button
              onClick={handleCloseNotification}
              className="mt-4 text-red-500 hover:underline"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Header;