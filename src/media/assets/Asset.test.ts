/**
 * Asset System Tests
 * 
 * Comprehensive tests for the Asset-role system including mixins and concrete types.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'fs';
import { MP3Asset, WAVAsset, MP4Asset, TextAsset, createAssetFromBuffer } from './types';
import { hasAudioRole, hasVideoRole, hasTextRole } from './roles';

// Mock fs
vi.mock('fs');
const mockFs = vi.mocked(fs);

describe('Asset System', () => {
  let mockAudioData: Buffer;
  let mockVideoData: Buffer;
  let mockTextData: Buffer;

  beforeEach(() => {
    mockAudioData = Buffer.from('fake audio data');
    mockVideoData = Buffer.from('fake video data');
    mockTextData = Buffer.from('Hello world');
    vi.clearAllMocks();
  });

  describe('MP3Asset', () => {
    it('should create MP3Asset with Audio role', () => {
      const asset = new MP3Asset(mockAudioData, { duration: 120 });

      expect(asset.canPlayRole('audio')).toBe(true);
      expect(asset.canPlayRole('video')).toBe(false);
      expect(asset.canPlayRole('text')).toBe(false);

      expect(asset.getRoles()).toContain('audio');
    });

    it('should convert to Audio role', async () => {
      const asset = new MP3Asset(mockAudioData, { 
        duration: 120,
        sampleRate: 44100,
        channels: 2
      });

      const audio = await asset.asAudio();
      expect(audio.getFormat()).toBe('mp3');
      expect(audio.isValid()).toBe(true);
      expect(audio.toString()).toContain('AUDIO');
    });

    it('should create from file', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(mockAudioData as any);

      const asset = MP3Asset.fromFile('/path/to/audio.mp3');

      expect(asset.metadata.sourceFile).toBe('/path/to/audio.mp3');
      expect(asset.metadata.format).toBe('mp3');
      expect(asset.data).toBe(mockAudioData);
    });

    it('should create from buffer', () => {
      const asset = MP3Asset.fromBuffer(mockAudioData, { duration: 60 });

      expect(asset.metadata.format).toBe('mp3');
      expect(asset.metadata.duration).toBe(60);
      expect(asset.data).toBe(mockAudioData);
    });
  });

  describe('WAVAsset', () => {
    it('should create WAVAsset with Audio role', () => {
      const asset = new WAVAsset(mockAudioData);

      expect(asset.canPlayRole('audio')).toBe(true);
      expect(asset.getMimeType()).toBe('audio/wav');
      expect(asset.getFileExtension()).toBe('wav');
    });
  });

  describe('MP4Asset', () => {
    it('should create MP4Asset with Video and Audio roles', () => {
      const asset = new MP4Asset(mockVideoData, { 
        width: 1920,
        height: 1080,
        duration: 300
      });

      expect(asset.canPlayRole('video')).toBe(true);
      expect(asset.canPlayRole('audio')).toBe(true);
      expect(asset.canPlayRole('text')).toBe(false);

      expect(asset.getRoles()).toContain('video');
      expect(asset.getRoles()).toContain('audio');
    });

    it('should convert to Audio role from MP4', async () => {
      const asset = new MP4Asset(mockVideoData);
      const audio = await asset.asAudio();
      
      expect(audio.getFormat()).toBe('mp3'); // Default audio format extraction
      expect(audio.isValid()).toBe(true);
    });
  });

  describe('TextAsset', () => {
    it('should create TextAsset with Text role only', () => {
      const asset = new TextAsset(mockTextData);

      expect(asset.canPlayRole('text')).toBe(true);
      expect(asset.canPlayRole('audio')).toBe(false);
      expect(asset.canPlayRole('video')).toBe(false);

      expect(asset.getRoles()).toContain('text');
    });

    it('should convert to Text role', async () => {
      const content = 'Hello world this is a test';
      const asset = TextAsset.fromString(content, { language: 'en' });

      const text = await asset.asText();
      expect(text.isValid()).toBe(true);
      expect(text.toString()).toContain('TEXT');
    });

    it('should create from string', () => {
      const content = 'Hello world';
      const asset = TextAsset.fromString(content);

      expect(asset.metadata.format).toBe('txt');
      expect(asset.metadata.encoding).toBe('utf-8');
      expect(asset.metadata.wordCount).toBe(2);
    });
  });

  describe('Role Type Guards', () => {
    it('should correctly identify role capabilities', () => {
      const mp3Asset = new MP3Asset(mockAudioData);
      const mp4Asset = new MP4Asset(mockVideoData);
      const textAsset = new TextAsset(mockTextData);

      // MP3Asset
      expect(hasAudioRole(mp3Asset)).toBe(true);
      expect(hasVideoRole(mp3Asset)).toBe(false);
      expect(hasTextRole(mp3Asset)).toBe(false);

      // MP4Asset
      expect(hasAudioRole(mp4Asset)).toBe(true);
      expect(hasVideoRole(mp4Asset)).toBe(true);
      expect(hasTextRole(mp4Asset)).toBe(false);

      // TextAsset
      expect(hasAudioRole(textAsset)).toBe(false);
      expect(hasVideoRole(textAsset)).toBe(false);
      expect(hasTextRole(textAsset)).toBe(true);
    });
  });

  describe('Asset Factory', () => {
    it('should create correct asset type from buffer and format', () => {
      const mp3Asset = createAssetFromBuffer(mockAudioData, 'mp3');
      const mp4Asset = createAssetFromBuffer(mockVideoData, 'mp4');
      const textAsset = createAssetFromBuffer(mockTextData, 'txt');

      expect(mp3Asset).toBeInstanceOf(MP3Asset);
      expect(mp4Asset).toBeInstanceOf(MP4Asset);
      expect(textAsset).toBeInstanceOf(TextAsset);
    });

    it('should throw error for unsupported format', () => {
      expect(() => createAssetFromBuffer(mockAudioData, 'unsupported'))
        .toThrow('Unsupported asset format: unsupported');
    });
  });

  describe('Asset Cloning and Metadata', () => {
    it('should clone asset with new metadata', () => {
      const original = new MP3Asset(mockAudioData, { duration: 120 });
      const cloned = original.withMetadata({ artist: 'Test Artist' });

      expect(cloned.metadata.duration).toBe(120);
      expect(cloned.metadata.artist).toBe('Test Artist');
      expect(cloned.data).toBe(original.data);
      expect(cloned).not.toBe(original);
    });

    it('should clone asset completely', () => {
      const original = new MP3Asset(mockAudioData, { duration: 120 });
      const cloned = original.clone();

      expect(cloned.metadata).toEqual(original.metadata);
      expect(cloned.data).toEqual(original.data);
      expect(cloned.data).not.toBe(original.data); // Different buffer
      expect(cloned).not.toBe(original);
    });
  });

  describe('Asset Validation', () => {
    it('should validate asset data', () => {
      const validAsset = new MP3Asset(mockAudioData);
      const invalidAsset = new MP3Asset(Buffer.alloc(0));

      expect(validAsset.isValid()).toBe(true);
      expect(invalidAsset.isValid()).toBe(false);

      const validationResult = validAsset.validate();
      expect(validationResult.valid).toBe(true);
      expect(validationResult.errors).toHaveLength(0);

      const invalidValidationResult = invalidAsset.validate();
      expect(invalidValidationResult.valid).toBe(false);
      expect(invalidValidationResult.errors).toContain('Asset data is invalid or empty');
    });
  });
});
