// Quick script to start the Chatterbox TTS service
const { ChatterboxTTSDockerService } = require('./src/media/ChatterboxTTSDockerService.ts');

async function startChatterbox() {
  console.log('🚀 Starting Chatterbox TTS service...');
  
  const service = new ChatterboxTTSDockerService();
  
  try {
    const started = await service.startService();
    
    if (started) {
      console.log('✅ Chatterbox TTS service started successfully!');
      console.log('🔍 Checking availability...');
      
      const available = await service.isAvailable();
      console.log('📊 Service available:', available);
      
      const status = await service.getServiceStatus();
      console.log('📊 Service status:', status);
      
    } else {
      console.log('❌ Failed to start Chatterbox TTS service');
    }
  } catch (error) {
    console.error('❌ Error starting service:', error);
  }
}

startChatterbox();
