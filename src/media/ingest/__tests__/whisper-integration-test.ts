#!/usr/bin/env node

/**
 * Quick and Dirty Whisper Integration Test
 * 
 * Tests the complete Whisper STT pipeline with real Docker service.
 * No Vitest, no environment issues - just pure Node.js + TypeScript + assertions.
 */

import fs from 'fs';
import path from 'path';
import { WhisperDockerProvider } from '../../providers/WhisperDockerProvider';
import { Audio, Video, Text } from '../../assets/roles';
import { AssetLoader } from '../../assets/SmartAssetFactory';
import { SpeechToTextModel } from '../../models/SpeechToTextModel';
import { SpeechToTextProvider } from '../../registry/ProviderRoles';

// Simple assertion helper
function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ ${message}`);
}

async function runIntegrationTest(): Promise<void> {
  console.log('🧪 Starting Whisper STT Integration Test...\n');

  try {
    console.log('📦 Modules imported successfully');

    // Check if test files exist
    const wavPath: string = path.join(process.cwd(), 'confusion.wav');
    const mp3Path: string = path.join(process.cwd(), 'debug-test.mp3');
    const mp4Path: string = path.join(process.cwd(), '300-million-job-massacre-goldman-sachs-avatar.mp4');

    assert(fs.existsSync(wavPath), `Test WAV file exists at ${wavPath}`);
    assert(fs.existsSync(mp3Path), `Test MP3 file exists at ${mp3Path}`);
    assert(fs.existsSync(mp4Path), `Test MP4 file exists at ${mp4Path}`);

    // Create provider
    const provider: SpeechToTextProvider = new WhisperDockerProvider();
    console.log('🏭 Provider created');

    // Start Docker service
    console.log('🐳 Starting Docker service...');
    await provider.startService();
    console.log('✅ Docker service started');

    // Check service status
    const status = await provider.getServiceStatus();
    assert(status.running, 'Docker service is running');
    assert(status.healthy, 'Docker service is healthy');
    console.log('📊 Service status verified');

    // Create model
    const model: SpeechToTextModel = await provider.createSpeechToTextModel('whisper-stt');
    console.log('🤖 Model created');

    // Check model availability
    const isAvailable: boolean = await model.isAvailable();
    assert(isAvailable, 'Model is available');

    // Test 1: WAV Audio file - this is the clean interface!
    console.log('🎵 Testing WAV Audio...');
    const wavAudio: Audio = Audio.fromFile(wavPath);
    assert(wavAudio.isValid(), 'WAV Audio is valid');

    const wavResult: Text = await model.transform(wavAudio);
    assert(!!wavResult, 'WAV transcription result exists');
    assert(!!wavResult.content, 'WAV result has content property');
    assert(typeof wavResult.content === 'string', 'WAV result content is a string');
    assert(wavResult.content.length > 0, 'WAV result content is not empty');
    console.log(`� WAV result: "${wavResult.content.substring(0, 100)}..."`);

    // Test 2: MP3 Audio file - same clean interface!
    console.log('🎵 Testing MP3 Audio...');
    const mp3Audio: Audio = Audio.fromFile(mp3Path);
    assert(mp3Audio.isValid(), 'MP3 Audio is valid');

    const mp3Result: Text = await model.transform(mp3Audio);
    assert(!!mp3Result, 'MP3 transcription result exists');
    assert(!!mp3Result.content, 'MP3 result has content property');
    assert(typeof mp3Result.content === 'string', 'MP3 result content is a string');
    assert(mp3Result.content.length > 0, 'MP3 result content is not empty');
    console.log(`📝 MP3 result: "${mp3Result.content.substring(0, 100)}..."`);

    // Test 3: MP4 Video file - smart asset loading with automatic role detection!
    console.log('🎬 Testing MP4 Video...');
    const mp4Video = AssetLoader.load(mp4Path); // Smart asset loading with auto role detection
    assert(mp4Video.isValid(), 'MP4 Video is valid');

    const mp4Result: Text = await model.transform(mp4Video);
    assert(!!mp4Result, 'MP4 transcription result exists');
    assert(!!mp4Result.content, 'MP4 result has content property');
    assert(typeof mp4Result.content === 'string', 'MP4 result content is a string');
    assert(mp4Result.content.length > 0, 'MP4 result content is not empty');
    console.log(`📝 MP4 result: "${mp4Result.content.substring(0, 100)}..."`);

    // Test with options on MP3
    console.log('🔧 Testing MP3 with custom options...');
    const mp3OptionsResult: Text = await model.transform(mp3Audio, {
      task: 'transcribe',
      language: 'en'
    });

    assert(!!mp3OptionsResult, 'MP3 transcription with options works');
    assert(!!mp3OptionsResult.content, 'MP3 options result has content');
    console.log(`📝 MP3 options result: "${mp3OptionsResult.content.substring(0, 100)}..."`);

    // Stop Docker service
    console.log('🛑 Stopping Docker service...');
    await provider.stopService();
    console.log('✅ Docker service stopped');

    // Final verification
    const finalStatus: { running: boolean; healthy: boolean; error?: string } = await provider.getServiceStatus();
    assert(!finalStatus.running || !finalStatus.healthy, 'Service is stopped');

    console.log('\n🎉 ALL TESTS PASSED! Integration test successful.');
    
  } catch (error) {
    console.error('\n💥 TEST FAILED:', (error as Error).message);
    console.error((error as Error).stack);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  runIntegrationTest().catch(error => {
    console.error('💥 Unhandled error:', error);
    process.exit(1);
  });
}

export { runIntegrationTest };
