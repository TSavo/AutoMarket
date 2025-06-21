/**
 * Asset Role Mixins
 * 
 * TypeScript mixin functions that add role capabilities to Asset classes.
 * These mixins enable Assets to play different roles (Audio, Video, Text).
 */

import { Asset, BaseAsset, Constructor } from '../Asset';
import {
  Audio, Video, Text, Image,
  AudioRole, VideoRole, TextRole, ImageRole,
  AudioMetadata, VideoMetadata, TextMetadata, ImageMetadata,
  AudioFormat, VideoFormat, ImageFormat
} from '../roles';

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
     * Extract audio from video using Smart FFMPEG Provider (placeholder)
     */
    private async extractAudioFromVideo(): Promise<Audio> {
      console.log('[AudioRole Mixin] Video to audio extraction not implemented yet');
      
      // Fallback to original data
      return new Audio(this.data, this);
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
// IMAGE ROLE MIXIN
// ============================================================================

/**
 * Mixin that adds ImageRole capabilities to an Asset
 */
export function withImageRole<T extends Constructor<BaseAsset>>(Base: T) {
  return class extends Base implements ImageRole {
    /**
     * Convert this Asset to Image data
     * For already image assets, returns the data as-is
     */
    async asImage(): Promise<Image> {
      // For image assets, return the data directly
      const format = this.getImageFormat();
      
      return new Image(
        this.data,
        format,
        {
          format,
          fileSize: this.data.length,
          sourceFile: this.metadata.sourceFile
        },
        this
      );
    }    /**
     * Get image metadata
     */
    getImageMetadata(): ImageMetadata {
      return {
        format: this.getImageFormat(),
        fileSize: this.data.length,
        sourceFile: this.metadata.sourceFile,
        ...this.metadata
      } as ImageMetadata;
    }

    /**
     * Check if this Asset can play the Image role
     */
    canPlayImageRole(): boolean {
      const format = this.metadata.format?.toLowerCase();
      const imageFormats = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'tiff'];
      return imageFormats.includes(format || '');
    }

    /**
     * Get the image format from metadata or file extension
     */
    private getImageFormat(): ImageFormat {
      const format = this.metadata.format?.toLowerCase();
      const validFormats: ImageFormat[] = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'tiff'];
      
      if (format && validFormats.includes(format as ImageFormat)) {
        return format as ImageFormat;
      }
      
      // Default to png if unknown
      return 'png';
    }
  };
}

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

/**
 * Type helper for Assets with ImageRole
 */
export type ImageCapableAsset = Asset & ImageRole;
