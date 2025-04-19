import React, { createContext, useState, useEffect } from 'react';
import api from '../utils/axios';


export const NotificationContext = createContext();

export const NotificationProvider = ({ children, staffId }) => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (!staffId) {
            console.warn('No se puede obtener notificaciones: staffId es undefined');
            return;
        }
    
        console.log('NotificationProvider mounted with staffId:', staffId);
        fetchNotifications();
    }, [staffId]);
    const fetchNotifications = async () => {
        try {
            const response = await api.get(`/notification/${staffId}`);
            setNotifications(response.data);
            const unread = response.data.filter((n) => !n.isRead).length;
            setUnreadCount(unread);
        } catch (error) {
            console.error('Error al obtener las notificaciones:', error);
        }
    };

    const markAsRead = async (notificationId) => {
        try {
            await api.put(`/notification/${notificationId}/read`);
            fetchNotifications();
        } catch (error) {
            console.error('Error al marcar la notificación como leída:', error);
        }
    };

    return (
        <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead }}>
            {children}
        </NotificationContext.Provider>
    );
};