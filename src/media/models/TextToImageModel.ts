/**
 * TextToImageModel - Abstract Base Class
 * 
 * Abstract base class for text-to-image generation models.
 * Uses Asset-role system with automatic casting.
 */

import { Model, ModelMetadata } from './Model';
import { Text } from '../assets/roles';
import { TextInput, castToText } from '../assets/casting';
import * as fs from 'fs';
import * as path from 'path';

// Enhanced Image class with file operations
export class Image {
  constructor(
    public readonly data: Buffer,
    public readonly format: string = 'png',
    public readonly metadata: any = {},
    public readonly sourceAsset?: any
  ) {}

  /**
   * Create Image from URL (for API results)
   */
  static fromUrl(url: string, metadata: any = {}): Image {
    return new Image(Buffer.alloc(0), 'png', { ...metadata, url });
  }

  /**
   * Create Image from file path
   */
  static fromFile(filePath: string): Image {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Image file not found: ${filePath}`);
    }

    const data = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase().slice(1);
    
    return new Image(data, ext, { sourceFile: filePath }, { sourceFile: filePath });
  }

  /**
   * Get image dimensions (placeholder - would need image parsing library)
   */
  getDimensions(): { width?: number; height?: number } {
    return {
      width: this.metadata.width,
      height: this.metadata.height
    };
  }

  /**
   * Get file size in bytes
   */
  getFileSize(): number {
    return this.data.length;
  }

  /**
   * Check if image has valid data
   */
  isValid(): boolean {
    return this.data.length > 0 || !!this.metadata.url;
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
    const fileSize = this.getFileSize();
    return `Image(${this.format.toUpperCase()}${size ? `, ${size}` : ''}${fileSize ? `, ${(fileSize / 1024).toFixed(1)}KB` : ''})`;
  }
}

export interface TextToImageOptions {
  width?: number;
  height?: number;
  aspectRatio?: string;
  quality?: number;
  format?: 'jpg' | 'png' | 'webp';
  seed?: number;
  negativePrompt?: string;
  guidanceScale?: number;
  steps?: number;
  [key: string]: any; // Allow model-specific parameters
}

/**
 * Abstract base class for text-to-image models
 */
export abstract class TextToImageModel extends Model<TextInput, TextToImageOptions, Image> {
  protected metadata: ModelMetadata;

  constructor(metadata: ModelMetadata) {
    super(metadata);
    this.metadata = metadata;
  }

  /**
   * Transform text to image
   */
  abstract transform(input: TextInput, options?: TextToImageOptions): Promise<Image>;

  /**
   * Check if the model is available
   */
  abstract isAvailable(): Promise<boolean>;
  
}

export default TextToImageModel;
