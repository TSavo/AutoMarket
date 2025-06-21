/**
 * VideoToVideoModel - Abstract Base Class
 * 
 * Abstract base class for video-to-video transformation models.
 * Simple transformation interface - for composition use VideoCompositionBuilder.
 * Uses Asset-role system with automatic casting.
 */

import { ModelMetadata } from './Model';
import { Video, VideoRole } from '../../assets/roles';

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
  videoOutputLabel?: string; // Custom label for video output stream
  audioOutputLabel?: string; // Custom label for audio output stream
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
   * Transform and compose videos - takes array of all input videos
   * @param videos Array of all input videos (order matters for filter complex)
   * @param options Composition options including customFilterComplex
   */
  abstract transform(
    videos: VideoRole | VideoRole[], 
    options?: VideoCompositionOptions
  ): Promise<Video>;



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
