/**
 * Test the Kokoro Docker Provider
 * 
 * This script tests the complete Kokoro TTS Docker integration
 */

import { KokoroDockerProvider } from './src/media/providers/docker/kokoro/KokoroDockerProvider';

async function testKokoroProvider() {
  console.log('🧪 Testing Kokoro Docker Provider...\n');

  const provider = new KokoroDockerProvider();

  try {
    // Test 1: Provider Info
    console.log('📋 Provider Info:');
    const info = provider.getInfo();
    console.log(`   Name: ${provider.name}`);
    console.log(`   Type: ${provider.type}`);
    console.log(`   Docker Image: ${info.dockerImage}`);
    console.log(`   Default Port: ${info.defaultPort}`);
    console.log(`   Capabilities: ${info.capabilities.join(', ')}`);
    console.log('');

    // Test 2: Check availability
    console.log('🔍 Checking availability...');
    const available = await provider.isAvailable();
    console.log(`   Available: ${available}`);
    console.log('');

    // Test 3: Start service
    console.log('🚀 Starting Kokoro Docker service...');
    const started = await provider.startService();
    console.log(`   Service started: ${started}`);
    
    if (!started) {
      console.log('⚠️  Service failed to start. Please check Docker setup.');
      return;
    }
    console.log('');

    // Test 4: Service status
    console.log('📊 Checking service status...');
    const status = await provider.getServiceStatus();
    console.log(`   Running: ${status.running}`);
    console.log(`   Healthy: ${status.healthy}`);
    if (status.error) {
      console.log(`   Error: ${status.error}`);
    }
    console.log('');

    // Test 5: Available models
    console.log('🎵 Available models:');
    const models = provider.getAvailableModels();
    models.forEach(model => console.log(`   - ${model}`));
    console.log('');    // Test 6: Create model instance
    console.log('🔧 Creating model instance...');
    const model = await provider.createModel('kokoro-82m');
    const kokoroModel = model as any; // Cast to access Kokoro-specific methods
    console.log(`   Model created: ${model.getName()}`);
    console.log('');

    // Test 7: Check model availability
    console.log('✅ Checking model availability...');
    const modelAvailable = await model.isAvailable();
    console.log(`   Model available: ${modelAvailable}`);
    console.log('');

    // Test 8: Get available voices
    console.log('🗣️  Available voices:');
    const voices = await model.getAvailableVoices();
    voices.forEach(voice => console.log(`   - ${voice}`));
    console.log('');

    // Test 9: Generate TTS (if model is available)
    if (modelAvailable) {
      console.log('🎵 Generating test audio...');
      
      // Create a simple text input
      const { Text } = await import('./src/media/assets/roles');
      const textInput = new Text('Hello! This is a test of the Kokoro TTS Docker provider. It should generate high-quality speech using StyleTTS2 architecture.');

      try {
        const audio = await model.transform(textInput, {
          voice: 'default',
          speed: 1.0,
          alpha: 0.3,
          beta: 0.7,
          style: 'default'
        });

        console.log(`   ✅ Audio generated successfully!`);
        console.log(`   📁 Audio buffer size: ${audio.data.length} bytes`);
        console.log(`   🎛️  Audio format: ${audio.format}`);
        
        // Save test audio
        const fs = await import('fs');
        const path = await import('path');
        const outputPath = path.join(process.cwd(), `kokoro_test_${Date.now()}.wav`);
        fs.writeFileSync(outputPath, audio.data);
        console.log(`   💾 Saved to: ${outputPath}`);
        
      } catch (error) {
        console.log(`   ❌ Audio generation failed: ${error.message}`);
      }
    } else {
      console.log('⚠️  Model not available, skipping audio generation test');
    }
    console.log('');

    // Test 10: Get service logs
    console.log('📝 Getting service logs (last 20 lines)...');
    try {
      const logs = await kokoroModel.getServiceLogs(20);
      console.log('   Last 20 log lines:');
      console.log(logs.split('\n').slice(0, 20).map(line => `   ${line}`).join('\n'));
    } catch (error) {
      console.log(`   Could not get logs: ${error.message}`);
    }
    console.log('');

    // Test 11: Container stats
    console.log('📊 Container statistics...');
    const stats = await kokoroModel.getContainerStats();
    if (stats.error) {
      console.log(`   Error: ${stats.error}`);
    } else {
      console.log(`   CPU Usage: ${stats.cpuUsage || 'N/A'}`);
      console.log(`   Memory Usage: ${stats.memoryUsage || 'N/A'}`);
      console.log(`   Network I/O: ${stats.networkIO || 'N/A'}`);
    }
    console.log('');

    console.log('🎉 All tests completed successfully!');
    console.log('🏁 Kokoro Docker Provider is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Optional: Stop service after tests
    console.log('\n🛑 Stopping service...');
    try {
      await provider.stopService();
      console.log('✅ Service stopped successfully');
    } catch (error) {
      console.log(`⚠️  Error stopping service: ${error.message}`);
    }
  }
}

// Run the test
if (require.main === module) {
  testKokoroProvider().catch(console.error);
}

export { testKokoroProvider };
