/**
 * WhisperAPIClient Tests
 * 
 * Unit tests for the extracted Whisper API client.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import fs from 'fs';
import { WhisperAPIClient } from './WhisperAPIClient';

// Mock fs, form-data, and fetch
vi.mock('fs');
vi.mock('form-data', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      append: vi.fn(),
      getHeaders: vi.fn().mockReturnValue({ 'content-type': 'multipart/form-data' })
    }))
  };
});

const mockFs = vi.mocked(fs);
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('WhisperAPIClient', () => {
  let client: WhisperAPIClient;
  const mockBaseUrl = 'http://localhost:9000';

  beforeEach(() => {
    client = new WhisperAPIClient(mockBaseUrl);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('constructor', () => {
    it('should initialize with default values', () => {
      const defaultClient = new WhisperAPIClient();
      const info = defaultClient.getInfo();
      
      expect(info.baseUrl).toBe('http://localhost:9000');
      expect(info.timeout).toBe(300000);
      expect(info.endpoints).toEqual(['/asr']);
    });

    it('should initialize with custom values', () => {
      const customClient = new WhisperAPIClient('http://custom:8000', 60000);
      const info = customClient.getInfo();
      
      expect(info.baseUrl).toBe('http://custom:8000');
      expect(info.timeout).toBe(60000);
    });
  });

  describe('transcribeAudio', () => {
    const mockRequest = {
      audioFilePath: '/path/to/audio.mp3',
      task: 'transcribe' as const,
      language: 'en'
    };

    beforeEach(() => {
      mockFs.existsSync = vi.fn().mockReturnValue(true);
      mockFs.createReadStream = vi.fn().mockReturnValue('mock stream');
    });

    it('should make successful transcription request with JSON response', async () => {
      const mockJsonResponse = {
        text: 'Hello world',
        language: 'en',
        confidence: 0.95
      };

      const mockResponse = {
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue(JSON.stringify(mockJsonResponse))
      };

      mockFetch.mockResolvedValue(mockResponse);

      const result = await client.transcribeAudio(mockRequest);

      expect(mockFetch).toHaveBeenCalledWith(
        `${mockBaseUrl}/asr`,
        expect.objectContaining({
          method: 'POST'
        })
      );

      expect(result).toEqual({
        text: 'Hello world',
        language: 'en',
        confidence: 0.95
      });
    });

    it('should handle plain text response', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue('Hello world from plain text')
      };

      mockFetch.mockResolvedValue(mockResponse);

      const result = await client.transcribeAudio(mockRequest);

      expect(result).toEqual({
        text: 'Hello world from plain text',
        language: 'unknown',
        confidence: 0.95
      });
    });

    it('should handle file not found error', async () => {
      mockFs.existsSync = vi.fn().mockReturnValue(false);

      await expect(client.transcribeAudio(mockRequest))
        .rejects.toThrow('Audio file not found: /path/to/audio.mp3');
    });

    it('should handle API errors', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        text: vi.fn().mockResolvedValue('Server error')
      };

      mockFetch.mockResolvedValue(mockResponse);

      await expect(client.transcribeAudio(mockRequest))
        .rejects.toThrow('Whisper service error (500): Server error');
    });

    it('should handle timeout', async () => {
      vi.useFakeTimers();
      
      const timeoutClient = new WhisperAPIClient(mockBaseUrl, 1000);
      
      // Mock fetch to never resolve
      mockFetch.mockImplementation(() => new Promise(() => {}));

      const promise = timeoutClient.transcribeAudio(mockRequest);
      
      // Fast-forward time to trigger timeout
      vi.advanceTimersByTime(1001);
      
      await expect(promise).rejects.toThrow('Request timeout after 5 minutes');
      
      vi.useRealTimers();
    });

    it('should handle empty response', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue('')
      };

      mockFetch.mockResolvedValue(mockResponse);

      await expect(client.transcribeAudio(mockRequest))
        .rejects.toThrow('Empty or invalid response from Whisper service');
    });
  });

  describe('checkHealth', () => {
    it('should return true for healthy service', async () => {
      const mockResponse = {
        status: 200
      };

      mockFetch.mockResolvedValue(mockResponse);

      const result = await client.checkHealth();

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        `${mockBaseUrl}/asr`,
        expect.objectContaining({
          method: 'GET'
        })
      );
    });

    it('should return true even for error responses (service is up)', async () => {
      const mockResponse = {
        status: 405 // Method not allowed, but service is responding
      };

      mockFetch.mockResolvedValue(mockResponse);

      const result = await client.checkHealth();

      expect(result).toBe(true);
    });

    it('should return false on network error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await client.checkHealth();

      expect(result).toBe(false);
    });
  });

  describe('getSupportedFormats', () => {
    it('should return supported audio formats', () => {
      const formats = client.getSupportedFormats();
      
      expect(formats).toContain('mp3');
      expect(formats).toContain('wav');
      expect(formats).toContain('flac');
      expect(formats).toContain('m4a');
    });
  });

  describe('getSupportedLanguages', () => {
    it('should return supported languages', () => {
      const languages = client.getSupportedLanguages();
      
      expect(languages).toContain('auto');
      expect(languages).toContain('en');
      expect(languages).toContain('es');
      expect(languages).toContain('fr');
    });
  });

  describe('validateAudioFormat', () => {
    it('should validate supported formats', () => {
      expect(client.validateAudioFormat('audio.mp3')).toBe(true);
      expect(client.validateAudioFormat('audio.wav')).toBe(true);
      expect(client.validateAudioFormat('audio.flac')).toBe(true);
    });

    it('should reject unsupported formats', () => {
      expect(client.validateAudioFormat('audio.txt')).toBe(false);
      expect(client.validateAudioFormat('audio.pdf')).toBe(false);
      expect(client.validateAudioFormat('audio')).toBe(false);
    });
  });

  describe('createTranscriptionRequest', () => {
    it('should create request with default options', () => {
      const request = client.createTranscriptionRequest('/path/to/audio.mp3');

      expect(request).toEqual({
        audioFilePath: '/path/to/audio.mp3',
        task: 'transcribe',
        language: undefined,
        word_timestamps: undefined
      });
    });

    it('should create request with custom options', () => {
      const request = client.createTranscriptionRequest('/path/to/audio.mp3', {
        task: 'translate',
        language: 'es',
        word_timestamps: true
      });

      expect(request).toEqual({
        audioFilePath: '/path/to/audio.mp3',
        task: 'translate',
        language: 'es',
        word_timestamps: true
      });
    });
  });

  describe('normalizeResponse', () => {
    it('should normalize complete response', () => {
      const client = new WhisperAPIClient();
      const response = {
        text: 'Hello world',
        language: 'en',
        confidence: 0.95,
        segments: [{ start: 0, end: 1, text: 'Hello' }],
        duration: 5.0
      };

      // Access private method for testing
      const normalized = (client as any).normalizeResponse(response);

      expect(normalized).toEqual({
        text: 'Hello world',
        language: 'en',
        confidence: 0.95,
        segments: [{ start: 0, end: 1, text: 'Hello' }],
        duration: 5.0
      });
    });

    it('should normalize minimal response', () => {
      const client = new WhisperAPIClient();
      const response = {
        text: 'Hello world'
      };

      // Access private method for testing
      const normalized = (client as any).normalizeResponse(response);

      expect(normalized).toEqual({
        text: 'Hello world',
        language: 'unknown',
        confidence: 0.9,
        segments: [],
        duration: undefined
      });
    });
  });
});
