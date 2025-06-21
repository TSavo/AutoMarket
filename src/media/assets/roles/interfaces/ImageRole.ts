/**
 * ImageRole Interface
 * 
 * Interface for assets that can provide image data.
 */

import { Image } from '../classes';
import { ImageMetadata } from '../types';

export interface ImageRole {
  asImage(): Promise<Image>;
  getImageMetadata(): ImageMetadata;
  canPlayImageRole(): boolean;
}
