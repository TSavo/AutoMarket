/**
 * IFFMPEGClient
 * 
 * Generic interface for FFMPEG clients that can be either Docker-based or local.
 * This allows the FFMPEGProvider to work with different FFMPEG implementations.
 */

import { Readable } from 'stream';

export interface AudioConversionOptions {
  outputFormat?: 'wav' | 'mp3' | 'flac' | 'm4a' | 'aac' | 'ogg';
  sampleRate?: number;
  channels?: number;
  bitrate?: string;
  quality?: 'low' | 'medium' | 'high' | 'lossless';
  volume?: number;
  normalize?: boolean;
  startTime?: number;
  duration?: number;
  fadeIn?: number;
  fadeOut?: number;
  speed?: number;
  pitch?: number;
  denoise?: boolean;
  bassBoost?: number;
  trebleBoost?: number;
  reverb?: {
    roomSize?: number;
    damping?: number;
    wetLevel?: number;
    dryLevel?: number;
  };
  equalizer?: {
    lowGain?: number;
    midGain?: number;
    highGain?: number;
  };
  loop?: number;
  preserveMetadata?: boolean;
  metadata?: Record<string, any>;
  customFilters?: string[];
  codecOptions?: Record<string, any>;
}

export interface AudioExtractionOptions {
  outputFormat?: 'wav' | 'mp3' | 'flac' | 'm4a' | 'aac' | 'ogg';
  sampleRate?: number;
  channels?: number;
  bitrate?: string;
  quality?: 'low' | 'medium' | 'high' | 'lossless';
  startTime?: number;
  duration?: number;
  volume?: number;
  normalize?: boolean;
}

export interface AudioExtractionResult {
  success: boolean;
  outputPath?: string;
  filename?: string;
  format: string;
  metadata: {
    duration?: number;
    sampleRate?: number;
    channels?: number;
    size: number;
    bitrate?: string;
  };
  processingTime: number;
  error?: string;
}

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  version?: string;
  ffmpegVersion?: string;
  uptime?: number;
  activeJobs?: number;
  totalProcessed?: number;
  timestamp?: Date;
  error?: string;
}

export interface VideoCompositionOptions {
  layout?: 'side-by-side' | 'overlay' | 'picture-in-picture';
  outputFormat?: 'mp4' | 'mov' | 'avi' | 'mkv' | 'webm';
  codec?: 'libx264' | 'libx265' | 'libvpx' | 'h264_nvenc' | 'h265_nvenc' | 'av1_nvenc';
  bitrate?: string;
  resolution?: string;
  fps?: number;
  gap?: number;
  overlayPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  overlayScale?: number;
  overlayOpacity?: number;
  overlayStart?: number; // Start time for overlay in seconds
  overlayEnd?: number;   // End time for overlay in seconds
  pipPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  pipScale?: number;
  pipMargin?: number;
  // Custom filter complex string (takes precedence over layout-based options)
  filterComplex?: string;
  customFilterComplex?: string; // Alias for filterComplex
  // Custom output mapping options
  videoOutputLabel?: string; // Label for video output (default: 'v')
  audioOutputLabel?: string; // Label for audio output (default: use input audio)
  customAudioMapping?: boolean; // Whether to use custom audio mapping instead of input audio
  [key: string]: any;
}

export interface VideoCompositionResult {
  success: boolean;
  outputPath?: string;
  filename?: string;
  format: string;
  videoBuffer?: Buffer;
  metadata: {
    duration?: number;
    width?: number;
    height?: number;
    framerate?: number;
    size: number;
    videoCount?: number; // Number of videos processed
  };
  processingTime: number;
  error?: string;
}

export interface OverlayOptions {
  x?: string | number;
  y?: string | number;
  width?: string | number;
  height?: string | number;
  startTime?: number;
  duration?: number;
  opacity?: number;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center' | 'custom';
  colorKey?: string;
  colorKeySimilarity?: number;
  colorKeyBlend?: number;
}

export interface FilterOptions {
  outputFormat?: 'mp4' | 'webm' | 'avi' | 'mov';
  codec?: string;
  bitrate?: string;
  fps?: number;
  resolution?: string;
  videoOutputLabel?: string;
  audioOutputLabel?: string;
  customAudioMapping?: boolean;
}

export interface CompositionState {
  videos: any[]; // Video array
  overlays: Array<{ video: any; options: OverlayOptions }>;
  prependVideos: any[];
  appendVideos: any[];
  customFilters: string[];
  filterOptions: FilterOptions;
}

/**
 * Generic FFMPEG client interface
 */
export interface IFFMPEGClient {
  /**
   * Check health/availability of the FFMPEG service
   */
  checkHealth(): Promise<HealthCheckResult>;

  /**
   * Test connection to the FFMPEG service
   */
  testConnection(): Promise<boolean>;

  /**
   * Extract audio from video
   */
  extractAudio(
    videoData: Buffer | Readable | string,
    options?: AudioExtractionOptions
  ): Promise<AudioExtractionResult>;

  /**
   * Convert audio from one format to another
   */
  convertAudio(
    audioData: Buffer | Readable | string,
    options?: AudioConversionOptions
  ): Promise<AudioExtractionResult>;

  /**
   * Download a file from the service (for Docker-based clients)
   */
  downloadFile?(filePath: string): Promise<Buffer>;

  /**
   * Get service metadata
   */
  getMetadata?(): Promise<any>;

  /**
   * Get service info (for Docker-based clients)
   */
  getServiceInfo?(): Promise<any>;

  /**
   * Compose multiple videos (for Docker-based clients)
   */
  composeVideo?(videoBuffers: Buffer[], options?: VideoCompositionOptions): Promise<VideoCompositionResult>;

  /**
   * Filter a single video (for Docker-based clients)
   */
  filterVideo?(videoData: Buffer | Readable | string, options?: VideoCompositionOptions): Promise<VideoCompositionResult>;

  /**
   * Filter multiple videos (for Docker-based clients)
   */
  filterMultipleVideos?(videoBuffers: Buffer[], options?: VideoCompositionOptions): Promise<VideoCompositionResult>;
  /**
   * Get video metadata (for Docker-based clients)
   */
  getVideoMetadata?(videoData: Buffer | Readable | string): Promise<{ width: number; height: number; duration: number; framerate: number }>;

  /**
   * Extract frame(s) from video as images
   */
  extractFrames?(videoData: Buffer | Readable | string, options?: FrameExtractionOptions): Promise<FrameExtractionResult>;
}

export interface FrameExtractionOptions {
  frameTime?: number; // Time in seconds to extract frame from
  frameNumber?: number; // Specific frame number to extract
  width?: number; // Output width
  height?: number; // Output height
  format?: 'png' | 'jpg' | 'webp'; // Output image format
  quality?: number; // Image quality (0-100)
  extractAll?: boolean; // Extract all frames
  frameRate?: number; // For extracting multiple frames at specific intervals
  startTime?: number; // Start time for frame extraction
  endTime?: number; // End time for frame extraction
}

export interface FrameExtractionResult {
  success: boolean;
  frames: Buffer[]; // Array of image buffers
  format: string;
  width: number;
  height: number;
  frameCount: number;
  processingTime: number;
  error?: string;
}
