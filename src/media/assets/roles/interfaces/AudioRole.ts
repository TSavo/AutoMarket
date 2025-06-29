/**
 * AudioRole Interface
 * 
 * Interface for assets that can provide audio data.
 */

import { Audio, Video, Text, Image } from '../classes';

export interface AudioRole {
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
}
