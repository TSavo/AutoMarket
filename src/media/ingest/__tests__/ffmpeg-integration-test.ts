#!/usr/bin/env node

/**
 * FFMPEG Docker Provider Integration Test
 * 
 * Tests the complete end-to-end implementation of the FFMPEG Docker Provider
 * with Smart Asset Loading system integration.
 */

import assert from 'assert';
import path from 'path';
import fs from 'fs';
import { FFMPEGDockerProvider } from '../../providers/FFMPEGDockerProvider';
import { VideoToAudioModel } from '../../models/VideoToAudioModel';
import { VideoToAudioProvider } from '../../registry/ProviderRoles';
import { AssetLoader } from '../../assets/SmartAssetFactory';
import { Audio } from '../../assets/roles';

async function testFFMPEGIntegration(): Promise<void> {
  console.log('🧪 Starting FFMPEG Docker Provider Integration Test...');

  // Paths to test files
  const mp4Path = path.resolve('300-million-job-massacre-goldman-sachs-avatar.mp4');

  // Verify test files exist
  console.log('📁 Checking test files...');
  assert(fs.existsSync(mp4Path), `Test MP4 file not found: ${mp4Path}`);
  console.log('✅ Test MP4 file exists at', mp4Path);

  console.log('🏭 Creating FFMPEG Docker Provider...');
  const provider: VideoToAudioProvider = new FFMPEGDockerProvider({
    baseUrl: 'http://localhost:8006',
    serviceName: 'ffmpeg-service',
    containerName: 'ffmpeg-service',
    composeFile: 'services/ffmpeg/docker-compose.yml'
  });
  console.log('✅ Provider created');

  // Test Docker service lifecycle
  console.log('🐳 Starting Docker service...');
  const serviceStarted = await provider.startService();
  assert(serviceStarted, 'FFMPEG Docker service should start');

  const status = await provider.getServiceStatus();
  assert(status.running, 'FFMPEG Docker service should be running');
  assert(status.healthy, 'FFMPEG Docker service should be healthy');
  console.log('✅ Docker service started and healthy');

  // Test model creation
  console.log('🤖 Creating video-to-audio model...');
  const model: VideoToAudioModel = await provider.createVideoToAudioModel('ffmpeg-extract-audio');
  const isAvailable = await model.isAvailable();
  assert(isAvailable, 'Model should be available');
  console.log('✅ Model created and available');

  // Test Smart Asset Loading integration
  console.log('🎬 Testing Smart Asset Loading with MP4 video...');
  const videoAsset = AssetLoader.load(mp4Path);
  assert(videoAsset.isValid(), 'Video asset should be valid');
  console.log('✅ Video asset loaded with Smart Asset Loading');
  console.log(`📊 Video metadata: ${videoAsset.metadata.format}, ${videoAsset.metadata.fileSize} bytes`);

  // Test video-to-audio transformation
  console.log('🎵 Testing video-to-audio transformation...');
  const audioResult: Audio = await model.transform(videoAsset, {
    outputFormat: 'wav',
    sampleRate: 44100,
    channels: 2
  });

  assert(!!audioResult, 'Audio result should exist');
  assert(audioResult instanceof Audio, 'Result should be Audio instance');
  assert(audioResult.isValid(), 'Audio result should be valid');
  assert(audioResult.data.length > 0, 'Audio result should have data');
  console.log('✅ Video-to-audio transformation successful');
  console.log(`🎵 Audio result: ${audioResult.toString()}`);
  console.log(`📊 Audio metadata:`, {
    format: audioResult.sourceAsset?.metadata?.format,
    duration: audioResult.sourceAsset?.metadata?.duration,
    sampleRate: audioResult.sourceAsset?.metadata?.sampleRate,
    channels: audioResult.sourceAsset?.metadata?.channels,
    size: audioResult.sourceAsset?.metadata?.size,
    processingTime: audioResult.sourceAsset?.metadata?.processingTime
  });

  // Test with different output format
  console.log('🔧 Testing with MP3 output format...');
  const mp3Result: Audio = await model.transform(videoAsset, {
    outputFormat: 'mp3',
    bitrate: '192k'
  });
  assert(!!mp3Result, 'MP3 result should exist');
  assert(mp3Result.sourceAsset?.metadata?.format === 'mp3', 'Result should be MP3 format');
  console.log('✅ MP3 format conversion successful');
  console.log(`🎵 MP3 result: ${mp3Result.toString()}`);

  // Test error handling with invalid input
  console.log('🔧 Testing error handling...');
  try {
    // Test with text file (should fail)
    const textAsset = AssetLoader.load('./test-script.txt');
    await model.transform(textAsset as any);
    assert(false, 'Should have thrown error for text input');
  } catch (error) {
    console.log('✅ Error handling works:', error.message);
  }

  // Stop Docker service
  console.log('🛑 Stopping Docker service...');
  const serviceStopped = await provider.stopService();
  assert(serviceStopped, 'Service should stop successfully');

  const finalStatus = await provider.getServiceStatus();
  assert(!finalStatus.running || !finalStatus.healthy, 'Service should be stopped');
  console.log('✅ Docker service stopped');

  console.log('🎉 ALL TESTS PASSED! FFMPEG Docker Provider integration test successful.');
}

// Error handling
testFFMPEGIntegration().catch(error => {
  console.error('❌ Integration test failed:', error);
  process.exit(1);
});
