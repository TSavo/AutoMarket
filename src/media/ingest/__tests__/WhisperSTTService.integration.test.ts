/**
 * Integration Tests for WhisperSTTService
 *
 * These tests hit the REAL Whisper Docker service and transcribe actual audio.
 * Requires: docker run -d -p 9000:9000 onerahmet/openai-whisper-asr-webservice:latest
 *
 * Tests will be skipped if Docker container is not running.
 */

import { describe, test, expect, beforeAll, vi } from 'vitest';
import { WhisperSTTService } from '../WhisperSTTService';
import { createMediaInput } from '../../types/MediaTransformer';
import fs from 'fs';
import path from 'path';

// Import integration test setup for real fetch and file system operations
import '../../../test/integration-setup';

// NO MOCKS - These are integration tests that hit real services
// Additional unmocks for safety (integration-setup already handles most)
vi.unmock('form-data');

describe('WhisperSTTService Integration Tests (Real Docker Service)', () => {
  let whisperService: WhisperSTTService;
  let isWhisperAvailable = false;
  const testAudioPath = path.join(__dirname, '../../../../confusion.wav');

  beforeAll(async () => {
    whisperService = new WhisperSTTService();

    // Check if test audio file exists
    if (!fs.existsSync(testAudioPath)) {
      console.log('❌ Test audio file not found at:', testAudioPath);
    } else {
      console.log('✅ Test audio file found:', testAudioPath);
    }

    // Check if Whisper service is available
    try {
      isWhisperAvailable = await whisperService.isAvailable();
      console.log('🔍 Whisper Docker service available:', isWhisperAvailable);

      if (!isWhisperAvailable) {
        console.log('💡 To start Whisper: docker run -d -p 9000:9000 onerahmet/openai-whisper-asr-webservice:latest');
      }
    } catch (error) {
      console.log('❌ Whisper service check failed:', error);
      isWhisperAvailable = false;
    }
  });

  describe('Service Availability', () => {
    test('should check if Whisper service is available', async () => {
      const available = await whisperService.isAvailable();
      expect(typeof available).toBe('boolean');
      
      if (available) {
        console.log('✅ Whisper service is running and available');
      } else {
        console.log('❌ Whisper service is not available - Docker container may not be running');
      }
    });

    test('should have correct MediaTransformer properties', () => {
      expect(whisperService.id).toBe('whisper');
      expect(whisperService.name).toBe('Whisper STT');
      expect(whisperService.type).toBe('local');
      expect(whisperService.transforms).toHaveLength(1);
      expect(whisperService.transforms[0].input).toBe('audio');
      expect(whisperService.transforms[0].output).toBe('text');
    });
  });

  describe('MediaTransformer Interface', () => {
    test('should validate input/output types correctly', async () => {
      // Test invalid input type
      const invalidInput = createMediaInput('image', '/path/to/image.jpg');
      await expect(whisperService.transform(invalidInput, 'text'))
        .rejects.toThrow('WhisperSTTService only supports audio input, received: image');

      // Test invalid output type
      const validInput = createMediaInput('audio', '/path/to/audio.wav');
      await expect(whisperService.transform(validInput, 'image' as any))
        .rejects.toThrow('WhisperSTTService only outputs text, requested: image');
    });

    test('should handle missing audio file', async () => {
      const input = createMediaInput('audio', '/nonexistent/file.wav');
      
      await expect(whisperService.transform(input, 'text'))
        .rejects.toThrow();
    });

    test('should handle buffer input (not yet supported)', async () => {
      const audioBuffer = Buffer.from('fake audio data');
      const input = createMediaInput('audio', audioBuffer);
      
      await expect(whisperService.transform(input, 'text'))
        .rejects.toThrow('Buffer input not yet supported');
    });
  });

  describe('Real Whisper Service Tests', () => {
    test('should transcribe confusion.wav using MediaTransformer interface', async () => {
      if (!isWhisperAvailable) {
        console.log('⏭️ Skipping - Whisper service not available');
        return;
      }

      if (!fs.existsSync(testAudioPath)) {
        console.log('⏭️ Skipping - Test audio file not found');
        return;
      }

      const input = createMediaInput('audio', testAudioPath);
      const result = await whisperService.transform(input, 'text');

      expect(result.type).toBe('text');
      expect(typeof result.data).toBe('string');
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.metadata?.service).toBe('whisper');
      expect(result.metadata?.confidence).toBeGreaterThan(0);
      
      console.log('✅ Transcription result:', result.data);
      console.log('✅ Confidence:', result.metadata?.confidence);
    });

    test('should handle invalid audio file gracefully', async () => {
      if (!isWhisperAvailable) {
        console.log('⏭️ Skipping - Whisper service not available');
        return;
      }

      // Test with an invalid file that exists but isn't audio
      const invalidAudioPath = path.join(__dirname, '../WhisperSTTService.ts');
      const input = createMediaInput('audio', invalidAudioPath);

      await expect(whisperService.transform(input, 'text'))
        .rejects.toThrow();
    });
  });



  describe('Performance', () => {
    test('should respond to availability check quickly', async () => {
      const startTime = Date.now();
      await whisperService.isAvailable();
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(5000); // Should respond within 5 seconds
      console.log(`⏱️ Availability check took: ${duration}ms`);
    });
  });
});
