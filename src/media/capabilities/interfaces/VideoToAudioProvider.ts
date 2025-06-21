/**
 * VideoToAudioProvider Interface
 * 
 * Provider role for video-to-audio transformation capabilities.
 * Typically used for extracting audio tracks from video files.
 */

import { VideoToAudioModel } from '../../models/abstracts/VideoToAudioModel';
import { ServiceManagement } from '../ServiceManagement';

/**
 * Video-to-Audio Provider Role
 */
export interface VideoToAudioProvider extends ServiceManagement {
  createVideoToAudioModel(modelId: string): Promise<VideoToAudioModel>;
  getSupportedVideoToAudioModels(): string[];
  supportsVideoToAudioModel(modelId: string): boolean;
}
