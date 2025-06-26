/**
 * FFMPEG Audio-to-Audio Conversion Test
 * 
 * Test script to demonstrate FFMPEG Docker provider's audio-to-audio conversion capabilities.
 * This test showcases audio format conversion, quality control, and processing effects.
 */

import { FFMPEGProvider } from './src/media/providers/ffmpeg/FFMPEGProvider';
import { MediaCapability } from './src/media/types/provider';

async function testFFMPEGAudioToAudio() {
  console.log('🎵 Testing FFMPEG Audio-to-Audio Conversion...\n');

  try {    // Create FFMPEG provider
    const provider = new FFMPEGProvider();

    // Check provider capabilities
    console.log('🔧 Provider Capabilities:');
    console.log(`   - Audio-to-Audio: ${provider.capabilities.includes(MediaCapability.AUDIO_TO_AUDIO)}`);
    console.log(`   - Video-to-Audio: ${provider.capabilities.includes(MediaCapability.VIDEO_TO_AUDIO)}`);

    // List available audio-to-audio models
    console.log('\n📋 Available Audio-to-Audio Models:');
    const audioModels = provider.getSupportedAudioToAudioModels();
    audioModels.forEach((model, index) => {
      console.log(`  ${index + 1}. ${model}`);
    });

    // Check if the audio converter model is supported
    const modelId = 'ffmpeg-audio-to-audio';
    const isSupported = provider.supportsAudioToAudioModel(modelId);
    console.log(`\n🔍 Model Support Check for '${modelId}': ${isSupported ? '✅ Supported' : '❌ Not Supported'}`);

    if (!isSupported) {
      console.log('❌ Audio-to-audio model not available. Skipping conversion test.');
      return;
    }

    // Check service availability
    console.log('\n🏥 Service Health Check:');
    const serviceStatus = await provider.getServiceStatus();
    console.log(`   - Running: ${serviceStatus.running}`);
    console.log(`   - Healthy: ${serviceStatus.healthy}`);
    if (serviceStatus.error) {
      console.log(`   - Error: ${serviceStatus.error}`);
    }

    if (!serviceStatus.healthy) {
      console.log('\n🚀 Starting FFMPEG service...');
      const started = await provider.startService();
      if (!started) {
        console.log('❌ Failed to start FFMPEG service');
        return;
      }
      console.log('✅ FFMPEG service started successfully');
    }

    // Create audio-to-audio model
    console.log('\n🤖 Creating Audio-to-Audio Model...');
    try {
      const model = await provider.createAudioToAudioModel(modelId);
      console.log(`✅ Model created: ${model.getName()}`);
      console.log(`   - ID: ${model.getId()}`);
      console.log(`   - Description: ${model.getDescription()}`);
      console.log(`   - Capabilities: ${model.getCapabilities().join(', ')}`);

      // Check model availability
      const isAvailable = await model.isAvailable();
      console.log(`   - Available: ${isAvailable ? '✅ Yes' : '❌ No'}`);

      // Show supported formats
      console.log(`   - Input Formats: ${model.getSupportedInputFormats().join(', ')}`);
      console.log(`   - Output Formats: ${model.getSupportedOutputFormats().join(', ')}`);

      if (!isAvailable) {
        console.log('❌ Model not available for processing');
        return;
      }

      // Test audio conversion (mock example - would need actual audio file)
      console.log('\n🎵 Audio Conversion Examples:');
      
      // Example 1: Basic MP3 to WAV conversion
      console.log('\n📝 Example 1: MP3 to WAV Conversion');
      console.log('   Input: song.mp3 (320kbps, 44.1kHz stereo)');
      console.log('   Output: song.wav (44.1kHz, 16-bit, stereo)');
      console.log('   Command: model.transform(audio, { outputFormat: "wav", sampleRate: 44100, quality: "high" })');

      // Example 2: Audio enhancement with effects
      console.log('\n📝 Example 2: Audio Enhancement');
      console.log('   Input: recording.wav (poor quality)');
      console.log('   Output: enhanced.flac (cleaned, normalized)');
      console.log('   Command: model.transform(audio, {');
      console.log('     outputFormat: "flac",');
      console.log('     sampleRate: 96000,');
      console.log('     normalize: true,');
      console.log('     denoise: true,');
      console.log('     quality: "lossless"');
      console.log('   })');

      // Example 3: Time-based extraction
      console.log('\n📝 Example 3: Time-based Extraction');
      console.log('   Input: podcast.mp3 (2 hours)');
      console.log('   Output: segment.mp3 (30 seconds from 5:30)');
      console.log('   Command: model.transform(audio, {');
      console.log('     outputFormat: "mp3",');
      console.log('     startTime: 330,  // 5:30 in seconds');
      console.log('     duration: 30,    // 30 seconds');
      console.log('     fadeIn: 1,       // 1 second fade in');
      console.log('     fadeOut: 1       // 1 second fade out');
      console.log('   })');

      // Show quality presets
      console.log('\n⚙️ Quality Presets:');
      const formats = ['mp3', 'wav', 'flac', 'aac'];
      formats.forEach(format => {
        const settings = model.getRecommendedSettings(format);
        console.log(`   - ${format.toUpperCase()}: ${JSON.stringify(settings, null, 2).replace(/\n/g, '\n     ')}`);
      });

      console.log('\n✅ Audio-to-Audio test completed successfully!');

    } catch (error) {
      console.log(`❌ Model creation failed: ${error.message}`);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
if (require.main === module) {
  testFFMPEGAudioToAudio().catch(console.error);
}

export { testFFMPEGAudioToAudio };
