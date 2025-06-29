/**
 * Asset Tests - Updated for Universal Role Compatibility
 * 
 * Tests the new generic asset system with multi-role implementations.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'fs';
import { AudioAsset, VideoAsset, TextAsset, ImageAsset } from './types';
import { SmartAssetFactory } from './SmartAssetFactory';
import { hasAudioRole, hasVideoRole, hasTextRole } from './roles';
import { Audio, Video, Text, Image } from './roles';

// Mock fs
vi.mock('fs');
const mockFs = vi.mocked(fs);

// Mock data
const mockAudioData = Buffer.from('mock audio data', 'utf8');
const mockVideoData = Buffer.from('mock video data', 'utf8');
const mockImageData = Buffer.from('mock image data', 'utf8');
const mockTextData = Buffer.from('Hello, world!', 'utf8');

describe('Universal Asset System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('AudioAsset', () => {
    it('should create audio asset with metadata', () => {
      const asset = new AudioAsset(mockAudioData, { 
        duration: 120, 
        format: 'mp3',
        mimeType: 'audio/mpeg'
      });
      
      expect(asset.data).toBe(mockAudioData);
      expect(asset.metadata.duration).toBe(120);
      expect(asset.metadata.format).toBe('mp3');
      expect(asset.metadata.category).toBe('audio');
      expect(asset.metadata.hasAudio).toBe(true);
    });

    it('should implement multiple roles', () => {
      const asset = new AudioAsset(mockAudioData, { format: 'mp3' });
      
      // Should implement AudioRole and TextRole
      expect(asset.canPlayRole(Audio)).toBe(true);  // Identity
      expect(asset.canPlayRole(Text)).toBe(true);   // Speech-to-text conversion
    });

    it('should load from file', () => {
      mockFs.readFileSync.mockReturnValue(mockAudioData);
      
      const asset = AudioAsset.fromFile('/path/to/audio.mp3');
      
      expect(mockFs.readFileSync).toHaveBeenCalledWith('/path/to/audio.mp3');
      expect(asset.metadata.sourceFile).toBe('/path/to/audio.mp3');
      expect(asset.metadata.format).toBe('mp3');
    });
  });

  describe('VideoAsset', () => {
    it('should create video asset with metadata', () => {
      const asset = new VideoAsset(mockVideoData, {
        duration: 300,
        format: 'mp4',
        width: 1920,
        height: 1080
      });
      
      expect(asset.data).toBe(mockVideoData);
      expect(asset.metadata.duration).toBe(300);
      expect(asset.metadata.format).toBe('mp4');
      expect(asset.metadata.category).toBe('video');
      expect(asset.metadata.hasAudio).toBe(true);
      expect(asset.metadata.hasVideo).toBe(true);
    });

    it('should implement multiple roles', () => {
      const asset = new VideoAsset(mockVideoData, { format: 'mp4' });
      
      // Should implement VideoRole, AudioRole, and ImageRole
      expect(asset.canPlayRole(Video)).toBe(true);  // Identity
      expect(asset.canPlayRole(Audio)).toBe(true);  // Audio extraction
      expect(asset.canPlayRole(Image)).toBe(true);  // Frame extraction
    });
  });

  describe('TextAsset', () => {
    it('should create text asset from string', () => {
      const content = 'Hello, world!';
      const asset = TextAsset.fromString(content);
      
      expect(asset.content).toBe(content);
      expect(asset.metadata.category).toBe('text');
      expect(asset.metadata.encoding).toBe('utf8');
      expect(asset.metadata.wordCount).toBe(2);
    });

    it('should implement ALL roles for maximum compatibility', () => {
      const asset = TextAsset.fromString('A beautiful sunset over mountains');
      
      // Should implement ALL roles - this is the key to universal compatibility
      expect(asset.canPlayRole(Text)).toBe(true);   // Identity
      expect(asset.canPlayRole(Audio)).toBe(true);  // TTS conversion
      expect(asset.canPlayRole(Image)).toBe(true);  // Text-to-image
      expect(asset.canPlayRole(Video)).toBe(true);  // Text-to-video
    });

    it('should load from file', () => {
      const content = 'File content';
      mockFs.readFileSync.mockReturnValue(content);
      
      const asset = TextAsset.fromFile('/path/to/text.txt');
      
      expect(mockFs.readFileSync).toHaveBeenCalledWith('/path/to/text.txt', 'utf8');
      expect(asset.content).toBe(content);
      expect(asset.metadata.format).toBe('txt');
    });
  });

  describe('ImageAsset', () => {
    it('should create image asset with metadata', () => {
      const asset = new ImageAsset(mockImageData, {
        format: 'png',
        width: 800,
        height: 600
      });
      
      expect(asset.data).toBe(mockImageData);
      expect(asset.metadata.format).toBe('png');
      expect(asset.metadata.category).toBe('image');
    });

    it('should implement multiple roles', () => {
      const asset = new ImageAsset(mockImageData, { format: 'png' });
      
      // Should implement ImageRole, VideoRole, and TextRole
      expect(asset.canPlayRole(Image)).toBe(true);  // Identity
      expect(asset.canPlayRole(Video)).toBe(true);  // Image-to-video
      expect(asset.canPlayRole(Text)).toBe(true);   // OCR conversion
    });
  });

  describe('SmartAssetFactory', () => {
    it('should load assets with generic typing', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(mockVideoData);
      
      const asset = await SmartAssetFactory.load<VideoAsset>('/path/to/video.mp4');
      
      expect(asset).toBeInstanceOf(VideoAsset);
      expect(asset.metadata.format).toBe('mp4');
    });

    it('should auto-detect format', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(mockAudioData);
      
      const asset = await SmartAssetFactory.load('/path/to/audio.wav');
      
      expect(asset).toBeInstanceOf(AudioAsset);
    });
  });

  describe('Universal Role Compatibility', () => {
    it('should enable identity transformations', async () => {
      const textAsset = TextAsset.fromString('Test content');
      const audioAsset = new AudioAsset(mockAudioData, { format: 'mp3' });
      
      // Identity transformations should work
      const textToText = await textAsset.asRole(Text);
      const audioToAudio = await audioAsset.asRole(Audio);
      
      expect(textToText).toBe(textAsset);
      expect(audioToAudio).toBe(audioAsset);
    });

    it('should support cross-modal transformations', () => {
      const textAsset = TextAsset.fromString('Generate an image of a sunset');
      const videoAsset = new VideoAsset(mockVideoData, { format: 'mp4' });
      
      // Cross-modal capabilities should be available
      expect(textAsset.canPlayRole(Image)).toBe(true);  // Text → Image
      expect(textAsset.canPlayRole(Audio)).toBe(true);  // Text → Audio  
      expect(videoAsset.canPlayRole(Audio)).toBe(true); // Video → Audio
      expect(videoAsset.canPlayRole(Image)).toBe(true); // Video → Image
    });
  });

  describe('Legacy Role Checking', () => {
    it('should maintain backward compatibility', () => {
      const audioAsset = new AudioAsset(mockAudioData, { format: 'mp3' });
      const videoAsset = new VideoAsset(mockVideoData, { format: 'mp4' });
      const textAsset = TextAsset.fromString('Hello');
      
      expect(hasAudioRole(audioAsset)).toBe(true);
      expect(hasVideoRole(videoAsset)).toBe(true);
      expect(hasTextRole(textAsset)).toBe(true);
    });
  });
});

describe('Real-World Universal Compatibility Scenarios', () => {
  it('should enable content creation pipelines', () => {
    const script = TextAsset.fromString('A day in the life of a developer');
    
    // All these conversions should be possible
    expect(script.canPlayRole(Audio)).toBe(true);  // Script → Podcast
    expect(script.canPlayRole(Image)).toBe(true);  // Script → Thumbnail
    expect(script.canPlayRole(Video)).toBe(true);  // Script → Video
  });

  it('should enable analysis pipelines', () => {
    const footage = new VideoAsset(mockVideoData, { format: 'mp4' });
    
    // Multi-modal analysis should be possible
    expect(footage.canPlayRole(Audio)).toBe(true);  // Extract audio
    expect(footage.canPlayRole(Image)).toBe(true);  // Extract frames
    // Note: Video → Text would require OCR + speech-to-text providers
  });

  it('should enable any-to-any model input', () => {
    const textAsset = TextAsset.fromString('A beautiful landscape');
    const videoAsset = new VideoAsset(mockVideoData, { format: 'mp4' });
    const audioAsset = new AudioAsset(mockAudioData, { format: 'mp3' });
    
    // ImageToVideoModel pattern: ALL these should work
    // const video1 = await imageToVideoModel.transform(textAsset);     // Text→Image→Video
    // const video2 = await imageToVideoModel.transform(videoAsset);    // Video→Image→Video  
    // const video3 = await imageToVideoModel.transform(audioAsset);    // Audio→Image→Video
    
    expect(textAsset.canPlayRole(Image)).toBe(true);
    expect(videoAsset.canPlayRole(Image)).toBe(true); 
    // Note: AudioAsset → Image would need a waveform visualization provider
  });
});
