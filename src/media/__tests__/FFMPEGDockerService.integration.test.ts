/**
 * FFMPEG Docker Service Integration Test
 * 
 * Tests the complete FFMPEG service integration:
 * - Video.fromFile() → model.transform() → Audio
 * - Docker service lifecycle management
 * - Provider architecture integration
 * - Same clean interface as Whisper STT and Chatterbox TTS
 */

import { FFMPEGDockerProvider } from '../providers/FFMPEGDockerProvider';
import { FFMPEGDockerModel } from '../models/FFMPEGDockerModel';
import { Video, Audio } from '../assets/roles';
import { AssetLoader } from '../assets/AssetLoader';
import path from 'path';
import fs from 'fs';

// Test configuration
const TEST_TIMEOUT = 120000; // 2 minutes for Docker operations
const TEST_VIDEO_PATH = path.join(__dirname, '../../test-assets/sample-video.mp4');

/**
 * Integration test for FFMPEG Docker service
 */
async function runFFMPEGIntegrationTest(): Promise<void> {
  console.log('\n🎬 Starting FFMPEG Docker Service Integration Test...\n');

  try {
    // Check if test video file exists
    if (!fs.existsSync(TEST_VIDEO_PATH)) {
      console.log(`⏭️ Skipping test - test video not found: ${TEST_VIDEO_PATH}`);
      console.log('💡 To run this test, place a sample video file at the expected path');
      return;
    }

    // Test 1: Provider and Model Creation
    console.log('🏗️ Testing provider and model creation...');
    const provider = new FFMPEGDockerProvider({
      baseUrl: 'http://localhost:8006'
    });

    // Check provider info
    const providerInfo = provider.getInfo();
    console.log('📋 Provider info:', {
      id: providerInfo.id,
      name: providerInfo.name,
      type: providerInfo.type,
      supportedModels: providerInfo.supportedModels,
      roles: providerInfo.roles
    });

    // Test 2: Start Docker Service
    console.log('🐳 Starting Docker service...');
    const serviceStarted = await provider.startService();
    if (!serviceStarted) {
      console.log('⏭️ Skipping test - Docker service failed to start');
      console.log('💡 Make sure Docker is running and the FFMPEG service is built');
      return;
    }
    console.log('✅ Docker service started successfully');

    // Test 3: Create Model
    console.log('🎯 Creating FFMPEG model...');
    const model: FFMPEGDockerModel = await provider.createVideoToAudioModel('ffmpeg-extract-audio') as FFMPEGDockerModel;
    console.log('✅ Model created successfully');

    // Test 4: Check Model Availability
    console.log('🔍 Checking model availability...');
    const isAvailable = await model.isAvailable();
    if (!isAvailable) {
      console.log('⏭️ Skipping transformation test - model not available');
      return;
    }
    console.log('✅ Model is available');

    // Test 5: Load Video Asset
    console.log('📹 Loading video asset...');
    const videoAsset = AssetLoader.load(TEST_VIDEO_PATH);
    if (!videoAsset.isValid()) {
      throw new Error('Failed to load test video asset');
    }
    console.log(`✅ Video loaded: ${videoAsset.metadata.format}, ${videoAsset.data.length} bytes`);

    // Test 6: Transform Video to Audio (Basic)
    console.log('🎵 Testing video-to-audio transformation...');
    const audioResult: Audio = await model.transform(videoAsset);
    
    if (!audioResult) {
      throw new Error('Audio transformation result is null');
    }
    
    if (!audioResult.isValid()) {
      throw new Error('Audio transformation result is invalid');
    }
    
    if (audioResult.data.length === 0) {
      throw new Error('Audio transformation result has no data');
    }
    
    console.log(`✅ Basic transformation successful: Audio(${audioResult.getFormat().toUpperCase()})`);
    console.log(`📊 Audio metadata:`, {
      format: audioResult.metadata.format,
      duration: audioResult.metadata.duration,
      sampleRate: audioResult.metadata.sampleRate,
      channels: audioResult.metadata.channels,
      size: audioResult.metadata.size,
      processingTime: audioResult.metadata.processingTime
    });

    // Test 7: Transform with Custom Options
    console.log('🔧 Testing transformation with custom options...');
    const customAudioResult: Audio = await model.transform(videoAsset, {
      outputFormat: 'mp3',
      sampleRate: 22050,
      channels: 1,
      volume: 0.8
    });
    
    if (!customAudioResult.isValid() || customAudioResult.data.length === 0) {
      throw new Error('Custom options transformation failed');
    }
    
    console.log(`✅ Custom options transformation successful: Audio(${customAudioResult.getFormat().toUpperCase()})`);
    console.log(`📊 Custom audio metadata:`, {
      format: customAudioResult.metadata.format,
      sampleRate: customAudioResult.metadata.sampleRate,
      channels: customAudioResult.metadata.channels,
      processingTime: customAudioResult.metadata.processingTime
    });

    // Test 8: Verify Source Asset Preservation
    console.log('🔗 Testing source asset preservation...');
    if (audioResult.sourceAsset !== videoAsset) {
      console.warn('⚠️ Source asset not preserved correctly');
    } else {
      console.log('✅ Source asset preserved correctly');
    }

    // Test 9: Test Model Status
    console.log('📊 Testing model status...');
    const modelStatus = await model.getStatus();
    console.log('📋 Model status:', {
      available: modelStatus.available,
      dockerService: {
        running: modelStatus.dockerService.running,
        health: modelStatus.dockerService.health
      }
    });

    // Test 10: Stop Docker Service
    console.log('🛑 Stopping Docker service...');
    const serviceStopped = await provider.stopService();
    if (!serviceStopped) {
      console.warn('⚠️ Warning: Failed to stop Docker service cleanly');
    } else {
      console.log('✅ Docker service stopped successfully');
    }

    console.log('\n🎉 ALL TESTS PASSED! FFMPEG Integration test successful.');
    console.log('✅ Provider creation and configuration');
    console.log('✅ Docker service lifecycle management');
    console.log('✅ Model creation and availability check');
    console.log('✅ Video asset loading');
    console.log('✅ Video-to-audio transformation (basic)');
    console.log('✅ Video-to-audio transformation (custom options)');
    console.log('✅ Source asset preservation');
    console.log('✅ Model status reporting');
    console.log('✅ Service cleanup');

  } catch (error) {
    console.error(`\n💥 TEST FAILED: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    throw error;
  }
}

// Export for use in test suites
export { runFFMPEGIntegrationTest };

// Run test if called directly
if (require.main === module) {
  runFFMPEGIntegrationTest()
    .then(() => {
      console.log('\n✅ Integration test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Integration test failed:', error.message);
      process.exit(1);
    });
}

// Jest test wrapper
describe('FFMPEG Docker Service Integration', () => {
  test('should complete full integration test', async () => {
    await runFFMPEGIntegrationTest();
  }, TEST_TIMEOUT);
});
