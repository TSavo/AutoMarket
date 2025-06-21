/**
 * ImageToVideoModel - Abstract Base Class
 * 
 * Abstract base class for image-to-video generation models.
 * Uses Asset-role system with automatic casting.
 */

import { Model, ModelMetadata } from './Model';
import { Video } from '../assets/roles';
import { Image } from './TextToImageModel';

export type ImageInput = Image | Buffer | string; // Image object, buffer, or file path

export interface ImageToVideoOptions {
  duration?: number; // Video duration in seconds
  fps?: number; // Frames per second
  motionStrength?: number;
  motionBucketId?: number;
  seed?: number;
  loop?: boolean;
  interpolationSteps?: number;
  guidanceScale?: number;
  noiseAugStrength?: number;
  prompt?: string; // Optional text prompt for guidance
  negativePrompt?: string;
  [key: string]: any; // Allow model-specific parameters
}

/**
 * Cast input to Image object
 */
export async function castToImage(input: ImageInput): Promise<Image> {
  if (input instanceof Image) {
    return input;
  } else if (Buffer.isBuffer(input)) {
    return new Image(input, 'unknown', { format: 'unknown' });
  } else if (typeof input === 'string') {
    // Assume it's a file path or URL
    if (input.startsWith('http')) {
      return Image.fromUrl(input);
    } else {
      // Load from file path - use Image.fromFile for proper metadata extraction
      return Image.fromFile(input);
    }
  } else {
    throw new Error('Invalid image input type');
  }
}

/**
 * Abstract base class for image-to-video models
 */
export abstract class ImageToVideoModel extends Model<ImageInput, ImageToVideoOptions, Video> {
  protected metadata: ModelMetadata;

  constructor(metadata: ModelMetadata) {
    super(metadata);
    this.metadata = metadata;
  }

  /**
   * Transform image to video
   */
  abstract transform(input: ImageInput, options?: ImageToVideoOptions): Promise<Video>;

  /**
   * Check if the model is available
   */
  abstract isAvailable(): Promise<boolean>;
}
