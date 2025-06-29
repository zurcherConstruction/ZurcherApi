import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import socket from "../utils/io";
import {
  fetchNotifications,
  markNotificationAsRead,
} from "../Redux/Actions/notificationAction";
import { addNotification } from "../Redux/Reducer/notificationReducer";
import api from "../utils/axios";
import { FaBell } from "react-icons/fa";


const Notifications = ({ isDropdown = false, onClose }) => {
  const dispatch = useDispatch();
  const { currentStaff: staff } = useSelector((state) => state.auth);
  const { notifications, loading, error } = useSelector((state) => state.notifications);

  const [selectedNotification, setSelectedNotification] = useState(null);
  const [responseMessage, setResponseMessage] = useState("");

  // Asegúrate de que notifications sea siempre un array
  const validNotifications = Array.isArray(notifications) ? notifications : [];

  useEffect(() => {
    if (staff) {
      // Llamar a fetchNotifications para cargar las notificaciones iniciales
      dispatch(fetchNotifications(staff.id));

      // Configurar Socket.IO para manejar notificaciones en tiempo real
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
    <div className={isDropdown ? "bg-white shadow-lg rounded-lg" : ""}>
      <h2 className="text-sm font-medium bg-blue-600 text-white p-3 rounded-t-lg">
        Notificaciones {validNotifications.length > 0 && `(${validNotifications.length})`}
      </h2>
      <div
        className="divide-y divide-gray-200 overflow-y-auto"
        style={{ maxHeight: "400px" }}
      >
        {validNotifications.length > 0 ? (
          validNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 transition-all duration-200 hover:bg-gray-50 ${notification.isRead ? "bg-white" : "bg-blue-50 border-l-4 border-blue-500"}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-semibold text-gray-800 mb-1">{notification.message}</p>
                  <p className="text-sm text-gray-500 mb-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 mr-2">
                      {notification.type}
                    </span>
                    Enviado por: {notification.senderName || "Desconocido"}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenNotification(notification)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium hover:underline transition-colors duration-200"
                    >
                      Responder
                    </button>
                    {!notification.isRead && (
                      <button
                        onClick={() => handleMarkAsRead(notification.id)}
                        className="text-green-600 hover:text-green-800 text-sm font-medium hover:underline transition-colors duration-200"
                      >
                        Marcar como leída
                      </button>
                    )}
                  </div>
                </div>
                {!notification.isRead && (
                  <div className="w-3 h-3 bg-blue-500 rounded-full flex-shrink-0 ml-3 mt-1"></div>
                )}
              </div>

              {/* Mostrar respuestas asociadas */}
              {notification.responses && Array.isArray(notification.responses) && notification.responses.length > 0 && (
                <div className="mt-3 pl-4 border-l-2 border-gray-200 bg-gray-50 rounded-r-lg p-3">
                  <p className="text-xs font-medium text-gray-600 mb-2">Respuestas:</p>
                  {notification.responses.map((response) => (
                    <div key={response.id} className="text-sm text-gray-700 mb-2 last:mb-0">
                      <p className="mb-1">{response.message}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(response.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="p-8 text-center text-gray-500">
            <FaBell className="mx-auto text-4xl text-gray-300 mb-3" />
            <p className="text-lg font-medium">No hay notificaciones</p>
            <p className="text-sm">Te notificaremos cuando tengas nuevos mensajes</p>
          </div>
        )}
      </div>

      {/* Modal para ver detalles */}
      {selectedNotification && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Detalles de la Notificación</h2>
              <button
                onClick={handleCloseNotification}
                className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Mensaje</label>
                <p className="p-3 bg-gray-50 rounded-lg text-gray-800">{selectedNotification.message}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Tipo</label>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                  {selectedNotification.type}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Enviado por</label>
                <p className="text-gray-800">{selectedNotification.senderName}</p>
              </div>
            </div>

            {/* Formulario para responder */}
            <form onSubmit={handleResponseSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Tu respuesta</label>
                <textarea
                  value={responseMessage}
                  onChange={(e) => setResponseMessage(e.target.value)}
                  placeholder="Escribe tu respuesta aquí..."
                  className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 resize-none"
                  rows="4"
                ></textarea>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium"
                >
                  Enviar respuesta
                </button>
                <button
                  type="button"
                  onClick={handleCloseNotification}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;
