/**
 * Provider Architecture Integration Tests
 *
 * Tests the complete Provider → Model → Service → Docker flow
 * Demonstrates the proper separation of concerns and end-to-end functionality.
 */

import { describe, test, expect, beforeAll, afterAll, vi } from 'vitest';
import { WhisperDockerProvider } from '../providers/WhisperDockerProvider';
import { ChatterboxDockerProvider } from '../providers/ChatterboxDockerProvider';
import { ProviderFactory } from '../registry/ProviderFactory';
import { WAVAsset, TextAsset } from '../assets/types';
import { Speech, Text } from '../assets/roles';
import fs from 'fs';
import path from 'path';

// Import integration test setup for real fetch and file system operations
import '../../test/integration-setup';

// NO MOCKS - These are integration tests that hit real services
vi.unmock('form-data');

describe('Provider Architecture Integration Tests (Real Docker Services)', () => {
  let whisperProvider: WhisperDockerProvider;
  let chatterboxProvider: ChatterboxDockerProvider;
  let isWhisperAvailable = false;
  let isChatterboxAvailable = false;
  const testAudioPath = path.join(__dirname, '../../../confusion.wav');

  beforeAll(async () => {
    console.log('🧪 Starting Provider Architecture integration tests...');
    console.log('📁 Test audio file path:', testAudioPath);

    // Create providers
    whisperProvider = new WhisperDockerProvider();
    chatterboxProvider = new ChatterboxDockerProvider();

    // Check if test audio file exists
    if (!fs.existsSync(testAudioPath)) {
      console.log('❌ Test audio file not found at:', testAudioPath);
    } else {
      console.log('✅ Test audio file found:', testAudioPath);
    }

    // Start Whisper Docker service
    console.log('🚀 Starting Whisper Docker service...');
    try {
      const whisperStarted = await whisperProvider.startService();
      if (whisperStarted) {
        console.log('✅ Whisper Docker service started successfully');
        isWhisperAvailable = await whisperProvider.isAvailable();
        console.log('🔍 Whisper service available:', isWhisperAvailable);
      } else {
        console.log('❌ Failed to start Whisper Docker service');
        isWhisperAvailable = false;
      }
    } catch (error) {
      console.log('❌ Whisper service startup failed:', error);
      isWhisperAvailable = false;
    }

    // Start Chatterbox Docker service
    console.log('🚀 Starting Chatterbox Docker service...');
    try {
      const chatterboxStarted = await chatterboxProvider.startService();
      if (chatterboxStarted) {
        console.log('✅ Chatterbox Docker service started successfully');
        isChatterboxAvailable = await chatterboxProvider.isAvailable();
        console.log('🔍 Chatterbox service available:', isChatterboxAvailable);
      } else {
        console.log('❌ Failed to start Chatterbox Docker service');
        isChatterboxAvailable = false;
      }
    } catch (error) {
      console.log('❌ Chatterbox service startup failed:', error);
      isChatterboxAvailable = false;
    }
  }, 180000); // 3 minute timeout for service startup

  afterAll(async () => {
    // Stop services
    try {
      console.log('🛑 Stopping Docker services after integration tests...');
      await Promise.all([
        whisperProvider.stopService(),
        chatterboxProvider.stopService()
      ]);
      console.log('✅ Docker services stopped');
    } catch (error) {
      console.warn('Service stop warning:', error);
    }
  });

  describe('Provider Factory Pattern', () => {
    test('should get providers by role', () => {
      // Test provider role selection
      expect(() => ProviderFactory.getSpeechToTextProvider('whisper-docker')).not.toThrow();
      expect(() => ProviderFactory.getTextToSpeechProvider('chatterbox-docker')).not.toThrow();
    });

    test('should enforce role constraints', () => {
      // Should throw if provider doesn't support the role
      expect(() => ProviderFactory.getSpeechToTextProvider('nonexistent')).toThrow();
      expect(() => ProviderFactory.getTextToSpeechProvider('nonexistent')).toThrow();
    });
  });

  describe('Provider → Model → Service → Docker Flow', () => {
    test('should demonstrate complete Whisper STT flow', async () => {
      if (!isWhisperAvailable || !fs.existsSync(testAudioPath)) {
        console.log('⏭️  Skipping Whisper flow test - service or file not available');
        return;
      }

      console.log('🎵 Testing complete Whisper STT flow...');

      // 1. Provider creates model
      const whisperModel = await whisperProvider.createModel('whisper-stt');
      expect(whisperModel).toBeDefined();
      console.log('✅ Provider created WhisperDockerModel');

      // 2. Load audio as Asset
      const wavAsset = WAVAsset.fromFile(testAudioPath);
      console.log('✅ Created WAVAsset from file');

      // 3. Model transforms speech to text (coordinates Service → Docker)
      const result = await whisperModel.transform(wavAsset);
      
      expect(result).toBeInstanceOf(Text);
      expect(result.content).toBeDefined();
      expect(result.content.length).toBeGreaterThan(0);
      expect(result.sourceAsset).toBe(wavAsset); // Source Asset preserved
      
      console.log('📝 Transcription result:', result.content);
      console.log('🌍 Detected language:', result.language);
      console.log('📊 Confidence:', result.getConfidence());
      console.log('✅ Complete Whisper STT flow successful');
    }, 60000);

    test('should demonstrate complete Chatterbox TTS flow', async () => {
      if (!isChatterboxAvailable) {
        console.log('⏭️  Skipping Chatterbox flow test - service not available');
        return;
      }

      console.log('🗣️  Testing complete Chatterbox TTS flow...');

      // 1. Provider creates model
      const chatterboxModel = await chatterboxProvider.createModel('chatterbox-tts');
      expect(chatterboxModel).toBeDefined();
      console.log('✅ Provider created ChatterboxDockerModel');

      // 2. Create text as Asset
      const textAsset = TextAsset.fromString('Hello from the provider architecture!', { language: 'en' });
      console.log('✅ Created TextAsset');

      // 3. Model transforms text to speech (coordinates Service → Docker)
      const result = await chatterboxModel.transform(textAsset);
      
      expect(result).toBeInstanceOf(Speech);
      expect(result.data).toBeDefined();
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.sourceAsset).toBe(textAsset); // Source Asset preserved
      
      console.log('🎵 Generated speech duration:', result.metadata?.duration);
      console.log('🗣️  Voice used:', result.speaker);
      console.log('✅ Complete Chatterbox TTS flow successful');
    }, 60000);

    test('should demonstrate Speech → Text → Speech pipeline', async () => {
      if (!isWhisperAvailable || !isChatterboxAvailable || !fs.existsSync(testAudioPath)) {
        console.log('⏭️  Skipping pipeline test - services or file not available');
        return;
      }

      console.log('🔄 Testing complete Speech → Text → Speech pipeline...');

      // 1. Get models from providers
      const whisperModel = await whisperProvider.createModel('whisper-stt');
      const chatterboxModel = await chatterboxProvider.createModel('chatterbox-tts');

      // 2. Load original audio
      const originalAudio = WAVAsset.fromFile(testAudioPath);
      console.log('✅ Loaded original audio');

      // 3. Speech → Text (Whisper)
      const transcribedText = await whisperModel.transform(originalAudio);
      expect(transcribedText).toBeInstanceOf(Text);
      expect(transcribedText.sourceAsset).toBe(originalAudio);
      console.log('📝 Transcribed text:', transcribedText.content);

      // 4. Text → Speech (Chatterbox)
      const synthesizedSpeech = await chatterboxModel.transform(transcribedText);
      expect(synthesizedSpeech).toBeInstanceOf(Speech);
      expect(synthesizedSpeech.sourceAsset).toBe(originalAudio); // Original Asset preserved through chain!
      console.log('🎵 Synthesized speech duration:', synthesizedSpeech.metadata?.duration);

      // 5. Verify Asset chain preservation
      expect(synthesizedSpeech.sourceAsset).toBe(originalAudio);
      if (synthesizedSpeech.sourceAsset && 'asAudio' in synthesizedSpeech.sourceAsset) {
        const originalAudioRole = synthesizedSpeech.sourceAsset.asAudio();
        expect(originalAudioRole.format).toBe('wav');
      }

      console.log('✅ Complete pipeline with Asset chain preservation successful');
    }, 120000);
  });

  describe('Provider Service Management', () => {
    test('should manage Whisper service lifecycle', async () => {
      // Test service status
      const status = await whisperProvider.getServiceStatus();
      expect(status).toHaveProperty('running');
      expect(status).toHaveProperty('healthy');
      console.log('📊 Whisper service status:', status);

      // Test availability
      const available = await whisperProvider.isAvailable();
      expect(typeof available).toBe('boolean');
      console.log('🔍 Whisper provider available:', available);
    });

    test('should manage Chatterbox service lifecycle', async () => {
      // Test service status
      const status = await chatterboxProvider.getServiceStatus();
      expect(status).toHaveProperty('running');
      expect(status).toHaveProperty('healthy');
      console.log('📊 Chatterbox service status:', status);

      // Test availability
      const available = await chatterboxProvider.isAvailable();
      expect(typeof available).toBe('boolean');
      console.log('🔍 Chatterbox provider available:', available);
    });

    test('should provide correct model information', async () => {
      // Test Whisper provider info
      const whisperInfo = whisperProvider.getInfo();
      expect(whisperInfo.description).toContain('Whisper STT');
      expect(whisperInfo.capabilities).toContain('speech-to-text');

      // Test Chatterbox provider info
      const chatterboxInfo = chatterboxProvider.getInfo();
      expect(chatterboxInfo.description).toContain('Chatterbox TTS');
      expect(chatterboxInfo.capabilities).toContain('text-to-speech');

      console.log('📋 Provider info verified');
    });
  });

  describe('Architecture Validation', () => {
    test('should demonstrate clean separation of concerns', async () => {
      if (!isWhisperAvailable) {
        console.log('⏭️  Skipping architecture test - Whisper not available');
        return;
      }

      // 1. Provider manages infrastructure
      expect(typeof whisperProvider.startService).toBe('function');
      expect(typeof whisperProvider.stopService).toBe('function');
      expect(typeof whisperProvider.getServiceStatus).toBe('function');

      // 2. Provider creates models
      const model = await whisperProvider.createModel('whisper-stt');
      expect(model).toBeDefined();

      // 3. Model handles transformation (no infrastructure concerns)
      expect(typeof model.transform).toBe('function');
      expect(typeof model.isAvailable).toBe('function');

      // 4. Model can access services for advanced operations
      expect(typeof model.getDockerService).toBe('function');
      expect(typeof model.getAPIClient).toBe('function');

      console.log('✅ Clean separation of concerns validated');
    });

    test('should demonstrate provider role flexibility', () => {
      // Providers can support multiple models
      const whisperModels = whisperProvider.getAvailableModels();
      expect(Array.isArray(whisperModels)).toBe(true);
      expect(whisperModels.length).toBeGreaterThan(0);

      const chatterboxModels = chatterboxProvider.getAvailableModels();
      expect(Array.isArray(chatterboxModels)).toBe(true);
      expect(chatterboxModels.length).toBeGreaterThan(0);

      console.log('🎭 Provider role flexibility validated');
    });
  });
});
