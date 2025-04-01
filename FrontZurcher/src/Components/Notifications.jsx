import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import socket from "../utils/io";
import {
  fetchNotifications,
  markNotificationAsRead,
} from "../Redux/Actions/notificationAction";
import { addNotification } from "../Redux/Reducer/notificationReducer";
import api from "../utils/axios";


const Notifications = ({ isDropdown = false, onClose }) => {
  const dispatch = useDispatch();
  const { staff } = useSelector((state) => state.auth);
  const { notifications, loading, error } = useSelector((state) => state.notifications);

  const [selectedNotification, setSelectedNotification] = useState(null);
  const [responseMessage, setResponseMessage] = useState("");

  useEffect(() => {
    if (staff) {
      // Cargar notificaciones iniciales
      dispatch(fetchNotifications(staff.id));

      // Escuchar notificaciones en tiempo real
      socket.emit("join", staff.id);
      socket.on("newNotification", (notification) => {
        if (notification.staffId === staff.id) {
          dispatch(addNotification(notification));
        }
      });

      return () => {
        socket.off("newNotification");
      };
    }
  }, [staff, dispatch]);

  const handleMarkAsRead = (notificationId) => {
    dispatch(markNotificationAsRead(notificationId));
  };

  const handleOpenNotification = (notification) => {
    setSelectedNotification(notification);
  };

  const handleCloseNotification = () => {
    setSelectedNotification(null);
    if (onClose) onClose(); // Cierra el dropdown si se usa en el Header
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
      // Enviar la respuesta al backend
      await api.post("/notification", {
        staffId: selectedNotification.senderId, // ID del remitente original
        message: responseMessage,
        type: "respuesta", // Tipo de notificación
        parentId: selectedNotification.id, // ID de la notificación original
      });
  
      alert("Respuesta enviada con éxito.");
      setResponseMessage(""); // Limpiar el formulario
      handleCloseNotification(); // Cerrar el modal
    } catch (error) {
      console.error("Error al enviar la respuesta:", error);
      alert("Hubo un error al enviar la respuesta.");
    }
  };
  if (loading) return <p>Cargando notificaciones...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div className={isDropdown ? "absolute bg-white shadow-lg rounded-lg" : ""}>
      <h2 className="text-sm font-medium bg-sky-800 text-white p-2 border-">Notificaciones</h2>
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
          Responder
        </button>
        {!notification.isRead && (
          <button
            onClick={() => handleMarkAsRead(notification.id)}
            className="ml-2 text-green-500 hover:underline"
          >
            Marcar como leída
          </button>
        )}

        {/* Mostrar respuestas asociadas */}
        {notification.responses && notification.responses.length > 0 && (
          <ul className="mt-2 pl-4 border-l-2 border-gray-300">
            {notification.responses.map((response) => (
              <li key={response.id} className="text-sm text-gray-700">
                <p>Respuesta: {response.message}</p>
                <p className="text-xs text-gray-500">Enviado el: {new Date(response.createdAt).toLocaleString()}</p>
              </li>
            ))}
          </ul>
        )}
      </li>
    ))
  ) : (
    <li className="p-2 text-center text-gray-500">No hay notificaciones</li>
  )}
</ul>

      {/* Modal para ver detalles */}
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

export default Notifications;