import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true, 
    shouldPlaySound: false, 
    shouldSetBadge: false,
    shouldShowBanner: false,
    shouldShowList: false
  })
});

const SERVER_URL = "http://192.168.0.7:3000"; // IP local para conectar desde dispositivos móviles
const DEFAULT_TOPIC = "general"; // Tópico por defecto

export function useNotifications() {
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [lastNotification, setLastNotification] = useState<any>(null);
  const responseListener = useRef<any>(null);

  // Función para suscribirse a un tópico
  const subscribeToTopic = async (token: string, topic: string = DEFAULT_TOPIC) => {
    try {
      const response = await fetch(`${SERVER_URL}/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, topic }),
      });
      
      const result = await response.json();
      if (result.success) {
        setIsSubscribed(true);
        console.log(`Suscrito al tópico '${topic}' exitosamente`);
      } else {
        console.error('Error al suscribirse:', result.error);
      }
    } catch (error) {
      console.error('Error de red al suscribirse:', error);
    }
  };

  // Función para desuscribirse de un tópico
  const unsubscribeFromTopic = async (token: string, topic: string = DEFAULT_TOPIC) => {
    try {
      const response = await fetch(`${SERVER_URL}/unsubscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, topic }),
      });
      
      const result = await response.json();
      if (result.success) {
        setIsSubscribed(false);
        console.log(`Desuscrito del tópico '${topic}' exitosamente`);
      } else {
        console.error('Error al desuscribirse:', result.error);
      }
    } catch (error) {
      console.error('Error de red al desuscribirse:', error);
    }
  };

  useEffect(() => {
    (async () => {
      if (!Device.isDevice) return;
      
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== "granted") return;

      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "default",
          importance: Notifications.AndroidImportance.MAX
        });
      }
      
      const token = await Notifications.getDevicePushTokenAsync();
      setFcmToken(token.data);
      
      // Suscribirse automáticamente al tópico por defecto
      if (token.data) {
        await subscribeToTopic(token.data);
      }
    })();

    // Listener para notificaciones recibidas mientras la app está abierta
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notificación recibida:', notification);
      setLastNotification({
        title: notification.request.content.title,
        body: notification.request.content.body,
        data: notification.request.content.data,
        timestamp: new Date().toISOString()
      });
    });

    // Listener para cuando el usuario toca una notificación
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Usuario tocó la notificación:', response);
      setLastNotification({
        title: response.notification.request.content.title,
        body: response.notification.request.content.body,
        data: response.notification.request.content.data,
        timestamp: new Date().toISOString(),
        userTapped: true
      });
    });

    return () => {
      notificationListener.remove();
      if (responseListener.current) responseListener.current.remove();
    };
  }, []);

  return { 
    fcmToken, 
    isSubscribed, 
    lastNotification,
    subscribeToTopic: (topic?: string) => fcmToken && subscribeToTopic(fcmToken, topic),
    unsubscribeFromTopic: (topic?: string) => fcmToken && unsubscribeFromTopic(fcmToken, topic)
  };
}
