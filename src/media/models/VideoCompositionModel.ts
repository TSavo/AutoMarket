import { BaseModel } from './BaseModel';
import { VideoAsset } from '../media/types';

export interface VideoCompositionOptions {
  overlay: {
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center' | 'bottom-center';
    startTime: number; // seconds
    duration?: number; // seconds, optional - if not provided, overlay runs until end
    opacity?: number; // 0-1, default 1
    scale?: number; // scale factor for overlay, default 1
  };
  aspectRatioHandling: 'letterbox' | 'crop' | 'stretch' | 'smart'; // how to handle aspect ratio mismatches
}

export interface VideoCompositionModel extends BaseModel {
  transform(baseVideo: VideoAsset, overlayVideo: VideoAsset, options: VideoCompositionOptions): Promise<VideoAsset>;
  
  /**
   * Compose two videos together with overlay
   * This method is required by the VideoCompositionProvider role
   */
  composeVideos(
    video1: VideoAsset,
    video2: VideoAsset,
    options?: VideoCompositionOptions
  ): Promise<VideoAsset>;
}
