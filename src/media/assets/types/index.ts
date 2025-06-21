/**
 * Concrete Asset Types
 * 
 * Concrete implementations of Asset classes with specific role combinations.
 * Each Asset type represents a specific media format and the roles it can play.
 */

import fs from 'fs';
import path from 'path';
import { Asset, BaseAsset, AssetMetadata, detectAssetTypeFromPath, validateAssetFile } from '../Asset';
import { withAudioRole, withVideoRole, withTextRole } from '../mixins';
import { AudioFormat, VideoFormat } from '../roles';

// ============================================================================
// MP3 ASSET - Audio Role Only
// ============================================================================

/**
 * MP3Asset - Can play Audio role
 */
export class MP3Asset extends withAudioRole(BaseAsset) {
  constructor(data: Buffer, metadata: AssetMetadata = {}) {
    super(data, {
      format: 'mp3',
      ...metadata
    }, 'audio/mpeg', 'mp3');
  }

  /**
   * Create MP3Asset from file
   */
  static fromFile(filePath: string): MP3Asset {
    if (!validateAssetFile(filePath)) {
      throw new Error(`MP3 file not found: ${filePath}`);
    }

    const data = fs.readFileSync(filePath);
    const metadata: AssetMetadata = {
      sourceFile: filePath,
      fileSize: data.length,
      format: 'mp3'
    };

    return new MP3Asset(data, metadata);
  }

  /**
   * Create MP3Asset from Buffer
   */
  static fromBuffer(buffer: Buffer, metadata: AssetMetadata = {}): MP3Asset {
    return new MP3Asset(buffer, {
      format: 'mp3',
      fileSize: buffer.length,
      ...metadata
    });
  }

  /**
   * Create MP3Asset from base64
   */
  static fromBase64(base64: string, metadata: AssetMetadata = {}): MP3Asset {
    const buffer = Buffer.from(base64, 'base64');
    return MP3Asset.fromBuffer(buffer, metadata);
  }

  /**
   * Get MIME type
   */
  getMimeType(): string {
    return 'audio/mpeg';
  }

  /**
   * Get file extension
   */
  getFileExtension(): string {
    return 'mp3';
  }

  /**
   * Clone with new metadata
   */
  withMetadata(newMetadata: Partial<AssetMetadata>): MP3Asset {
    return new MP3Asset(this.data, {
      ...this.metadata,
      ...newMetadata
    });
  }

  /**
   * Clone the asset
   */
  clone(): MP3Asset {
    return new MP3Asset(
      Buffer.from(this.data),
      { ...this.metadata }
    );
  }
}

// ============================================================================
// WAV ASSET - Audio + Speech Roles
// ============================================================================

/**
 * WAVAsset - Can play Audio role
 */
export class WAVAsset extends withAudioRole(BaseAsset) {
  constructor(data: Buffer, metadata: AssetMetadata = {}) {
    super(data, {
      format: 'wav',
      ...metadata
    }, 'audio/wav', 'wav');
  }

  /**
   * Create WAVAsset from file
   */
  static fromFile(filePath: string): WAVAsset {
    if (!validateAssetFile(filePath)) {
      throw new Error(`WAV file not found: ${filePath}`);
    }

    const data = fs.readFileSync(filePath);
    const metadata: AssetMetadata = {
      sourceFile: filePath,
      fileSize: data.length,
      format: 'wav'
    };

    return new WAVAsset(data, metadata);
  }

  /**
   * Create WAVAsset from Buffer
   */
  static fromBuffer(buffer: Buffer, metadata: AssetMetadata = {}): WAVAsset {
    return new WAVAsset(buffer, {
      format: 'wav',
      fileSize: buffer.length,
      ...metadata
    });
  }

  /**
   * Create WAVAsset from base64
   */
  static fromBase64(base64: string, metadata: AssetMetadata = {}): WAVAsset {
    const buffer = Buffer.from(base64, 'base64');
    return WAVAsset.fromBuffer(buffer, metadata);
  }

  /**
   * Get MIME type
   */
  getMimeType(): string {
    return 'audio/wav';
  }

  /**
   * Get file extension
   */
  getFileExtension(): string {
    return 'wav';
  }

  /**
   * Clone with new metadata
   */
  withMetadata(newMetadata: Partial<AssetMetadata>): WAVAsset {
    return new WAVAsset(this.data, {
      ...this.metadata,
      ...newMetadata
    });
  }

  /**
   * Clone the asset
   */
  clone(): WAVAsset {
    return new WAVAsset(
      Buffer.from(this.data),
      { ...this.metadata }
    );
  }
}

// ============================================================================
// MP4 ASSET - Video + Audio + Speech Roles
// ============================================================================

/**
 * MP4Asset - Can play Video and Audio roles
 */
export class MP4Asset extends withAudioRole(withVideoRole(BaseAsset)) {
  constructor(data: Buffer, metadata: AssetMetadata = {}) {
    super(data, {
      format: 'mp4',
      hasAudio: true, // MP4 typically has audio
      ...metadata
    }, 'video/mp4', 'mp4');
  }

  /**
   * Create MP4Asset from file
   */
  static fromFile(filePath: string): MP4Asset {
    if (!validateAssetFile(filePath)) {
      throw new Error(`MP4 file not found: ${filePath}`);
    }

    const data = fs.readFileSync(filePath);
    const metadata: AssetMetadata = {
      sourceFile: filePath,
      fileSize: data.length,
      format: 'mp4',
      hasAudio: true
    };

    return new MP4Asset(data, metadata);
  }

  /**
   * Create MP4Asset from Buffer
   */
  static fromBuffer(buffer: Buffer, metadata: AssetMetadata = {}): MP4Asset {
    return new MP4Asset(buffer, {
      format: 'mp4',
      fileSize: buffer.length,
      hasAudio: true,
      ...metadata
    });
  }

  /**
   * Create MP4Asset from base64
   */
  static fromBase64(base64: string, metadata: AssetMetadata = {}): MP4Asset {
    const buffer = Buffer.from(base64, 'base64');
    return MP4Asset.fromBuffer(buffer, metadata);
  }

  /**
   * Get MIME type
   */
  getMimeType(): string {
    return 'video/mp4';
  }

  /**
   * Get file extension
   */
  getFileExtension(): string {
    return 'mp4';
  }

  /**
   * Clone with new metadata
   */
  withMetadata(newMetadata: Partial<AssetMetadata>): MP4Asset {
    return new MP4Asset(this.data, {
      ...this.metadata,
      ...newMetadata
    });
  }

  /**
   * Clone the asset
   */
  clone(): MP4Asset {
    return new MP4Asset(
      Buffer.from(this.data),
      { ...this.metadata }
    );
  }
}

// ============================================================================
// TEXT ASSET - Text Role Only
// ============================================================================

/**
 * TextAsset - Can play Text role
 */
export class TextAsset extends withTextRole(BaseAsset) {
  constructor(data: Buffer, metadata: AssetMetadata = {}) {
    super(data, {
      format: 'txt',
      encoding: 'utf-8',
      ...metadata
    }, 'text/plain', 'txt');
  }

  /**
   * Create TextAsset from file
   */
  static fromFile(filePath: string): TextAsset {
    if (!validateAssetFile(filePath)) {
      throw new Error(`Text file not found: ${filePath}`);
    }

    const data = fs.readFileSync(filePath);
    const metadata: AssetMetadata = {
      sourceFile: filePath,
      fileSize: data.length,
      format: path.extname(filePath).slice(1).toLowerCase() || 'txt',
      encoding: 'utf-8'
    };

    return new TextAsset(data, metadata);
  }

  /**
   * Create TextAsset from string content
   */
  static fromString(content: string, metadata: AssetMetadata = {}): TextAsset {
    const buffer = Buffer.from(content, 'utf-8');
    return new TextAsset(buffer, {
      format: 'txt',
      encoding: 'utf-8',
      fileSize: buffer.length,
      wordCount: content.split(/\s+/).filter(word => word.length > 0).length,
      ...metadata
    });
  }

  /**
   * Create TextAsset from Buffer
   */
  static fromBuffer(buffer: Buffer, metadata: AssetMetadata = {}): TextAsset {
    return new TextAsset(buffer, {
      format: 'txt',
      encoding: 'utf-8',
      fileSize: buffer.length,
      ...metadata
    });
  }

  /**
   * Get MIME type
   */
  getMimeType(): string {
    const format = this.metadata.format?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      'txt': 'text/plain',
      'md': 'text/markdown',
      'json': 'application/json',
      'xml': 'application/xml',
      'html': 'text/html',
      'csv': 'text/csv'
    };
    return mimeTypes[format || 'txt'] || 'text/plain';
  }

  /**
   * Get file extension
   */
  getFileExtension(): string {
    return this.metadata.format || 'txt';
  }

  /**
   * Clone with new metadata
   */
  withMetadata(newMetadata: Partial<AssetMetadata>): TextAsset {
    return new TextAsset(this.data, {
      ...this.metadata,
      ...newMetadata
    });
  }

  /**
   * Clone the asset
   */
  clone(): TextAsset {
    return new TextAsset(
      Buffer.from(this.data),
      { ...this.metadata }
    );
  }
}

// ============================================================================
// ASSET FACTORY
// ============================================================================

/**
 * Factory function to create appropriate Asset type from file path
 */
export function createAssetFromFile(filePath: string): Asset {
  if (!validateAssetFile(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const assetType = detectAssetTypeFromPath(filePath);
  const ext = path.extname(filePath).toLowerCase().slice(1);

  switch (ext) {
    case 'mp3':
      return MP3Asset.fromFile(filePath);
    case 'wav':
    case 'wave':
      return WAVAsset.fromFile(filePath);
    case 'mp4':
      return MP4Asset.fromFile(filePath);
    case 'txt':
    case 'md':
    case 'json':
    case 'xml':
    case 'html':
    case 'csv':
      return TextAsset.fromFile(filePath);
    default:
      throw new Error(`Unsupported asset type: ${ext}`);
  }
}

/**
 * Factory function to create appropriate Asset type from buffer and format
 */
export function createAssetFromBuffer(buffer: Buffer, format: string, metadata: AssetMetadata = {}): Asset {
  const normalizedFormat = format.toLowerCase();

  switch (normalizedFormat) {
    case 'mp3':
      return MP3Asset.fromBuffer(buffer, metadata);
    case 'wav':
    case 'wave':
      return WAVAsset.fromBuffer(buffer, metadata);
    case 'mp4':
      return MP4Asset.fromBuffer(buffer, metadata);
    case 'txt':
    case 'md':
    case 'json':
    case 'xml':
    case 'html':
    case 'csv':
      return TextAsset.fromBuffer(buffer, metadata);
    default:
      throw new Error(`Unsupported asset format: ${format}`);
  }
}
