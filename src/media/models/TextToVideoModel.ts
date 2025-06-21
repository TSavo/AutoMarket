/**
 * TextToVideoModel - Abstract Base Class
 * 
 * Abstract base class for text-to-video generation models.
 * Uses Asset-role system with automatic casting.
 */

import { Model, ModelMetadata } from './Model';
import { Text, Video } from '../assets/roles';
import { TextInput, castToText } from '../assets/casting';

export interface TextToVideoOptions {
  duration?: number; // Video duration in seconds
  width?: number;
  height?: number;
  aspectRatio?: string;
  fps?: number; // Frames per second
  quality?: number;
  format?: 'mp4' | 'webm' | 'mov';
  seed?: number;
  motionStrength?: number;
  loop?: boolean;
  negativePrompt?: string;
  guidanceScale?: number;
  steps?: number;
  [key: string]: any; // Allow model-specific parameters
}

/**
 * Abstract base class for text-to-video models
 */
export abstract class TextToVideoModel extends Model<TextInput, TextToVideoOptions, Video> {
  protected metadata: ModelMetadata;

  constructor(metadata: ModelMetadata) {
    super(metadata);
    this.metadata = metadata;
  }
  
  /**
   * Transform text to video
   */
  abstract transform(input: TextInput, options?: TextToVideoOptions): Promise<Video>;

  /**
   * Check if the model is available
   */
  abstract isAvailable(): Promise<boolean>;

}
