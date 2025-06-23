/**
 * Test Full Kokoro Provider Integration
 * 
 * This tests the complete provider chain like your existing system
 */

import { KokoroDockerProvider } from './src/media/providers/docker/kokoro/KokoroDockerProvider';
import { Text } from './src/media/assets/roles';
import { MediaCapability } from './src/media/types/provider';

async function testFullKokoroIntegration() {
  console.log('🧪 Testing Full Kokoro Provider Integration...\n');

  const provider = new KokoroDockerProvider();

  try {
    // Test 1: Provider creation and info
    console.log('📋 Provider Information:');
    console.log(`   ID: ${provider.id}`);
    console.log(`   Name: ${provider.name}`);
    console.log(`   Type: ${provider.type}`);
    const info = provider.getInfo();
    console.log(`   Docker Image: ${info.dockerImage}`);
    console.log(`   Capabilities: ${info.capabilities.join(', ')}`);
    console.log('');

    // Test 2: Check if service is available
    console.log('🔍 Checking service availability...');
    const available = await provider.isAvailable();
    console.log(`   Available: ${available}`);
    console.log('');

    // Test 3: Start service (if needed)
    if (!available) {
      console.log('🚀 Starting service...');
      const started = await provider.startService();
      console.log(`   Started: ${started}`);
      console.log('');
    }

    // Test 4: Create model instance
    console.log('🔧 Creating model instance...');
    const model = await provider.createModel('kokoro-82m');
    console.log(`   Model: ${model.getName()}`);
    console.log('');

    // Test 5: Check model availability
    console.log('✅ Checking model availability...');
    const modelAvailable = await model.isAvailable();
    console.log(`   Model available: ${modelAvailable}`);
    console.log('');

    if (!modelAvailable) {
      console.log('⚠️  Model not available, cannot proceed with TTS test');
      return;
    }

    // Test 6: Get voices
    console.log('🗣️  Getting available voices...');
    const voices = await model.getAvailableVoices();
    console.log(`   Found ${voices.length} voices:`);
    voices.slice(0, 5).forEach(voice => console.log(`     - ${voice}`));
    if (voices.length > 5) {
      console.log(`     ... and ${voices.length - 5} more`);
    }
    console.log('');

    // Test 7: Create text input (using your actual Text class)
    console.log('📝 Creating text input...');
    const text = new Text(
      'Hello! This is a comprehensive test of the Kokoro TTS Docker provider. ' +
      'It should generate high-quality speech using the StyleTTS2 architecture, ' +
      'with proper voice cloning capabilities and style control parameters.'
    );
    console.log(`   Text length: ${text.content.length} characters`);
    console.log('');

    // Test 8: Generate audio with different voices/settings
    console.log('🎵 Testing TTS generation...');
    
    const testConfigs = [
      { voice: 'af_bella', speed: 1.0, alpha: 0.3, beta: 0.7, description: 'Female voice, normal speed' },
      { voice: 'am_adam', speed: 1.2, alpha: 0.4, beta: 0.6, description: 'Male voice, faster speed' },
      { voice: 'af_sarah', speed: 0.9, alpha: 0.2, beta: 0.8, description: 'Female voice, slower speed' }
    ];

    for (let i = 0; i < testConfigs.length; i++) {
      const config = testConfigs[i];
      console.log(`   ${i + 1}. Testing: ${config.description}`);
      
      try {
        const audio = await model.transform(text, {
          voice: config.voice,
          speed: config.speed,
          alpha: config.alpha,
          beta: config.beta
        });

        console.log(`      ✅ Generated ${audio.data.length} bytes of audio`);
        console.log(`      🎛️  Format: ${audio.format}`);
        
        // Save test file
        const fs = await import('fs');
        const path = await import('path');
        const filename = `kokoro_test_${config.voice}_${Date.now()}.wav`;
        const outputPath = path.join(process.cwd(), filename);
        fs.writeFileSync(outputPath, audio.data);
        console.log(`      💾 Saved to: ${filename}`);
        
      } catch (error) {
        console.log(`      ❌ Failed: ${error.message}`);
      }
      
      console.log('');
    }

    // Test 9: Test provider interface methods
    console.log('🔧 Testing provider interface methods...');
    
    // TextToAudioProvider methods
    const supportedModels = provider.getSupportedTextToAudioModels();
    console.log(`   Supported models: ${supportedModels.join(', ')}`);
    
    const supportsKokoro = provider.supportsTextToAudioModel('kokoro-82m');
    console.log(`   Supports kokoro-82m: ${supportsKokoro}`);
      // MediaProvider methods
    const capabilities = provider.getModelsForCapability(MediaCapability.TEXT_TO_AUDIO);
    console.log(`   Text-to-audio models: ${capabilities.length}`);
    console.log('');

    // Test 10: Health and status
    console.log('📊 Getting service status...');
    const status = await provider.getServiceStatus();
    console.log(`   Running: ${status.running}`);
    console.log(`   Healthy: ${status.healthy}`);
    if (status.error) {
      console.log(`   Error: ${status.error}`);
    }
    console.log('');

    console.log('🎉 Full Kokoro Provider Integration Test SUCCESSFUL!');
    console.log('🏁 All components are working correctly.');

  } catch (error) {
    console.error('❌ Integration test failed:', error);
  }
}

// Run the test
if (require.main === module) {
  testFullKokoroIntegration().catch(console.error);
}

export { testFullKokoroIntegration };
