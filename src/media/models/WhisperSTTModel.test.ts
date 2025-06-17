/**
 * Unit Tests for WhisperSTTModel with Asset-Role System
 *
 * Tests the new Asset-based architecture with automatic role casting
 * and source Asset preservation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WhisperSTTModel } from './WhisperSTTModel';
import { MP3Asset, MP4Asset, WAVAsset } from '../assets/types';
import { Speech, Text } from '../assets/roles';
import { SpeechToTextOptions } from './SpeechToTextModel';
import { WhisperAPIClient } from '../clients/WhisperAPIClient';
import { WhisperDockerService } from '../services/WhisperDockerService';

// Mock dependencies
vi.mock('../clients/WhisperAPIClient');
vi.mock('../services/WhisperDockerService');
vi.mock('fs');

describe('WhisperSTTModel', () => {
  let model: WhisperSTTModel;
  let mockApiClient: vi.Mocked<WhisperAPIClient>;
  let mockDockerService: vi.Mocked<WhisperDockerService>;
  let mockAudioData: Buffer;

  beforeEach(() => {
    mockAudioData = Buffer.from('fake audio data');
    
    // Create mocked instances
    mockApiClient = {
      createTranscriptionRequest: vi.fn(),
      transcribeAudio: vi.fn(),
      checkHealth: vi.fn()
    } as any;

    mockDockerService = {
      startService: vi.fn().mockResolvedValue(true),
      stopService: vi.fn().mockResolvedValue(true),
      isServiceHealthy: vi.fn().mockResolvedValue(true),
      getServiceStatus: vi.fn().mockResolvedValue({ running: true, health: 'healthy' }),
      waitForHealthy: vi.fn().mockResolvedValue(true)
    } as any;

    // Create model with mocked dependencies
    model = new WhisperSTTModel({
      id: 'whisper-stt',
      name: 'Whisper STT',
      version: '1.0.0',
      provider: 'docker',
      capabilities: ['speech-to-text'],
      inputTypes: ['speech'],
      outputTypes: ['text']
    });

    // Inject mocked dependencies
    (model as any).apiClient = mockApiClient;
    (model as any).dockerService = mockDockerService;

    vi.clearAllMocks();
  });

  describe('Asset-Role Input Handling', () => {
    it('should accept MP3Asset with Speech role', async () => {
      const mp3Asset = new MP3Asset(mockAudioData, { language: 'en' });
      
      // Mock successful transcription with small delay
      mockApiClient.transcribeAudio.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 10)); // Small delay for processing time
        return {
          text: 'Hello world',
          confidence: 0.95,
          language: 'en',
          segments: [],
          duration: 5.0
        };
      });

      const result = await model.transform(mp3Asset);

      expect(result).toBeInstanceOf(Text);
      expect(result.content).toBe('Hello world');
      expect(result.language).toBe('en');
      expect(result.getConfidence()).toBe(0.95);
      expect(result.sourceAsset).toBe(mp3Asset); // Source Asset preserved
    });

    it('should accept MP4Asset with Speech role', async () => {
      const mp4Asset = new MP4Asset(mockAudioData, { 
        language: 'es',
        width: 1920,
        height: 1080
      });
      
      mockApiClient.transcribeAudio.mockResolvedValue({
        text: 'Hola mundo',
        confidence: 0.92,
        language: 'es',
        segments: [],
        duration: 3.0
      });

      const result = await model.transform(mp4Asset);

      expect(result).toBeInstanceOf(Text);
      expect(result.content).toBe('Hola mundo');
      expect(result.language).toBe('es');
      expect(result.sourceAsset).toBe(mp4Asset); // Source Asset preserved
      
      // Can still access video capabilities through sourceAsset
      if (result.sourceAsset && 'asVideo' in result.sourceAsset) {
        const video = result.sourceAsset.asVideo();
        expect(video.getDimensions()).toEqual({ width: 1920, height: 1080 });
      }
    });

    it('should accept direct Speech object', async () => {
      const speech = new Speech(mockAudioData, 'fr', 'speaker1');
      
      mockApiClient.transcribeAudio.mockResolvedValue({
        text: 'Bonjour le monde',
        confidence: 0.88,
        language: 'fr',
        segments: [],
        duration: 4.0
      });

      const result = await model.transform(speech);

      expect(result).toBeInstanceOf(Text);
      expect(result.content).toBe('Bonjour le monde');
      expect(result.language).toBe('fr');
      expect(result.sourceAsset).toBeUndefined(); // No source Asset for direct Speech
    });

    it('should accept WAVAsset with Speech role', async () => {
      const wavAsset = new WAVAsset(mockAudioData, { language: 'de' });
      
      mockApiClient.transcribeAudio.mockResolvedValue({
        text: 'Hallo Welt',
        confidence: 0.97,
        language: 'de',
        segments: [],
        duration: 2.5
      });

      const result = await model.transform(wavAsset);

      expect(result).toBeInstanceOf(Text);
      expect(result.content).toBe('Hallo Welt');
      expect(result.sourceAsset).toBe(wavAsset);
    });
  });

  describe('Options Handling', () => {
    it('should pass options to API client', async () => {
      const mp3Asset = new MP3Asset(mockAudioData);
      const options: SpeechToTextOptions = {
        language: 'en',
        task: 'translate',
        wordTimestamps: true,
        confidence: 0.8
      };

      mockApiClient.createTranscriptionRequest.mockReturnValue({
        audio_file: '/tmp/test.wav',
        task: 'translate',
        language: 'en',
        word_timestamps: true
      });

      mockApiClient.transcribeAudio.mockResolvedValue({
        text: 'Translated text',
        confidence: 0.9,
        language: 'en',
        segments: [],
        duration: 3.0
      });

      await model.transform(mp3Asset, options);

      expect(mockApiClient.createTranscriptionRequest).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          task: 'translate',
          language: 'en',
          word_timestamps: true
        })
      );
    });

    it('should use Speech language as fallback', async () => {
      const speech = new Speech(mockAudioData, 'ja');
      
      mockApiClient.createTranscriptionRequest.mockReturnValue({
        audio_file: '/tmp/test.wav',
        language: 'ja'
      });

      mockApiClient.transcribeAudio.mockResolvedValue({
        text: 'こんにちは世界',
        confidence: 0.85,
        language: 'ja',
        segments: [],
        duration: 2.0
      });

      await model.transform(speech);

      expect(mockApiClient.createTranscriptionRequest).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          language: 'ja'
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid speech data', async () => {
      const invalidSpeech = new Speech(Buffer.alloc(0)); // Empty buffer

      await expect(model.transform(invalidSpeech))
        .rejects.toThrow('Invalid speech data provided');
    });

    it('should handle API client errors', async () => {
      const mp3Asset = new MP3Asset(mockAudioData);
      
      mockApiClient.transcribeAudio.mockRejectedValue(new Error('API Error'));

      await expect(model.transform(mp3Asset))
        .rejects.toThrow('Whisper STT failed: API Error');
    });

    it('should handle file system errors', async () => {
      const mp3Asset = new MP3Asset(mockAudioData);
      
      // Mock fs.writeFileSync to throw
      const fs = await import('fs');
      vi.mocked(fs.writeFileSync).mockImplementation(() => {
        throw new Error('File system error');
      });

      await expect(model.transform(mp3Asset))
        .rejects.toThrow('Whisper STT failed: File system error');
    });
  });

  describe('Metadata Preservation', () => {
    it('should preserve processing metadata', async () => {
      const mp3Asset = new MP3Asset(mockAudioData);
      
      mockApiClient.transcribeAudio.mockResolvedValue({
        text: 'Test transcription',
        confidence: 0.95,
        language: 'en',
        segments: [
          { start: 0, end: 1, text: 'Test', confidence: 0.96 },
          { start: 1, end: 2, text: 'transcription', confidence: 0.94 }
        ],
        duration: 2.0
      });

      const result = await model.transform(mp3Asset);

      expect(result.metadata.segments).toHaveLength(2);
      expect(result.metadata.processingTime).toBeGreaterThanOrEqual(0);
      expect(result.metadata.model).toBe('whisper-1');
      expect(result.metadata.provider).toBe('whisper-docker');
      expect(result.metadata.duration).toBe(2.0);
    });

    it('should convert segments correctly', async () => {
      const mp3Asset = new MP3Asset(mockAudioData);
      
      mockApiClient.transcribeAudio.mockResolvedValue({
        text: 'Hello world',
        confidence: 0.95,
        language: 'en',
        segments: [
          { start: 0.0, end: 0.5, text: 'Hello', confidence: 0.98 },
          { start: 0.5, end: 1.0, text: 'world', confidence: 0.92 }
        ],
        duration: 1.0
      });

      const result = await model.transform(mp3Asset);

      expect(result.metadata.segments).toEqual([
        { start: 0.0, end: 0.5, text: 'Hello', confidence: 0.9 },
        { start: 0.5, end: 1.0, text: 'world', confidence: 0.9 }
      ]);
    });
  });

  describe('Source Asset Chain Preservation', () => {
    it('should maintain source Asset through transformation pipeline', async () => {
      const mp4Asset = new MP4Asset(mockAudioData, { 
        width: 1920, 
        height: 1080,
        language: 'en'
      });

      mockApiClient.transcribeAudio.mockResolvedValue({
        text: 'Pipeline test',
        confidence: 0.9,
        language: 'en',
        segments: [],
        duration: 3.0
      });

      // Transform: MP4Asset → Speech → Text
      const speech = mp4Asset.asSpeech();
      expect(speech.sourceAsset).toBe(mp4Asset);

      const text = await model.transform(speech);
      expect(text.sourceAsset).toBe(mp4Asset); // Preserved through transformation

      // Can still access original video capabilities
      if (text.sourceAsset && 'asVideo' in text.sourceAsset) {
        const video = text.sourceAsset.asVideo();
        expect(video.getDimensions()).toEqual({ width: 1920, height: 1080 });
      }
    });
  });
});
