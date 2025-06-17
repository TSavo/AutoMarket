/**
 * MediaIngest System - Core Types
 * 
 * This file defines the core interfaces and types for the media ingest system.
 * The system is designed to be pluggable, allowing different implementations
 * of metadata discovery for different media types.
 */

import { 
  BaseAsset, 
  MediaType,
  AspectRatio
} from '../types';
import { 
  ImageAsset, 
  ImageFormat 
} from '../image';
import { 
  VideoAsset, 
  VideoFormat 
} from '../video';
import { 
  AudioAsset, 
  AudioFormat 
} from '../audio';
import { 
  FontAsset, 
  FontFormat 
} from '../font';

/**
 * Media ingest options - base interface
 */
export interface MediaIngestOptions {
  path: string;
  generateId?: boolean;
  overwriteExisting?: boolean;
  extractTags?: boolean;
  author?: string;
  license?: string;
  defaultTitle?: string;
  defaultDescription?: string;
  defaultTags?: string[];
  defaultContentPurpose?: string[];
  originalFilename?: string; // Original filename before it was saved to temp directory
  defaultMood?: string; // Added for audio mood
}

/**
 * Result of a media ingest operation
 */
export interface MediaIngestResult<T extends BaseAsset> {
  success: boolean;
  asset?: T;
  error?: string;
  warnings?: string[];
}

/**
 * Base interface for all metadata discovery implementations
 */
export interface MediaMetadataDiscovery<T extends BaseAsset> {
  /**
   * Get the unique identifier for this discovery implementation
   */
  getId(): string;
  
  /**
   * Get the display name for this discovery implementation
   */
  getName(): string;
  
  /**
   * Get the media type this discovery implementation supports
   */
  getSupportedMediaType(): MediaType;

  /**
   * Get the priority of this discovery implementation (higher number = higher priority)
   */
  getPriority(): number;
  
  /**
   * Check if this discovery implementation can handle the given file
   * @param path Path to the file
   */
  canHandle(path: string): Promise<boolean>;
  
  /**
   * Discover metadata from the given file and create an asset object
   * @param path Path to the file
   * @param options Options for the discovery process
   */
  discoverMetadata(path: string, options: MediaIngestOptions): Promise<MediaIngestResult<T>>;
}

/**
 * Interface for image metadata discovery
 */
export interface ImageMediaDiscovery extends MediaMetadataDiscovery<ImageAsset> {
  /**
   * Get supported image formats
   */
  getSupportedFormats(): ImageFormat[];
  
  /**
   * Get image dimensions
   * @param path Path to the image file
   */
  getImageDimensions(path: string): Promise<{ width: number; height: number }>;
  
  /**
   * Get image format
   * @param path Path to the image file
   */
  getImageFormat(path: string): Promise<ImageFormat>;
  
  /**
   * Calculate aspect ratio from dimensions
   * @param width Image width
   * @param height Image height
   */
  calculateAspectRatio(width: number, height: number): AspectRatio | string;
  
  /**
   * Check if image has responsive versions available
   * @param path Path to the image file
   */
  checkResponsiveVersions(path: string): Promise<{
    hasResponsiveVersions: boolean;
    responsiveVersions?: string[];
  }>;
}

/**
 * Interface for video metadata discovery
 */
export interface VideoMediaDiscovery extends MediaMetadataDiscovery<VideoAsset> {
  /**
   * Get supported video formats
   */
  getSupportedFormats(): VideoFormat[];
  
  /**
   * Get video dimensions
   * @param path Path to the video file
   */
  getVideoDimensions(path: string): Promise<{ width: number; height: number }>;
  
  /**
   * Get video format
   * @param path Path to the video file
   */
  getVideoFormat(path: string): Promise<VideoFormat>;
  
  /**
   * Get video duration in seconds
   * @param path Path to the video file
   */
  getVideoDuration(path: string): Promise<number>;
  
  /**
   * Check if video has audio tracks
   * @param path Path to the video file
   */
  hasAudio(path: string): Promise<boolean>;
  
  /**
   * Check if video has captions
   * @param path Path to the video file
   */
  hasCaptions(path: string): Promise<{
    hasCaptions: boolean;
    captionPaths?: string[];
  }>;
  
  /**
   * Generate or find a thumbnail for the video
   * @param path Path to the video file
   */
  generateThumbnail(path: string): Promise<{
    success: boolean;
    thumbnailPath?: string;
  }>;
}

/**
 * Interface for audio metadata discovery
 */
export interface AudioMediaDiscovery extends MediaMetadataDiscovery<AudioAsset> {
  /**
   * Get supported audio formats
   */
  getSupportedFormats(): AudioFormat[];
  
  /**
   * Get audio format
   * @param path Path to the audio file
   */
  getAudioFormat(path: string): Promise<AudioFormat>;
  
  /**
   * Get audio duration in seconds
   * @param path Path to the audio file
   */
  getAudioDuration(path: string): Promise<number>;
  
  /**
   * Get audio bitrate in kbps
   * @param path Path to the audio file
   */
  getAudioBitrate(path: string): Promise<number>;
  
  /**
   * Get number of audio channels
   * @param path Path to the audio file
   */
  getAudioChannels(path: string): Promise<number>;
  
  /**
   * Get audio sample rate in Hz
   * @param path Path to the audio file
   */
  getAudioSampleRate(path: string): Promise<number>;
  
  /**
   * Check if audio has a transcript
   * @param path Path to the audio file
   */
  hasTranscript(path: string): Promise<{
    hasTranscript: boolean;
    transcriptPath?: string;
  }>;
  
  /**
   * Generate or find a waveform image for the audio
   * @param path Path to the audio file
   */
  generateWaveform(path: string): Promise<{
    success: boolean;
    waveformImagePath?: string;
  }>;
}

/**
 * Interface for font metadata discovery
 */
export interface FontMediaDiscovery extends MediaMetadataDiscovery<FontAsset> {
  /**
   * Get supported font formats
   */
  getSupportedFormats(): FontFormat[];
  
  /**
   * Get font format
   * @param path Path to the font file
   */
  getFontFormat(path: string): Promise<FontFormat>;
  
  /**
   * Get font family name
   * @param path Path to the font file
   */
  getFontFamily(path: string): Promise<string>;
  
  /**
   * Get font weight
   * @param path Path to the font file
   */
  getFontWeight(path: string): Promise<number>;
  
  /**
   * Get font style
   * @param path Path to the font file
   */
  getFontStyle(path: string): Promise<'normal' | 'italic' | 'oblique'>;
  
  /**
   * Check if the font is a variable font
   * @param path Path to the font file
   */
  isVariableFont(path: string): Promise<boolean>;
  
  /**
   * Get unicode range supported by the font
   * @param path Path to the font file
   */
  getUnicodeRange(path: string): Promise<string>;
  
  /**
   * Generate or find a preview image for the font
   * @param path Path to the font file
   */
  generatePreview(path: string): Promise<{
    success: boolean;
    previewImagePath?: string;
  }>;
}
