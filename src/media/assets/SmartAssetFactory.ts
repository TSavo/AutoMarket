/**
 * Smart Asset Factory
 * 
 * Provides intelligent asset loading that automatically detects format
 * and applies appropriate role mixins for maximum functionality.
 */

import fs from 'fs';
import path from 'path';
import { AssetMetadata, BaseAsset } from './Asset';
import { 
  withAudioRole, withVideoRole, withTextRole
} from './mixins';

/**
 * Media format detection utilities
 */
export interface FormatInfo {
  extension: string;
  mimeType: string;
  category: 'audio' | 'video' | 'image' | 'text' | 'document' | 'unknown';
  roles: ('speech' | 'audio' | 'video' | 'text')[];
}

/**
 * Registry of supported formats with their capabilities
 */
const FORMAT_REGISTRY: Record<string, FormatInfo> = {
  // Audio formats
  mp3: { extension: 'mp3', mimeType: 'audio/mpeg', category: 'audio', roles: ['speech', 'audio'] },
  wav: { extension: 'wav', mimeType: 'audio/wav', category: 'audio', roles: ['speech', 'audio'] },
  wave: { extension: 'wave', mimeType: 'audio/wav', category: 'audio', roles: ['speech', 'audio'] },
  flac: { extension: 'flac', mimeType: 'audio/flac', category: 'audio', roles: ['speech', 'audio'] },
  ogg: { extension: 'ogg', mimeType: 'audio/ogg', category: 'audio', roles: ['speech', 'audio'] },
  
  // Video formats - can play video, audio, and speech roles
  mp4: { extension: 'mp4', mimeType: 'video/mp4', category: 'video', roles: ['video', 'speech', 'audio'] },
  avi: { extension: 'avi', mimeType: 'video/x-msvideo', category: 'video', roles: ['video', 'speech', 'audio'] },
  mov: { extension: 'mov', mimeType: 'video/quicktime', category: 'video', roles: ['video', 'speech', 'audio'] },
  wmv: { extension: 'wmv', mimeType: 'video/x-ms-wmv', category: 'video', roles: ['video', 'speech', 'audio'] },
  flv: { extension: 'flv', mimeType: 'video/x-flv', category: 'video', roles: ['video', 'speech', 'audio'] },
  webm: { extension: 'webm', mimeType: 'video/webm', category: 'video', roles: ['video', 'speech', 'audio'] },
  mkv: { extension: 'mkv', mimeType: 'video/x-matroska', category: 'video', roles: ['video', 'speech', 'audio'] },
  
  // Text formats
  txt: { extension: 'txt', mimeType: 'text/plain', category: 'text', roles: ['text'] },
  md: { extension: 'md', mimeType: 'text/markdown', category: 'text', roles: ['text'] },
  json: { extension: 'json', mimeType: 'application/json', category: 'text', roles: ['text'] },
  xml: { extension: 'xml', mimeType: 'application/xml', category: 'text', roles: ['text'] },
  html: { extension: 'html', mimeType: 'text/html', category: 'text', roles: ['text'] },
  css: { extension: 'css', mimeType: 'text/css', category: 'text', roles: ['text'] },
  js: { extension: 'js', mimeType: 'application/javascript', category: 'text', roles: ['text'] },
  ts: { extension: 'ts', mimeType: 'application/typescript', category: 'text', roles: ['text'] },
};

/**
 * Detect format information from file extension
 */
export function detectFormat(filePath: string): FormatInfo | null {
  const ext = path.extname(filePath).toLowerCase().slice(1);
  return FORMAT_REGISTRY[ext] || null;
}

/**
 * Create a dynamic asset class with the appropriate role mixins
 */
function createDynamicAssetClass(formatInfo: FormatInfo) {
  // Start with BaseAsset
  let AssetClass: any = BaseAsset;
    // Apply role mixins based on format capabilities
  if (formatInfo.roles.includes('audio')) {
    AssetClass = withAudioRole(AssetClass);
  }
  if (formatInfo.roles.includes('video')) {
    AssetClass = withVideoRole(AssetClass);
  }
  if (formatInfo.roles.includes('text')) {
    AssetClass = withTextRole(AssetClass);
  }
  
  return AssetClass;
}

/**
 * Smart Asset Factory Class
 */
export class SmartAssetFactory {
  /**
   * Load an asset from file with automatic format detection and role assignment
   */
  static load<T extends BaseAsset = BaseAsset>(filePath: string): T {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const formatInfo = detectFormat(filePath);
    if (!formatInfo) {
      throw new Error(`Unsupported file format: ${path.extname(filePath)}`);
    }

    // Create dynamic asset class with appropriate mixins
    const AssetClass = createDynamicAssetClass(formatInfo);
    
    // Load file data
    const data = fs.readFileSync(filePath);
    const metadata: AssetMetadata = {
      sourceFile: filePath,
      fileSize: data.length,
      format: formatInfo.extension
    };

    // Create asset instance
    return new AssetClass(data, metadata, formatInfo.mimeType, formatInfo.extension);
  }

  /**
   * Create asset from buffer with format specification
   */
  static fromBuffer(buffer: Buffer, format: string, metadata: AssetMetadata = {}): any {
    const formatInfo = FORMAT_REGISTRY[format.toLowerCase()];
    if (!formatInfo) {
      throw new Error(`Unsupported format: ${format}`);
    }

    // Create dynamic asset class with appropriate mixins
    const AssetClass = createDynamicAssetClass(formatInfo);
    
    // Create asset instance
    return new AssetClass(buffer, { format, ...metadata }, formatInfo.mimeType, formatInfo.extension);
  }

  /**
   * Type-safe factory method for creating assets with specific role guarantees
   */
  static fromFile<T>(filePath: string): T {
    return SmartAssetFactory.load(filePath) as T;
  }

  /**
   * Get format information for a file
   */
  static getFormatInfo(filePath: string): FormatInfo | null {
    return detectFormat(filePath);
  }

  /**
   * Check if a file format supports specific roles
   */
  static supportsRoles(filePath: string, roles: string[]): boolean {
    const formatInfo = detectFormat(filePath);
    if (!formatInfo) return false;
    
    return roles.every(role => formatInfo.roles.includes(role as any));
  }
}

/**
 * Convenience exports for easy use
 */
export const AssetLoader = {
  /**
   * Smart asset loader with automatic format detection
   */
  load: SmartAssetFactory.load,
  
  /**
   * Type-safe factory method
   */
  fromFile: SmartAssetFactory.fromFile,
  
  /**
   * Create asset from buffer
   */
  fromBuffer: SmartAssetFactory.fromBuffer,
  
  /**
   * Get format information
   */
  getFormatInfo: SmartAssetFactory.getFormatInfo,
  
  /**
   * Check role support
   */
  supportsRoles: SmartAssetFactory.supportsRoles
};

// Export all the format info for external use
export { FORMAT_REGISTRY };
