import React, { createContext, useState, useEffect, useContext } from 'react';
import * as Notifications from 'expo-notifications';
import api from '../utils/axios';

export const NotificationContext = createContext();

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};

export const NotificationProvider = ({ children, staffId }) => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!staffId) {
            console.warn('No se puede obtener notificaciones: staffId es undefined');
            return;
        }
    
        console.log('NotificationProvider mounted with staffId:', staffId);
        fetchNotifications();

        // Listener para notificaciones recibidas
        const notificationListener = Notifications.addNotificationReceivedListener((notification) => {
            console.log('Nueva notificación recibida:', notification);
            // Recargar notificaciones para actualizar el estado
            fetchNotifications();
        });

        return () => {
            notificationListener.remove();
        };
    }, [staffId]);

    const fetchNotifications = async () => {
        if (!staffId || loading) return;
        
        setLoading(true);
        try {
            console.log('Fetching notifications from context...');
            const response = await api.get(`/notification/${staffId}`);
            
            if (!response.data || !Array.isArray(response.data)) {
                console.warn('Respuesta inesperada del servidor:', response.data);
                setNotifications([]);
                setUnreadCount(0);
                await Notifications.setBadgeCountAsync(0);
                return;
            }

            setNotifications(response.data);
            const unread = response.data.filter((n) => !n.isRead).length;
            setUnreadCount(unread);
            
            // Actualizar badge de la app
            await Notifications.setBadgeCountAsync(unread);
            console.log('Badge count actualizado a:', unread);
            
        } catch (error) {
            console.error('Error al obtener las notificaciones:', error);
            await Notifications.setBadgeCountAsync(0);
        } finally {
            setLoading(false);
        }
    };

   const markAsRead = async (notificationId) => {
    try {
        console.log('Marking notification as read:', notificationId);
        await api.put(`/notification/${notificationId}/read`);
        
        // Actualizar estado local inmediatamente para mejor UX
        setNotifications(prev => 
            prev.map(notif => 
                notif.id === notificationId 
                    ? { ...notif, isRead: true }
                    : notif
            )
        );
        
        // Recalcular unread count usando el estado actualizado
        setNotifications(prevNotifications => {
            const updatedNotifications = prevNotifications.map(notif => 
                notif.id === notificationId 
                    ? { ...notif, isRead: true }
                    : notif
            );
            
            const newUnreadCount = updatedNotifications.filter(n => !n.isRead).length;
            setUnreadCount(newUnreadCount);
            Notifications.setBadgeCountAsync(newUnreadCount);
            
            console.log('Notification marked as read, new unread count:', newUnreadCount);
            return updatedNotifications;
        });
        
    } catch (error) {
        console.error('Error al marcar la notificación como leída:', error);
        // Revertir cambios locales si hay error
        fetchNotifications();
    }
};

   const markAllAsRead = async () => {
    try {
        console.log('Marking all notifications as read for staffId:', staffId);
        await api.put(`/notification/mark-all-read/${staffId}`);
        
        // Actualizar estado local inmediatamente
        setNotifications(prev => 
            prev.map(notif => ({ ...notif, isRead: true }))
        );
        
        setUnreadCount(0);
        await Notifications.setBadgeCountAsync(0);
        
        console.log('All notifications marked as read');
        
    } catch (error) {
        console.error('Error al marcar todas las notificaciones como leídas:', error);
        // Recargar notificaciones si hay error
        fetchNotifications();
    }
};

    return (
        <NotificationContext.Provider value={{ 
            notifications, 
            unreadCount, 
            markAsRead, 
            markAllAsRead,
            fetchNotifications,
            loading 
        }}>
            {children}
        </NotificationContext.Provider>
    );
};