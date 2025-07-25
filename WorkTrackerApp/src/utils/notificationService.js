import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// Configurar cómo se mostrarán las notificaciones
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true, // Importante para iOS
         ...(Platform.OS === 'ios' && {
            sound: true,
        }),
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
            // Para iOS, solicitar permisos específicos de una vez
            const { status } = await Notifications.requestPermissionsAsync({
                ios: {
                    allowAlert: true,
                    allowBadge: true,
                    allowSound: true,
                    allowDisplayInCarPlay: true,
                    allowCriticalAlerts: false,
                    allowProvisional: false,
                    allowAnnouncements: true,
                    providesAppNotificationSettings: false,
                },
                android: {
                    allowAlert: true,
                    allowBadge: true,
                    allowSound: true,
                    allowDisplayInCarPlay: true,
                },
            });
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            alert('No se pudieron obtener permisos para notificaciones.');
            return null;
        }

        // Verificar específicamente el permiso de sonido para iOS
        if (Platform.OS === 'ios') {
            const permissions = await Notifications.getPermissionsAsync();
            console.log('Permisos de notificación iOS:', permissions);
            
            if (!permissions.ios?.allowsSound) {
                console.warn('Permisos de sonido no otorgados en iOS');
            }
        }

        const token = (await Notifications.getExpoPushTokenAsync({
            projectId: '12f004e9-48c9-4c45-b2b8-d68a1228bcdf' // Tu project ID de app.json
        })).data;
        console.log('Token de notificación:', token);
        return token;
    } else {
        console.log('Las notificaciones solo funcionan en dispositivos físicos.');
        return null;
    }
};

// Mostrar una notificación local (para testing)
export const showNotification = async (title, body, badge = null) => {
    await Notifications.scheduleNotificationAsync({
        content: {
            title: title,
            body: body,
            sound: Platform.OS === 'ios' ? 'default' : 'default',
            badge: badge,
            ...(Platform.OS === 'android' && {
                priority: Notifications.AndroidImportance.HIGH,
            }),
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

// Función para probar sonido de notificación local
export const testNotificationSound = async () => {
    await showNotification(
        'Prueba de Sonido',
        'Esta es una notificación de prueba para verificar el sonido',
        1
    );
};