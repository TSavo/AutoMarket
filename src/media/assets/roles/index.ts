/**
 * Asset Roles and Core Media Types
 * 
 * Defines the role interfaces that Assets can implement and the core media types
 * that represent the actual data when an Asset plays a specific role.
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// CORE MEDIA TYPES
// ============================================================================

export type AudioFormat = 'mp3' | 'wav' | 'flac' | 'm4a' | 'ogg' | 'webm' | 'aac' | 'opus' | 'wma';
export type VideoFormat = 'mp4' | 'avi' | 'mov' | 'wmv' | 'flv' | 'webm' | 'mkv';
export type ImageFormat = 'png' | 'jpg' | 'jpeg' | 'gif' | 'webp' | 'svg' | 'bmp' | 'tiff';

export interface AudioMetadata {
  format: AudioFormat;
  duration?: number;
  sampleRate?: number;
  channels?: number;
  bitrate?: number;
  codec?: string;
  [key: string]: any;
}

export interface VideoMetadata {
  format: VideoFormat;
  duration?: number;
  width?: number;
  height?: number;
  frameRate?: number;
  codec?: string;
  hasAudio?: boolean;
  [key: string]: any;
}

export interface TextMetadata {
  language?: string;
  confidence?: number;
  encoding?: string;
  wordCount?: number;
  [key: string]: any;
}

export interface ImageMetadata {
  format?: ImageFormat;
  width?: number;
  height?: number;
  channels?: number;
  colorSpace?: string;
  compression?: string;
  dpi?: number;
  [key: string]: any;
}

/**
 * Audio - Represents audio data
 * Simple container for audio stream data
 */
export class Audio {
  constructor(
    public readonly data: Buffer,
    public readonly sourceAsset?: any // Reference to original Asset
  ) {}

  /**
   * Create Audio from file path
   */
  static fromFile(filePath: string): Audio {
    const fs = require('fs');
    const path = require('path');

    if (!fs.existsSync(filePath)) {
      throw new Error(`Audio file not found: ${filePath}`);
    }

    const data = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase().slice(1);

    // Create a simple source asset with basic metadata
    const sourceAsset = {
      metadata: {
        sourceFile: filePath,
        fileSize: data.length,
        format: ext
      }
    };

    return new Audio(data, sourceAsset);
  }

  /**
   * Detect audio format from data or source asset
   * Can be enhanced with ffprobe later
   */
  getFormat(): AudioFormat {
    // Try to detect from source asset metadata if available
    if (this.sourceAsset?.metadata?.format) {
      const format = this.sourceAsset.metadata.format.toLowerCase();
      if (['mp3', 'wav', 'flac', 'm4a', 'ogg', 'webm', 'aac', 'opus', 'wma'].includes(format)) {
        return format as AudioFormat;
      }
    }

    // Try to detect from source file extension if available
    if (this.sourceAsset?.metadata?.sourceFile) {
      const ext = this.sourceAsset.metadata.sourceFile.split('.').pop()?.toLowerCase();
      if (ext && ['mp3', 'wav', 'flac', 'm4a', 'ogg', 'webm', 'aac', 'opus', 'wma'].includes(ext)) {
        return ext as AudioFormat;
      }
    }

    // TODO: Use ffprobe to detect format from actual audio data
    // For now, default to wav
    return 'wav';
  }

  /**
   * Check if audio has valid data
   */
  isValid(): boolean {
    return this.data.length > 0;
  }

  /**
   * Get audio file size in bytes
   */
  getSize(): number {
    return this.data.length;
  }

  /**
   * Get human-readable file size
   */
  getHumanSize(): string {
    const size = this.getSize();
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }

  /**
   * Get audio duration (with lazy metadata extraction)
   */
  getDuration(): number | undefined {
    // Try to get from source asset metadata first
    if (this.sourceAsset?.metadata?.duration !== undefined) {
      return this.sourceAsset.metadata.duration;
    }

    // If not available, trigger extraction and return undefined for now
    this.extractMetadataIfNeeded().catch(err =>
      console.warn('[Audio] Metadata extraction failed:', err)
    );

    return this.sourceAsset?.metadata?.duration;
  }

  /**
   * Get human-readable duration
   */
  getHumanDuration(): string {
    const duration = this.getDuration();
    if (!duration) return 'unknown';

    const minutes = Math.floor(duration / 60);
    const seconds = Math.floor(duration % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Get audio format
   */
  get format(): AudioFormat {
    return this.getFormat();
  }

  /**
   * Get audio metadata
   */
  get metadata(): AudioMetadata | undefined {
    return this.sourceAsset?.metadata;
  }

  /**
   * Lazy metadata extraction using ffprobe
   */
  private async extractMetadataIfNeeded(): Promise<void> {
    if (this.sourceAsset?.metadata?._metadataExtracted) {
      return; // Already extracted
    }

    const sourceFile = this.sourceAsset?.metadata?.sourceFile;
    if (!sourceFile) {
      if (this.sourceAsset?.metadata) {
        this.sourceAsset.metadata._metadataExtracted = true;
      }
      return;
    }

    try {
      const { FFmpegService } = await import('../../services/FFmpegService');
      const ffmpegService = new FFmpegService();
      const extractedMetadata = await ffmpegService.getAudioMetadata(sourceFile);

      // Merge extracted metadata
      if (this.sourceAsset?.metadata) {
        Object.assign(this.sourceAsset.metadata, extractedMetadata);
        this.sourceAsset.metadata._metadataExtracted = true;
      }
      console.log(`[Audio] Extracted metadata for ${sourceFile}:`, extractedMetadata);
    } catch (error) {
      console.warn(`[Audio] Failed to extract metadata for ${sourceFile}:`, error.message);
      if (this.sourceAsset?.metadata) {
        this.sourceAsset.metadata._metadataExtracted = true;
      }
    }
  }

  toString(): string {
    const format = this.getFormat();
    const duration = this.getDuration();
    const size = this.getHumanSize();
    return `Audio(${format.toUpperCase()}${duration ? `, ${this.getHumanDuration()}` : ''}${size ? `, ${size}` : ''})`;
  }
}



/**
 * Video - Represents video data extracted from an Asset
 */
export class Video implements VideoRole, AudioRole {
  constructor(
    public readonly data: Buffer,
    public readonly format: VideoFormat,
    public readonly metadata: VideoMetadata = { format },
    public readonly sourceAsset?: any // Reference to original Asset
  ) {}

  private _metadataExtracted = false; // Track if we've extracted metadata

  /**
   * Lazy metadata extraction using ffprobe
   */
  private async extractMetadataIfNeeded(): Promise<void> {
    if (this._metadataExtracted) {
      return; // Already extracted
    }

    const sourceFile = this.sourceAsset?.metadata?.sourceFile;
    if (!sourceFile) {
      this._metadataExtracted = true; // Mark as tried even if no source file
      return;
    }

    try {
      const { FFmpegService } = await import('../../services/FFmpegService');
      const ffmpegService = new FFmpegService();
      const extractedMetadata = await ffmpegService.getVideoMetadata(sourceFile);
      
      // Merge extracted metadata
      Object.assign(this.metadata, extractedMetadata);
      console.log(`[Video] Extracted metadata for ${sourceFile}:`, extractedMetadata);
    } catch (error) {
      console.warn(`[Video] Failed to extract metadata for ${sourceFile}:`, error.message);
    }

    this._metadataExtracted = true;
  }

  /**
   * Create Video from file path
   */
  static fromFile(filePath: string): Video {
    const fs = require('fs');
    const path = require('path');

    if (!fs.existsSync(filePath)) {
      throw new Error(`Video file not found: ${filePath}`);
    }

    const data = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase().slice(1);

    // Create a source asset with basic metadata (ffprobe extraction is lazy)
    const sourceAsset = {
      metadata: {
        sourceFile: filePath,
        fileSize: data.length,
        format: ext
      }
    };

    return new Video(data, ext as VideoFormat, { format: ext as VideoFormat }, sourceAsset);
  }

  /**
   * Get video duration (with lazy metadata extraction)
   */
  getDuration(): number | undefined {
    // Try to get from existing metadata first
    if (this.metadata.duration !== undefined) {
      return this.metadata.duration;
    }

    // If not available, trigger extraction and return undefined for now
    // The next call will have the extracted data
    this.extractMetadataIfNeeded().catch(err => 
      console.warn('[Video] Metadata extraction failed:', err)
    );
    
    return this.metadata.duration;
  }

  /**
   * Get video dimensions (with lazy metadata extraction)
   */
  getDimensions(): { width?: number; height?: number } {
    // Try to get from existing metadata first
    if (this.metadata.width !== undefined && this.metadata.height !== undefined) {
      return {
        width: this.metadata.width,
        height: this.metadata.height
      };
    }

    // If not available, trigger extraction and return current values
    this.extractMetadataIfNeeded().catch(err => 
      console.warn('[Video] Metadata extraction failed:', err)
    );

    return {
      width: this.metadata.width,
      height: this.metadata.height
    };
  }

  /**
   * Get frame rate
   */
  getFrameRate(): number | undefined {
    return this.metadata.frameRate;
  }

  /**
   * Check if video has audio track
   */
  hasAudio(): boolean {
    return this.metadata.hasAudio || false;
  }

  /**
   * Check if video has valid data
   */
  isValid(): boolean {
    return this.data.length > 0;
  }

  /**
   * Convert to Audio role - extract audio from video
   */
  async asAudio(): Promise<Audio> {
    // For now, create Audio from the video data
    // TODO: In the future, this could extract audio track from video
    return new Audio(this.data, this.sourceAsset);
  }

  /**
   * Check if this Video can play the Audio role
   */
  canPlayAudioRole(): boolean {
    return this.isValid() && this.hasAudio(); // Video can provide audio if it has an audio track
  }

  /**
   * Convert to Video role (self)
   */
  async asVideo(): Promise<Video> {
    return this;
  }

  /**
   * Get video metadata
   */
  getVideoMetadata(): VideoMetadata {
    return this.metadata;
  }

  /**
   * Check if this Video can play the Video role
   */
  canPlayVideoRole(): boolean {
    return this.isValid();
  }

  toString(): string {
    const duration = this.getDuration();
    const { width, height } = this.getDimensions();
    const resolution = width && height ? `${width}x${height}` : '';
    return `Video(${this.format.toUpperCase()}${resolution ? `, ${resolution}` : ''}${duration ? `, ${duration.toFixed(1)}s` : ''})`;
  }
}

/**
 * Text - Represents text data extracted from an Asset
 */
export class Text {
  constructor(
    public readonly content: string,
    public readonly language?: string,
    public readonly confidence?: number,
    public readonly metadata: TextMetadata = {},
    public readonly sourceAsset?: any // Reference to original Asset
  ) {}

  /**
   * Create Text from string content
   */
  static fromString(content: string, language?: string): Text {
    return new Text(content, language, 1.0, { encoding: 'utf-8' });
  }

  /**
   * Create Text from file path
   */
  static fromFile(filePath: string): Text {
    const fs = require('fs');
    const path = require('path');

    if (!fs.existsSync(filePath)) {
      throw new Error(`Text file not found: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const ext = path.extname(filePath).toLowerCase().slice(1);

    // Create a simple source asset with basic metadata
    const sourceAsset = {
      metadata: {
        sourceFile: filePath,
        fileSize: Buffer.byteLength(content, 'utf-8'),
        format: ext || 'txt',
        encoding: 'utf-8'
      }
    };

    return new Text(content, undefined, 1.0, {
      encoding: 'utf-8',
      format: ext || 'txt'
    }, sourceAsset);
  }

  /**
   * Get text length
   */
  getLength(): number {
    return this.content.length;
  }

  /**
   * Get word count
   */
  getWordCount(): number {
    return this.metadata.wordCount || this.content.split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Get confidence score
   */
  getConfidence(): number {
    return this.confidence || this.metadata.confidence || 1.0;
  }

  /**
   * Check if text has valid content
   */
  isValid(): boolean {
    return this.content.trim().length > 0;
  }

  toString(): string {
    const wordCount = this.getWordCount();
    const lang = this.language || 'unknown';
    return `Text(${lang}, ${wordCount} words)`;
  }
}

/**
 * Image - Represents image data extracted from an Asset
 */
export class Image {
  constructor(
    public readonly data: Buffer,
    public readonly format: ImageFormat,
    public readonly metadata: ImageMetadata = {},
    public readonly sourceAsset?: any // Reference to original Asset
  ) {}

  /**
   * Create Image from file path
   */
  static fromFile(filePath: string): Image {
    const fs = require('fs');
    const path = require('path');

    if (!fs.existsSync(filePath)) {
      throw new Error(`Image file not found: ${filePath}`);
    }

    const data = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase().slice(1) as ImageFormat;
    
    return new Image(data, ext, {
      format: ext,
      fileSize: data.length,
      sourceFile: filePath
    });
  }

  /**
   * Create Image from Buffer
   */
  static fromBuffer(buffer: Buffer, format: ImageFormat): Image {
    return new Image(buffer, format, {
      format,
      fileSize: buffer.length
    });
  }

  /**
   * Get image width (if available in metadata)
   */
  getWidth(): number | undefined {
    return this.metadata.width;
  }

  /**
   * Get image height (if available in metadata)
   */
  getHeight(): number | undefined {
    return this.metadata.height;
  }

  /**
   * Get file size in bytes
   */
  getSize(): number {
    return this.data.length;
  }

  /**
   * Check if image has valid data
   */
  isValid(): boolean {
    return this.data && this.data.length > 0;
  }

  /**
   * Get aspect ratio (if dimensions are available)
   */
  getAspectRatio(): number | undefined {
    const width = this.getWidth();
    const height = this.getHeight();
    return width && height ? width / height : undefined;
  }

  /**
   * Get image dimensions (compatible with TextToImageModel)
   */
  getDimensions(): { width?: number; height?: number } {
    return {
      width: this.getWidth(),
      height: this.getHeight()
    };
  }

  /**
   * Get file size in bytes (alias for getSize for compatibility)
   */
  getFileSize(): number {
    return this.getSize();
  }

  /**
   * Create Image from URL (for API results)
   */
  static fromUrl(url: string, format: ImageFormat = 'png', metadata: ImageMetadata = {}): Image {
    return new Image(Buffer.alloc(0), format, { ...metadata, url });
  }

  /**
   * Save image to file
   */
  saveToFile(filePath: string): void {
    if (this.data.length === 0) {
      throw new Error('No image data to save');
    }
    
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(filePath, this.data);
  }

  toString(): string {
    const { width, height } = this.getDimensions();
    const size = width && height ? `${width}x${height}` : '';
    const fileSize = this.getSize();
    return `Image(${this.format.toUpperCase()}${size ? `, ${size}` : ''}${fileSize ? `, ${(fileSize / 1024).toFixed(1)}KB` : ''})`;
  }
}

// ============================================================================
// ROLE INTERFACES
// ============================================================================



/**
 * AudioRole - Assets that can provide audio data
 */
export interface AudioRole {
  asAudio(): Promise<Audio>;
  canPlayAudioRole(): boolean;
}

/**
 * VideoRole - Assets that can provide video data
 */
export interface VideoRole {
  asVideo(): Promise<Video>;
  getVideoMetadata(): VideoMetadata;
  canPlayVideoRole(): boolean;
}

/**
 * TextRole - Assets that can provide text data
 */
export interface TextRole {
  asText(): Promise<Text>;
  getTextMetadata(): TextMetadata;
  canPlayTextRole(): boolean;
}

/**
 * ImageRole - Assets that can provide image data
 */
export interface ImageRole {
  asImage(): Promise<Image>;
  getImageMetadata(): ImageMetadata;
  canPlayImageRole(): boolean;
}

// ============================================================================
// TYPE HELPERS
// ============================================================================



/**
 * Type guard to check if an object implements AudioRole
 */
export function hasAudioRole(obj: any): obj is AudioRole {
  return obj && typeof obj.asAudio === 'function' && typeof obj.canPlayAudioRole === 'function';
}

/**
 * Type guard to check if an object implements VideoRole
 */
export function hasVideoRole(obj: any): obj is VideoRole {
  return obj && typeof obj.asVideo === 'function' && typeof obj.canPlayVideoRole === 'function';
}

/**
 * Type guard to check if an object implements TextRole
 */
export function hasTextRole(obj: any): obj is TextRole {
  return obj && typeof obj.asText === 'function' && typeof obj.canPlayTextRole === 'function';
}

/**
 * Type guard to check if an object implements ImageRole
 */
export function hasImageRole(obj: any): obj is ImageRole {
  return obj && typeof obj.asImage === 'function' && typeof obj.canPlayImageRole === 'function';
}

/**
 * Union type for all role interfaces
 */
export type AnyRole = AudioRole | VideoRole | TextRole | ImageRole;

/**
 * Union type for all core media types
 */
export type AnyMedia = Audio | Video | Text | Image;
