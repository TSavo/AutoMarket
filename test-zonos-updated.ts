/**
 * Test script for the updated Zonos TTS integration
 * 
 * This demonstrates the new zonos-client.ts style implementation with:
 * - @gradio/client integration
 * - Audio sequence building for long texts
 * - Proper voice cloning support
 * - Structured configuration options
 */

import { ZonosDockerProvider } from './src/media/providers/docker/zonos/ZonosDockerProvider';
import { ZonosTextToAudioModel } from './src/media/providers/docker/zonos/ZonosTextToAudioModel';
import { Text } from './src/media/assets/roles';
import * as path from 'path';

async function testZonosProvider() {
  console.log('🧪 Testing Updated Zonos TTS Provider');
  console.log('=' .repeat(60));

  try {
    // Initialize provider
    const provider = new ZonosDockerProvider();
    
    // Start the service
    console.log('🚀 Starting Zonos Docker service...');
    const serviceStarted = await provider.startService();
    
    if (!serviceStarted) {
      throw new Error('Failed to start Zonos Docker service');
    }
    
    console.log('✅ Service started successfully');
    
    // Get service status
    const status = await provider.getServiceStatus();
    console.log(`📊 Service Status: running=${status.running}, healthy=${status.healthy}`);
    
    // Create model instance
    console.log('🔨 Creating TTS model...');
    const model = await provider.createTextToAudioModel('zonos-docker-tts') as ZonosTextToAudioModel;
      // Test 1: Simple short text generation
    console.log('\n🎯 Test 1: Simple short text generation');
    const shortText = "Hello, this is a test of the updated Zonos TTS integration!";
    const shortTextRole = new Text(shortText);
    
    try {
      const shortAudio = await model.transform(shortTextRole, {
        modelChoice: "Zyphra/Zonos-v0.1-transformer",
        language: "en-us",
        emotion: {
          happiness: 0.8,
          neutral: 0.2
        },
        conditioning: {
          speakingRate: 15.0,
          vqScore: 0.78
        },
        generation: {
          cfgScale: 2.0,
          randomizeSeed: true
        }
      });
      
      console.log(`✅ Short audio generated: ${shortAudio.metadata?.localPath}`);
      console.log(`📊 Audio info: ${(shortAudio.data.length / 1024).toFixed(1)}KB, ${shortAudio.metadata?.processingTime}ms`);
    } catch (error) {
      console.error('❌ Short text generation failed:', error);
    }
    
    // Test 2: Long text with sequence building (if speaker audio is available)
    console.log('\n🎯 Test 2: Long text with sequence building');
    
    const longText = `
This is a much longer text that will test the sequence building functionality of the updated Zonos integration.

The sequence builder breaks long text into natural chunks at sentence boundaries, generates audio for each chunk separately, and then combines them with appropriate pauses.

This approach ensures better quality for long-form content while maintaining natural speech patterns and allowing for voice cloning with reference audio.

The system supports configurable pause durations between sentences and paragraphs, as well as different audio output formats.
    `.trim();
    
    const longTextRole = new Text(longText);
    
    // Note: For this test, you would need to provide a speaker audio file
    // const speakerAudioPath = path.join(__dirname, 'test-speaker.wav');
    
    try {      const longAudio = await model.transform(longTextRole, {
        modelChoice: "Zyphra/Zonos-v0.1-transformer",
        enableSequenceBuilding: true, // Force sequence building
        maxSingleChunkLength: 100, // Lower threshold for testing
        // speakerAudio: speakerAudioPath, // Uncomment if you have speaker audio
        // Note: Sequence building requires speaker audio, so this will fall back to single chunk
        emotion: {
          happiness: 0.7,
          neutral: 0.3
        }
      });
      
      console.log(`✅ Long audio generated: ${longAudio.metadata?.localPath}`);
      console.log(`📊 Audio info: ${(longAudio.data.length / 1024).toFixed(1)}KB, ${longAudio.metadata?.processingTime}ms`);
      console.log(`🔧 Used sequence building: ${longAudio.metadata?.isSequence}`);
    } catch (error) {
      console.error('❌ Long text generation failed:', error);
      console.log('💡 Note: Sequence building requires speaker audio for voice cloning');
    }
    
    // Test 3: Available voices and model info
    console.log('\n🎯 Test 3: Model capabilities');
    
    const voices = await model.getAvailableVoices();
    console.log(`🎭 Available voices: ${voices.join(', ')}`);
    
    const formats = model.getSupportedFormats();
    console.log(`🎵 Supported formats: ${formats.join(', ')}`);
    
    const maxLength = model.getMaxTextLength();
    console.log(`📏 Max text length: ${maxLength} characters`);
    
    const supportsCloning = model.supportsVoiceCloning();
    console.log(`🎤 Voice cloning supported: ${supportsCloning}`);
    
    console.log('\n🎉 All tests completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Example usage for voice cloning with reference audio
async function testVoiceCloning() {
  console.log('\n🎤 Testing Voice Cloning (requires speaker audio)');
  console.log('=' .repeat(60));
  
  // This example shows how to use voice cloning with a reference audio file
  const provider = new ZonosDockerProvider();
  const model = await provider.createTextToAudioModel('zonos-docker-tts') as ZonosTextToAudioModel;
  
  const text = "This speech will clone the voice from the reference audio file.";
  const textRole = new Text(text);
  
  // Replace with actual path to your speaker audio file
  const speakerAudioPath = "./confusion.wav";
  
  try {
    const clonedAudio = await model.transform(textRole, {
      speakerAudio: speakerAudioPath,
      speakerNoised: false, // Set to true if speaker audio needs denoising
      emotion: {
        happiness: 0.9,
        neutral: 0.1
      },
      conditioning: {
        speakingRate: 14.0,
        pitchStd: 40.0,
        vqScore: 0.80
      }
    });
    
    console.log(`✅ Voice cloned audio: ${clonedAudio.metadata?.localPath}`);
  } catch (error) {
    console.error('❌ Voice cloning test failed:', error);
    console.log('💡 Make sure speaker audio file exists and service is running');
  }
}

// Run the tests
if (require.main === module) {
  testZonosProvider()
    .then(() => {
      console.log('\n🏁 Test script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Test script failed:', error);
      process.exit(1);
    });
}

export { testZonosProvider, testVoiceCloning };
