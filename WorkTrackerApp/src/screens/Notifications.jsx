import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import api from '../utils/axios';

const NotificationsScreen = ({ staffId }) => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [appState, setAppState] = useState(AppState.currentState);

    useEffect(() => {
        if (!staffId) {
            console.warn('No se puede obtener notificaciones: staffId es undefined');
            return;
        }

        console.log('Cargando notificaciones para staffId:', staffId);
        fetchNotifications(); // Carga inicial

        // Listener para notificaciones recibidas mientras la app está abierta
        const notificationListener = Notifications.addNotificationReceivedListener((notification) => {
            const { title, body } = notification.request.content;
            console.log('Notificación push recibida:', title);
            // Opcional: Mostrar alerta o UI sutil en lugar de notificación local si la app está activa
            // handlePushNotification(title, body); // Comentado para evitar duplicados si el backend ya envía
            fetchNotifications(); // Recargar para obtener la nueva notificación y actualizar el badge
        });

        // Listener para cambios de estado de la app (para recargar al volver a primer plano)
        const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

        return () => {
            notificationListener.remove();
            appStateSubscription.remove(); // Limpiar suscripción de AppState
        };
    }, [staffId]);

    // Función para manejar cambios de estado de la app
    const handleAppStateChange = (nextAppState) => {
        if (appState.match(/inactive|background/) && nextAppState === 'active') {
            console.log('App ha vuelto a primer plano. Recargando notificaciones...');
            if (staffId) {
                fetchNotifications(); // Recargar notificaciones al volver a la app
            }
        }
        setAppState(nextAppState);
    };

    const fetchNotifications = async () => {
        if (!staffId) return; // Evitar llamada si staffId no está listo
        try {
            console.log('Fetching notifications...'); // Log para depuración
            const response = await api.get(`/notification/${staffId}`);
            if (!response.data || !Array.isArray(response.data)) {
                console.warn('Respuesta inesperada del servidor:', response.data);
                setNotifications([]);
                setUnreadCount(0);
                // *** ACTUALIZAR BADGE A 0 SI HAY ERROR O NO HAY DATOS ***
                await Notifications.setBadgeCountAsync(0);
                return;
            }
            setNotifications(response.data);
            const unread = response.data.filter((n) => !n.isRead).length;
            setUnreadCount(unread);
            console.log('Unread count:', unread); // Log para depuración

            // *** ACTUALIZAR EL BADGE DE LA APP ***
            try {
                await Notifications.setBadgeCountAsync(unread);
                console.log('Badge count set to:', unread); // Log para depuración
            } catch (badgeError) {
                console.error("Error setting badge count:", badgeError);
            }
            // *** FIN ACTUALIZACIÓN BADGE ***

        } catch (error) {
            console.error('Error al obtener las notificaciones:', error);
            // Considera poner el badge a 0 o mantener el último valor conocido en caso de error
            // await Notifications.setBadgeCountAsync(0);
        }
    };


    const markAsRead = async (notificationId) => {
        try {
            console.log('Marking notification as read:', notificationId); // Log
            await api.put(`/notification/${notificationId}/read`);
            console.log('Notification marked as read on server.'); // Log

            // *** RECARGAR NOTIFICACIONES DESPUÉS DE MARCAR COMO LEÍDA ***
            // Esto actualizará la lista local, el contador local Y el badge de la app.
            await fetchNotifications();
            console.log('Notifications re-fetched after marking as read.'); // Log

        } catch (error) {
            console.error('Error al marcar la notificación como leída:', error);
        }
    };

   

    const renderItem = ({ item }) => (
        <TouchableOpacity
            style={[styles.notificationItem, item.isRead ? styles.readNotification : null]} // Simplificado
            onPress={() => !item.isRead && markAsRead(item.id)} // Solo marcar si no está leída
            disabled={item.isRead} // Deshabilitar si ya está leída
        >
            <Text style={[styles.title, item.isRead ? styles.readText : null]}>{item.title}</Text>
            <Text style={[styles.message, item.isRead ? styles.readText : null]}>{item.message}</Text>
           <Text style={styles.date}>{new Date(item.createdAt).toLocaleString()}</Text>
        </TouchableOpacity>
    );
    return (
        <View style={styles.container}>
            <Text style={styles.header}>Notificaciones ({unreadCount} sin leer)</Text>
            {notifications.length === 0 ? (
                 <Text style={styles.noNotifications}>No tiene notificaciones</Text>
            ) : (
                <FlatList
                    data={notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))} // Ordenar por fecha descendente
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderItem}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: '#f9f9f9',
    },
    header: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    notificationItem: {
        padding: 12,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        marginBottom: 8,
        backgroundColor: '#fff',
    },
    readNotification: {
        backgroundColor: '#e6e6e6',
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    message: {
        fontSize: 14,
        color: '#555',
    },
    noNotifications: {
        fontSize: 16,
        color: '#888',
        textAlign: 'center',
        marginTop: 20,
    },
});

export default NotificationsScreen;