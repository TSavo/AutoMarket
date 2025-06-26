/**
 * FFMPEG API Client
 * 
 * Client for communicating with the FFMPEG Docker service REST API.
 * Handles file uploads, audio extraction, and format conversion.
 */

import axios, { AxiosInstance, AxiosResponse } from 'axios';
const FormData = require('form-data');
import * as fs from 'fs';
import * as path from 'path';
import { Readable } from 'stream';
import { IFFMPEGClient, HealthCheckResult, VideoCompositionOptions, VideoCompositionResult } from '../../ffmpeg/IFFMPEGClient';

export interface FFMPEGClientConfig {
  baseUrl: string;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
}

export interface AudioExtractionOptions {
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

export interface AudioConversionOptions extends AudioExtractionOptions {
  // Same options as extraction for consistency
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

export interface ServiceHealth {
  status: 'healthy' | 'unhealthy';
  version: string;
  ffmpegVersion?: string;
  uptime: number;
  activeJobs: number;
  totalProcessed: number;
  timestamp: Date;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: Date;
}

// Local interfaces moved to generic IFFMPEGClient interface

/**
 * Common interface for FFMPEG clients (API and Local)
 */
// Local interface removed - using imported IFFMPEGClient interface

/**
 * FFMPEG API Client for Docker service communication
 */
export class FFMPEGAPIClient implements IFFMPEGClient {
  private readonly client: AxiosInstance;
  private readonly config: FFMPEGClientConfig;

  constructor(config: FFMPEGClientConfig) {
    this.config = {
      timeout: 300000, // 5 minutes default
      maxRetries: 3,
      retryDelay: 1000,
      ...config
    };

    this.client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'User-Agent': 'AutoMarket-FFMPEG-Client/1.0.0'
      }
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('FFMPEG API Error:', {
          url: error.config?.url,
          method: error.config?.method,
          status: error.response?.status,
          message: error.message
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Check service health
   */
  async checkHealth(): Promise<ServiceHealth> {
    try {
      const response: AxiosResponse<ApiResponse<ServiceHealth>> = await this.client.get('/health');
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Health check failed');
      }
    } catch (error) {
      throw new Error(`Health check failed: ${error.message}`);
    }
  }

  /**
   * Extract audio from video file
   */
  async extractAudio(
    videoData: Buffer | Readable | string,
    options: AudioExtractionOptions = {}
  ): Promise<AudioExtractionResult> {
    try {
      const formData = new FormData();
      
      // Handle different input types
      if (typeof videoData === 'string') {
        // File path
        if (!fs.existsSync(videoData)) {
          throw new Error(`Video file not found: ${videoData}`);
        }
        formData.append('video', fs.createReadStream(videoData));
      } else if (Buffer.isBuffer(videoData)) {
        // Buffer data
        formData.append('video', videoData, { filename: 'video.mp4' });
      } else {
        // Stream
        formData.append('video', videoData, { filename: 'video.mp4' });
      }

      // Add options as form fields
      console.log('API Client: Received options:', options);
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) {
          console.log(`API Client: Adding form field ${key}:`, value);
          formData.append(key, value.toString());
        }
      });

      const response: AxiosResponse<ApiResponse<AudioExtractionResult>> = await this.client.post(
        '/video/extractAudio',
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            'Content-Type': 'multipart/form-data'
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity
        }
      );

      if (response.data.success && response.data.data) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Audio extraction failed');
      }
    } catch (error) {
      if (error.response?.data?.error) {
        throw new Error(`Audio extraction failed: ${error.response.data.error}`);
      }
      throw new Error(`Audio extraction failed: ${error.message}`);
    }
  }

  /**
   * Convert audio file format
   */
  async convertAudio(
    audioData: Buffer | Readable | string,
    options: AudioConversionOptions = {}
  ): Promise<AudioExtractionResult> {
    try {
      const formData = new FormData();
      
      // Handle different input types
      if (typeof audioData === 'string') {
        // File path
        if (!fs.existsSync(audioData)) {
          throw new Error(`Audio file not found: ${audioData}`);
        }
        formData.append('audio', fs.createReadStream(audioData));
      } else if (Buffer.isBuffer(audioData)) {
        // Buffer data
        formData.append('audio', audioData, { filename: 'audio.wav' });
      } else {
        // Stream
        formData.append('audio', audioData, { filename: 'audio.wav' });
      }

      // Add options as form fields
      console.log('API Client: Received options:', options);
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) {
          console.log(`API Client: Adding form field ${key}:`, value);
          formData.append(key, value.toString());
        }
      });

      const response: AxiosResponse<ApiResponse<AudioExtractionResult>> = await this.client.post(
        '/audio/convert',
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            'Content-Type': 'multipart/form-data'
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity
        }
      );

      if (response.data.success && response.data.data) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Audio conversion failed');
      }
    } catch (error) {
      if (error.response?.data?.error) {
        throw new Error(`Audio conversion failed: ${error.response.data.error}`);
      }
      throw new Error(`Audio conversion failed: ${error.message}`);
    }
  }

  /**
   * Download output file from service
   */
  async downloadFile(outputPath: string): Promise<Buffer> {
    try {
      const response = await this.client.get(outputPath, {
        responseType: 'arraybuffer'
      });
      
      return Buffer.from(response.data);
    } catch (error) {
      throw new Error(`Failed to download file: ${error.message}`);
    }
  }

  /**
   * Get service information
   */
  async getServiceInfo(): Promise<any> {
    try {
      const response = await this.client.get('/');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get service info: ${error.message}`);
    }
  }

  /**
   * Test connection to the service
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.checkHealth();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Compose videos together with overlay (supports 2-N videos)
   */
  async composeVideo(
    videoBuffers: Buffer[],
    options: VideoCompositionOptions = {}
  ): Promise<VideoCompositionResult> {
    try {
      const formData = new FormData();
      
      // For backward compatibility with 2-video case, use video1/video2 field names
      if (videoBuffers.length === 2) {
        formData.append('video1', videoBuffers[0], { filename: 'base_video.mp4' });
        formData.append('video2', videoBuffers[1], { filename: 'overlay_video.mp4' });
      } else {
        // For N videos, use video0, video1, video2, etc.
        videoBuffers.forEach((buffer, index) => {
          formData.append(`video${index}`, buffer, { filename: `video_${index}.mp4` });
        });
      }

      // Add options as form fields
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) {
          formData.append(key, value.toString());
        }
      });

      const response: AxiosResponse<Buffer> = await this.client.post(
        '/video/compose',
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            'Content-Type': 'multipart/form-data'
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
          timeout: 900000, // 15 minutes for multiple video processing
          responseType: 'arraybuffer' // Expect binary response
        }
      );

      // Since the endpoint returns the video file directly, we need to construct the result
      const videoBuffer = Buffer.from(response.data);

      // Extract metadata from headers if available
      const processingTime = parseInt(response.headers['x-processing-time'] || '0');
      const duration = parseFloat(response.headers['x-video-duration'] || '0');
      const width = parseInt(response.headers['x-video-width'] || '0');
      const height = parseInt(response.headers['x-video-height'] || '0');
      const fps = parseFloat(response.headers['x-video-fps'] || '0');

      return {
        success: true,
        format: options?.outputFormat || 'mp4',
        videoBuffer,
        metadata: {
          duration,
          width,
          height,
          framerate: fps,
          size: videoBuffer.length
        },
        processingTime
      };
    } catch (error) {
      if (error.response?.data?.error) {
        throw new Error(`Video composition failed: ${error.response.data.error}`);
      }
      throw new Error(`Video composition failed: ${error.message}`);
    }
  }

  /**
   * Apply filter complex to a single video
   */
  async filterVideo(
    videoData: Buffer | Readable | string,
    options: VideoCompositionOptions = {}
  ): Promise<VideoCompositionResult> {
    try {
      const formData = new FormData();

      // Handle video input
      if (typeof videoData === 'string') {
        if (!fs.existsSync(videoData)) {
          throw new Error(`Video file not found: ${videoData}`);
        }
        formData.append('video', fs.createReadStream(videoData));
      } else if (Buffer.isBuffer(videoData)) {
        formData.append('video', videoData, { filename: 'video.mp4' });
      } else {
        formData.append('video', videoData, { filename: 'video.mp4' });
      }

      // Add options as form fields
      console.log('API Client filterVideo: Received options:', options);
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) {
          console.log(`API Client filterVideo: Adding form field ${key}:`, value);
          formData.append(key, value.toString());
        }
      });

      const response: AxiosResponse<Buffer> = await this.client.post(
        '/video/filter',
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            'Content-Type': 'multipart/form-data'
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
          timeout: 600000, // 10 minutes for video processing
          responseType: 'arraybuffer' // Expect binary response
        }
      );

      // Since the endpoint returns the video file directly, we need to construct the result
      const videoBuffer = Buffer.from(response.data);

      // Extract metadata from headers if available
      const processingTime = parseInt(response.headers['x-processing-time'] || '0');
      const duration = parseFloat(response.headers['x-video-duration'] || '0');
      const width = parseInt(response.headers['x-video-width'] || '0');
      const height = parseInt(response.headers['x-video-height'] || '0');
      const fps = parseFloat(response.headers['x-video-fps'] || '0');

      return {
        success: true,
        format: options?.outputFormat || 'mp4',
        videoBuffer,
        metadata: {
          duration,
          width,
          height,
          framerate: fps,
          size: videoBuffer.length
        },
        processingTime
      };
    } catch (error) {
      if (error.response?.data?.error) {
        throw new Error(`Video filter failed: ${error.response.data.error}`);
      }
      throw new Error(`Video filter failed: ${error.message}`);
    }
  }

  /**
   * Apply filter complex to multiple videos (N >= 1)
   * This is the new method that calls the updated /video/filter endpoint
   */
  async filterMultipleVideos(
    videoBuffers: Buffer[],
    options: VideoCompositionOptions = {}
  ): Promise<VideoCompositionResult> {
    try {
      const formData = new FormData();
      
      // Add all videos using upload.any() compatible format
      videoBuffers.forEach((buffer, index) => {
        formData.append(`video${index}`, buffer, { filename: `video_${index}.mp4` });
      });

      // Add options as form fields
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) {
          formData.append(key, value.toString());
        }
      });

      const response: AxiosResponse<Buffer> = await this.client.post(
        '/video/filter',
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            'Content-Type': 'multipart/form-data'
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
          timeout: 900000, // 15 minutes for multiple video processing
          responseType: 'arraybuffer' // Expect binary response
        }
      );

      // Since the endpoint returns the video file directly, we need to construct the result
      const videoBuffer = Buffer.from(response.data);

      // Extract metadata from headers if available
      const processingTime = parseInt(response.headers['x-processing-time'] || '0');
      const duration = parseFloat(response.headers['x-video-duration'] || '0');
      const width = parseInt(response.headers['x-video-width'] || '0');
      const height = parseInt(response.headers['x-video-height'] || '0');
      const fps = parseFloat(response.headers['x-video-fps'] || '0');
      const videoCount = parseInt(response.headers['x-video-count'] || '0');

      return {
        success: true,
        format: options?.outputFormat || 'mp4',
        videoBuffer,
        metadata: {
          duration,
          width,
          height,
          framerate: fps,
          size: videoBuffer.length,
          videoCount
        },
        processingTime
      };
    } catch (error) {
      if (error.response?.data?.error) {
        throw new Error(`Video filter failed: ${error.response.data.error}`);
      }
      throw new Error(`Video filter failed: ${error.message}`);
    }
  }

  /**
   * Get video metadata
   */
  async getVideoMetadata(
    videoData: Buffer | Readable | string
  ): Promise<{ width: number; height: number; duration: number; framerate: number }> {
    try {
      const formData = new FormData();
      
      // Handle different input types
      if (typeof videoData === 'string') {
        if (!fs.existsSync(videoData)) {
          throw new Error(`Video file not found: ${videoData}`);
        }
        formData.append('video', fs.createReadStream(videoData));
      } else if (Buffer.isBuffer(videoData)) {
        formData.append('video', videoData, { filename: 'video.mp4' });
      } else {
        formData.append('video', videoData, { filename: 'video.mp4' });
      }
      //console.log('API Client: getVideoMetadata formData:', formData);

      const response: AxiosResponse<ApiResponse<any>> = await this.client.post(
        '/video/metadata',
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            'Content-Type': 'multipart/form-data'
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity
        }
      );
      console.log('API Client: getVideoMetadata response:', response.data);

      if (response.data.success && response.data.data) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to get video metadata');
      }
    } catch (error) {
      if (error.response?.data?.error) {
        throw new Error(`Failed to get video metadata: ${error.response.data.error}`);
      }
      throw new Error(`Failed to get video metadata: ${error.message}`);
    }
  }

}
