/**
 * VideoRole Interface
 * 
 * Interface for assets that can provide video data.
 */

import { Video } from '../classes';
import { VideoMetadata } from '../types';

export interface VideoRole {
  asVideo(): Promise<Video>;
  getVideoMetadata(): VideoMetadata;
  canPlayVideoRole(): boolean;
}
