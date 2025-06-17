/**
 * Asset - Base Class for Media Assets
 * 
 * Base class for all media assets that can play different roles through TypeScript mixins.
 * Replaces the previous Audio class with a more flexible, role-based system.
 */

import fs from 'fs';
import path from 'path';

export interface AssetMetadata {
  // File metadata
  sourceFile?: string;
  fileSize?: number;
  format?: string;
  
  // Media metadata
  duration?: number;
  sampleRate?: number;
  channels?: number;
  bitrate?: number;
  codec?: string;
  
  // Content metadata
  language?: string;
  speaker?: string;
  title?: string;
  artist?: string;
  album?: string;
  
  // Processing metadata
  confidence?: number;
  processingTime?: number;
  model?: string;
  provider?: string;
  
  // Custom metadata
  [key: string]: any;
}

/**
 * Base Asset class - container for media data that can play different roles
 */
export abstract class Asset {
  public readonly data: Buffer;
  public readonly metadata: AssetMetadata;

  constructor(data: Buffer, metadata: AssetMetadata = {}) {
    this.data = data;
    this.metadata = { ...metadata };
  }

  /**
   * Create Asset from file path - must be implemented by concrete classes
   */
  static fromFile(filePath: string): Asset {
    throw new Error('fromFile must be implemented by concrete Asset classes');
  }

  /**
   * Create Asset from Buffer - must be implemented by concrete classes
   */
  static fromBuffer(buffer: Buffer, metadata?: AssetMetadata): Asset {
    throw new Error('fromBuffer must be implemented by concrete Asset classes');
  }

  /**
   * Create Asset from base64 string - must be implemented by concrete classes
   */
  static fromBase64(base64: string, metadata?: AssetMetadata): Asset {
    throw new Error('fromBase64 must be implemented by concrete Asset classes');
  }

  /**
   * Save asset to file
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
   * Get asset data as Buffer
   */
  toBuffer(): Buffer {
    return Buffer.from(this.data);
  }

  /**
   * Get asset data as base64 string
   */
  toBase64(): string {
    return this.data.toString('base64');
  }

  /**
   * Get asset data as data URL
   */
  toDataURL(): string {
    const mimeType = this.getMimeType();
    return `data:${mimeType};base64,${this.toBase64()}`;
  }

  /**
   * Get MIME type for the asset - must be implemented by concrete classes
   */
  abstract getMimeType(): string;

  /**
   * Get file extension for the asset - must be implemented by concrete classes
   */
  abstract getFileExtension(): string;

  /**
   * Get asset size in bytes
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
   * Clone the asset with new metadata
   */
  withMetadata(newMetadata: Partial<AssetMetadata>): Asset {
    // Must be implemented by concrete classes to return correct type
    throw new Error('withMetadata must be implemented by concrete Asset classes');
  }

  /**
   * Check if asset has valid data
   */
  isValid(): boolean {
    return this.data.length > 0;
  }

  /**
   * Get a string representation
   */
  toString(): string {
    const type = this.constructor.name;
    const duration = this.getHumanDuration();
    const size = this.getHumanSize();
    return `${type}(${size}${duration ? `, ${duration}` : ''})`;
  }

  /**
   * Get JSON representation
   */
  toJSON(): {
    type: string;
    size: number;
    metadata: AssetMetadata;
  } {
    return {
      type: this.constructor.name,
      size: this.getSize(),
      metadata: this.metadata
    };
  }

  /**
   * Create a copy of the asset
   */
  clone(): Asset {
    // Must be implemented by concrete classes to return correct type
    throw new Error('clone must be implemented by concrete Asset classes');
  }

  /**
   * Check if this asset can play a specific role
   */
  canPlayRole(role: string): boolean {
    // This will be enhanced by mixins
    return false;
  }

  /**
   * Get list of roles this asset can play
   */
  getRoles(): string[] {
    // This will be enhanced by mixins
    return [];
  }

  /**
   * Validate asset data and metadata
   */
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.isValid()) {
      errors.push('Asset data is invalid or empty');
    }

    // Additional validation can be added by concrete classes
    return {
      valid: errors.length === 0,
      errors
    };
  }
}

/**
 * Concrete base Asset class that can be used with mixins
 * This provides default implementations for abstract methods
 */
export class BaseAsset extends Asset {
  private _mimeType: string;
  private _fileExtension: string;

  constructor(data: Buffer, metadata: AssetMetadata = {}, mimeType: string = 'application/octet-stream', fileExtension: string = 'bin') {
    super(data, metadata);
    this._mimeType = mimeType;
    this._fileExtension = fileExtension;
  }

  /**
   * Create BaseAsset from file
   */
  static fromFile(filePath: string): BaseAsset {
    if (!validateAssetFile(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const data = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase().slice(1);
    const metadata: AssetMetadata = {
      sourceFile: filePath,
      fileSize: data.length,
      format: ext
    };

    return new BaseAsset(data, metadata, 'application/octet-stream', ext);
  }

  /**
   * Create BaseAsset from Buffer
   */
  static fromBuffer(buffer: Buffer, metadata: AssetMetadata = {}): BaseAsset {
    return new BaseAsset(buffer, {
      fileSize: buffer.length,
      ...metadata
    });
  }

  /**
   * Create BaseAsset from base64
   */
  static fromBase64(base64: string, metadata: AssetMetadata = {}): BaseAsset {
    const buffer = Buffer.from(base64, 'base64');
    return BaseAsset.fromBuffer(buffer, metadata);
  }

  /**
   * Get MIME type
   */
  getMimeType(): string {
    return this._mimeType;
  }

  /**
   * Get file extension
   */
  getFileExtension(): string {
    return this._fileExtension;
  }

  /**
   * Clone with new metadata
   */
  withMetadata(newMetadata: Partial<AssetMetadata>): BaseAsset {
    return new BaseAsset(this.data, {
      ...this.metadata,
      ...newMetadata
    }, this._mimeType, this._fileExtension);
  }

  /**
   * Clone the asset
   */
  clone(): BaseAsset {
    return new BaseAsset(
      Buffer.from(this.data),
      { ...this.metadata },
      this._mimeType,
      this._fileExtension
    );
  }
}

/**
 * Type helper for constructor functions
 */
export type Constructor<T = {}> = new (...args: any[]) => T;

/**
 * Type helper for concrete Asset constructor (not abstract)
 */
export type ConcreteAssetConstructor = Constructor<Asset> & {
  fromFile(filePath: string): Asset;
  fromBuffer(buffer: Buffer, metadata?: AssetMetadata): Asset;
  fromBase64(base64: string, metadata?: AssetMetadata): Asset;
};

/**
 * Type helper for Asset constructor (legacy)
 */
export type AssetConstructor = ConcreteAssetConstructor;

/**
 * Utility function to detect asset type from file extension
 */
export function detectAssetTypeFromPath(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase().slice(1);
  
  const typeMap: Record<string, string> = {
    // Audio formats
    'mp3': 'audio',
    'wav': 'audio',
    'wave': 'audio',
    'flac': 'audio',
    'm4a': 'audio',
    'aac': 'audio',
    'ogg': 'audio',
    'opus': 'audio',
    'wma': 'audio',
    
    // Video formats
    'mp4': 'video',
    'avi': 'video',
    'mov': 'video',
    'wmv': 'video',
    'flv': 'video',
    'webm': 'video',
    'mkv': 'video',
    
    // Text formats
    'txt': 'text',
    'md': 'text',
    'json': 'text',
    'xml': 'text',
    'html': 'text',
    
    // Image formats
    'jpg': 'image',
    'jpeg': 'image',
    'png': 'image',
    'gif': 'image',
    'bmp': 'image',
    'svg': 'image',
    'webp': 'image'
  };

  return typeMap[ext] || 'unknown';
}

/**
 * Utility function to validate file exists
 */
export function validateAssetFile(filePath: string): boolean {
  return fs.existsSync(filePath);
}
