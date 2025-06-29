/**
 * Smart Asset Factory
 * 
 * Provides intelligent asset loading that automatically detects format
 * and applies appropriate role mixins for maximum functionality.
 */

import { BaseAsset } from './Asset';
import { AudioAsset, VideoAsset, ImageAsset, TextAsset } from './types';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// FORMAT DETECTION UTILITIES
// ============================================================================

interface FormatInfo {
  category: 'audio' | 'video' | 'image' | 'text';
  mimeType: string;
}

const FORMAT_REGISTRY: Record<string, FormatInfo> = {
  // Audio formats
  mp3: { category: 'audio', mimeType: 'audio/mpeg' },
  wav: { category: 'audio', mimeType: 'audio/wav' },
  flac: { category: 'audio', mimeType: 'audio/flac' },
  ogg: { category: 'audio', mimeType: 'audio/ogg' },
  
  // Video formats
  mp4: { category: 'video', mimeType: 'video/mp4' },
  avi: { category: 'video', mimeType: 'video/x-msvideo' },
  mov: { category: 'video', mimeType: 'video/quicktime' },
  webm: { category: 'video', mimeType: 'video/webm' },
  
  // Image formats
  png: { category: 'image', mimeType: 'image/png' },
  jpg: { category: 'image', mimeType: 'image/jpeg' },
  jpeg: { category: 'image', mimeType: 'image/jpeg' },
  webp: { category: 'image', mimeType: 'image/webp' },
  
  // Text formats
  txt: { category: 'text', mimeType: 'text/plain' },
  md: { category: 'text', mimeType: 'text/markdown' },
  json: { category: 'text', mimeType: 'application/json' },
  html: { category: 'text', mimeType: 'text/html' },
};

function detectFormatCategory(format: string): FormatInfo | null {
  return FORMAT_REGISTRY[format.toLowerCase()] || null;
}

/**
 * Smart Asset Factory Class
 */
export class SmartAssetFactory {
  /**
   * Load an asset with automatic format detection
   * 
   * @example
   * const video = await SmartAssetFactory.load<VideoAsset>('movie.mp4');
   * const audio = await SmartAssetFactory.load<AudioAsset>('song.wav');
   * // Or let TypeScript infer:
   * const asset = await SmartAssetFactory.load('movie.mp4'); // BaseAsset (cast as needed)
   */
  static async load<T extends BaseAsset = BaseAsset>(filePath: string): Promise<T> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    // Detect format and dispatch to appropriate Asset class
    const format = path.extname(filePath).toLowerCase().slice(1);
    const formatInfo = detectFormatCategory(format);
    
    if (!formatInfo) {
      throw new Error(`Unsupported file format: ${format}`);
    }

    // Clean dispatch to the right Asset class
    switch (formatInfo.category) {
      case 'audio': return AudioAsset.fromFile(filePath) as unknown as T;
      case 'video': return VideoAsset.fromFile(filePath) as unknown as T;
      case 'image': return ImageAsset.fromFile(filePath) as unknown as T;
      case 'text': return TextAsset.fromFile(filePath) as unknown as T;
      default:
        throw new Error(`Unsupported category: ${formatInfo.category}`);
    }
  }
}
