/**
 * Audio - Universal Audio Container
 * 
 * Universal audio class that can handle multiple formats (mp3, mp4, wav, flac, etc.)
 * Provides format conversion, metadata extraction, and file I/O operations.
 */

import fs from 'fs';
import path from 'path';

export type AudioFormat = 'mp3' | 'wav' | 'flac' | 'm4a' | 'ogg' | 'webm' | 'aac' | 'opus' | 'wma';

export interface AudioMetadata {
  duration?: number;
  sampleRate?: number;
  channels?: number;
  bitrate?: number;
  codec?: string;
  title?: string;
  artist?: string;
  album?: string;
  [key: string]: any;
}

/**
 * Universal audio container supporting multiple formats
 */
export class Audio {
  public readonly data: Buffer;
  public readonly format: AudioFormat;
  public readonly metadata: AudioMetadata;

  constructor(
    data: Buffer,
    format: AudioFormat,
    metadata: AudioMetadata = {}
  ) {
    this.data = data;
    this.format = format;
    this.metadata = { ...metadata };
  }

  /**
   * Create Audio from file path
   */
  static fromFile(filePath: string): Audio {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Audio file not found: ${filePath}`);
    }

    const data = fs.readFileSync(filePath);
    const format = Audio.detectFormatFromPath(filePath);
    
    return new Audio(data, format, {
      sourceFile: filePath,
      fileSize: data.length
    });
  }

  /**
   * Create Audio from Buffer with specified format
   */
  static fromBuffer(buffer: Buffer, format: AudioFormat, metadata: AudioMetadata = {}): Audio {
    return new Audio(buffer, format, metadata);
  }

  /**
   * Create Audio from base64 string
   */
  static fromBase64(base64: string, format: AudioFormat, metadata: AudioMetadata = {}): Audio {
    const buffer = Buffer.from(base64, 'base64');
    return new Audio(buffer, format, metadata);
  }

  /**
   * Detect audio format from file extension
   */
  static detectFormatFromPath(filePath: string): AudioFormat {
    const ext = path.extname(filePath).toLowerCase().slice(1);
    
    const formatMap: Record<string, AudioFormat> = {
      'mp3': 'mp3',
      'wav': 'wav',
      'wave': 'wav',
      'flac': 'flac',
      'm4a': 'm4a',
      'mp4': 'm4a',
      'ogg': 'ogg',
      'oga': 'ogg',
      'webm': 'webm',
      'aac': 'aac',
      'opus': 'opus',
      'wma': 'wma'
    };

    const format = formatMap[ext];
    if (!format) {
      throw new Error(`Unsupported audio format: ${ext}`);
    }

    return format;
  }

  /**
   * Get list of supported audio formats
   */
  static getSupportedFormats(): AudioFormat[] {
    return ['mp3', 'wav', 'flac', 'm4a', 'ogg', 'webm', 'aac', 'opus', 'wma'];
  }

  /**
   * Check if a format is supported
   */
  static isFormatSupported(format: string): boolean {
    return Audio.getSupportedFormats().includes(format as AudioFormat);
  }

  /**
   * Validate audio file format from path
   */
  static validateAudioFile(filePath: string): boolean {
    try {
      Audio.detectFormatFromPath(filePath);
      return fs.existsSync(filePath);
    } catch {
      return false;
    }
  }

  /**
   * Save audio to file
   */
  async toFile(outputPath: string): Promise<void> {
    // Ensure output directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, this.data);
  }

  /**
   * Get audio data as Buffer
   */
  toBuffer(): Buffer {
    return Buffer.from(this.data);
  }

  /**
   * Get audio data as base64 string
   */
  toBase64(): string {
    return this.data.toString('base64');
  }

  /**
   * Get audio data as data URL
   */
  toDataURL(): string {
    const mimeType = this.getMimeType();
    return `data:${mimeType};base64,${this.toBase64()}`;
  }

  /**
   * Get MIME type for the audio format
   */
  getMimeType(): string {
    const mimeTypes: Record<AudioFormat, string> = {
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'flac': 'audio/flac',
      'm4a': 'audio/mp4',
      'ogg': 'audio/ogg',
      'webm': 'audio/webm',
      'aac': 'audio/aac',
      'opus': 'audio/opus',
      'wma': 'audio/x-ms-wma'
    };

    return mimeTypes[this.format] || 'audio/octet-stream';
  }

  /**
   * Get file extension for the audio format
   */
  getFileExtension(): string {
    return this.format;
  }

  /**
   * Get audio size in bytes
   */
  getSize(): number {
    return this.data.length;
  }

  /**
   * Get human-readable size
   */
  getHumanSize(): string {
    const bytes = this.getSize();
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  /**
   * Get duration in seconds (if available in metadata)
   */
  getDuration(): number | undefined {
    return this.metadata.duration;
  }

  /**
   * Get human-readable duration
   */
  getHumanDuration(): string | undefined {
    const duration = this.getDuration();
    if (duration === undefined) return undefined;

    const minutes = Math.floor(duration / 60);
    const seconds = Math.floor(duration % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Clone the audio with new metadata
   */
  withMetadata(newMetadata: Partial<AudioMetadata>): Audio {
    return new Audio(this.data, this.format, {
      ...this.metadata,
      ...newMetadata
    });
  }

  /**
   * Clone the audio with new format (note: this doesn't convert, just changes the format label)
   */
  withFormat(newFormat: AudioFormat): Audio {
    return new Audio(this.data, newFormat, this.metadata);
  }

  /**
   * Check if audio has valid data
   */
  isValid(): boolean {
    return this.data.length > 0;
  }

  /**
   * Get a string representation
   */
  toString(): string {
    const duration = this.getHumanDuration();
    const size = this.getHumanSize();
    return `Audio(${this.format.toUpperCase()}, ${size}${duration ? `, ${duration}` : ''})`;
  }

  /**
   * Get JSON representation
   */
  toJSON(): {
    format: AudioFormat;
    size: number;
    metadata: AudioMetadata;
  } {
    return {
      format: this.format,
      size: this.getSize(),
      metadata: this.metadata
    };
  }

  /**
   * Create a copy of the audio
   */
  clone(): Audio {
    return new Audio(
      Buffer.from(this.data),
      this.format,
      { ...this.metadata }
    );
  }
}
