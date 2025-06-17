/**
 * Unit Tests for WhisperSTTService MediaTransformer Interface
 *
 * These tests use mocks and focus on testing the interface logic,
 * validation, and error handling without hitting real services.
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { WhisperSTTService } from '../WhisperSTTService';
import { createMediaInput } from '../../types/MediaTransformer';
import fs from 'fs';

// Mock all external dependencies for unit testing
vi.mock('node-fetch');
vi.mock('child_process');
vi.mock('fs');

describe('WhisperSTTService Unit Tests (Mocked)', () => {
  let whisperService: WhisperSTTService;

  beforeEach(() => {
    whisperService = new WhisperSTTService();
    vi.clearAllMocks();
  });

  describe('MediaTransformer Interface', () => {
    test('should have correct transformer properties', () => {
      expect(whisperService.id).toBe('whisper');
      expect(whisperService.name).toBe('Whisper STT');
      expect(whisperService.type).toBe('local');
      expect(whisperService.transforms).toHaveLength(1);
      expect(whisperService.transforms[0].input).toBe('audio');
      expect(whisperService.transforms[0].output).toBe('text');
    });

    test('should return correct transformer info', () => {
      const info = whisperService.getInfo();
      expect(info.id).toBe('whisper');
      expect(info.name).toBe('Whisper STT');
      expect(info.type).toBe('local');
      expect(info.transforms).toHaveLength(1);
      expect(info.status).toBe('unknown');
    });

    test('should transform audio to text successfully', async () => {
      // Mock file existence
      (fs.existsSync as any).mockReturnValue(true);

      // Mock successful transcription
      const mockTranscribeAudio = vi.spyOn(whisperService, 'transcribeAudio');
      mockTranscribeAudio.mockResolvedValue({
        success: true,
        text: 'Hello world',
        confidence: 0.95,
        language: 'en',
        wordTimestamps: [],
        processingTime: 1000,
        metadata: { duration: 5.0 }
      });

      const input = createMediaInput('audio', '/path/to/test.wav');
      const result = await whisperService.transform(input, 'text');

      expect(result.type).toBe('text');
      expect(result.data).toBe('Hello world');
      expect(result.metadata?.confidence).toBe(0.95);
      expect(result.metadata?.language).toBe('en');
    });

    test('should reject invalid input type', async () => {
      const input = createMediaInput('image', '/path/to/test.jpg');

      await expect(whisperService.transform(input, 'text'))
        .rejects.toThrow('WhisperSTTService only supports audio input, received: image');
    });

    test('should reject invalid output type', async () => {
      const input = createMediaInput('audio', '/path/to/test.wav');

      await expect(whisperService.transform(input, 'image' as any))
        .rejects.toThrow('WhisperSTTService only outputs text, requested: image');
    });
  });

  describe('Transform Interface Error Handling', () => {
    test('should handle transcription failure', async () => {
      // Mock file existence
      (fs.existsSync as any).mockReturnValue(true);

      // Mock failed transcription
      const mockTranscribeAudio = vi.spyOn(whisperService, 'transcribeAudio');
      mockTranscribeAudio.mockResolvedValue({
        success: false,
        text: '',
        confidence: 0,
        language: '',
        wordTimestamps: [],
        processingTime: 0,
        error: 'Transcription failed'
      });

      const input = createMediaInput('audio', '/path/to/test.wav');

      await expect(whisperService.transform(input, 'text'))
        .rejects.toThrow('Whisper transformation failed: Transcription failed');
    });

    test('should handle buffer input (not yet supported)', async () => {
      const input = createMediaInput('audio', Buffer.from('fake audio data'));

      await expect(whisperService.transform(input, 'text'))
        .rejects.toThrow('Buffer input not yet supported - please provide file path as string');
    });
  });


});
