/**
 * TextToImageModel - Abstract Base Class
 * 
 * Abstract base class for text-to-image generation models.
 * Uses Asset-role system with automatic casting.
 */

import { Model, ModelMetadata } from './Model';
import { Text, Image, ImageFormat, TextRole } from '../../assets/roles';

export interface TextToImageOptions {
  width?: number;
  height?: number;
  aspectRatio?: string;
  quality?: number | string; // Allow both numeric and string quality values
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
export abstract class TextToImageModel extends Model<TextRole, TextToImageOptions, Image> {
  protected metadata: ModelMetadata;

  constructor(metadata: ModelMetadata) {
    super(metadata);
    this.metadata = metadata;
  }

  /**
   * Transform text to image
   */
  abstract transform(input: TextRole | TextRole[], options?: TextToImageOptions): Promise<Image>;

  /**
   * Check if the model is available
   */
  abstract isAvailable(): Promise<boolean>;
  
}

export default TextToImageModel;
