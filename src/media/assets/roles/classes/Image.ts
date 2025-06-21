/**
 * Image Class
 * 
 * Represents image data with format and metadata information.
 * Serves as both DTO and rich interface for image assets.
 */

import { ImageFormat, ImageMetadata } from '../types';

export class Image {
  constructor(
    public readonly data: Buffer,
    public readonly format: ImageFormat,
    public readonly metadata: ImageMetadata,
    public readonly sourceAsset?: any
  ) {}

  isValid(): boolean {
    return this.data && this.data.length > 0;
  }

  toString(): string {
    return `Image(${this.format}, ${this.data.length} bytes)`;
  }

  // Rich interface methods for compatibility
  getDimensions(): { width: number; height: number } | undefined {
    if (this.metadata.width && this.metadata.height) {
      return { width: this.metadata.width, height: this.metadata.height };
    }
    return undefined;
  }

  getWidth(): number | undefined {
    return this.metadata.width;
  }

  getHeight(): number | undefined {
    return this.metadata.height;
  }

  getSize(): number {
    return this.data.length;
  }

  getFileSize(): number {
    return this.metadata.fileSize || this.data.length;
  }

  getHumanSize(): string {
    const bytes = this.data.length;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }  // Static factory methods for compatibility
  static fromUrl(url: string, format?: ImageFormat, metadata?: ImageMetadata): Image {
    // This would need actual implementation to fetch from URL
    throw new Error('Image.fromUrl not implemented - use SmartAssetFactory instead');
  }

  static fromFile(filePath: string): Image {
    // This would need actual implementation to read file
    throw new Error('Image.fromFile not implemented - use SmartAssetFactory instead');
  }

  // Instance methods
  saveToFile(filePath: string): Promise<void> {
    // This would need actual implementation to save file
    throw new Error('Image.saveToFile not implemented - use SmartAssetFactory instead');
  }
}
