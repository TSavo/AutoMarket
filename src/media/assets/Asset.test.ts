/**
 * Asset System Tests
 * 
 * Comprehensive tests for the Asset-role system including mixins and concrete types.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'fs';
import { AudioAsset, VideoAsset, TextAsset, ImageAsset } from './types';
import { hasAudioRole, hasVideoRole, hasTextRole } from './roles';
import { Audio, Video, Text, Image } from './roles';

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

  describe('AudioAsset (MP3)', () => {
    it('should create AudioAsset with Audio role (MP3)', () => {
      const asset = new AudioAsset(mockAudioData, { duration: 120, format: 'mp3' });

      expect(asset.canPlayRole(Audio)).toBe(true);
      expect(asset.canPlayRole(Video)).toBe(false);
      expect(asset.canPlayRole(Text)).toBe(false);

      expect(asset.getRoles()).toContain('audio');
    });

    it('should convert to Audio role', async () => {
      const asset = new AudioAsset(mockAudioData, {
        duration: 120,
        sampleRate: 44100,
        channels: 2,
        format: 'mp3'
      });

      const audio = await asset.asRole(Audio);
      expect(audio.getFormat()).toBe('mp3');
      expect(audio.isValid()).toBe(true);
      expect(audio.toString()).toContain('AUDIO');
    });

    it('should create from file', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(mockAudioData as any);

      const asset = AudioAsset.fromFile('/path/to/audio.mp3');

      expect(asset.metadata.sourceFile).toBe('/path/to/audio.mp3');
      expect(asset.metadata.format).toBe('mp3');
      expect(asset.data).toBe(mockAudioData);
    });

    it('should create from buffer', () => {
      const asset = AudioAsset.fromBuffer(mockAudioData, { duration: 60, format: 'mp3' });

      expect(asset.metadata.format).toBe('mp3');
      expect(asset.metadata.duration).toBe(60);
      expect(asset.data).toBe(mockAudioData);
    });
  });

  describe('AudioAsset (WAV)', () => {
    it('should create AudioAsset with Audio role (WAV)', () => {
      const asset = new AudioAsset(mockAudioData, { format: 'wav' });

      expect(asset.canPlayRole(Audio)).toBe(true);
      expect(asset.getMimeType()).toBe('audio/wav');
      expect(asset.getFileExtension()).toBe('wav');
    });
  });

  describe('VideoAsset', () => {
    it('should create VideoAsset with Video and Audio roles', () => {
      const asset = new VideoAsset(mockVideoData, { 
        width: 1920,
        height: 1080,
        duration: 300,
        format: 'mp4'
      });

      expect(asset.canPlayRole(Video)).toBe(true);
      expect(asset.canPlayRole(Audio)).toBe(true);
      expect(asset.canPlayRole(Text)).toBe(false);

      expect(asset.getRoles()).toContain('video');
      expect(asset.getRoles()).toContain('audio');
    });

    it('should convert to Audio role from MP4', async () => {
      const asset = new VideoAsset(mockVideoData, { format: 'mp4' });
      const audio = await asset.asRole(Audio);
      
      expect(audio.getFormat()).toBe('mp3'); // Default audio format extraction
      expect(audio.isValid()).toBe(true);
    });
  });

  describe('TextAsset', () => {
    it('should create TextAsset with Text role only', () => {
      const asset = new TextAsset(mockTextData.toString());

      expect(asset.canPlayRole(Text)).toBe(true);
      expect(asset.canPlayRole(Audio)).toBe(false);
      expect(asset.canPlayRole(Video)).toBe(false);

      expect(asset.getRoles()).toContain('text');
    });

    it('should convert to Text role', async () => {
      const content = 'Hello world this is a test';
      const asset = TextAsset.fromString(content, { language: 'en' });

      const text = await asset.asRole(Text);
      expect(text.isValid()).toBe(true);
      expect(text.toString()).toContain('TEXT');
    });

    it('should create from string', () => {
      const content = 'Hello world';
      const asset = TextAsset.fromString(content.toString());

      expect(asset.metadata.format).toBe('txt');
      expect(asset.metadata.encoding).toBe('utf-8');
      expect(asset.metadata.wordCount).toBe(2);
    });
  });

  describe('Role Type Guards', () => {
    it('should correctly identify role capabilities', () => {
      const mp3Asset = new AudioAsset(mockAudioData, { format: 'mp3' });
      const mp4Asset = new VideoAsset(mockVideoData, { format: 'mp4' });
      const textAsset = new TextAsset(mockTextData.toString());

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
      const mp3Asset = new AudioAsset(mockAudioData, { format: 'mp3' });
      const mp4Asset = new VideoAsset(mockVideoData, { format: 'mp4' });
      const textAsset = new TextAsset(mockTextData.toString(), { format: 'txt' });

      expect(mp3Asset).toBeInstanceOf(AudioAsset);
      expect(mp4Asset).toBeInstanceOf(VideoAsset);
      expect(textAsset).toBeInstanceOf(TextAsset);
    });

    });

  describe('Asset Cloning and Metadata', () => {
    it('should clone asset with new metadata', () => {
      const original = new AudioAsset(mockAudioData, { duration: 120, format: 'mp3' });
      const cloned = original.withMetadata({ artist: 'Test Artist' });

      expect(cloned.metadata.duration).toBe(120);
      expect(cloned.metadata.artist).toBe('Test Artist');
      expect(cloned.data).toBe(original.data);
      expect(cloned).not.toBe(original);
    });

    it('should clone asset completely', () => {
      const original = new AudioAsset(mockAudioData, { duration: 120, format: 'mp3' });
      const cloned = original.clone();

      expect(cloned.metadata).toEqual(original.metadata);
      expect(cloned.data).toEqual(original.data);
      expect(cloned.data).not.toBe(original.data); // Different buffer
      expect(cloned).not.toBe(original);
    });
  });

  describe('Asset Validation', () => {
    it('should validate asset data', () => {
      const validAsset = new AudioAsset(mockAudioData, { format: 'mp3' });
      const invalidAsset = new AudioAsset(Buffer.alloc(0), { format: 'mp3' });

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
