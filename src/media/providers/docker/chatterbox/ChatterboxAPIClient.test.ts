/**
 * ChatterboxAPIClient Tests
 * 
 * Unit tests for the extracted Chatterbox API client.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import fs from 'fs';
import { ChatterboxAPIClient } from './ChatterboxAPIClient';

// Mock fs, form-data, and fetch
vi.mock('fs');
vi.mock('../utils/execAsync');
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

describe('ChatterboxAPIClient', () => {
  let client: ChatterboxAPIClient;
  const mockBaseUrl = 'http://localhost:8004';

  beforeEach(() => {
    client = new ChatterboxAPIClient(mockBaseUrl);
    vi.clearAllMocks();
    mockFetch.mockImplementation((url, options) => {
      if (url.endsWith('/tts')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: {
            get: vi.fn().mockReturnValue('audio/mpeg')
          },
          arrayBuffer: vi.fn().mockResolvedValue(Buffer.from('fake audio data').buffer),
          text: vi.fn().mockResolvedValue(''),
        });
      } else if (url.endsWith('/upload_reference')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          statusText: 'OK',
          json: vi.fn().mockResolvedValue({ filename: 'voice.wav' }),
          text: vi.fn().mockResolvedValue(''),
        });
      } else if (url.endsWith('/health')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          statusText: 'OK',
          text: vi.fn().mockResolvedValue('OK'),
        });
      } else if (url.endsWith('/get_reference_files')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          statusText: 'OK',
          json: vi.fn().mockResolvedValue(['file1.wav', 'file2.wav']),
          text: vi.fn().mockResolvedValue(''),
        });
      }
      return Promise.reject(new Error('Unknown fetch URL'));
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('constructor', () => {
    it('should initialize with default values', () => {
      const defaultClient = new ChatterboxAPIClient();
      const info = defaultClient.getInfo();
      
      expect(info.baseUrl).toBe('http://localhost:8004');
      expect(info.timeout).toBe(900000);
      expect(info.endpoints).toEqual(['/tts', '/upload_reference', '/health']);
    });

    it('should initialize with custom values', () => {
      const customClient = new ChatterboxAPIClient('http://custom:9000', 60000);
      const info = customClient.getInfo();
      
      expect(info.baseUrl).toBe('http://custom:9000');
      expect(info.timeout).toBe(60000);
    });
  });

  describe('generateTTS', () => {
    const mockRequest = {
      text: 'Hello world',
      voice_mode: 'predefined' as const,
      output_format: 'mp3' as const,
      split_text: true,
      chunk_size: 120,
      temperature: 0.5,
      exaggeration: 0.5,
      cfg_weight: 0.5,
      speed_factor: 1.0,
      language: 'auto',
      predefined_voice_id: 'Abigail.wav'
    };

    it('should make successful TTS request', async () => {
      const mockAudioBuffer = Buffer.from('fake audio data');
      const mockResponse = {
        ok: true,
        status: 200,
        headers: {
          get: vi.fn().mockReturnValue('audio/mpeg')
        },
        arrayBuffer: vi.fn().mockResolvedValue(mockAudioBuffer.buffer)
      };

      mockFetch.mockResolvedValue(mockResponse);
      mockFs.writeFileSync = vi.fn();

      const result = await client.generateTTS(mockRequest, '/tmp/output.mp3');

      expect(mockFetch).toHaveBeenCalledWith(
        `${mockBaseUrl}/tts`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(mockRequest),
          headers: {
            'Content-Type': 'application/json'
          }
        })
      );

      expect(result.audioBuffer).toEqual(mockAudioBuffer);
      expect(mockFs.writeFileSync).toHaveBeenCalledWith('/tmp/output.mp3', mockAudioBuffer);
    });

    it('should handle API errors', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: vi.fn().mockResolvedValue('Server error')
      };

      mockFetch.mockResolvedValue(mockResponse);

      await expect(client.generateTTS(mockRequest, '/tmp/output.mp3'))
        .rejects.toThrow('TTS request failed: 500 Internal Server Error - Server error');
    });

    it('should handle timeout', async () => {
      vi.useFakeTimers();
      
      const timeoutClient = new ChatterboxAPIClient(mockBaseUrl, 1000);
      
      // Mock fetch to never resolve
      mockFetch.mockImplementation(() => new Promise(() => {}));

      const promise = timeoutClient.generateTTS(mockRequest, '/tmp/output.mp3');
      
      // Fast-forward time to trigger timeout
      vi.advanceTimersByTime(1001);
      
      await expect(promise).rejects.toThrow('TTS request timed out');
      
      vi.useRealTimers();
    });

    it('should handle non-audio response', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: {
          get: vi.fn().mockReturnValue('text/plain')
        },
        text: vi.fn().mockResolvedValue('Not audio')
      };

      mockFetch.mockResolvedValue(mockResponse);

      await expect(client.generateTTS(mockRequest, '/tmp/output.mp3'))
        .rejects.toThrow('Expected audio response, got: text/plain - Not audio');
    });
  });

  describe('uploadReferenceAudio', () => {
    it('should upload file successfully', async () => {
      const mockResponse = {
        ok: true,
        status: 200
      };

      mockFetch.mockResolvedValue(mockResponse);
      mockFs.createReadStream = vi.fn().mockReturnValue('mock stream');

      const result = await client.uploadReferenceAudio('/path/to/voice.wav');

      expect(mockFetch).toHaveBeenCalledWith(
        `${mockBaseUrl}/upload_reference`,
        expect.objectContaining({
          method: 'POST'
        })
      );

      expect(result.filename).toBe('voice.wav');
    });

    it('should handle upload errors', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        text: vi.fn().mockResolvedValue('Bad request')
      };

      mockFetch.mockResolvedValue(mockResponse);
      mockFs.createReadStream = vi.fn().mockReturnValue('mock stream');

      await expect(client.uploadReferenceAudio('/path/to/voice.wav'))
        .rejects.toThrow('Upload failed: HTTP 400: Bad request');
    });
  });

  describe('checkHealth', () => {
    it('should return true for healthy service', async () => {
      const mockResponse = {
        ok: true,
        status: 200
      };

      mockFetch.mockResolvedValue(mockResponse);

      const result = await client.checkHealth();

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        `${mockBaseUrl}/health`,
        expect.objectContaining({
          method: 'GET'
        })
      );
    });

    it('should return false for unhealthy service', async () => {
      const mockResponse = {
        ok: false,
        status: 500
      };

      mockFetch.mockResolvedValue(mockResponse);

      const result = await client.checkHealth();

      expect(result).toBe(false);
    });

    it('should return false on network error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await client.checkHealth();

      expect(result).toBe(false);
    });
  });

  describe('createTTSRequest', () => {
    it('should create request with default options', () => {
      const request = client.createTTSRequest('Hello world');

      expect(request).toEqual({
        text: 'Hello world',
        voice_mode: 'predefined',
        output_format: 'mp3',
        split_text: true,
        chunk_size: 120,
        temperature: 0.5,
        exaggeration: 0.5,
        cfg_weight: 0.5,
        speed_factor: 1.0,
        language: 'auto',
        predefined_voice_id: 'Abigail.wav'
      });
    });

    it('should create request with custom options', () => {
      const request = client.createTTSRequest('Hello world', {
        voice: 'custom-voice',
        speed: 1.5,
        outputFormat: 'wav'
      });

      expect(request).toEqual({
        text: 'Hello world',
        voice_mode: 'predefined',
        output_format: 'wav',
        split_text: true,
        chunk_size: 120,
        temperature: 0.5,
        exaggeration: 0.5,
        cfg_weight: 0.5,
        speed_factor: 1.5,
        language: 'auto',
        predefined_voice_id: 'custom-voice'
      });
    });

    it('should create request for voice cloning', () => {
      const request = client.createTTSRequest('Hello world', {
        voiceFile: '/path/to/voice.wav'
      });

      expect(request.voice_mode).toBe('clone');
      expect(request.predefined_voice_id).toBeUndefined();
    });
  });
});
