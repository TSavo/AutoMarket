/**
 * VideoToImageProvider Interface
 * 
 * Defines the contract for providers that can extract frames from videos.
 */

import { VideoRole, Image } from '../../assets/roles';
import { VideoToImageOptions } from '../../models/abstracts/VideoToImageModel';

export interface VideoToImageProvider {
  /**
   * Get list of supported video-to-image model IDs
   */
  getSupportedVideoToImageModels(): string[];

  /**
   * Extract frame(s) from video using specified model
   * 
   * @param input - Video input (VideoRole or array)
   * @param modelId - Model ID to use for extraction
   * @param options - Frame extraction options
   * @returns Promise resolving to extracted image
   */
  extractFrames(input: VideoRole | VideoRole[], modelId: string, options?: VideoToImageOptions): Promise<Image>;

  /**
   * Extract multiple frames from video
   * 
   * @param input - Video input
   * @param modelId - Model ID to use
   * @param options - Extraction options (must specify frameRate or extractAll)
   * @returns Promise resolving to array of extracted images
   */
  extractMultipleFrames(input: VideoRole, modelId: string, options: VideoToImageOptions): Promise<Image[]>;
}
