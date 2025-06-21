/**
 * VideoToAudioModel - Abstract Base Class
 * 
 * Abstract base class for video-to-audio transformation models that extract 
 * audio content from video files. This class provides a unified interface for 
 * audio extraction operations using various processing engines and services.
 * 
 * ## Features
 * - **Audio Extraction**: Extract audio tracks from video files
 * - **Format Conversion**: Support multiple output audio formats
 * - **Quality Control**: Configurable bitrate, sample rate, and quality settings
 * - **Time-based Extraction**: Extract audio from specific time ranges
 * - **Audio Processing**: Volume adjustment, normalization, and channel control
 * - **Multi-track Support**: Handle videos with multiple audio tracks
 * - **Codec Flexibility**: Support various input video and output audio codecs
 * 
 * ## Architecture
 * Uses the Asset-role system for type-safe input/output handling with automatic
 * casting between VideoRole and Audio types. Supports extensive configuration
 * through the VideoToAudioOptions interface.
 * 
 * ## Usage Patterns
 * 
 * ### Basic Audio Extraction
 * ```typescript
 * const model = await provider.createVideoToAudioModel('ffmpeg-extractor');
 * const video = AssetLoader.load('movie.mp4');
 * const audio = await model.transform(video, {
 *   outputFormat: 'mp3',
 *   sampleRate: 44100,
 *   quality: 'high'
 * });
 * ```
 * 
 * ### Time-based Extraction
 * ```typescript
 * const audio = await model.transform(video, {
 *   startTime: 30,    // Start at 30 seconds
 *   duration: 120,    // Extract 2 minutes
 *   outputFormat: 'wav',
 *   normalize: true
 * });
 * ```
 * 
 * ### Professional Audio Production
 * ```typescript
 * const audio = await model.transform(video, {
 *   outputFormat: 'flac',
 *   sampleRate: 96000,
 *   channels: 2,
 *   bitrate: '1411k',
 *   volume: 1.2,
 *   normalize: false
 * });
 * ```
 * 
 * @abstract
 */

import { ModelMetadata } from './Model';
import { Video, Audio, VideoRole, AudioRole } from '../../assets/roles';

/**
 * Configuration options for video-to-audio transformation.
 * 
 * These options control various aspects of the audio extraction and processing,
 * from basic format selection to advanced audio manipulation settings.
 */
export interface VideoToAudioOptions {
  /** Output audio format */
  outputFormat?: 'wav' | 'mp3' | 'flac' | 'm4a' | 'aac' | 'ogg' | 'opus';
  
  /** Sample rate in Hz (e.g., 44100, 48000, 96000) */
  sampleRate?: number;
  
  /** Number of audio channels (1 = mono, 2 = stereo, 6 = 5.1, etc.) */
  channels?: number;
  
  /** Audio bitrate (e.g., '128k', '320k', '1411k') */
  bitrate?: string;
  
  /** Quality setting ('low', 'medium', 'high', 'lossless') */
  quality?: 'low' | 'medium' | 'high' | 'lossless';
  
  /** Start time in seconds for extraction */
  startTime?: number;
  
  /** Duration in seconds to extract (from start time) */
  duration?: number;
  
  /** Volume multiplier (1.0 = original, 0.5 = half volume, 2.0 = double) */
  volume?: number;
  
  /** Apply audio normalization to optimize levels */
  normalize?: boolean;
  
  /** Audio track/stream index to extract (for multi-track videos) */
  trackIndex?: number;
  
  /** Audio codec to use for encoding */
  codec?: string;
  
  /** Additional FFmpeg or processor-specific options */
  [key: string]: any;
}

/**
 * Abstract base class for video-to-audio models
 */
export abstract class VideoToAudioModel {
  protected metadata: ModelMetadata;

  constructor(metadata: ModelMetadata) {
    this.metadata = metadata;
  }

  /**
   * Transform video to audio - extracts audio track from video
   */
  abstract transform(input: VideoRole, options?: VideoToAudioOptions): Promise<Audio>;

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
   * Get supported input formats
   */
  getSupportedInputFormats(): string[] {
    return ['mp4', 'avi', 'mov', 'mkv', 'webm', 'flv', 'm4v'];
  }

  /**
   * Get supported output formats
   */
  getSupportedOutputFormats(): string[] {
    return ['wav', 'mp3', 'flac', 'm4a', 'aac', 'ogg'];
  }

  /**
   * Validate input video format
   */
  protected validateInputFormat(video: Video): boolean {
    const format = video.metadata.format?.toLowerCase();
    return format ? this.getSupportedInputFormats().includes(format) : true;
  }

  /**
   * Validate output format option
   */
  protected validateOutputFormat(format?: string): boolean {
    if (!format) return true;
    return this.getSupportedOutputFormats().includes(format.toLowerCase());
  }

  /**
   * Estimate processing time for given video
   */
  estimateProcessingTime(video: Video): number {
    const duration = video.getDuration() || 60; // Default to 60 seconds if unknown
    // Default estimation: ~0.5x real-time processing for audio extraction
    return duration * 500; // milliseconds
  }

  /**
   * Get default options for video-to-audio conversion
   */
  protected getDefaultOptions(): VideoToAudioOptions {
    return {
      outputFormat: 'wav',
      sampleRate: 44100,
      channels: 2,
      quality: 'high'
    };
  }

  /**
   * Merge user options with defaults
   */
  protected mergeOptions(userOptions?: VideoToAudioOptions): VideoToAudioOptions {
    return {
      ...this.getDefaultOptions(),
      ...userOptions
    };
  }

  /**
   * Validate conversion options
   */
  protected validateOptions(options: VideoToAudioOptions): void {
    if (options.outputFormat && !this.validateOutputFormat(options.outputFormat)) {
      throw new Error(`Unsupported output format: ${options.outputFormat}`);
    }

    if (options.sampleRate && (options.sampleRate < 8000 || options.sampleRate > 192000)) {
      throw new Error(`Invalid sample rate: ${options.sampleRate}. Must be between 8000 and 192000 Hz`);
    }

    if (options.channels && (options.channels < 1 || options.channels > 8)) {
      throw new Error(`Invalid channel count: ${options.channels}. Must be between 1 and 8`);
    }

    if (options.startTime && options.startTime < 0) {
      throw new Error(`Invalid start time: ${options.startTime}. Must be >= 0`);
    }

    if (options.duration && options.duration <= 0) {
      throw new Error(`Invalid duration: ${options.duration}. Must be > 0`);
    }

    if (options.volume && (options.volume < 0 || options.volume > 10)) {
      throw new Error(`Invalid volume: ${options.volume}. Must be between 0 and 10`);
    }
  }
}
