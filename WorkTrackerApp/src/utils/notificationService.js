import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// Configurar cómo se mostrarán las notificaciones
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true, // Importante para iOS
    }),
});

// Configurar canal de notificaciones para Android
if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: 'default',
        enableVibrate: true,
    });
}

// Registrar el dispositivo para notificaciones
export const registerForPushNotificationsAsync = async () => {
    if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            alert('No se pudieron obtener permisos para notificaciones.');
            return null;
        }

        // Para iOS, también solicitar permisos de badge
        if (Platform.OS === 'ios') {
            await Notifications.requestPermissionsAsync({
                ios: {
                    allowAlert: true,
                    allowBadge: true,
                    allowSound: true,
                    allowAnnouncements: true,
                },
            });
        }

        const token = (await Notifications.getExpoPushTokenAsync()).data;
        console.log('Token de notificación:', token);
        return token;
    } else {
        console.log('Las notificaciones solo funcionan en dispositivos físicos.');
        return null;
    }
};

// Mostrar una notificación local
export const showNotification = async (title, body, badge = null) => {
    await Notifications.scheduleNotificationAsync({
        content: {
            title: title,
            body: body,
            sound: 'default',
            badge: badge,
            priority: Notifications.AndroidImportance.HIGH,
        },
        trigger: null, // Inmediatamente
    });
};

// Función para actualizar solo el badge
export const updateBadgeCount = async (count) => {
    try {
        await Notifications.setBadgeCountAsync(count);
        console.log('Badge count actualizado a:', count);
    } catch (error) {
        console.error('Error actualizando badge count:', error);
    }
};

// Función para limpiar todas las notificaciones
export const clearAllNotifications = async () => {
    await Notifications.dismissAllNotificationsAsync();
    await Notifications.setBadgeCountAsync(0);
};