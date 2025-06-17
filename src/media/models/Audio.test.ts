/**
 * Audio Tests
 * 
 * Unit tests for the Audio class.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'fs';
import { Audio } from './Audio';

// Mock fs
vi.mock('fs');
const mockFs = vi.mocked(fs);

describe('Audio', () => {
  let mockAudioData: Buffer;

  beforeEach(() => {
    mockAudioData = Buffer.from('fake audio data');
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create Audio instance with required parameters', () => {
      const audio = new Audio(mockAudioData, 'mp3');

      expect(audio.data).toBe(mockAudioData);
      expect(audio.format).toBe('mp3');
      expect(audio.metadata).toEqual({});
    });

    it('should create Audio instance with metadata', () => {
      const metadata = { duration: 120, sampleRate: 44100 };
      const audio = new Audio(mockAudioData, 'wav', metadata);

      expect(audio.metadata).toEqual(metadata);
    });
  });

  describe('static factory methods', () => {
    describe('fromFile', () => {
      it('should create Audio from file path', () => {
        mockFs.existsSync.mockReturnValue(true);
        mockFs.readFileSync.mockReturnValue(mockAudioData);

        const audio = Audio.fromFile('/path/to/audio.mp3');

        expect(audio.data).toBe(mockAudioData);
        expect(audio.format).toBe('mp3');
        expect(audio.metadata.sourceFile).toBe('/path/to/audio.mp3');
        expect(audio.metadata.fileSize).toBe(mockAudioData.length);
      });

      it('should throw error if file does not exist', () => {
        mockFs.existsSync.mockReturnValue(false);

        expect(() => Audio.fromFile('/nonexistent.mp3'))
          .toThrow('Audio file not found: /nonexistent.mp3');
      });
    });

    describe('fromBuffer', () => {
      it('should create Audio from buffer', () => {
        const metadata = { duration: 60 };
        const audio = Audio.fromBuffer(mockAudioData, 'wav', metadata);

        expect(audio.data).toBe(mockAudioData);
        expect(audio.format).toBe('wav');
        expect(audio.metadata).toEqual(metadata);
      });
    });

    describe('fromBase64', () => {
      it('should create Audio from base64 string', () => {
        const base64 = mockAudioData.toString('base64');
        const audio = Audio.fromBase64(base64, 'flac');

        expect(audio.data).toEqual(mockAudioData);
        expect(audio.format).toBe('flac');
      });
    });
  });

  describe('format detection', () => {
    it('should detect format from file path', () => {
      expect(Audio.detectFormatFromPath('/path/to/file.mp3')).toBe('mp3');
      expect(Audio.detectFormatFromPath('/path/to/file.wav')).toBe('wav');
      expect(Audio.detectFormatFromPath('/path/to/file.flac')).toBe('flac');
      expect(Audio.detectFormatFromPath('/path/to/file.m4a')).toBe('m4a');
    });

    it('should handle case insensitive extensions', () => {
      expect(Audio.detectFormatFromPath('/path/to/file.MP3')).toBe('mp3');
      expect(Audio.detectFormatFromPath('/path/to/file.WAV')).toBe('wav');
    });

    it('should throw error for unsupported format', () => {
      expect(() => Audio.detectFormatFromPath('/path/to/file.txt'))
        .toThrow('Unsupported audio format: txt');
    });
  });

  describe('format support', () => {
    it('should return supported formats', () => {
      const formats = Audio.getSupportedFormats();
      expect(formats).toContain('mp3');
      expect(formats).toContain('wav');
      expect(formats).toContain('flac');
    });

    it('should check if format is supported', () => {
      expect(Audio.isFormatSupported('mp3')).toBe(true);
      expect(Audio.isFormatSupported('wav')).toBe(true);
      expect(Audio.isFormatSupported('txt')).toBe(false);
    });

    it('should validate audio file', () => {
      mockFs.existsSync.mockReturnValue(true);
      expect(Audio.validateAudioFile('/path/to/audio.mp3')).toBe(true);

      mockFs.existsSync.mockReturnValue(false);
      expect(Audio.validateAudioFile('/path/to/audio.mp3')).toBe(false);

      expect(Audio.validateAudioFile('/path/to/file.txt')).toBe(false);
    });
  });

  describe('file operations', () => {
    let audio: Audio;

    beforeEach(() => {
      audio = new Audio(mockAudioData, 'mp3');
    });

    describe('toFile', () => {
      it('should save audio to file', async () => {
        mockFs.existsSync.mockReturnValue(true);
        mockFs.mkdirSync.mockImplementation(() => undefined);
        mockFs.writeFileSync.mockImplementation(() => undefined);

        await audio.toFile('/output/audio.mp3');

        expect(mockFs.writeFileSync).toHaveBeenCalledWith('/output/audio.mp3', mockAudioData);
      });

      it('should create directory if it does not exist', async () => {
        mockFs.existsSync.mockReturnValue(false);
        mockFs.mkdirSync.mockImplementation(() => undefined);
        mockFs.writeFileSync.mockImplementation(() => undefined);

        await audio.toFile('/output/audio.mp3');

        expect(mockFs.mkdirSync).toHaveBeenCalledWith('/output', { recursive: true });
      });
    });

    describe('toBuffer', () => {
      it('should return buffer copy', () => {
        const buffer = audio.toBuffer();
        expect(buffer).toEqual(mockAudioData);
        expect(buffer).not.toBe(mockAudioData); // Should be a copy
      });
    });

    describe('toBase64', () => {
      it('should return base64 string', () => {
        const base64 = audio.toBase64();
        expect(base64).toBe(mockAudioData.toString('base64'));
      });
    });

    describe('toDataURL', () => {
      it('should return data URL', () => {
        const dataUrl = audio.toDataURL();
        const expectedBase64 = mockAudioData.toString('base64');
        expect(dataUrl).toBe(`data:audio/mpeg;base64,${expectedBase64}`);
      });
    });
  });

  describe('metadata and properties', () => {
    let audio: Audio;

    beforeEach(() => {
      audio = new Audio(mockAudioData, 'wav', {
        duration: 120,
        sampleRate: 44100,
        channels: 2
      });
    });

    it('should get MIME type', () => {
      expect(audio.getMimeType()).toBe('audio/wav');
      
      const mp3Audio = new Audio(mockAudioData, 'mp3');
      expect(mp3Audio.getMimeType()).toBe('audio/mpeg');
    });

    it('should get file extension', () => {
      expect(audio.getFileExtension()).toBe('wav');
    });

    it('should get size in bytes', () => {
      expect(audio.getSize()).toBe(mockAudioData.length);
    });

    it('should get human readable size', () => {
      const size = audio.getHumanSize();
      expect(size).toMatch(/\d+\.\d+ B/);
    });

    it('should get duration', () => {
      expect(audio.getDuration()).toBe(120);
    });

    it('should get human readable duration', () => {
      expect(audio.getHumanDuration()).toBe('2:00');
      
      const shortAudio = new Audio(mockAudioData, 'mp3', { duration: 65 });
      expect(shortAudio.getHumanDuration()).toBe('1:05');
    });

    it('should return undefined for missing duration', () => {
      const audioWithoutDuration = new Audio(mockAudioData, 'mp3');
      expect(audioWithoutDuration.getDuration()).toBeUndefined();
      expect(audioWithoutDuration.getHumanDuration()).toBeUndefined();
    });
  });

  describe('manipulation methods', () => {
    let audio: Audio;

    beforeEach(() => {
      audio = new Audio(mockAudioData, 'mp3', { duration: 60 });
    });

    it('should create copy with new metadata', () => {
      const newAudio = audio.withMetadata({ title: 'Test Song' });

      expect(newAudio.data).toBe(audio.data);
      expect(newAudio.format).toBe(audio.format);
      expect(newAudio.metadata).toEqual({
        duration: 60,
        title: 'Test Song'
      });
    });

    it('should create copy with new format', () => {
      const newAudio = audio.withFormat('wav');

      expect(newAudio.data).toBe(audio.data);
      expect(newAudio.format).toBe('wav');
      expect(newAudio.metadata).toEqual(audio.metadata);
    });

    it('should clone audio', () => {
      const cloned = audio.clone();

      expect(cloned.data).toEqual(audio.data);
      expect(cloned.data).not.toBe(audio.data); // Different buffer
      expect(cloned.format).toBe(audio.format);
      expect(cloned.metadata).toEqual(audio.metadata);
      expect(cloned.metadata).not.toBe(audio.metadata); // Different object
    });
  });

  describe('validation', () => {
    it('should validate audio with data', () => {
      const audio = new Audio(mockAudioData, 'mp3');
      expect(audio.isValid()).toBe(true);
    });

    it('should invalidate empty audio', () => {
      const audio = new Audio(Buffer.alloc(0), 'mp3');
      expect(audio.isValid()).toBe(false);
    });
  });

  describe('string representations', () => {
    it('should return string representation', () => {
      const audio = new Audio(mockAudioData, 'mp3', { duration: 120 });
      const str = audio.toString();
      
      expect(str).toContain('MP3');
      expect(str).toContain('2:00');
    });

    it('should return JSON representation', () => {
      const audio = new Audio(mockAudioData, 'wav', { duration: 60 });
      const json = audio.toJSON();

      expect(json).toEqual({
        format: 'wav',
        size: mockAudioData.length,
        metadata: { duration: 60 }
      });
    });
  });
});
