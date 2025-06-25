import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, AppState, RefreshControl } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useNotifications } from '../utils/notificationContext';

const NotificationsScreen = ({ staffId }) => {
    const { 
        notifications, 
        unreadCount, 
        markAsRead, 
        markAllAsRead, 
        fetchNotifications,
        loading 
    } = useNotifications();
    
    const [appState, setAppState] = useState(AppState.currentState);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        // Listener para cambios de estado de la app
        const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

        return () => {
            appStateSubscription.remove();
        };
    }, []);

    const handleAppStateChange = (nextAppState) => {
        if (appState.match(/inactive|background/) && nextAppState === 'active') {
            console.log('App ha vuelto a primer plano. Recargando notificaciones...');
            fetchNotifications();
        }
        setAppState(nextAppState);
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchNotifications();
        setRefreshing(false);
    };

    const handleNotificationPress = async (item) => {
        if (!item.isRead) {
            await markAsRead(item.id);
        }
    };

    const renderItem = ({ item }) => (
        <TouchableOpacity
            style={[
                styles.notificationItem, 
                item.isRead ? styles.readNotification : styles.unreadNotification
            ]}
            onPress={() => handleNotificationPress(item)}
        >
            <View style={styles.notificationHeader}>
                <Text style={[styles.title, item.isRead ? styles.readText : styles.unreadText]}>
                    {item.title}
                </Text>
                {!item.isRead && <View style={styles.unreadDot} />}
            </View>
            <Text style={[styles.message, item.isRead ? styles.readText : null]}>
                {item.message}
            </Text>
            <Text style={styles.date}>
                {new Date(item.createdAt).toLocaleString()}
            </Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={styles.headerContainer}>
                <Text style={styles.header}>
                    Notificaciones ({unreadCount} sin leer)
                </Text>
                {unreadCount > 0 && (
                    <TouchableOpacity 
                        style={styles.markAllButton}
                        onPress={markAllAsRead}
                    >
                        <Text style={styles.markAllText}>Marcar todas como leídas</Text>
                    </TouchableOpacity>
                )}
            </View>
            
            {notifications.length === 0 ? (
                <Text style={styles.noNotifications}>No tiene notificaciones</Text>
            ) : (
                <FlatList
                    data={notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderItem}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
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
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    header: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    markAllButton: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
    },
    markAllText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '600',
    },
    notificationItem: {
        padding: 12,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        marginBottom: 8,
        backgroundColor: '#fff',
    },
    unreadNotification: {
        backgroundColor: '#f0f8ff',
        borderLeftWidth: 4,
        borderLeftColor: '#007AFF',
    },
    readNotification: {
        backgroundColor: '#f5f5f5',
    },
    notificationHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        flex: 1,
    },
    unreadText: {
        color: '#000',
    },
    readText: {
        color: '#666',
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#007AFF',
        marginLeft: 8,
    },
    message: {
        fontSize: 14,
        color: '#555',
        marginBottom: 4,
    },
    date: {
        fontSize: 12,
        color: '#888',
    },
    noNotifications: {
        fontSize: 16,
        color: '#888',
        textAlign: 'center',
        marginTop: 20,
    },
});

export default NotificationsScreen;