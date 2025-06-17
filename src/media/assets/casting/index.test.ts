/**
 * Asset Role Casting Tests
 * 
 * Tests for the automatic role casting system.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MP3Asset, MP4Asset, TextAsset } from '../types';
import { Speech, Audio, Video, Text, hasVideoRole } from '../roles';
import {
  castToSpeech, castToAudio, castToVideo, castToText,
  canCastToSpeech, canCastToAudio, canCastToVideo, canCastToText,
  safeCastToSpeech, safeCastToAudio, safeCastToVideo, safeCastToText,
  castAssetToAllRoles, getAvailableRoles,
  RoleCastingError, castToSpeechWithError,
  SpeechInput, AudioInput, VideoInput, TextInput
} from './index';

describe('Asset Role Casting System', () => {
  let mockAudioData: Buffer;
  let mockVideoData: Buffer;
  let mockTextData: Buffer;

  beforeEach(() => {
    mockAudioData = Buffer.from('fake audio data');
    mockVideoData = Buffer.from('fake video data');
    mockTextData = Buffer.from('Hello world');
  });

  describe('Direct Role Casting', () => {
    describe('castToSpeech', () => {
      it('should cast Speech object directly', () => {
        const speech = new Speech(mockAudioData, 'en', 'John');
        const result = castToSpeech(speech);
        
        expect(result).toBe(speech);
      });

      it('should cast MP3Asset to Speech', () => {
        const asset = new MP3Asset(mockAudioData, { language: 'en', speaker: 'John' });
        const result = castToSpeech(asset);
        
        expect(result).toBeInstanceOf(Speech);
        expect(result.language).toBe('en');
        expect(result.speaker).toBe('John');
      });

      it('should cast MP4Asset to Speech', () => {
        const asset = new MP4Asset(mockVideoData, { language: 'es' });
        const result = castToSpeech(asset);
        
        expect(result).toBeInstanceOf(Speech);
        expect(result.language).toBe('es');
      });

      it('should throw error for TextAsset', () => {
        const asset = new TextAsset(mockTextData);
        
        expect(() => castToSpeech(asset as any))
          .toThrow('Input cannot be cast to Speech: missing SpeechRole capability');
      });
    });

    describe('castToAudio', () => {
      it('should cast Audio object directly', () => {
        const audio = new Audio(mockAudioData, 'mp3');
        const result = castToAudio(audio);
        
        expect(result).toBe(audio);
      });

      it('should cast MP3Asset to Audio', () => {
        const asset = new MP3Asset(mockAudioData, { duration: 120 });
        const result = castToAudio(asset);
        
        expect(result).toBeInstanceOf(Audio);
        expect(result.format).toBe('mp3');
        expect(result.getDuration()).toBe(120);
      });

      it('should cast MP4Asset to Audio', () => {
        const asset = new MP4Asset(mockVideoData);
        const result = castToAudio(asset);
        
        expect(result).toBeInstanceOf(Audio);
        expect(result.format).toBe('mp3'); // Extracted audio format
      });

      it('should throw error for TextAsset', () => {
        const asset = new TextAsset(mockTextData);
        
        expect(() => castToAudio(asset as any))
          .toThrow('Input cannot be cast to Audio: missing AudioRole capability');
      });
    });

    describe('castToVideo', () => {
      it('should cast Video object directly', () => {
        const video = new Video(mockVideoData, 'mp4');
        const result = castToVideo(video);
        
        expect(result).toBe(video);
      });

      it('should cast MP4Asset to Video', () => {
        const asset = new MP4Asset(mockVideoData, { width: 1920, height: 1080 });
        const result = castToVideo(asset);
        
        expect(result).toBeInstanceOf(Video);
        expect(result.format).toBe('mp4');
        expect(result.getDimensions()).toEqual({ width: 1920, height: 1080 });
      });

      it('should throw error for MP3Asset', () => {
        const asset = new MP3Asset(mockAudioData);
        
        expect(() => castToVideo(asset as any))
          .toThrow('Input cannot be cast to Video: missing VideoRole capability');
      });
    });

    describe('castToText', () => {
      it('should cast Text object directly', () => {
        const text = new Text('Hello world', 'en');
        const result = castToText(text);
        
        expect(result).toBe(text);
      });

      it('should cast TextAsset to Text', () => {
        const asset = TextAsset.fromString('Hello world', { language: 'en' });
        const result = castToText(asset);
        
        expect(result).toBeInstanceOf(Text);
        expect(result.content).toBe('Hello world');
        expect(result.language).toBe('en');
      });

      it('should throw error for MP3Asset', () => {
        const asset = new MP3Asset(mockAudioData);
        
        expect(() => castToText(asset as any))
          .toThrow('Input cannot be cast to Text: missing TextRole capability');
      });
    });
  });

  describe('Type Validation', () => {
    it('should correctly validate Speech casting capability', () => {
      const speech = new Speech(mockAudioData);
      const mp3Asset = new MP3Asset(mockAudioData);
      const textAsset = new TextAsset(mockTextData);
      
      expect(canCastToSpeech(speech)).toBe(true);
      expect(canCastToSpeech(mp3Asset)).toBe(true);
      expect(canCastToSpeech(textAsset)).toBe(false);
      expect(canCastToSpeech('invalid')).toBe(false);
    });

    it('should correctly validate Audio casting capability', () => {
      const audio = new Audio(mockAudioData, 'mp3');
      const mp3Asset = new MP3Asset(mockAudioData);
      const mp4Asset = new MP4Asset(mockVideoData);
      const textAsset = new TextAsset(mockTextData);
      
      expect(canCastToAudio(audio)).toBe(true);
      expect(canCastToAudio(mp3Asset)).toBe(true);
      expect(canCastToAudio(mp4Asset)).toBe(true);
      expect(canCastToAudio(textAsset)).toBe(false);
    });

    it('should correctly validate Video casting capability', () => {
      const video = new Video(mockVideoData, 'mp4');
      const mp4Asset = new MP4Asset(mockVideoData);
      const mp3Asset = new MP3Asset(mockAudioData);
      
      expect(canCastToVideo(video)).toBe(true);
      expect(canCastToVideo(mp4Asset)).toBe(true);
      expect(canCastToVideo(mp3Asset)).toBe(false);
    });

    it('should correctly validate Text casting capability', () => {
      const text = new Text('Hello');
      const textAsset = new TextAsset(mockTextData);
      const mp3Asset = new MP3Asset(mockAudioData);
      
      expect(canCastToText(text)).toBe(true);
      expect(canCastToText(textAsset)).toBe(true);
      expect(canCastToText(mp3Asset)).toBe(false);
    });
  });

  describe('Safe Casting', () => {
    it('should safely cast valid inputs', () => {
      const mp3Asset = new MP3Asset(mockAudioData);
      
      const speech = safeCastToSpeech(mp3Asset);
      const audio = safeCastToAudio(mp3Asset);
      
      expect(speech).toBeInstanceOf(Speech);
      expect(audio).toBeInstanceOf(Audio);
    });

    it('should return undefined for invalid inputs', () => {
      const textAsset = new TextAsset(mockTextData);
      
      const speech = safeCastToSpeech(textAsset);
      const audio = safeCastToAudio(textAsset);
      const video = safeCastToVideo(textAsset);
      
      expect(speech).toBeUndefined();
      expect(audio).toBeUndefined();
      expect(video).toBeUndefined();
    });

    it('should return undefined for completely invalid inputs', () => {
      const invalidInput = 'not an asset';
      
      expect(safeCastToSpeech(invalidInput)).toBeUndefined();
      expect(safeCastToAudio(invalidInput)).toBeUndefined();
      expect(safeCastToVideo(invalidInput)).toBeUndefined();
      expect(safeCastToText(invalidInput)).toBeUndefined();
    });
  });

  describe('Multi-Role Casting', () => {
    it('should cast MP3Asset to all supported roles', () => {
      const asset = new MP3Asset(mockAudioData, { language: 'en' });
      const roles = castAssetToAllRoles(asset);
      
      expect(roles.speech).toBeInstanceOf(Speech);
      expect(roles.audio).toBeInstanceOf(Audio);
      expect(roles.video).toBeUndefined();
      expect(roles.text).toBeUndefined();
    });

    it('should cast MP4Asset to all supported roles', () => {
      const asset = new MP4Asset(mockVideoData, { language: 'en' });
      const roles = castAssetToAllRoles(asset);
      
      expect(roles.speech).toBeInstanceOf(Speech);
      expect(roles.audio).toBeInstanceOf(Audio);
      expect(roles.video).toBeInstanceOf(Video);
      expect(roles.text).toBeUndefined();
    });

    it('should cast TextAsset to supported roles only', () => {
      const asset = new TextAsset(mockTextData);
      const roles = castAssetToAllRoles(asset);
      
      expect(roles.speech).toBeUndefined();
      expect(roles.audio).toBeUndefined();
      expect(roles.video).toBeUndefined();
      expect(roles.text).toBeInstanceOf(Text);
    });
  });

  describe('Available Roles', () => {
    it('should return correct available roles for MP3Asset', () => {
      const asset = new MP3Asset(mockAudioData);
      const roles = getAvailableRoles(asset);
      
      expect(roles).toContain('speech');
      expect(roles).toContain('audio');
      expect(roles).not.toContain('video');
      expect(roles).not.toContain('text');
    });

    it('should return correct available roles for MP4Asset', () => {
      const asset = new MP4Asset(mockVideoData);
      const roles = getAvailableRoles(asset);
      
      expect(roles).toContain('speech');
      expect(roles).toContain('audio');
      expect(roles).toContain('video');
      expect(roles).not.toContain('text');
    });

    it('should return correct available roles for TextAsset', () => {
      const asset = new TextAsset(mockTextData);
      const roles = getAvailableRoles(asset);
      
      expect(roles).not.toContain('speech');
      expect(roles).not.toContain('audio');
      expect(roles).not.toContain('video');
      expect(roles).toContain('text');
    });
  });

  describe('Enhanced Error Handling', () => {
    it('should throw RoleCastingError with available roles', () => {
      const textAsset = new TextAsset(mockTextData);
      
      expect(() => castToSpeechWithError(textAsset))
        .toThrow(RoleCastingError);
      
      try {
        castToSpeechWithError(textAsset);
      } catch (error) {
        expect(error).toBeInstanceOf(RoleCastingError);
        expect((error as RoleCastingError).targetRole).toBe('speech');
        expect((error as RoleCastingError).availableRoles).toEqual(['text']);
      }
    });
  });

  describe('TypeScript Type Compatibility', () => {
    it('should accept correct types for SpeechInput', () => {
      const speech = new Speech(mockAudioData);
      const mp3Asset = new MP3Asset(mockAudioData);

      // These should compile without errors
      const speechInput1: SpeechInput = speech;
      const speechInput2: SpeechInput = mp3Asset;

      expect(speechInput1).toBe(speech);
      expect(speechInput2).toBe(mp3Asset);
    });

    it('should accept correct types for AudioInput', () => {
      const audio = new Audio(mockAudioData, 'mp3');
      const mp3Asset = new MP3Asset(mockAudioData);
      const mp4Asset = new MP4Asset(mockVideoData);

      // These should compile without errors
      const audioInput1: AudioInput = audio;
      const audioInput2: AudioInput = mp3Asset;
      const audioInput3: AudioInput = mp4Asset;

      expect(audioInput1).toBe(audio);
      expect(audioInput2).toBe(mp3Asset);
      expect(audioInput3).toBe(mp4Asset);
    });
  });

  describe('Source Asset Preservation', () => {
    it('should preserve source Asset reference in role objects', () => {
      const mp4Asset = new MP4Asset(mockVideoData, {
        width: 1920,
        height: 1080,
        language: 'en'
      });

      // Extract different roles
      const speech = mp4Asset.asSpeech();
      const audio = mp4Asset.asAudio();
      const video = mp4Asset.asVideo();

      // All role objects should reference the original Asset
      expect(speech.sourceAsset).toBe(mp4Asset);
      expect(audio.sourceAsset).toBe(mp4Asset);
      expect(video.sourceAsset).toBe(mp4Asset);
    });

    it('should allow accessing broader capabilities through sourceAsset', () => {
      const mp4Asset = new MP4Asset(mockVideoData, {
        width: 1920,
        height: 1080,
        language: 'en'
      });

      // Use for speech processing
      const speech = castToSpeech(mp4Asset);

      // Later, access video capabilities from the speech result
      expect(speech.sourceAsset).toBe(mp4Asset);

      if (speech.sourceAsset && hasVideoRole(speech.sourceAsset)) {
        const video = speech.sourceAsset.asVideo();
        expect(video.getDimensions()).toEqual({ width: 1920, height: 1080 });
      }
    });

    it('should maintain source Asset through transformation chain', () => {
      const mp4Asset = new MP4Asset(mockVideoData, { language: 'en' });

      // Simulate a transformation pipeline
      const speech = castToSpeech(mp4Asset);

      // Create a new Text object (simulating model output)
      const text = new Text(
        'Transcribed text',
        'en',
        0.95,
        { processingTime: 1000 },
        speech.sourceAsset // Preserve source Asset
      );

      // Text should still reference the original MP4Asset
      expect(text.sourceAsset).toBe(mp4Asset);

      // Can still access video capabilities
      if (text.sourceAsset && hasVideoRole(text.sourceAsset)) {
        const video = text.sourceAsset.asVideo();
        expect(video).toBeInstanceOf(Video);
      }
    });
  });
});
