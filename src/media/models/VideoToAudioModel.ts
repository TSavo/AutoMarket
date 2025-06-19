/**
 * VideoToAudioModel - Abstract Base Class
 * 
 * Abstract base class for video-to-audio transformation models.
 * Uses Asset-role system with automatic casting.
 */

import { ModelMetadata } from './Model';
import { Video, Audio, VideoRole, AudioRole } from '../assets/roles';
import { VideoInput, castToVideo } from '../assets/casting';

export interface VideoToAudioOptions {
  outputFormat?: 'wav' | 'mp3' | 'flac' | 'm4a' | 'aac' | 'ogg';
  sampleRate?: number;
  channels?: number;
  bitrate?: string;
  quality?: string;
  startTime?: number;
  duration?: number;
  volume?: number;
  normalize?: boolean;
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
  abstract transform(input: VideoInput, options?: VideoToAudioOptions): Promise<Audio>;

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
