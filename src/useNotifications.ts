import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { useEffect, useRef, useState } from "react";
import { Platform, Alert } from "react-native";
import Constants from "expo-constants";

// Debug helper function
const debugLog = (context: string, data: any) => {
  const timestamp = new Date().toISOString();
  console.log(`[FCM-DEBUG ${timestamp}] ${context}:`, data);
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true, 
    shouldPlaySound: false, 
    shouldSetBadge: false,
    shouldShowBanner: false,
    shouldShowList: false
  })
});

// Detectar URLs para diferentes entornos
const getServerUrl = () => {
  // Para preview builds en Expo, usar la URL de desarrollo
  if (Constants.expoConfig?.hostUri) {
    const [ip] = Constants.expoConfig.hostUri.split(':');
    debugLog("EXPO-PREVIEW", `Detected Expo Dev environment, using IP: ${ip}`);
    return `http://${ip}:3000`;
  }
  
  // Para desarrollo local
  const localUrl = "http://192.168.0.7:3000";
  debugLog("LOCAL-DEV", `Using local development URL: ${localUrl}`);
  return localUrl;
};

const SERVER_URL = getServerUrl();
const DEFAULT_TOPIC = "general"; // Tópico por defecto

debugLog("INIT", {
  serverUrl: SERVER_URL,
  defaultTopic: DEFAULT_TOPIC,
  platform: Platform.OS,
  isDevice: Device.isDevice,
  expoConfig: Constants.expoConfig?.hostUri,
  appOwnership: Constants.appOwnership
});

export function useNotifications() {
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [lastNotification, setLastNotification] = useState<any>(null);
  const [debugInfo, setDebugInfo] = useState<Record<string, any>>({});
  const responseListener = useRef<any>(null);

  // Función para suscribirse a un tópico
  const subscribeToTopic = async (token: string, topic: string = DEFAULT_TOPIC) => {
    debugLog("SUBSCRIBE-START", { token: token.substring(0, 20) + "...", topic, serverUrl: SERVER_URL });
    
    try {
      const requestBody = { token, topic };
      debugLog("SUBSCRIBE-REQUEST", requestBody);
      
      const response = await fetch(`${SERVER_URL}/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      debugLog("SUBSCRIBE-RESPONSE-STATUS", { 
        status: response.status, 
        statusText: response.statusText,
        url: response.url,
        headers: Object.fromEntries(response.headers.entries())
      });
      
      const result = await response.json();
      debugLog("SUBSCRIBE-RESPONSE-BODY", result);
      
      if (result.success) {
        setIsSubscribed(true);
        debugLog("SUBSCRIBE-SUCCESS", `Suscrito al tópico '${topic}' exitosamente`);
        setDebugInfo(prev => ({ ...prev, lastSubscribeSuccess: new Date().toISOString() }));
      } else {
        debugLog("SUBSCRIBE-ERROR", result.error);
        setDebugInfo(prev => ({ ...prev, lastSubscribeError: result.error }));
        Alert.alert("Error de suscripción", result.error);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      debugLog("SUBSCRIBE-NETWORK-ERROR", error);
      setDebugInfo(prev => ({ ...prev, lastNetworkError: errorMessage }));
      Alert.alert("Error de conexión", `No se pudo conectar al servidor: ${errorMessage}`);
    }
  };

  // Función para desuscribirse de un tópico
  const unsubscribeFromTopic = async (token: string, topic: string = DEFAULT_TOPIC) => {
    debugLog("UNSUBSCRIBE-START", { token: token.substring(0, 20) + "...", topic, serverUrl: SERVER_URL });
    
    try {
      const requestBody = { token, topic };
      debugLog("UNSUBSCRIBE-REQUEST", requestBody);
      
      const response = await fetch(`${SERVER_URL}/unsubscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      debugLog("UNSUBSCRIBE-RESPONSE-STATUS", { 
        status: response.status, 
        statusText: response.statusText,
        url: response.url
      });
      
      const result = await response.json();
      debugLog("UNSUBSCRIBE-RESPONSE-BODY", result);
      
      if (result.success) {
        setIsSubscribed(false);
        debugLog("UNSUBSCRIBE-SUCCESS", `Desuscrito del tópico '${topic}' exitosamente`);
        setDebugInfo(prev => ({ ...prev, lastUnsubscribeSuccess: new Date().toISOString() }));
      } else {
        debugLog("UNSUBSCRIBE-ERROR", result.error);
        setDebugInfo(prev => ({ ...prev, lastUnsubscribeError: result.error }));
        Alert.alert("Error de desuscripción", result.error);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      debugLog("UNSUBSCRIBE-NETWORK-ERROR", error);
      setDebugInfo(prev => ({ ...prev, lastNetworkError: errorMessage }));
      Alert.alert("Error de conexión", `No se pudo conectar al servidor: ${errorMessage}`);
    }
  };

  useEffect(() => {
    (async () => {
      debugLog("PERMISSION-CHECK-START", { isDevice: Device.isDevice });
      
      if (!Device.isDevice) {
        debugLog("PERMISSION-CHECK-SKIP", "No es un dispositivo físico");
        Alert.alert("Simulador detectado", "Las notificaciones push solo funcionan en dispositivos físicos");
        return;
      }
      
      // Verificar permisos existentes
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      debugLog("EXISTING-PERMISSIONS", { status: existingStatus });
      
      let finalStatus = existingStatus;
      if (existingStatus !== "granted") {
        debugLog("REQUESTING-PERMISSIONS", "Solicitando permisos de notificación");
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
        debugLog("PERMISSION-RESULT", { status });
      }
      
      if (finalStatus !== "granted") {
        debugLog("PERMISSION-DENIED", "Permisos de notificación denegados");
        Alert.alert("Permisos requeridos", "Se necesitan permisos de notificación para recibir mensajes push");
        return;
      }

      // Configurar canal de notificación para Android
      if (Platform.OS === "android") {
        debugLog("ANDROID-CHANNEL-SETUP", "Configurando canal de notificación");
        await Notifications.setNotificationChannelAsync("default", {
          name: "default",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
        debugLog("ANDROID-CHANNEL-SETUP-COMPLETE", "Canal configurado");
      }
      
      // Obtener token FCM
      debugLog("TOKEN-REQUEST-START", "Solicitando token FCM");
      try {
        const tokenResult = await Notifications.getDevicePushTokenAsync();
        debugLog("TOKEN-RECEIVED", { 
          type: tokenResult.type,
          tokenPreview: tokenResult.data.substring(0, 30) + "...",
          fullTokenLength: tokenResult.data.length
        });
        
        setFcmToken(tokenResult.data);
        setDebugInfo(prev => ({ 
          ...prev, 
          tokenReceived: new Date().toISOString(),
          tokenType: tokenResult.type,
          tokenLength: tokenResult.data.length
        }));
        
        // Suscribirse automáticamente al tópico por defecto
        if (tokenResult.data) {
          debugLog("AUTO-SUBSCRIBE-START", `Suscripción automática al tópico ${DEFAULT_TOPIC}`);
          await subscribeToTopic(tokenResult.data);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        debugLog("TOKEN-ERROR", error);
        setDebugInfo(prev => ({ ...prev, tokenError: errorMessage }));
        Alert.alert("Error de token", `No se pudo obtener el token FCM: ${errorMessage}`);
      }
    })();

    // Listener para notificaciones recibidas mientras la app está abierta
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      debugLog('NOTIFICATION-RECEIVED-FOREGROUND', {
        title: notification.request.content.title,
        body: notification.request.content.body,
        data: notification.request.content.data,
        categoryIdentifier: notification.request.content.categoryIdentifier,
        trigger: notification.request.trigger
      });
      
      setLastNotification({
        title: notification.request.content.title,
        body: notification.request.content.body,
        data: notification.request.content.data,
        timestamp: new Date().toISOString(),
        source: 'foreground'
      });
      
      setDebugInfo(prev => ({ 
        ...prev, 
        lastForegroundNotification: new Date().toISOString(),
        notificationCount: (prev.notificationCount || 0) + 1
      }));
    });

    // Listener para cuando el usuario toca una notificación
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      debugLog('NOTIFICATION-RESPONSE', {
        title: response.notification.request.content.title,
        body: response.notification.request.content.body,
        data: response.notification.request.content.data,
        actionIdentifier: response.actionIdentifier,
        userText: response.userText
      });
      
      setLastNotification({
        title: response.notification.request.content.title,
        body: response.notification.request.content.body,
        data: response.notification.request.content.data,
        timestamp: new Date().toISOString(),
        userTapped: true,
        actionIdentifier: response.actionIdentifier,
        source: 'background'
      });
      
      setDebugInfo(prev => ({ 
        ...prev, 
        lastTappedNotification: new Date().toISOString(),
        tapCount: (prev.tapCount || 0) + 1
      }));
    });

    return () => {
      debugLog("CLEANUP", "Limpiando listeners de notificación");
      notificationListener.remove();
      if (responseListener.current) responseListener.current.remove();
    };
  }, []);

  return { 
    fcmToken, 
    isSubscribed, 
    lastNotification,
    debugInfo,
    serverUrl: SERVER_URL,
    subscribeToTopic: (topic?: string) => fcmToken && subscribeToTopic(fcmToken, topic),
    unsubscribeFromTopic: (topic?: string) => fcmToken && unsubscribeFromTopic(fcmToken, topic),
    // Función para testing manual de conectividad
    testConnection: async () => {
      debugLog("TEST-CONNECTION-START", { serverUrl: SERVER_URL });
      try {
        const response = await fetch(`${SERVER_URL}/health`);
        const result = await response.json();
        debugLog("TEST-CONNECTION-SUCCESS", result);
        Alert.alert("Conexión exitosa", `Servidor respondió: ${result.message}`);
        return true;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        debugLog("TEST-CONNECTION-ERROR", error);
        Alert.alert("Error de conexión", `No se pudo conectar: ${errorMessage}`);
        return false;
      }
    }
  };
}
