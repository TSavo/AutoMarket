/**
 * Asset Role Mixins - Refactored for asRole<T>() Pattern
 * 
 * TypeScript mixin functions that add unified role capabilities to Asset classes.
 * These mixins enable Assets to use the universal asRole<T>() pattern.
 */

import { Asset, BaseAsset, Constructor } from '../Asset';
import {
  Audio, Video, Text, Image,
  AudioRole, VideoRole, TextRole, ImageRole,
  AudioMetadata, VideoMetadata, TextMetadata, ImageMetadata,
  AudioFormat, VideoFormat, ImageFormat
} from '../roles';
import { asRole } from '../RoleTransformation';

// ============================================================================
// AUDIO ROLE MIXIN
// ============================================================================

/**
 * Mixin that adds AudioRole capabilities to an Asset
 */
export function withAudioRole<T extends Constructor<BaseAsset>>(Base: T) {
  return class extends Base implements AudioRole {
    /**
     * Universal role transformation method
     * @param targetType - Target role class (Audio, Video, Text, Image)
     * @param modelId - Optional model ID
     */
    async asRole<TRole extends Audio | Video | Text | Image>(
      targetType: new (...args: any[]) => TRole,
      modelId: string = 'default'
    ): Promise<TRole> {
      return await asRole<TRole>(this, targetType, modelId);
    }

    /**
     * Check if this asset can play a specific role
     * @param targetType - Target role class to check
     */
    canPlayRole<TRole extends Audio | Video | Text | Image>(
      targetType: new (...args: any[]) => TRole
    ): boolean {
      if (targetType === Audio as any) {
        return this.isValid() && this.isAudioFormat();
      }
      // For other roles, delegate to their specific mixins
      return super.canPlayRole?.(targetType) || false;
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
     * Universal role transformation method
     * @param targetType - Target role class (Audio, Video, Text, Image)
     * @param modelId - Optional model ID
     */
    async asRole<TRole extends Audio | Video | Text | Image>(
      targetType: new (...args: any[]) => TRole,
      modelId: string = 'default'
    ): Promise<TRole> {
      return await asRole<TRole>(this, targetType, modelId);
    }

    /**
     * Check if this asset can play a specific role
     * @param targetType - Target role class to check
     */
    canPlayRole<TRole extends Audio | Video | Text | Image>(
      targetType: new (...args: any[]) => TRole
    ): boolean {
      if (targetType === Video as any) {
        return this.isValid() && this.isVideoFormat();
      }
      // For other roles, delegate to their specific mixins
      return super.canPlayRole?.(targetType) || false;
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
     * Universal role transformation method
     * @param targetType - Target role class (Audio, Video, Text, Image)
     * @param modelId - Optional model ID
     */
    async asRole<TRole extends Audio | Video | Text | Image>(
      targetType: new (...args: any[]) => TRole,
      modelId: string = 'default'
    ): Promise<TRole> {
      return await asRole<TRole>(this, targetType, modelId);
    }

    /**
     * Check if this asset can play a specific role
     * @param targetType - Target role class to check
     */
    canPlayRole<TRole extends Audio | Video | Text | Image>(
      targetType: new (...args: any[]) => TRole
    ): boolean {
      if (targetType === Text as any) {
        return this.isValid() && this.isTextFormat();
      }
      // For other roles, delegate to their specific mixins
      return super.canPlayRole?.(targetType) || false;
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
     * Universal role transformation method
     * @param targetType - Target role class (Audio, Video, Text, Image)
     * @param modelId - Optional model ID
     */
    async asRole<TRole extends Audio | Video | Text | Image>(
      targetType: new (...args: any[]) => TRole,
      modelId: string = 'default'
    ): Promise<TRole> {
      return await asRole<TRole>(this, targetType, modelId);
    }

    /**
     * Check if this asset can play a specific role
     * @param targetType - Target role class to check
     */
    canPlayRole<TRole extends Audio | Video | Text | Image>(
      targetType: new (...args: any[]) => TRole
    ): boolean {
      if (targetType === Image as any) {
        return this.isValid() && this.isImageFormat();
      }
      // For other roles, delegate to their specific mixins
      return super.canPlayRole?.(targetType) || false;
    }

    /**
     * Get image-specific metadata
     */
    getImageMetadata(): ImageMetadata {
      return {
        format: this.getImageFormat() as ImageFormat,
        width: this.metadata.width,
        height: this.metadata.height,
        colorSpace: this.metadata.colorSpace,
        ...this.metadata.image
      };
    }

    /**
     * Get image format from metadata or detect from data
     */
    private getImageFormat(): string {
      // Try to get format from metadata first
      if (this.metadata.format) {
        return this.metadata.format.toLowerCase();
      }

      // Try to detect from file extension
      if (this.metadata.sourceFile) {
        const ext = this.metadata.sourceFile.split('.').pop()?.toLowerCase();
        if (ext && ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'svg', 'webp'].includes(ext)) {
          return ext;
        }
      }

      // Default fallback
      return 'png';
    }

    /**
     * Check if this Asset represents an image format
     */
    private isImageFormat(): boolean {
      const imageFormats = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'svg', 'webp'];
      return imageFormats.includes(this.metadata.format?.toLowerCase() || '');
    }

    /**
     * Override getRoles to include Image
     */
    getRoles(): string[] {
      const baseRoles = super.getRoles();
      return [...baseRoles, 'image'];
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
