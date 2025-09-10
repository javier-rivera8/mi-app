import { Text, View, Button, ScrollView, StyleSheet, Alert } from "react-native";
import { useNotifications } from "./src/useNotifications";

const SERVER_URL = "http://192.168.0.7:3000";

export default function App() {
  const { 
    fcmToken, 
    isSubscribed, 
    lastNotification, 
    debugInfo, 
    serverUrl, 
    subscribeToTopic, 
    unsubscribeFromTopic, 
    testConnection 
  } = useNotifications();

  const sendTestNotification = async () => {
    console.log('[DEBUG] Enviando notificación de prueba...');
    try {
      const requestBody = {
        topic: 'general',
        title: 'Notificación de Prueba',
        body: '¡Esta es una notificación enviada al tópico general!',
        data: { tipo: 'prueba', timestamp: new Date().toISOString() }
      };
      
      console.log('[DEBUG] Request body:', requestBody);
      console.log('[DEBUG] Server URL:', serverUrl);
      
      const response = await fetch(`${serverUrl}/send-to-topic`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      console.log('[DEBUG] Response status:', response.status);
      console.log('[DEBUG] Response headers:', Object.fromEntries(response.headers.entries()));
      
      const result = await response.json();
      console.log('[DEBUG] Response body:', result);
      
      if (result.success) {
        Alert.alert('Éxito', `Notificación enviada al tópico correctamente. ID: ${result.id}`);
      } else {
        Alert.alert('Error', result.error || 'No se pudo enviar la notificación');
      }
    } catch (error) {
      console.error('[DEBUG] Error completo:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      Alert.alert('Error', `Error de conexión con el servidor: ${errorMessage}`);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Sistema de Notificaciones por Tópicos</Text>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🌐 Información de Conexión:</Text>
          <Text style={styles.status}>
            📡 Servidor: {serverUrl}
          </Text>
          <Text style={styles.status}>
            🔗 Estado: {fcmToken ? '✅ Conectado' : '⏳ Conectando...'}
          </Text>
          <Text style={styles.status}>
            📢 Tópico: {isSubscribed ? '✅ Suscrito a "general"' : '❌ No suscrito'}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🐛 Información de Debug:</Text>
          {Object.keys(debugInfo).length > 0 ? (
            <Text selectable style={styles.debugInfo}>
              {JSON.stringify(debugInfo, null, 2)}
            </Text>
          ) : (
            <Text style={styles.status}>Sin información de debug disponible</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Token FCM:</Text>
          <Text selectable style={styles.token}>
            {fcmToken ?? "Solicitando permisos..."}
          </Text>
        </View>

        {lastNotification && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Última Notificación:</Text>
            <View style={styles.notification}>
              <Text style={styles.notificationTitle}>
                📱 {lastNotification.title}
              </Text>
              <Text style={styles.notificationBody}>
                {lastNotification.body}
              </Text>
              <Text style={styles.notificationTime}>
                🕒 {new Date(lastNotification.timestamp).toLocaleString()}
              </Text>
              {lastNotification.userTapped && (
                <Text style={styles.notificationTapped}>👆 Usuario tocó la notificación</Text>
              )}
              {lastNotification.data && Object.keys(lastNotification.data).length > 0 && (
                <Text style={styles.notificationData}>
                  📋 Datos: {JSON.stringify(lastNotification.data, null, 2)}
                </Text>
              )}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Acciones:</Text>
          
          <Button
            title="🔔 Enviar Notificación de Prueba"
            onPress={sendTestNotification}
            disabled={!isSubscribed}
          />
          
          <View style={styles.buttonSpacer} />
          
          <Button
            title="🔍 Probar Conexión al Servidor"
            onPress={testConnection}
          />
          
          <View style={styles.buttonSpacer} />
          
          <Button
            title={isSubscribed ? "🔕 Desuscribirse del Tópico" : "🔔 Suscribirse al Tópico"}
            onPress={() => {
              if (isSubscribed) {
                unsubscribeFromTopic();
              } else {
                subscribeToTopic();
              }
            }}
            disabled={!fcmToken}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ℹ️ Información:</Text>
          <Text style={styles.info}>
            • Las notificaciones se envían al tópico "general"{'\n'}
            • El dispositivo se suscribe automáticamente al iniciar{'\n'}
            • Puedes enviar notificaciones desde el servidor usando: POST /send-to-topic{'\n'}
            • Las notificaciones aparecen aquí cuando la app está abierta
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
    paddingTop: 50,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#333',
  },
  section: {
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  status: {
    fontSize: 16,
    marginBottom: 5,
    color: '#666',
  },
  token: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 5,
    fontFamily: 'monospace',
  },
  notification: {
    backgroundColor: '#e8f4fd',
    padding: 15,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#1976D2',
  },
  notificationBody: {
    fontSize: 14,
    marginBottom: 10,
    color: '#333',
  },
  notificationTime: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  notificationTapped: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  notificationData: {
    fontSize: 11,
    color: '#555',
    backgroundColor: '#f0f0f0',
    padding: 5,
    borderRadius: 3,
    fontFamily: 'monospace',
  },
  buttonSpacer: {
    height: 10,
  },
  info: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  debugInfo: {
    fontSize: 10,
    color: '#555',
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 4,
    fontFamily: 'monospace',
    maxHeight: 200,
  },
});
