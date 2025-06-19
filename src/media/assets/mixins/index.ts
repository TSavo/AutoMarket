/**
 * Asset Role Mixins
 * 
 * TypeScript mixin functions that add role capabilities to Asset classes.
 * These mixins enable Assets to play different roles (Speech, Audio, Video, Text).
 */

import { Asset, BaseAsset, Constructor } from '../Asset';
import {
  Speech, Audio, Video, Text,
  SpeechRole, AudioRole, VideoRole, TextRole,
  AudioMetadata, VideoMetadata, TextMetadata,
  AudioFormat, VideoFormat
} from '../roles';
import { FFMPEGDockerProvider } from '../../providers/FFMPEGDockerProvider';
import { VideoToAudioProvider } from '../../registry/ProviderRoles';

// ============================================================================
// SMART FFMPEG PROVIDER SINGLETON
// ============================================================================

/**
 * Singleton FFMPEG provider for smart asset processing
 * Replaces the old hardcoded FFmpegService with provider-based architecture
 */
class SmartFFMPEGProvider {
  private static instance: VideoToAudioProvider | null = null;

  static async getInstance(): Promise<VideoToAudioProvider> {
    if (!SmartFFMPEGProvider.instance) {
      console.log('[SmartFFMPEGProvider] Initializing FFMPEG Docker Provider...');
      SmartFFMPEGProvider.instance = new FFMPEGDockerProvider({
        baseUrl: 'http://localhost:8006',
        serviceName: 'ffmpeg-service',
        containerName: 'ffmpeg-service',
        composeFile: 'services/ffmpeg/docker-compose.yml'
      });

      // Ensure service is started
      const started = await SmartFFMPEGProvider.instance.startService();
      if (!started) {
        console.warn('[SmartFFMPEGProvider] Failed to start FFMPEG service, will retry on demand');
      }
    }

    return SmartFFMPEGProvider.instance;
  }

  static reset() {
    SmartFFMPEGProvider.instance = null;
  }
}

// ============================================================================
// SPEECH ROLE MIXIN
// ============================================================================

/**
 * Mixin that adds SpeechRole capabilities to an Asset
 */
export function withSpeechRole<T extends Constructor<BaseAsset>>(Base: T) {
  return class extends Base implements SpeechRole {
    /**
     * Convert this Asset to Speech data
     * For video assets, extracts audio using FFmpeg
     */
    async asSpeech(): Promise<Speech> {
      console.log(`[SpeechRole Mixin] asSpeech() called on format: ${this.metadata.format}`);
      
      // Check if this is a video format that needs audio extraction
      if (this.isVideoFormatForSpeech()) {
        console.log('[SpeechRole Mixin] Video format detected, extracting speech from video using FFmpeg...');
        return await this.extractSpeechFromVideo();
      }
      
      console.log('[SpeechRole Mixin] Audio format detected, direct conversion to Speech');
      // For audio formats, return as Speech
      return new Speech(this.data, this);
    }

    /**
     * Extract speech from video using Smart FFMPEG Provider
     */
    private async extractSpeechFromVideo(): Promise<Speech> {
      console.log('[SpeechRole Mixin] Starting Smart FFMPEG provider audio extraction...');
      
      try {
        // Get the provider and model
        const provider = await SmartFFMPEGProvider.getInstance();
        const model = await provider.createVideoToAudioModel('ffmpeg-extract-audio');

        console.log(`[SpeechRole Mixin] Using Smart FFMPEG provider for format: ${this.getFileExtension()}`);
        
        // For video files, we need to ensure we have VideoRole capabilities
        // Use Smart Asset Loading to get a properly composed asset with all roles
        let audio;
        if (this.metadata?.sourceFile) {
          const { AssetLoader } = await import('../SmartAssetFactory');
          const smartAsset = AssetLoader.load(this.metadata.sourceFile);
          audio = await model.transform(smartAsset, {
            outputFormat: 'wav',
            sampleRate: 44100,
            channels: 2
          });
        } else {
          throw new Error('Cannot extract speech from video: source file information missing');
        }
        
        console.log(`[SpeechRole Mixin] Smart FFMPEG extraction successful, audio buffer size: ${audio.data.length} bytes`);
        
        // Convert Audio to Speech (Audio can play Speech role)
        return new Speech(audio.data, this);
      } catch (error) {
        console.error('[SpeechRole Mixin] Failed to extract speech from video using Smart FFMPEG:', error);
        // Fallback: return speech object with original data
        return new Speech(this.data, this);
      }
    }

    /**
     * Check if this Asset represents a video format (for speech extraction)
     */
    private isVideoFormatForSpeech(): boolean {
      const videoFormats = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'];
      const format = this.metadata.format?.toLowerCase() || '';
      const isVideo = videoFormats.includes(format);
      console.log(`[SpeechRole Mixin] isVideoFormatForSpeech check: format="${format}", isVideo=${isVideo}`);
      return isVideo;
    }

    /**
     * Check if this Asset can play the Speech role
     */
    canPlaySpeechRole(): boolean {
      return this.isValid() && this.hasAudioContent();
    }



    /**
     * Check if Asset contains audio content that could be speech
     */
    private hasAudioContent(): boolean {
      // This is a basic check - concrete classes can override for more specific logic
      return this.data.length > 0 && (
        this.metadata.format === 'mp3' ||
        this.metadata.format === 'wav' ||
        this.metadata.format === 'flac' ||
        this.metadata.format === 'm4a' ||
        this.metadata.format === 'mp4' ||
        this.metadata.format === 'webm'
      );
    }

    /**
     * Override getRoles to include Speech
     */
    getRoles(): string[] {
      const baseRoles = super.getRoles();
      return [...baseRoles, 'speech'];
    }

    /**
     * Override canPlayRole to include Speech
     */
    canPlayRole(role: string): boolean {
      if (role === 'speech') {
        return this.canPlaySpeechRole();
      }
      return super.canPlayRole(role);
    }
  };
}

// ============================================================================
// AUDIO ROLE MIXIN
// ============================================================================

/**
 * Mixin that adds AudioRole capabilities to an Asset
 */
export function withAudioRole<T extends Constructor<BaseAsset>>(Base: T) {
  return class extends Base implements AudioRole {
    /**
     * Convert this Asset to Audio data
     * For video assets, extracts audio using FFmpeg
     */
    async asAudio(): Promise<Audio> {
      // Check if this is a video format that needs audio extraction
      if (this.isVideoFormatForAudio()) {
        return await this.extractAudioFromVideo();
      }
      
      // For audio formats, return as-is
      return new Audio(this.data, this);
    }

    /**
     * Extract audio from video using Smart FFMPEG Provider
     */
    private async extractAudioFromVideo(): Promise<Audio> {
      console.log('[AudioRole Mixin] Starting Smart FFMPEG provider audio extraction...');
      
      try {
        // Get the provider and model
        const provider = await SmartFFMPEGProvider.getInstance();
        const model = await provider.createVideoToAudioModel('ffmpeg-extract-audio');

        console.log(`[AudioRole Mixin] Using Smart FFMPEG provider for format: ${this.getFileExtension()}`);
        
        // For video files, we need to ensure we have VideoRole capabilities
        // Use Smart Asset Loading to get a properly composed asset with all roles
        let audio;
        if (this.metadata?.sourceFile) {
          const { AssetLoader } = await import('../SmartAssetFactory');
          const smartAsset = AssetLoader.load(this.metadata.sourceFile);
          audio = await model.transform(smartAsset, {
            outputFormat: 'wav',
            sampleRate: 44100,
            channels: 2
          });
        } else {
          throw new Error('Cannot extract audio from video: source file information missing');
        }
        
        console.log(`[AudioRole Mixin] Smart FFMPEG extraction successful, audio buffer size: ${audio.data.length} bytes`);
        return audio;
      } catch (error) {
        console.error('[AudioRole Mixin] Failed to extract audio from video using Smart FFMPEG:', error);
        // Fallback to original data
        return new Audio(this.data, this);
      }
    }

    /**
     * Check if this Asset represents a video format (for audio extraction)
     */
    private isVideoFormatForAudio(): boolean {
      const videoFormats = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'];
      return videoFormats.includes(this.metadata.format?.toLowerCase() || '');
    }



    /**
     * Check if this Asset can play the Audio role
     */
    canPlayAudioRole(): boolean {
      return this.isValid() && this.isAudioFormat();
    }



    /**
     * Check if this Asset represents an audio format
     */
    private isAudioFormat(): boolean {
      const audioFormats = ['mp3', 'wav', 'flac', 'm4a', 'ogg', 'webm', 'aac', 'opus', 'wma'];
      const format = this.metadata.format?.toLowerCase() || '';

      // Direct audio formats
      if (audioFormats.includes(format)) {
        return true;
      }

      // Video formats that contain audio
      const videoWithAudio = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv'];
      return videoWithAudio.includes(format);
    }

    /**
     * Override getRoles to include Audio
     */
    getRoles(): string[] {
      const baseRoles = super.getRoles();
      return [...baseRoles, 'audio'];
    }

    /**
     * Override canPlayRole to include Audio
     */
    canPlayRole(role: string): boolean {
      if (role === 'audio') {
        return this.canPlayAudioRole();
      }
      return super.canPlayRole(role);
    }
  };
}

// ============================================================================
// VIDEO ROLE MIXIN
// ============================================================================

/**
 * Mixin that adds VideoRole capabilities to an Asset
 */
export function withVideoRole<T extends Constructor<BaseAsset>>(Base: T) {
  return class extends Base implements VideoRole {
    /**
     * Convert this Asset to Video data
     */
    async asVideo(): Promise<Video> {
      const videoMetadata = this.getVideoMetadata();
      const format = videoMetadata.format || this.detectVideoFormat();

      return new Video(this.data, format, videoMetadata, this); // Pass reference to source Asset
    }

    /**
     * Get video-specific metadata
     */
    getVideoMetadata(): VideoMetadata {
      const format = this.metadata.format as VideoFormat || this.detectVideoFormat();
      return {
        format,
        duration: this.metadata.duration,
        width: this.metadata.width,
        height: this.metadata.height,
        frameRate: this.metadata.frameRate,
        codec: this.metadata.codec,
        hasAudio: this.metadata.hasAudio,
        ...this.metadata.video
      };
    }

    /**
     * Check if this Asset can play the Video role
     */
    canPlayVideoRole(): boolean {
      return this.isValid() && this.isVideoFormat();
    }

    /**
     * Detect video format from metadata or file extension
     */
    private detectVideoFormat(): VideoFormat {
      // Try to get format from metadata first
      if (this.metadata.format) {
        const format = this.metadata.format.toLowerCase();
        if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'].includes(format)) {
          return format as VideoFormat;
        }
      }

      // Try to get from source file extension
      if (this.metadata.sourceFile) {
        const ext = this.metadata.sourceFile.split('.').pop()?.toLowerCase();
        if (ext && ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'].includes(ext)) {
          return ext as VideoFormat;
        }
      }

      // Default fallback
      return 'mp4';
    }

    /**
     * Check if this Asset represents a video format
     */
    private isVideoFormat(): boolean {
      const videoFormats = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'];
      return videoFormats.includes(this.metadata.format?.toLowerCase() || '');
    }

    /**
     * Override getRoles to include Video
     */
    getRoles(): string[] {
      const baseRoles = super.getRoles();
      return [...baseRoles, 'video'];
    }

    /**
     * Override canPlayRole to include Video
     */
    canPlayRole(role: string): boolean {
      if (role === 'video') {
        return this.canPlayVideoRole();
      }
      return super.canPlayRole(role);
    }
  };
}

// ============================================================================
// TEXT ROLE MIXIN
// ============================================================================

/**
 * Mixin that adds TextRole capabilities to an Asset
 */
export function withTextRole<T extends Constructor<BaseAsset>>(Base: T) {
  return class extends Base implements TextRole {
    /**
     * Convert this Asset to Text data
     */
    async asText(): Promise<Text> {
      const textMetadata = this.getTextMetadata();
      const content = this.extractTextContent();

      return new Text(
        content,
        textMetadata.language || this.metadata.language,
        textMetadata.confidence || this.metadata.confidence,
        textMetadata,
        this // Pass reference to source Asset
      );
    }

    /**
     * Get text-specific metadata
     */
    getTextMetadata(): TextMetadata {
      return {
        language: this.metadata.language,
        confidence: this.metadata.confidence,
        encoding: this.metadata.encoding || 'utf-8',
        wordCount: this.metadata.wordCount,
        ...this.metadata.text
      };
    }

    /**
     * Check if this Asset can play the Text role
     */
    canPlayTextRole(): boolean {
      return this.isValid() && this.isTextFormat();
    }

    /**
     * Extract text content from the Asset data
     */
    private extractTextContent(): string {
      try {
        // Assume UTF-8 encoding by default
        const encoding = this.metadata.encoding || 'utf-8';
        return this.data.toString(encoding as BufferEncoding);
      } catch (error) {
        // Fallback to binary string if UTF-8 fails
        return this.data.toString('binary');
      }
    }

    /**
     * Check if this Asset represents a text format
     */
    private isTextFormat(): boolean {
      const textFormats = ['txt', 'md', 'json', 'xml', 'html', 'csv'];
      return textFormats.includes(this.metadata.format?.toLowerCase() || '');
    }

    /**
     * Override getRoles to include Text
     */
    getRoles(): string[] {
      const baseRoles = super.getRoles();
      return [...baseRoles, 'text'];
    }

    /**
     * Override canPlayRole to include Text
     */
    canPlayRole(role: string): boolean {
      if (role === 'text') {
        return this.canPlayTextRole();
      }
      return super.canPlayRole(role);
    }
  };
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Type helper for Assets with SpeechRole
 */
export type SpeechCapableAsset = Asset & SpeechRole;

/**
 * Type helper for Assets with AudioRole
 */
export type AudioCapableAsset = Asset & AudioRole;

/**
 * Type helper for Assets with VideoRole
 */
export type VideoCapableAsset = Asset & VideoRole;

/**
 * Type helper for Assets with TextRole
 */
export type TextCapableAsset = Asset & TextRole;
