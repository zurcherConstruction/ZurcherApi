import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications } from '../utils/notificationContext';

const NotificationBell = ({ onPress, size = 24, color = '#333' }) => {
    const { unreadCount } = useNotifications();

    return (
        <TouchableOpacity onPress={onPress} style={styles.container}>
            <Ionicons 
                name={unreadCount > 0 ? "notifications" : "notifications-outline"} 
                size={size} 
                color={unreadCount > 0 ? '#FF3B30' : color} 
            />
            {unreadCount > 0 && (
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </Text>
                </View>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'relative',
        padding: 4,
    },
    badge: {
        position: 'absolute',
        right: -2,
        top: -2,
        backgroundColor: '#FF3B30',
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'white',
    },
    badgeText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    },
});

export default NotificationBell;