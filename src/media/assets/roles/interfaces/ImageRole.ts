/**
 * ImageRole Interface
 * 
 * Interface for assets that can provide image data.
 */

import { Image, Audio, Video, Text } from '../classes';
import { ImageMetadata } from '../types';

export interface ImageRole {
  /**
   * Universal role transformation method
   * @param targetType - Target role class (Audio, Video, Text, Image)
   * @param modelId - Optional model ID
   */
  asRole<T extends Audio | Video | Text | Image>(
    targetType: new (...args: any[]) => T,
    modelId?: string
  ): Promise<T>;
  
  /**
   * Check if this asset can play a specific role
   * @param targetType - Target role class to check
   */
  canPlayRole<T extends Audio | Video | Text | Image>(
    targetType: new (...args: any[]) => T
  ): boolean;
  
  getImageMetadata(): ImageMetadata;
}
