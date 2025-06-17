/**
 * Asset Roles and Core Media Types
 * 
 * Defines the role interfaces that Assets can implement and the core media types
 * that represent the actual data when an Asset plays a specific role.
 */

// ============================================================================
// CORE MEDIA TYPES
// ============================================================================

export type AudioFormat = 'mp3' | 'wav' | 'flac' | 'm4a' | 'ogg' | 'webm' | 'aac' | 'opus' | 'wma';
export type VideoFormat = 'mp4' | 'avi' | 'mov' | 'wmv' | 'flv' | 'webm' | 'mkv';

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

/**
 * Audio - Represents audio data
 * Simple container for audio stream data
 */
export class Audio implements SpeechRole {
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
   * Convert to Speech role - simple naming extension
   */
  asSpeech(): Speech {
    return new Speech(this.data, this.sourceAsset);
  }

  /**
   * Check if this Audio can play the Speech role
   */
  canPlaySpeechRole(): boolean {
    return this.isValid(); // Any valid audio can be treated as speech
  }

  toString(): string {
    const format = this.getFormat();
    return `Audio(${format.toUpperCase()})`;
  }
}

/**
 * Speech - Represents speech data
 * Simple naming extension of Audio that indicates the audio contains speech
 */
export class Speech extends Audio {
  constructor(
    data: Buffer,
    sourceAsset?: any // Reference to original Asset
  ) {
    super(data, sourceAsset);
  }

  toString(): string {
    const format = this.getFormat();
    return `Speech(${format.toUpperCase()})`;
  }
}

/**
 * Video - Represents video data extracted from an Asset
 */
export class Video implements SpeechRole {
  constructor(
    public readonly data: Buffer,
    public readonly format: VideoFormat,
    public readonly metadata: VideoMetadata = { format },
    public readonly sourceAsset?: any // Reference to original Asset
  ) {}

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

    // Create a simple source asset with basic metadata
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
   * Get video duration
   */
  getDuration(): number | undefined {
    return this.metadata.duration;
  }

  /**
   * Get video dimensions
   */
  getDimensions(): { width?: number; height?: number } {
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
   * Convert to Speech role - extract audio from video
   */
  asSpeech(): Speech {
    // For now, create Speech from the video data
    // TODO: In the future, this could extract audio track from video
    return new Speech(this.data, this.sourceAsset);
  }

  /**
   * Check if this Video can play the Speech role
   */
  canPlaySpeechRole(): boolean {
    return this.isValid(); // Any valid video can potentially have speech
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

// ============================================================================
// ROLE INTERFACES
// ============================================================================

/**
 * SpeechRole - Assets that can provide speech data
 */
export interface SpeechRole {
  asSpeech(): Speech;
  canPlaySpeechRole(): boolean;
}

/**
 * AudioRole - Assets that can provide audio data
 */
export interface AudioRole {
  asAudio(): Audio;
  canPlayAudioRole(): boolean;
}

/**
 * VideoRole - Assets that can provide video data
 */
export interface VideoRole {
  asVideo(): Video;
  getVideoMetadata(): VideoMetadata;
  canPlayVideoRole(): boolean;
}

/**
 * TextRole - Assets that can provide text data
 */
export interface TextRole {
  asText(): Text;
  getTextMetadata(): TextMetadata;
  canPlayTextRole(): boolean;
}

// ============================================================================
// TYPE HELPERS
// ============================================================================

/**
 * Type guard to check if an object implements SpeechRole
 */
export function hasSpeechRole(obj: any): obj is SpeechRole {
  return obj && typeof obj.asSpeech === 'function' && typeof obj.canPlaySpeechRole === 'function';
}

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
 * Union type for all role interfaces
 */
export type AnyRole = SpeechRole | AudioRole | VideoRole | TextRole;

/**
 * Union type for all core media types
 */
export type AnyMedia = Speech | Audio | Video | Text;
