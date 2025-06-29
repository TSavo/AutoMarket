/**
 * FFMPEGAudioToAudioModel
 * 
 * FFMPEG-based implementation of AudioToAudioModel for audio format conversion
 * and processing. Handles audio-to-audio transformation through the FFMPEG Docker API.
 */

import { AudioToAudioModel, AudioToAudioOptions } from '../../../models/abstracts/AudioToAudioModel';
import { ModelMetadata } from '../../../models/abstracts/Model';
import { Audio, AudioRole } from '../../../assets/roles';
import { AudioFormat } from '../../../assets/roles/types/formats';
import { FFMPEGAPIClient } from './FFMPEGAPIClient';
import { FFMPEGDockerService } from '../../../services/FFMPEGDockerService';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface FFMPEGAudioToAudioModelConfig {
  apiClient?: FFMPEGAPIClient;
  dockerService?: FFMPEGDockerService;
  baseUrl?: string;
  timeout?: number;
}

/**
 * FFMPEG Docker-based audio-to-audio model implementation
 */
export class FFMPEGAudioToAudioModel extends AudioToAudioModel {
  private apiClient?: FFMPEGAPIClient;
  private dockerService?: FFMPEGDockerService;

  constructor(config?: FFMPEGAudioToAudioModelConfig) {
    const metadata: ModelMetadata = {
      id: 'ffmpeg-audio-to-audio',
      name: 'FFMPEG Audio Converter',
      description: 'FFMPEG-based audio format conversion and processing model',
      version: '1.0.0',
      provider: 'ffmpeg-docker',
      capabilities: ['audio-to-audio', 'audio-conversion', 'audio-processing'],
      inputTypes: ['audio'],
      outputTypes: ['audio']
    };

    super(metadata);

    this.apiClient = config?.apiClient;
    this.dockerService = config?.dockerService;

    // Initialize API client if not provided
    if (!this.apiClient && config?.baseUrl) {
      this.apiClient = new FFMPEGAPIClient({
        baseUrl: config.baseUrl,
        timeout: config.timeout || 300000
      });
    }
  }

  /**
   * Transform audio to another format or with processing effects
   */
  async transform(input: AudioRole | AudioRole[], options?: AudioToAudioOptions): Promise<Audio> {
    if (!this.apiClient) {
      throw new Error('FFMPEGAPIClient is required for transform operation');
    }

    // Handle array input (for batch processing)
    if (Array.isArray(input)) {
      if (input.length === 0) {
        throw new Error('At least one audio input is required');
      }
      if (input.length > 1) {
        throw new Error('Multiple audio inputs not supported in this version - use the first audio only');
      }
      input = input[0];
    }

    // Convert AudioRole to Audio object
    const audioObject = await input.asRole(Audio);
    
    // Validate input format
    if (!this.validateInputFormat(audioObject)) {
      throw new Error(`Unsupported input audio format: ${audioObject.metadata?.format}`);
    }

    // Validate and normalize options
    const normalizedOptions = this.validateOptions(options);

    // If no output format specified, keep the same format
    if (!normalizedOptions.outputFormat) {
      normalizedOptions.outputFormat = audioObject.metadata?.format || 'mp3';
    }

    // Check if output format is supported
    if (!this.supportsOutputFormat(normalizedOptions.outputFormat)) {
      throw new Error(`Unsupported output audio format: ${normalizedOptions.outputFormat}`);
    }    try {
      // Use the convertAudio method from the API client
      const result = await this.apiClient.convertAudio(audioObject.data, {
        outputFormat: normalizedOptions.outputFormat as 'wav' | 'mp3' | 'flac' | 'm4a' | 'aac' | 'ogg',
        sampleRate: normalizedOptions.sampleRate,
        bitrate: normalizedOptions.bitrate ? `${normalizedOptions.bitrate}k` : undefined,
        channels: normalizedOptions.channels,
        volume: normalizedOptions.volume,
        normalize: normalizedOptions.normalize,
        startTime: normalizedOptions.startTime,
        duration: normalizedOptions.duration
      });

      if (!result.success) {
        throw new Error(result.error || 'Audio conversion failed');
      }

      // Download the converted audio file
      const audioBuffer = await this.apiClient.downloadFile(result.outputPath!);

      // Create new Audio object with converted data
      const convertedAudio = new Audio(
        audioBuffer,
        {
          metadata: {
            format: normalizedOptions.outputFormat,
            duration: result.metadata?.duration || audioObject.getDuration(),
            sampleRate: normalizedOptions.sampleRate || audioObject.metadata?.sampleRate,
            channels: normalizedOptions.channels || audioObject.metadata?.channels,
            bitrate: normalizedOptions.bitrate,
            ...normalizedOptions.metadata
          }
        },        {
          format: normalizedOptions.outputFormat as AudioFormat,
          duration: result.metadata?.duration || audioObject.getDuration(),
          sampleRate: normalizedOptions.sampleRate || audioObject.metadata?.sampleRate,
          channels: normalizedOptions.channels || audioObject.metadata?.channels,
          bitrate: normalizedOptions.bitrate
        }
      );

      return convertedAudio;

    } catch (error) {
      throw new Error(`Audio conversion failed: ${error.message}`);
    }
  }

  /**
   * Check if the model is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      if (this.apiClient) {
        // Test API client connectivity
        const healthResponse = await this.apiClient.checkHealth();
        return healthResponse.status === 'healthy';
      }
        if (this.dockerService) {
        // For now, assume docker service is available if it exists
        // TODO: Implement proper service availability check
        return true;
      }
      
      return false;
    } catch (error) {
      console.warn(`[FFMPEGAudioToAudioModel] Availability check failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Get supported input audio formats
   */
  getSupportedInputFormats(): string[] {
    // FFMPEG supports a wide range of audio formats
    return [
      'wav', 'mp3', 'flac', 'm4a', 'aac', 'ogg', 'wma', 'opus', 
      'amr', 'aiff', 'au', 'ra', 'ac3', 'dts', 'ape', 'tak'
    ];
  }

  /**
   * Get supported output audio formats
   */
  getSupportedOutputFormats(): string[] {
    // Common output formats supported by FFMPEG
    return [
      'wav', 'mp3', 'flac', 'm4a', 'aac', 'ogg', 'opus', 
      'aiff', 'au', 'ac3'
    ];
  }

  /**
   * Get quality presets for different formats
   */
  getQualityPresets(format: string): Record<string, Partial<AudioToAudioOptions>> {
    const formatLower = format.toLowerCase();
    
    switch (formatLower) {
      case 'mp3':
        return {
          low: { bitrate: 128, sampleRate: 44100 },
          medium: { bitrate: 192, sampleRate: 44100 },
          high: { bitrate: 320, sampleRate: 44100 }
        };
      
      case 'aac':
        return {
          low: { bitrate: 96, sampleRate: 44100 },
          medium: { bitrate: 128, sampleRate: 44100 },
          high: { bitrate: 256, sampleRate: 44100 }
        };
      
      case 'ogg':
        return {
          low: { bitrate: 128, sampleRate: 44100 },
          medium: { bitrate: 192, sampleRate: 44100 },
          high: { bitrate: 256, sampleRate: 44100 }
        };
      
      case 'wav':
      case 'flac':
        return {
          low: { sampleRate: 44100, channels: 2 },
          medium: { sampleRate: 48000, channels: 2 },
          high: { sampleRate: 96000, channels: 2 },
          lossless: { sampleRate: 192000, channels: 2 }
        };
      
      default:
        return {
          low: { bitrate: 128, sampleRate: 44100 },
          medium: { bitrate: 192, sampleRate: 44100 },
          high: { bitrate: 256, sampleRate: 44100 }
        };
    }
  }

  /**
   * Apply quality preset to options
   */
  applyQualityPreset(options: AudioToAudioOptions): AudioToAudioOptions {
    if (!options.quality || !options.outputFormat) {
      return options;
    }

    const presets = this.getQualityPresets(options.outputFormat);
    const preset = presets[options.quality];
    
    if (preset) {
      // Apply preset values, but don't override explicitly set values
      return {
        ...preset,
        ...options // User options take precedence
      };
    }

    return options;
  }

  /**
   * Validate and normalize options with FFMPEG-specific logic
   */
  protected validateOptions(options?: AudioToAudioOptions): AudioToAudioOptions {
    const normalized = super.validateOptions(options);
    
    // Apply quality preset if specified
    return this.applyQualityPreset(normalized);
  }

  /**
   * Get estimated processing time based on audio duration and options
   */
  estimateProcessingTime(audioDuration: number, options?: AudioToAudioOptions): number {
    // Base processing time (1x realtime for simple conversion)
    let multiplier = 1.0;
    
    // Complex operations take longer
    if (options?.denoise) multiplier += 0.5;
    if (options?.reverb) multiplier += 0.3;
    if (options?.equalizer) multiplier += 0.2;
    if (options?.speed && options.speed !== 1.0) multiplier += 0.3;
    if (options?.pitch && options.pitch !== 0) multiplier += 0.4;
    
    // High quality output takes longer
    if (options?.quality === 'lossless') multiplier += 0.2;
    if (options?.sampleRate && options.sampleRate > 48000) multiplier += 0.3;
    
    return audioDuration * multiplier;
  }

  /**
   * Get recommended buffer size for processing
   */
  getRecommendedBufferSize(audioDuration: number): number {
    // Start with base buffer size
    let bufferSize = 1024 * 1024; // 1MB base
    
    // Increase buffer for longer audio
    if (audioDuration > 300) bufferSize *= 2; // > 5 minutes
    if (audioDuration > 1800) bufferSize *= 2; // > 30 minutes
    
    return bufferSize;
  }
}

export default FFMPEGAudioToAudioModel;
