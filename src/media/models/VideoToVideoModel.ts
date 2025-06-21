/**
 * VideoToVideoModel - Abstract Base Class
 * 
 * Abstract base class for video-to-video transformation models.
 * Supports video composition, overlay, and transformation operations.
 * Uses Asset-role system with automatic casting.
 */

import { ModelMetadata } from './Model';
import { Video } from '../assets/roles';
import { VideoInput } from '../assets/casting';

export interface VideoOverlayConfig {
  // Timing options for this overlay
  startTime?: number; // When to start this overlay (in seconds)
  duration?: number; // How long to show this overlay (in seconds)
  
  // Position options for this overlay
  position?: 'top-left' | 'top-center' | 'top-right' | 
            'center-left' | 'center' | 'center-right' |
            'bottom-left' | 'bottom-center' | 'bottom-right';
  offsetX?: number; // Additional horizontal offset (pixels)
  offsetY?: number; // Additional vertical offset (pixels)
  
  // Size options for this overlay
  width?: number | string; // Width in pixels or percentage ('50%')
  height?: number | string; // Height in pixels or percentage ('30%')
  maintainAspectRatio?: boolean; // Whether to maintain overlay aspect ratio
  
  // Visual options for this overlay
  opacity?: number; // Overlay opacity (0.0 to 1.0)
  blendMode?: 'normal' | 'multiply' | 'screen' | 'overlay' | 'soft-light' | 'hard-light';
}

export interface VideoCompositionOptions {
  // Global timing options (legacy support)
  overlayStartTime?: number; // When to start the overlay (in seconds) - for single overlay backward compatibility
  overlayDuration?: number; // How long to show the overlay (in seconds) - for single overlay backward compatibility
  
  // Global position options (legacy support)
  position?: 'top-left' | 'top-center' | 'top-right' | 
            'center-left' | 'center' | 'center-right' |
            'bottom-left' | 'bottom-center' | 'bottom-right';
  offsetX?: number; // Additional horizontal offset (pixels)
  offsetY?: number; // Additional vertical offset (pixels)
  
  // Global size options (legacy support)
  overlayWidth?: number | string; // Width in pixels or percentage ('50%')
  overlayHeight?: number | string; // Height in pixels or percentage ('30%')
  maintainAspectRatio?: boolean; // Whether to maintain overlay aspect ratio
  
  // Global visual options (legacy support)
  opacity?: number; // Overlay opacity (0.0 to 1.0)
  blendMode?: 'normal' | 'multiply' | 'screen' | 'overlay' | 'soft-light' | 'hard-light';
  
  // Multi-overlay configuration - takes precedence over global options
  overlayConfigs?: VideoOverlayConfig[]; // Per-overlay configuration for multiple overlays
  
  // Output options
  outputFormat?: 'mp4' | 'avi' | 'mov' | 'webm' | 'mkv';
  outputQuality?: 'low' | 'medium' | 'high' | 'ultra';
  outputResolution?: string; // e.g., '1920x1080', '1280x720'
  framerate?: number; // Output framerate
  codec?: 'libx264' | 'libx265' | 'libvpx' | 'h264_nvenc' | 'h265_nvenc' | 'av1_nvenc';
  
  // Advanced options
  customFilterComplex?: string; // Custom filter complex string for advanced users
  
  // Smart positioning (handles different aspect ratios)
  smartPositioning?: boolean; // Enable smart aspect ratio handling
  fallbackPosition?: 'top-left' | 'top-center' | 'top-right' | 
                    'center-left' | 'center' | 'center-right' |
                    'bottom-left' | 'bottom-center' | 'bottom-right';
}

export interface VideoCompositionResult {
  composedVideo: Video;
  metadata: {
    duration: number;
    resolution: string;
    aspectRatio: string;
    framerate: number;
    baseVideoInfo: {
      duration: number;
      resolution: string;
    };
    overlayInfo: {
      count: number; // Number of overlays processed
      overlays: Array<{
        index: number;
        startTime: number;
        duration: number;
        position: string;
        finalSize: { width: number; height: number };
      }>;
    };
  };
}

/**
 * Abstract base class for video-to-video models (composition, overlay, etc.)
 * 
 * This class only defines the interface - concrete implementations like
 * FFMPEGVideoFilterModel handle the actual video processing logic.
 */
export abstract class VideoToVideoModel {
  protected metadata: ModelMetadata;

  constructor(metadata: ModelMetadata) {
    this.metadata = metadata;
  }

  /**
   * Transform and compose videos - supports single overlay (legacy) or multiple overlays (new)
   * @param baseVideo The main/background video
   * @param overlayVideos Single overlay video (legacy) or array of overlay videos (new)
   * @param options Composition options for positioning, timing, etc.
   */
  abstract transform(
    baseVideo: VideoInput, 
    overlayVideos: VideoInput | VideoInput[], 
    options?: VideoCompositionOptions
  ): Promise<VideoCompositionResult>;

  /**
   * Convenience method for simple overlay composition (legacy - single overlay)
   * @param baseVideo The main/background video
   * @param overlayVideo The video to overlay on top
   * @param position Where to place the overlay
   * @param startTime When to start the overlay (seconds)
   */
  async overlay(
    baseVideo: VideoInput,
    overlayVideo: VideoInput,
    position: VideoCompositionOptions['position'] = 'bottom-right',
    startTime: number = 0
  ): Promise<Video> {
    const result = await this.transform(baseVideo, overlayVideo, {
      position,
      overlayStartTime: startTime,
      smartPositioning: true
    });
    return result.composedVideo;
  }

  /**
   * Convenience method for multiple overlay composition (new)
   * @param baseVideo The main/background video
   * @param overlayVideos Array of videos to overlay
   * @param overlayConfigs Array of configuration for each overlay
   */
  async multiOverlay(
    baseVideo: VideoInput,
    overlayVideos: VideoInput[],
    overlayConfigs: VideoOverlayConfig[]
  ): Promise<Video> {
    const result = await this.transform(baseVideo, overlayVideos, {
      overlayConfigs,
      smartPositioning: true
    });
    return result.composedVideo;
  }

  /**
   * Check if the model is available
   */
  abstract isAvailable(): Promise<boolean>;

  /**
   * Get model metadata
   */
  getMetadata(): ModelMetadata {
    return { ...this.metadata };
  }

  /**
   * Get the model ID
   */
  getId(): string {
    return this.metadata.id;
  }

  /**
   * Get the model name
   */
  getName(): string {
    return this.metadata.name;
  }

  /**
   * Get the model description
   */
  getDescription(): string {
    return this.metadata.description || '';
  }

  /**
   * Get the model capabilities
   */
  getCapabilities(): string[] {
    return this.metadata.capabilities || [];
  }
}
