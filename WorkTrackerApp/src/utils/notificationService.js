import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

// Configurar cómo se mostrarán las notificaciones cuando la app esté en primer plano
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

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

        const token = (await Notifications.getExpoPushTokenAsync()).data;
        console.log('Token de notificación:', token);
        return token;
    } else {
        alert('Las notificaciones solo funcionan en dispositivos físicos.');
        return null;
    }
};

// Mostrar una notificación local
export const showNotification = async (title, body) => {
    await Notifications.scheduleNotificationAsync({
        content: {
            title: title,
            body: body,
            sound: true,
        },
        trigger: null, // Inmediatamente
    });
    
};