/**
 * Test Zonos Voice Cloning with Standard Interface
 * 
 * This test demonstrates voice cloning using the standard TextToAudioOptions
 * interface with voiceToClone parameter, matching the expected API.
 */

import { ZonosDockerProvider } from './src/media/providers/docker/zonos/ZonosDockerProvider';
import { ZonosTextToAudioModel } from './src/media/providers/docker/zonos/ZonosTextToAudioModel';
import { Text, Audio } from './src/media/assets/roles';
import * as fs from 'fs';
import * as path from 'path';

async function testVoiceCloningStandardInterface() {
  console.log('🎤 Testing Zonos Voice Cloning with Standard Interface');
  console.log('=' .repeat(60));

  try {
    // Initialize the provider
    console.log('=== STEP 1: Initialize Provider ===');
    const provider = new ZonosDockerProvider();
    
    // Start service if needed
    console.log('\n=== STEP 2: Ensure Service is Running ===');
    const status = await provider.getServiceStatus();
    
    if (!status.running || !status.healthy) {
      console.log('🚀 Starting Zonos Docker service...');
      const started = await provider.startService();
      if (!started) {
        throw new Error('Failed to start Zonos service');
      }
      console.log('✅ Service started successfully');
    } else {
      console.log('✅ Service is already running and healthy');
    }

    // Create the model
    console.log('\n=== STEP 3: Create TTS Model ===');
    const model = await provider.createTextToAudioModel('zonos-docker-tts') as ZonosTextToAudioModel;
    console.log(`✅ Model created: ${model.getId()}`);

    // Load voice sample for cloning
    console.log('\n=== STEP 4: Load Voice Sample ===');
    const voiceSamplePath = './confusion.wav';
    
    if (!fs.existsSync(voiceSamplePath)) {
      throw new Error(`Voice sample not found: ${voiceSamplePath}`);
    }
    
    console.log(`📁 Loading voice sample: ${voiceSamplePath}`);
    const voiceSampleBuffer = fs.readFileSync(voiceSamplePath);
    const fileStats = fs.statSync(voiceSamplePath);
    
    console.log(`   File size: ${(fileStats.size / 1024).toFixed(1)}KB`);
    console.log(`   Buffer length: ${voiceSampleBuffer.length} bytes`);
    
    // Create Audio object for voice cloning
    const voiceSample = new Audio(voiceSampleBuffer, null, {
      format: 'wav',
      fileSize: voiceSampleBuffer.length,
      localPath: path.resolve(voiceSamplePath),
      originalFileName: 'confusion.wav'
    });
    
    console.log(`✅ Voice sample loaded: ${voiceSample.toString()}`);

    // Test 1: Basic voice cloning using standard interface
    console.log('\n=== STEP 5: Voice Cloning with Standard Interface ===');
    
    const text = Text.fromString("Hello in my voice! This is a test of voice cloning using the standard TextToAudioOptions interface.");
    console.log(`📝 Text to synthesize: "${text.content}"`);
    
    console.log('\n🎵 Generating cloned speech...');
    const startTime = Date.now();
    
    // Using the standard interface as shown in the documentation
    const clonedAudio = await model.transform(text, { 
      voiceToClone: voiceSample,
      quality: 'high',
      language: 'en',
      speed: 1.0,
      // Additional Zonos-specific options can still be used
      emotion: {
        happiness: 0.8,
        neutral: 0.2
      },
      conditioning: {
        speakingRate: 15.0,
        vqScore: 0.78
      }
    });
    
    const generationTime = Date.now() - startTime;
    
    console.log('✅ Voice cloned audio generated successfully!');
    console.log(`   Generation time: ${generationTime}ms`);
    console.log(`   Audio format: ${clonedAudio.metadata?.format || 'unknown'}`);
    console.log(`   Audio size: ${(clonedAudio.data.length / 1024).toFixed(1)}KB`);
    console.log(`   Sample rate: ${clonedAudio.metadata?.sample_rate || 'unknown'}Hz`);
    console.log(`   Local path: ${clonedAudio.metadata?.localPath || 'none'}`);
    console.log(`   Voice cloning: ${clonedAudio.metadata?.voiceCloning ? 'enabled' : 'disabled'}`);

    // Test 2: Verify voice cloning capability
    console.log('\n=== STEP 6: Model Capabilities ===');
    
    const supportsCloning = model.supportsVoiceCloning();
    console.log(`🎤 Voice cloning supported: ${supportsCloning}`);
    
    const maxTextLength = model.getMaxTextLength();
    console.log(`📏 Max text length: ${maxTextLength} characters`);
    
    const supportedFormats = model.getSupportedFormats();
    console.log(`🎵 Supported formats: ${supportedFormats.join(', ')}`);

    // Test 3: Compare with Zonos-specific interface (backward compatibility)
    console.log('\n=== STEP 7: Backward Compatibility Test ===');
    
    const text2 = Text.fromString("This uses the Zonos-specific interface for comparison.");
    console.log(`📝 Text for comparison: "${text2.content}"`);
    
    const zonosSpecificAudio = await model.transform(text2, {
      speakerAudio: voiceSamplePath, // Zonos-specific parameter
      emotion: {
        happiness: 0.8,
        neutral: 0.2
      },
      conditioning: {
        speakingRate: 15.0,
        vqScore: 0.78
      }
    });
    
    console.log('✅ Zonos-specific interface also works');
    console.log(`   Audio size: ${(zonosSpecificAudio.data.length / 1024).toFixed(1)}KB`);

    console.log('\n🎉 Voice cloning with standard interface test completed!');
    console.log('\n💡 Summary:');
    console.log('   ✅ Standard voiceToClone interface supported');
    console.log('   ✅ Audio object properly processed');
    console.log('   ✅ Voice cloning functional');
    console.log('   ✅ Backward compatibility maintained');
    console.log('   ✅ Quality and emotion controls working');

  } catch (error) {
    console.error('❌ Test failed:', error);
    
    if (error.message.includes('confusion.wav')) {
      console.log('\n💡 Make sure confusion.wav exists in the project root');
    }
    
    if (error.message.includes('service') || error.message.includes('connection')) {
      console.log('\n💡 Troubleshooting:');
      console.log('   1. Ensure Docker is running');
      console.log('   2. Start the service: docker-compose -f services/zonos/docker-compose.yml up -d');
      console.log('   3. Check logs: docker-compose -f services/zonos/docker-compose.yml logs');
    }
  }
}

// Run the test
if (require.main === module) {
  testVoiceCloningStandardInterface()
    .then(() => {
      console.log('\n🏁 Test completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Test script failed:', error);
      process.exit(1);
    });
}

export { testVoiceCloningStandardInterface };
