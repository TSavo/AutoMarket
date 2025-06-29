/**
 * TextRole Interface
 * 
 * Interface for assets that can provide text data.
 */

import { Text, Audio, Video, Image } from '../classes';
import { TextMetadata } from '../types';

export interface TextRole {
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
  
  getTextMetadata(): TextMetadata;
}
