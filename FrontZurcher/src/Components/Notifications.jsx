import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import socket from "../utils/io";
import {
  fetchNotifications,
  markNotificationAsRead,
} from "../Redux/Actions/notificationAction";
import { addNotification } from "../Redux/Reducer/notificationReducer";
import api from "../utils/axios";

const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_DELAY = 5000;


const Notifications = ({ isDropdown = false, onClose }) => {
  const dispatch = useDispatch();
  const { staff } = useSelector((state) => state.auth);
  const { notifications, loading, error } = useSelector((state) => state.notifications);

  const [selectedNotification, setSelectedNotification] = useState(null);
  const [responseMessage, setResponseMessage] = useState("");
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [socketStatus, setSocketStatus] = useState({
    connected: false,
    error: null
  });

  const connectSocket = useCallback(async () => {
    if (!staff || connectionAttempts >= MAX_RECONNECT_ATTEMPTS) return;

    try {
      if (!socket.connected) {
        socket.connect();
      }
      socket.emit("join", staff.id);
      setSocketStatus({ connected: true, error: null });
      console.log('Socket connected successfully:', socket.id);
    } catch (error) {
      console.error('Socket connection error:', error);
      setSocketStatus({ connected: false, error: error.message });
      setConnectionAttempts(prev => prev + 1);
      
      // Try alternative server if available
      if (connectionAttempts < MAX_RECONNECT_ATTEMPTS) {
        setTimeout(connectSocket, RECONNECT_DELAY);
      }
    }
  }, [staff, connectionAttempts]);

  useEffect(() => {
    if (staff) {
      let mounted = true;

      const initialize = async () => {
        try {
          // Load initial notifications
          await dispatch(fetchNotifications(staff.id));
          
          // Setup socket connection
          if (mounted) {
            await connectSocket();
          }
        } catch (error) {
          console.error('Initialization error:', error);
          setSocketStatus({ connected: false, error: error.message });
        }
      };

      initialize();

      // Socket event handlers
      const handleNewNotification = (notification) => {
        if (notification.staffId === staff.id && mounted) {
          dispatch(addNotification(notification));
        }
      };

      const handleSocketError = (error) => {
        console.error('Socket error:', error);
        if (mounted) {
          setSocketStatus({ connected: false, error: error.message });
          // Attempt reconnect if not maxed out
          if (connectionAttempts < MAX_RECONNECT_ATTEMPTS) {
            setTimeout(connectSocket, RECONNECT_DELAY);
          }
        }
      };

      const handleSocketDisconnect = (reason) => {
        console.log('Socket disconnected:', reason);
        if (mounted) {
          setSocketStatus({ connected: false, error: `Disconnected: ${reason}` });
          // Attempt reconnect for specific disconnect reasons
          if (['io server disconnect', 'transport close'].includes(reason)) {
            setTimeout(connectSocket, RECONNECT_DELAY);
          }
        }
      };

      // Register socket event listeners
      socket.on("newNotification", handleNewNotification);
      socket.on("connect_error", handleSocketError);
      socket.on("disconnect", handleSocketDisconnect);

      // Cleanup function
      return () => {
        mounted = false;
        socket.off("newNotification", handleNewNotification);
        socket.off("connect_error", handleSocketError);
        socket.off("disconnect", handleSocketDisconnect);
        if (socket.connected) {
          socket.disconnect();
        }
      };
    }
  }, [staff, dispatch, connectSocket]);

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
      await api.post("/notification/io", {
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
{socketStatus.error && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 p-2 mb-2">
          <p className="text-xs text-yellow-700">
            Estado de conexión: {socketStatus.error}
          </p>
        </div>
      )}
  <h2 className="text-sm font-medium bg-sky-800 text-white p-2 border-">
    Notificaciones
  </h2>
  <ul
    className="divide-y divide-gray-200 overflow-y-auto"
    style={{ maxHeight: "400px" }} // Altura máxima con scroll
  >
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
                  <p className="text-xs text-gray-500">
                    Enviado el: {new Date(response.createdAt).toLocaleString()}
                  </p>
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