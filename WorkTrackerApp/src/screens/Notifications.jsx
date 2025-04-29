import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import * as Notifications from 'expo-notifications';
import api from '../utils/axios';

const NotificationsScreen = ({ staffId }) => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (!staffId) {
            console.warn('No se puede obtener notificaciones: staffId es undefined');
            return;
        }

        console.log('Cargando notificaciones para staffId:', staffId);
        fetchNotifications();

        const subscription = Notifications.addNotificationReceivedListener((notification) => {
            const { title, body } = notification.request.content;
            handlePushNotification(title, body);
        });

        return () => subscription.remove(); // Limpiar el listener al desmontar el componente
    }, [staffId]);

    const fetchNotifications = async () => {
        try {
            const response = await api.get(`/notification/${staffId}`);
            if (!response.data || !Array.isArray(response.data)) {
                console.warn('Respuesta inesperada del servidor:', response.data);
                setNotifications([]);
                setUnreadCount(0);
                return;
            }
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
            setNotifications((prevNotifications) =>
                prevNotifications.map((n) =>
                    n.id === notificationId ? { ...n, isRead: true } : n
                )
            );
            setUnreadCount((prevCount) => prevCount - 1);
        } catch (error) {
            console.error('Error al marcar la notificación como leída:', error);
        }
    };

    const handlePushNotification = (title, body) => {
        // Mostrar la notificación local
        Notifications.scheduleNotificationAsync({
            content: {
                title,
                body,
                sound: true,
            },
            trigger: null, // Mostrar inmediatamente
        });

        // Opcional: Actualizar la lista de notificaciones desde el backend
        fetchNotifications();
    };

    const renderItem = ({ item }) => (
        <TouchableOpacity
            style={[styles.notificationItem, item.isRead && styles.readNotification]}
            onPress={() => markAsRead(item.id)}
        >
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.message}>{item.message}</Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <Text style={styles.header}>Notificaciones ({unreadCount} sin leer)</Text>
            {/* Filtrar notificaciones antes de pasarlas a FlatList */}
            {notifications.filter(n => !n.isRead).length === 0 ? (
                <Text style={styles.noNotifications}>No tiene notificaciones sin leer</Text>
            ) : (
                <FlatList
                    // Solo pasar las no leídas a la lista
                    data={notifications.filter(n => !n.isRead)}
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