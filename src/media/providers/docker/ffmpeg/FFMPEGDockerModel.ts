/**
 * FFMPEGDockerModel
 * 
 * Docker-based implementation of VideoToAudioModel using FFMPEG service.
 * Handles video-to-audio transformation through the FFMPEG Docker API.
 */

import { VideoToAudioModel, VideoToAudioOptions } from '../../../models/abstracts/VideoToAudioModel';
import { ModelMetadata } from '../../../models/abstracts/Model';
import { Video, Audio, VideoRole } from '../../../assets/roles';
import { FFMPEGAPIClient } from './FFMPEGAPIClient';
import { FFMPEGDockerService } from '../../../services/FFMPEGDockerService';
import fs from 'fs';
import path from 'path';
import os from 'os';

export interface FFMPEGDockerModelConfig {
  dockerService: FFMPEGDockerService;
  apiClient: FFMPEGAPIClient;
}

/**
 * FFMPEG Docker-based video-to-audio model implementation
 */
export class FFMPEGDockerModel extends VideoToAudioModel {
  private dockerService: FFMPEGDockerService;
  private apiClient: FFMPEGAPIClient;
  private tempDir: string;

  constructor(config: FFMPEGDockerModelConfig) {
    const metadata: ModelMetadata = {
      id: 'ffmpeg-docker',
      name: 'FFMPEG Docker Video to Audio',
      description: 'Extract audio from video files using FFMPEG in Docker container',
      version: '1.0.0',
      provider: 'ffmpeg-docker',
      inputTypes: ['video'],
      outputTypes: ['audio'],
      capabilities: ['video-to-audio', 'audio-extraction', 'format-conversion']
    };

    super(metadata);
    this.dockerService = config.dockerService;
    this.apiClient = config.apiClient;
    this.tempDir = path.join(os.tmpdir(), 'ffmpeg-docker-model');

    // Ensure temp directory exists
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Transform video to audio using FFMPEG Docker service
   */
  async transform(input: VideoRole | VideoRole[], options?: VideoToAudioOptions): Promise<Audio> {
    const startTime = Date.now();

    try {
      // Handle array input - get first element for single audio extraction
      const inputRole = Array.isArray(input) ? input[0] : input;

      // Get video from the VideoRole
      const video = await inputRole.asVideo();

      // Validate input
      if (!video.isValid()) {
        throw new Error('Invalid video data provided');
      }

      if (!this.validateInputFormat(video)) {
        throw new Error(`Unsupported video format: ${video.metadata.format}`);
      }

      // Merge and validate options
      const mergedOptions = this.mergeOptions(options);
      this.validateOptions(mergedOptions);

      // Ensure Docker service is running
      const serviceStarted = await this.dockerService.startService();
      if (!serviceStarted) {
        throw new Error('Failed to start FFMPEG Docker service');
      }

      // Wait for service to be healthy
      const isHealthy = await this.dockerService.waitForHealthy(60000);
      if (!isHealthy) {
        throw new Error('FFMPEG Docker service failed to become healthy');
      }

      // Save video data to temporary file
      const tempFilePath = await this.saveVideoToTempFile(video);

      try {
        // Extract audio using API client
        console.log('🎵 Extracting audio from video using FFMPEG service...');
        
        // Ensure outputFormat is compatible with API client
        const supportedFormats = ['wav', 'mp3', 'flac', 'm4a', 'aac', 'ogg'] as const;
        const outputFormat = mergedOptions.outputFormat && supportedFormats.includes(mergedOptions.outputFormat as any) 
          ? mergedOptions.outputFormat as 'wav' | 'mp3' | 'flac' | 'm4a' | 'aac' | 'ogg'
          : 'mp3';
        
        const result = await this.apiClient.extractAudio(tempFilePath, {
          outputFormat,
          sampleRate: mergedOptions.sampleRate,
          channels: mergedOptions.channels,
          bitrate: mergedOptions.bitrate,
          quality: mergedOptions.quality,
          startTime: mergedOptions.startTime,
          duration: mergedOptions.duration,
          volume: mergedOptions.volume,
          normalize: mergedOptions.normalize
        });

        if (!result.success) {
          throw new Error(result.error || 'Audio extraction failed');
        }

        // Download the extracted audio file
        const audioBuffer = await this.apiClient.downloadFile(result.outputPath!);

        // Create Audio object with extracted data
        // Create source asset with extraction metadata
        const audioSourceAsset = {
          metadata: {
            ...(video.sourceAsset?.metadata || {}),
            format: result.format,
            duration: result.metadata.duration,
            sampleRate: result.metadata.sampleRate,
            channels: result.metadata.channels,
            size: result.metadata.size,
            bitrate: result.metadata.bitrate,
            processingTime: Date.now() - startTime,
            extractedFrom: video.sourceAsset?.metadata?.format || 'video',
            ffmpegProcessingTime: result.processingTime,
            model: 'ffmpeg-docker',
            provider: 'ffmpeg-docker'
          }
        };

        // Create new Audio with updated source asset metadata
        const audio = new Audio(audioBuffer, audioSourceAsset);

        console.log(`✅ Audio extraction completed in ${Date.now() - startTime}ms`);
        console.log(`📊 Output: ${result.format}, ${result.metadata.duration}s, ${result.metadata.sampleRate}Hz`);

        return audio;

      } finally {
        // Clean up temporary file
        this.cleanupTempFile(tempFilePath);
      }

    } catch (error) {
      console.error('❌ FFMPEG Docker model transformation failed:', error);
      throw new Error(`Video to audio transformation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if the model is available (Docker service is healthy)
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Check if Docker service is healthy
      const isHealthy = await this.dockerService.isHealthy();
      if (isHealthy) {
        return true;
      }

      // Try to test API connection directly
      return await this.apiClient.testConnection();
    } catch (error) {
      console.warn('⚠️ FFMPEG Docker model availability check failed:', error.message);
      return false;
    }
  }

  /**
   * Get model status and information
   */
  async getStatus(): Promise<{
    available: boolean;
    dockerService: any;
    apiHealth?: any;
    error?: string;
  }> {
    try {
      const dockerStatus = await this.dockerService.getServiceStatus();
      let apiHealth;
      let available = false;

      if (dockerStatus.running && dockerStatus.health === 'healthy') {
        try {
          apiHealth = await this.apiClient.checkHealth();
          available = true;
        } catch (apiError) {
          available = false;
        }
      }

      return {
        available,
        dockerService: dockerStatus,
        apiHealth
      };
    } catch (error) {
      return {
        available: false,
        dockerService: { running: false, health: 'unhealthy', state: 'error' },
        error: error.message
      };
    }
  }

  /**
   * Start the underlying Docker service
   */
  async startService(): Promise<boolean> {
    return await this.dockerService.startService();
  }

  /**
   * Stop the underlying Docker service
   */
  async stopService(): Promise<boolean> {
    return await this.dockerService.stopService();
  }

  /**
   * Get service logs for debugging
   */
  async getLogs(lines: number = 100): Promise<string> {
    return await this.dockerService.getLogs(lines);
  }

  /**
   * Clean up temporary files
   */
  async cleanup(): Promise<void> {
    await this.dockerService.cleanup();
  }

  /**
   * Save video data to temporary file
   */
  private async saveVideoToTempFile(video: Video): Promise<string> {
    const timestamp = Date.now();
    const extension = this.getFileExtension(video.metadata.format) || 'mp4';
    const tempFilePath = path.join(this.tempDir, `ffmpeg_input_${timestamp}.${extension}`);

    try {
      fs.writeFileSync(tempFilePath, video.data);
      return tempFilePath;
    } catch (error) {
      throw new Error(`Failed to save video to temp file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get file extension from format
   */
  private getFileExtension(format?: string): string | undefined {
    if (!format) return undefined;

    const formatMap: Record<string, string> = {
      'mp4': 'mp4',
      'avi': 'avi',
      'mov': 'mov',
      'mkv': 'mkv',
      'webm': 'webm',
      'flv': 'flv',
      'm4v': 'm4v'
    };

    return formatMap[format.toLowerCase()];
  }

  /**
   * Clean up temporary file
   */
  private cleanupTempFile(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch {
      // Ignore cleanup errors
    }
  }

  /**
   * Get Docker service for advanced operations
   */
  getDockerService(): FFMPEGDockerService {
    return this.dockerService;
  }

  /**
   * Get API client for direct access
   */
  getAPIClient(): FFMPEGAPIClient {
    return this.apiClient;
  }
}
