/**
 * Unit Tests for ChatterboxTTSModel with Asset-Role System
 *
 * Tests the new Asset-based architecture with automatic role casting
 * and source Asset preservation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChatterboxTTSModel } from './ChatterboxTTSModel';
import { TextAsset } from '../assets/types';
import { Text, Speech } from '../assets/roles';
import { TextToSpeechOptions } from './TextToSpeechModel';
import { ChatterboxAPIClient } from '../clients/ChatterboxAPIClient';
import { ChatterboxDockerService } from '../services/ChatterboxDockerService';

// Mock dependencies
vi.mock('../clients/ChatterboxAPIClient');
vi.mock('../services/ChatterboxDockerService');
vi.mock('fs');

describe('ChatterboxTTSModel', () => {
  let model: ChatterboxTTSModel;
  let mockApiClient: vi.Mocked<ChatterboxAPIClient>;
  let mockDockerService: vi.Mocked<ChatterboxDockerService>;
  let mockAudioData: Buffer;

  beforeEach(() => {
    mockAudioData = Buffer.from('fake audio data');
    
    // Create mocked instances
    mockApiClient = {
      createTTSRequest: vi.fn(),
      generateTTS: vi.fn(),
      uploadReferenceAudio: vi.fn(),
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
    model = new ChatterboxTTSModel({
      id: 'chatterbox-tts',
      name: 'Chatterbox TTS',
      version: '1.0.0',
      provider: 'docker',
      capabilities: ['text-to-speech'],
      inputTypes: ['text'],
      outputTypes: ['speech']
    });

    // Inject mocked dependencies
    (model as any).apiClient = mockApiClient;
    (model as any).dockerService = mockDockerService;

    vi.clearAllMocks();
  });

  describe('Asset-Role Input Handling', () => {
    it('should accept TextAsset with Text role', async () => {
      const textAsset = TextAsset.fromString('Hello world', { language: 'en' });
      
      // Mock successful TTS generation
      mockApiClient.generateTTS.mockResolvedValue({
        duration: 2.5,
        language: 'en'
      });

      const result = await model.transform(textAsset);

      expect(result).toBeInstanceOf(Speech);
      expect(result.data).toBe(mockAudioData);
      expect(result.language).toBe('en');
      expect(result.sourceAsset).toBe(textAsset); // Source Asset preserved
    });

    it('should accept direct Text object', async () => {
      const text = new Text('Bonjour le monde', 'fr', 1.0);
      
      mockApiClient.synthesizeSpeech.mockResolvedValue({
        audio: { data: mockAudioData },
        duration: 3.0,
        language: 'fr'
      });

      const result = await model.transform(text);

      expect(result).toBeInstanceOf(Speech);
      expect(result.data).toBe(mockAudioData);
      expect(result.language).toBe('fr');
      expect(result.sourceAsset).toBeUndefined(); // No source Asset for direct Text
    });

    it('should handle Text from previous transformation', async () => {
      // Simulate text that came from a video transcription
      const originalVideoAsset = { 
        asVideo: () => ({ format: 'mp4', getDimensions: () => ({ width: 1920, height: 1080 }) })
      };
      
      const transcribedText = new Text(
        'This text came from video',
        'en',
        0.95,
        { segments: [] },
        originalVideoAsset as any
      );
      
      mockApiClient.synthesizeSpeech.mockResolvedValue({
        audio: { data: mockAudioData },
        duration: 4.0,
        language: 'en'
      });

      const result = await model.transform(transcribedText);

      expect(result).toBeInstanceOf(Speech);
      expect(result.sourceAsset).toBe(originalVideoAsset); // Preserves original video Asset
    });
  });

  describe('Options Handling', () => {
    it('should pass options to API client', async () => {
      const textAsset = TextAsset.fromString('Test speech generation');
      const options: TextToSpeechOptions = {
        voice: 'female-1',
        speed: 1.2,
        emotion: 'happy',
        style: 'conversational',
        language: 'en'
      };

      mockApiClient.createTTSRequest.mockReturnValue({
        text: 'Test speech generation',
        voice: 'female-1',
        speed: 1.2,
        outputFormat: 'mp3'
      });

      mockApiClient.synthesizeSpeech.mockResolvedValue({
        audio: { data: mockAudioData },
        duration: 3.5,
        language: 'en'
      });

      await model.transform(textAsset, options);

      expect(mockApiClient.createTTSRequest).toHaveBeenCalledWith(
        'Test speech generation',
        expect.objectContaining({
          voice: 'female-1',
          speed: 1.2
        })
      );
    });

    it('should handle voice cloning', async () => {
      const textAsset = TextAsset.fromString('Clone this voice');
      const options: TextToSpeechOptions = {
        voiceFile: '/path/to/reference.wav'
      };

      mockApiClient.uploadReferenceAudio.mockResolvedValue({
        filename: 'reference_123.wav'
      });

      mockApiClient.createTTSRequest.mockReturnValue({
        text: 'Clone this voice',
        voiceFile: '/path/to/reference.wav',
        outputFormat: 'mp3'
      });

      mockApiClient.synthesizeSpeech.mockResolvedValue({
        audio: { data: mockAudioData },
        duration: 2.0,
        language: 'en'
      });

      const result = await model.transform(textAsset, options);

      expect(mockApiClient.uploadReferenceAudio).toHaveBeenCalledWith('/path/to/reference.wav');
      expect(result.metadata.voiceCloned).toBe(true);
    });

    it('should use Text language as fallback', async () => {
      const text = new Text('Hola mundo', 'es');
      
      mockApiClient.createTTSRequest.mockReturnValue({
        text: 'Hola mundo',
        outputFormat: 'mp3'
      });

      mockApiClient.synthesizeSpeech.mockResolvedValue({
        audio: { data: mockAudioData },
        duration: 1.5,
        language: 'es'
      });

      const result = await model.transform(text);

      expect(result.language).toBe('es');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid text data', async () => {
      const invalidText = new Text(''); // Empty content
      
      await expect(model.transform(invalidText))
        .rejects.toThrow('Invalid text data provided');
    });

    it('should handle API client errors', async () => {
      const textAsset = TextAsset.fromString('Test text');
      
      mockApiClient.synthesizeSpeech.mockRejectedValue(new Error('TTS API Error'));

      await expect(model.transform(textAsset))
        .rejects.toThrow('Chatterbox TTS failed: TTS API Error');
    });

    it('should handle voice upload errors', async () => {
      const textAsset = TextAsset.fromString('Test text');
      const options: TextToSpeechOptions = {
        voiceFile: '/invalid/path.wav'
      };

      mockApiClient.uploadReferenceAudio.mockRejectedValue(new Error('Upload failed'));

      await expect(model.transform(textAsset, options))
        .rejects.toThrow('Failed to upload reference audio: Upload failed');
    });

    it('should handle file system errors', async () => {
      const textAsset = TextAsset.fromString('Test text');
      
      // Mock fs.readFileSync to throw
      const fs = await import('fs');
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        throw new Error('File read error');
      });

      mockApiClient.synthesizeSpeech.mockResolvedValue({
        audio: { data: mockAudioData },
        duration: 2.0,
        language: 'en'
      });

      await expect(model.transform(textAsset))
        .rejects.toThrow('Chatterbox TTS failed: File read error');
    });
  });

  describe('Metadata Preservation', () => {
    it('should preserve processing metadata', async () => {
      const textAsset = TextAsset.fromString('Metadata test');
      const options: TextToSpeechOptions = {
        voice: 'narrator',
        emotion: 'calm',
        style: 'news'
      };
      
      mockApiClient.synthesizeSpeech.mockResolvedValue({
        audio: { data: mockAudioData },
        duration: 3.2,
        language: 'en'
      });

      const result = await model.transform(textAsset, options);

      expect(result.metadata.emotion).toBe('calm');
      expect(result.metadata.style).toBe('news');
      expect(result.metadata.processingTime).toBeGreaterThan(0);
      expect(result.metadata.model).toBe('chatterbox-tts');
      expect(result.metadata.provider).toBe('docker');
      expect(result.metadata.duration).toBe(3.2);
    });

    it('should track voice information', async () => {
      const textAsset = TextAsset.fromString('Voice test');
      const options: TextToSpeechOptions = {
        voice: 'custom-voice-1'
      };
      
      mockApiClient.synthesizeSpeech.mockResolvedValue({
        audio: { data: mockAudioData },
        duration: 2.8,
        language: 'en'
      });

      const result = await model.transform(textAsset, options);

      expect(result.speaker).toBe('custom-voice-1');
      expect(result.metadata.voice).toBe('custom-voice-1');
    });
  });

  describe('Source Asset Chain Preservation', () => {
    it('should maintain source Asset through transformation pipeline', async () => {
      // Simulate: Video → Text → Speech pipeline
      const originalVideoAsset = { 
        asVideo: () => ({ format: 'mp4', getDimensions: () => ({ width: 1920, height: 1080 }) }),
        asAudio: () => ({ format: 'mp3', getDuration: () => 120 })
      };
      
      // Text from video transcription
      const transcribedText = new Text(
        'This came from video transcription',
        'en',
        0.95,
        { segments: [] },
        originalVideoAsset as any
      );

      mockApiClient.synthesizeSpeech.mockResolvedValue({
        audio: { data: mockAudioData },
        duration: 5.0,
        language: 'en'
      });

      // Transform: Text → Speech
      const speech = await model.transform(transcribedText);
      
      expect(speech.sourceAsset).toBe(originalVideoAsset); // Preserved through transformation

      // Can still access original video capabilities
      if (speech.sourceAsset && 'asVideo' in speech.sourceAsset) {
        const video = speech.sourceAsset.asVideo();
        expect(video.getDimensions()).toEqual({ width: 1920, height: 1080 });
      }

      // Can still access original audio capabilities
      if (speech.sourceAsset && 'asAudio' in speech.sourceAsset) {
        const audio = speech.sourceAsset.asAudio();
        expect(audio.getDuration()).toBe(120);
      }
    });

    it('should work in complex transformation chains', async () => {
      const originalAsset = { id: 'original-mp4' };
      
      // Simulate: MP4 → Speech → Text → Speech chain
      const text1 = new Text('First text', 'en', 0.9, {}, originalAsset as any);
      
      mockApiClient.synthesizeSpeech.mockResolvedValue({
        audio: { data: mockAudioData },
        duration: 2.0,
        language: 'en'
      });

      const speech1 = await model.transform(text1);
      expect(speech1.sourceAsset).toBe(originalAsset);

      // Create new text from this speech (simulating another transformation)
      const text2 = new Text('Second text', 'en', 0.85, {}, speech1.sourceAsset);
      const speech2 = await model.transform(text2);
      
      expect(speech2.sourceAsset).toBe(originalAsset); // Still preserved
    });
  });
});
