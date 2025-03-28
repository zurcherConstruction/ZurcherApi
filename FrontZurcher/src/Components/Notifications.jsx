import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import socket from '../socket';
import {
  fetchNotifications,
  markNotificationAsRead,
} from '../Redux/Actions/notificationAction';

const Notifications = () => {
  const dispatch = useDispatch();

  // Obtener el usuario autenticado desde el estado global
  const { staff } = useSelector((state) => state.auth); // Reducer de autenticación
  const { notifications, loading, error } = useSelector((state) => state.notifications); // Reducer de notificaciones

  useEffect(() => {
    if (staff) {
      // Conectar al servidor de Socket.IO
      socket.emit('join', staff.id); // Unir al usuario a su sala específica

      // Escuchar nuevas notificaciones
      socket.on('newNotification', (notification) => {
        dispatch(fetchNotifications(staff.id)); // Actualizar las notificaciones
      });

      // Obtener notificaciones existentes
      dispatch(fetchNotifications(staff.id));

      // Desconectar al desmontar el componente
      return () => {
        socket.off('newNotification');
      };
    }
  }, [dispatch, staff]);

  const handleMarkAsRead = (notificationId) => {
    dispatch(markNotificationAsRead(notificationId));
  };

  if (!staff) return <p>No estás autenticado.</p>;
  if (loading) return <p>Cargando notificaciones...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div>
      <h2>Notificaciones</h2>
      <ul>
        {notifications.map((notification) => (
          <li key={notification.id} style={{ opacity: notification.isRead ? 0.5 : 1 }}>
            {notification.message}
            {!notification.isRead && (
              <button onClick={() => handleMarkAsRead(notification.id)}>Marcar como leída</button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Notifications;