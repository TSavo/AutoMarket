/**
 * VideoToVideoProvider Interface
 * 
 * Provider role for video-to-video transformation capabilities.
 * Includes video enhancement, upscaling, style transfer, etc.
 */

import { VideoToVideoModel } from '../../../models/VideoToVideoModel';
import { ServiceManagement } from '../ServiceManagement';

/**
 * Video-to-Video Provider Role
 */
export interface VideoToVideoProvider extends ServiceManagement {
  createVideoToVideoModel(modelId: string): Promise<VideoToVideoModel>;
  getSupportedVideoToVideoModels(): string[];
  supportsVideoToVideoModel(modelId: string): boolean;
}
