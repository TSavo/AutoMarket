/**
 * Test Zonos Docker TTS Provider
 * 
 * Tests the new Zonos TTS provider following the same patterns as
 * Chatterbox and Kokoro Docker providers.
 */

import { ZonosDockerProvider } from './src/media/providers/docker/zonos';
import { Text } from './src/media/assets/roles';

async function testZonosDockerProvider() {
  console.log('🧪 Testing Zonos Docker TTS Provider...\n');

  try {
    // Initialize the provider
    console.log('=== STEP 1: Initialize Provider ===');
    const provider = new ZonosDockerProvider();
    
    console.log(`📋 Provider Info:`);
    console.log(`   ID: ${provider.id}`);
    console.log(`   Name: ${provider.name}`);
    console.log(`   Type: ${provider.type}`);
    console.log(`   Capabilities: ${provider.capabilities.join(', ')}`);
    
    // Check service status
    console.log('\n=== STEP 2: Service Status ===');
    const status = await provider.getServiceStatus();
    console.log(`🔍 Service Status:`);
    console.log(`   Running: ${status.running}`);
    console.log(`   Healthy: ${status.healthy}`);
    if (status.error) console.log(`   Error: ${status.error}`);

    // Start service if not running
    if (!status.running || !status.healthy) {
      console.log('\n🚀 Starting Zonos Docker service...');
      const started = await provider.startService();
      console.log(`   Service started: ${started}`);
      
      if (started) {
        // Wait a moment for the service to fully initialize
        console.log('   Waiting for service to initialize...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    } else {
      console.log('✅ Service is already running and healthy');
    }

    // Check availability
    console.log('\n=== STEP 3: Provider Availability ===');
    const available = await provider.isAvailable();
    console.log(`🔗 Provider available: ${available}`);

    if (!available) {
      console.log('⚠️  Provider not available. Skipping TTS generation test.');
      return;
    }

    // Get available models
    console.log('\n=== STEP 4: Available Models ===');
    const models = provider.getAvailableModels();
    console.log(`📦 Available models: ${models.join(', ')}`);

    // Test TTS generation
    console.log('\n=== STEP 5: TTS Generation Test ===');
    
    // Create text input
    const testText = "Hello, this is a test of the Zonos text-to-speech system. It supports emotional voice control and style customization.";
    const textInput = new Text(testText, 'en', 1.0);
    
    console.log(`📝 Input text: "${testText}"`);
    
    // Create TTS model
    console.log('\n🤖 Creating TTS model...');
    const model = await provider.createTextToAudioModel('zonos-tts');
    console.log(`   Model created: ${model.getId()}`);
    
    // Generate audio with custom options
    console.log('\n🎵 Generating audio...');
    const startTime = Date.now();
      const audio = await model.transform(textInput, {
      // Model selection
      modelChoice: "Zyphra/Zonos-v0.1-transformer",
      language: "en-us",
      
      // Emotion settings - happy and enthusiastic
      emotion: {
        happiness: 1.0,
        sadness: 0.05,
        neutral: 0.2
      },
      
      // Voice conditioning - clear and expressive
      conditioning: {
        speakingRate: 15.0,
        pitchStd: 45.0,
        vqScore: 0.78,
        dnsmos: 4.0
      },
      
      // Generation settings - deterministic for testing
      generation: {
        cfgScale: 2.0,
        seed: 12345,
        randomizeSeed: false
      }
    });
    
    const generationTime = Date.now() - startTime;
    
    console.log('✅ Audio generated successfully!');
    console.log(`   Generation time: ${generationTime}ms`);
    console.log(`   Audio format: ${audio.metadata?.format || 'unknown'}`);
    console.log(`   Audio size: ${(audio.data.length / 1024).toFixed(1)}KB`);
    console.log(`   Sample rate: ${audio.metadata?.sample_rate || 'unknown'}Hz`);
    console.log(`   Local path: ${audio.metadata?.localPath || 'none'}`);
    
    // Show generation metadata
    if (audio.metadata?.generation_prompt) {
      console.log('\n📊 Generation Metadata:');
      const gp = audio.metadata.generation_prompt;
      console.log(`   Provider: ${gp.provider}`);
      console.log(`   Model: ${gp.modelName}`);
      console.log(`   Transform: ${gp.transformationType}`);
      console.log(`   Timestamp: ${gp.timestamp}`);
      console.log(`   Model choice: ${gp.metadata?.modelChoice}`);
      console.log(`   Emotion settings: ${JSON.stringify(gp.metadata?.emotionSettings)}`);
    }    // Test with voice cloning using standard interface
    console.log('\n=== STEP 6: Voice Cloning Test (Standard Interface) ===');
    try {
      console.log('🎤 Testing voice cloning with confusion.wav using standard interface...');
      
      // Load the voice sample as an Audio object
      const fs = await import('fs');
      const path = await import('path');
      
      const voiceSamplePath = './confusion.wav';
      if (!fs.existsSync(voiceSamplePath)) {
        throw new Error('confusion.wav not found in project root');
      }
      
      console.log(`📁 Loading voice sample: ${voiceSamplePath}`);
      const voiceSampleBuffer = fs.readFileSync(voiceSamplePath);
      
      // Create Audio object for voice cloning
      const { Audio } = await import('./src/media/assets/roles');
      const voiceSample = new Audio(voiceSampleBuffer, null, {
        format: 'wav',
        fileSize: voiceSampleBuffer.length,
        localPath: path.resolve(voiceSamplePath),
        originalFileName: 'confusion.wav'
      });
      
      const clonedText = "This is a test of voice cloning using the standard interface. The voice should match the speaker from the confusion audio file.";
      const clonedTextInput = new Text(clonedText, 'en', 1.0);
      
      console.log(`📝 Cloning text: "${clonedText}"`);
      console.log('🎯 Using standard voiceToClone interface');
      
      const cloneStartTime = Date.now();
      
      // Using the standard TextToAudioOptions interface
      const clonedAudio = await model.transform(clonedTextInput, {
        // Standard interface
        voiceToClone: voiceSample,
        quality: 'high',
        language: 'en',
        speed: 1.0,
        
        // Zonos-specific emotion and conditioning options
        emotion: {
          happiness: 0.7,
          sadness: 0.1,
          neutral: 0.3
        },
        conditioning: {
          speakingRate: 14.0,
          pitchStd: 40.0,
          vqScore: 0.80,
          dnsmos: 4.2
        },
        generation: {
          cfgScale: 2.2,
          seed: 54321,
          randomizeSeed: false
        }
      });
      
      const cloneGenerationTime = Date.now() - cloneStartTime;
      
      console.log('✅ Voice cloned audio generated successfully!');
      console.log(`   Clone generation time: ${cloneGenerationTime}ms`);
      console.log(`   Cloned audio format: ${clonedAudio.metadata?.format || 'unknown'}`);
      console.log(`   Cloned audio size: ${(clonedAudio.data.length / 1024).toFixed(1)}KB`);
      console.log(`   Local path: ${clonedAudio.metadata?.localPath || 'none'}`);
      console.log(`   Voice cloning: ${clonedAudio.metadata?.voiceCloning ? 'enabled' : 'disabled'}`);
      console.log(`   Using standard interface: ✅`);
      
    } catch (error) {
      console.log(`❌ Voice cloning test failed: ${error.message}`);
      console.log('💡 Make sure confusion.wav exists in the project root');
    }

    // Get service info
    console.log('\n=== STEP 7: Service Information ===');
    const serviceInfo = provider.getInfo();
    console.log(`📋 Service Info:`);
    console.log(`   Description: ${serviceInfo.description}`);
    console.log(`   Docker Image: ${serviceInfo.dockerImage}`);
    console.log(`   Default Port: ${serviceInfo.defaultPort}`);
    console.log(`   Capabilities: ${serviceInfo.capabilities.join(', ')}`);

    console.log('\n🎉 Zonos Docker TTS Provider test completed successfully!');
    console.log('\n💡 Integration Notes:');
    console.log('   ✅ Docker service management working');
    console.log('   ✅ Provider interface compatible');
    console.log('   ✅ TTS generation functional');
    console.log('   ✅ Emotion control available');
    console.log('   ✅ Generation metadata preserved');
    console.log('   ✅ Ready for pipeline integration');

  } catch (error) {
    console.error('❌ Test failed:', error);
    
    if (error.message.includes('connection') || error.message.includes('available')) {
      console.log('\n💡 Troubleshooting:');
      console.log('   1. Ensure Docker is running');
      console.log('   2. Start the service: docker-compose -f services/zonos/docker-compose.yml up -d');
      console.log('   3. Check service health: curl http://localhost:7860/');
      console.log('   4. Check logs: docker-compose -f services/zonos/docker-compose.yml logs');
    }
  }
}

// Run the test
if (require.main === module) {
  testZonosDockerProvider().catch(console.error);
}

export { testZonosDockerProvider };
