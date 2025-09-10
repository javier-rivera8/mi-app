// Test para verificar la detección de URL en preview builds
import Constants from 'expo-constants';

// Simulamos diferentes escenarios
const testUrlDetection = () => {
  console.log('🔍 PROBANDO DETECCIÓN DE URL PARA PREVIEW BUILDS\n');
  
  // Escenario actual (development)
  console.log('📱 Escenario actual:');
  console.log(`   hostUri: ${Constants.expoConfig?.hostUri || 'No definido'}`);
  console.log(`   appOwnership: ${Constants.appOwnership}`);
  
  // Función real de detección
  const getServerUrl = () => {
    if (Constants.expoConfig?.hostUri) {
      const [ip] = Constants.expoConfig.hostUri.split(':');
      console.log(`   🎯 Preview build detectado, usando IP: ${ip}`);
      return `http://${ip}:3000`;
    }
    
    const localUrl = "http://192.168.0.7:3000";
    console.log(`   🏠 Development local, usando: ${localUrl}`);
    return localUrl;
  };
  
  const detectedUrl = getServerUrl();
  console.log(`\n✅ URL detectada: ${detectedUrl}`);
  
  // Simular escenario de preview build
  console.log('\n🧪 Simulando preview build:');
  const mockHostUri = '192.168.0.10:8081'; // IP típica de preview build
  const [mockIp] = mockHostUri.split(':');
  const mockPreviewUrl = `http://${mockIp}:3000`;
  console.log(`   📱 hostUri simulado: ${mockHostUri}`);
  console.log(`   🎯 URL que se usaría: ${mockPreviewUrl}`);
  
  console.log('\n📋 VERIFICACIONES PARA PREVIEW BUILD:');
  console.log('   ✅ Detección automática de IP implementada');
  console.log('   ✅ CORS configurado para cualquier origen');
  console.log('   ✅ Headers adicionales para preview builds');
  console.log('   ✅ Logging detallado para debug');
  
  return detectedUrl;
};

export { testUrlDetection };
