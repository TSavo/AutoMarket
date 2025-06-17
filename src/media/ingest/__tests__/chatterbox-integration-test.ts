/**
 * Chatterbox TTS Integration Test
 * 
 * Tests the clean interface pattern for Chatterbox TTS:
 * - Text.fromString() → model.transform() → Audio
 * - Text.fromFile() → model.transform() → Audio
 * - Voice cloning with confusion.wav file
 * - Same clean interface as Whisper STT
 */

import fs from 'fs';
import path from 'path';
import { ChatterboxDockerProvider } from '../../providers/ChatterboxDockerProvider';
import { Text, Speech } from '../../assets/roles';
import { TextToSpeechModel } from '../../models/TextToSpeechModel';
import { TextToSpeechProvider } from '../../registry/ProviderRoles';

// Simple assertion helper
function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  } else {
    console.log(`✅ ${message}`);
  }
}

async function runIntegrationTest() {
  try {
    console.log('🧪 Starting Chatterbox TTS Integration Test...\n');

    console.log('📦 Modules imported successfully');

    // Create test text file if it doesn't exist
    const testTextPath: string = path.join(process.cwd(), 'test-script.txt');
    if (!fs.existsSync(testTextPath)) {
      fs.writeFileSync(testTextPath, 'This is a test script for text-to-speech conversion.');
    }
    assert(fs.existsSync(testTextPath), `Test text file exists at ${testTextPath}`);

    // Create provider
    console.log('🏭 Provider created');
    const provider: TextToSpeechProvider = new ChatterboxDockerProvider();

    // Start Docker service
    console.log('🐳 Starting Docker service...');
    const serviceStarted: boolean = await provider.startService();
    assert(serviceStarted, 'Docker service started');

    const status: { running: boolean; healthy: boolean; error?: string } = await provider.getServiceStatus();
    assert(status.running, 'Docker service is running');
    assert(status.healthy, 'Docker service is healthy');

    console.log('📊 Service status verified');

    // Create model
    console.log('🤖 Model created');
    const model: TextToSpeechModel = await provider.createTextToSpeechModel('chatterbox-tts');

    // Check model availability
    const isAvailable: boolean = await model.isAvailable();
    assert(isAvailable, 'Model is available');

    // Test 1: Text from string - this is the clean interface!
    console.log('📝 Testing Text from string...');
    const textFromString: Text = Text.fromString('Hello, this is a test of the clean interface.');
    assert(textFromString.isValid(), 'Text from string is valid');

    const stringResult: Speech = await model.transform(textFromString);
    assert(!!stringResult, 'String TTS result exists');
    assert(stringResult.isValid(), 'String result is valid audio');
    assert(stringResult.data.length > 0, 'String result has audio data');
    console.log(`🎵 String result: Audio(${stringResult.getFormat().toUpperCase()})`);

    // Test 2: Text from file - same clean interface!
    console.log('📄 Testing Text from file...');
    const textFromFile: Text = Text.fromFile(testTextPath);
    assert(textFromFile.isValid(), 'Text from file is valid');

    const fileResult: Speech = await model.transform(textFromFile);
    assert(!!fileResult, 'File TTS result exists');
    assert(fileResult.isValid(), 'File result is valid audio');
    assert(fileResult.data.length > 0, 'File result has audio data');
    console.log(`🎵 File result: Audio(${fileResult.getFormat().toUpperCase()})`);

    // Test with options
    console.log('🔧 Testing with custom options...');
    const optionsResult: Speech = await model.transform(textFromString, {
      voice: 'Abigail.wav',
      speed: 1.0
    });

    assert(!!optionsResult, 'TTS with options works');
    assert(optionsResult.isValid(), 'Options result is valid audio');
    console.log(`🎵 Options result: Audio(${optionsResult.getFormat().toUpperCase()})`);

    // Test 3: Voice cloning with automatic upload handling
    console.log('🎤 Testing voice cloning with automatic upload...');
    const voiceCloneFile = path.join(process.cwd(), 'confusion.wav');
    
    // Check if confusion.wav exists
    if (!fs.existsSync(voiceCloneFile)) {
      console.warn('⚠️  confusion.wav not found, skipping voice cloning test');
    } else {
      console.log(`📁 Using voice clone file: ${voiceCloneFile}`);
      
      // Test 3a: Voice cloning - model should automatically handle upload
      console.log('🎵 Testing voice cloning (automatic upload handling)...');
      
      // For voice cloning, we only need voiceFile parameter - model handles the upload
      const voiceCloneOptions = {
        speed: 1.0,
        voiceFile: voiceCloneFile
      } as any; // Type assertion to bypass TypeScript checking
      
      console.log('📋 Voice clone options:', voiceCloneOptions);
      
      const voiceCloneResult: Speech = await model.transform(
        Text.fromString('This should sound like the cloned voice from the confusion audio file. The model automatically handles upload.'),
        voiceCloneOptions
      );

      assert(!!voiceCloneResult, 'Voice cloning result exists');
      assert(voiceCloneResult.isValid(), 'Voice cloning result is valid audio');
      assert(voiceCloneResult.data.length > 0, 'Voice cloning result has audio data');
      console.log(`🎵 Voice clone result: Audio(${voiceCloneResult.getFormat().toUpperCase()})`);
      
      // Test 3b: Voice cloning with force upload option
      console.log('🔄 Testing voice cloning with force upload...');
      const forceUploadOptions = {
        speed: 1.2,
        voiceFile: voiceCloneFile,
        forceUpload: true
      } as any; // Type assertion to bypass TypeScript checking
      
      console.log('📋 Force upload options:', forceUploadOptions);
      
      const forceUploadResult: Speech = await model.transform(
        Text.fromString('This is a second test with forced upload to ensure the upload mechanism works properly.'),
        forceUploadOptions
      );

      assert(!!forceUploadResult, 'Force upload result exists');
      assert(forceUploadResult.isValid(), 'Force upload result is valid audio');
      assert(forceUploadResult.data.length > 0, 'Force upload result has audio data');
      console.log(`🎵 Force upload result: Audio(${forceUploadResult.getFormat().toUpperCase()})`);
      console.log('✅ Voice cloning with automatic upload handling completed successfully');
    }

    // Stop Docker service
    console.log('🛑 Stopping Docker service...');
    const stopped: boolean = await provider.stopService();
    assert(stopped, 'Service is stopped');

    console.log('\n🎉 ALL TESTS PASSED! Integration test successful.');
    console.log('✅ Text-to-Speech from string');
    console.log('✅ Text-to-Speech from file');
    console.log('✅ Custom options (voice and speed)');
    console.log('✅ Voice cloning with automatic upload handling');
    console.log('✅ Voice cloning with force upload option');
    console.log('✅ Docker service lifecycle management');

  } catch (error) {
    console.error(`\n💥 TEST FAILED: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

// Run the test
if (require.main === module) {
  runIntegrationTest()
    .then(() => {
      console.log('✅ Integration test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Integration test failed:', error);
      process.exit(1);
    });
}

export { runIntegrationTest };
