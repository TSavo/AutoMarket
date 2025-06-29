/**
 * FFmpeg Video-to-Image Model Implementation
 * 
 * Uses FFmpeg to extract frames from videos.
 * Supports single frame extraction, multiple frames, and various output formats.
 */

import { ModelMetadata } from '../../models/abstracts/Model';
import { VideoToImageModel, VideoToImageOptions } from '../../models/abstracts/VideoToImageModel';
import { Video, VideoRole, Image } from '../../assets/roles';
import { IFFMPEGClient } from './IFFMPEGClient';
import { SmartAssetFactory } from '../../assets/SmartAssetFactory';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface FFMPEGVideoToImageConfig {
  client: IFFMPEGClient;
  enableGPU?: boolean;
  outputFormat?: 'png' | 'jpg' | 'webp';
  defaultQuality?: number;
}

/**
 * FFMPEGVideoToImageModel - Extracts frames from videos using FFmpeg
 */
export class FFMPEGVideoToImageModel extends VideoToImageModel {
  private client: IFFMPEGClient;
  private config: FFMPEGVideoToImageConfig;

  constructor(config: FFMPEGVideoToImageConfig) {
    const metadata: ModelMetadata = {
      id: 'ffmpeg-video-to-image',
      name: 'FFmpeg Video to Image',
      description: 'Extract frames from videos using FFmpeg',
      version: '1.0.0',
      provider: 'ffmpeg',
      capabilities: ['video-to-image'],
      inputTypes: ['video'],
      outputTypes: ['image']
    };

    super(metadata);
    this.client = config.client;
    this.config = config;
  }
  /**
   * Transform video to image (frame extraction)
   */
  async transform(input: VideoRole | VideoRole[], options?: VideoToImageOptions): Promise<Image> {
    // Handle array input - get first element for single frame extraction
    const inputRole = Array.isArray(input) ? input[0] : input;

    // Cast input to Video using the universal pattern
    const video = await inputRole.asRole(Video);

    if (!video.isValid()) {
      throw new Error('Invalid video data provided');
    }

    try {
      console.log(`[FFMPEGVideoToImage] Extracting frame from video...`);

      // Prepare frame extraction options
      const extractionOptions = {
        frameTime: options?.frameTime || 1.0,
        frameNumber: options?.frameNumber,
        format: (options?.format || this.config.outputFormat || 'jpg') as 'png' | 'jpg' | 'webp',
        width: options?.width,
        height: options?.height,
        quality: options?.quality || this.config.defaultQuality || 90,
        extractAll: false, // Single frame extraction
        frameRate: undefined
      };

      console.log(`[FFMPEGVideoToImage] Extraction options:`, extractionOptions);      // Extract frame using FFmpeg client
      if (!this.client.extractFrames) {
        throw new Error('FFmpeg client does not support frame extraction');
      }

      const result = await this.client.extractFrames(video.data, extractionOptions);

      if (!result.success || result.frames.length === 0) {
        throw new Error(`FFmpeg frame extraction failed: ${result.error || 'No frames extracted'}`);
      }

      console.log(`[FFMPEGVideoToImage] Frame extracted successfully: ${result.frameCount} frame(s)`);

      // Create Image asset from extracted frame (first frame if multiple)
      const frameBuffer = result.frames[0];
      const format = extractionOptions.format;
      
      const image = new Image(frameBuffer, format, {
        format: format,
        mimeType: `image/${format}`,
        width: result.width || extractionOptions.width,
        height: result.height || extractionOptions.height,
        sourceVideo: {
          frameTime: extractionOptions.frameTime,
          frameNumber: extractionOptions.frameNumber,
          videoDuration: video.getDuration?.(),
          videoDimensions: video.getDimensions?.()
        },
        extractionOptions: extractionOptions,
        processingTime: result.processingTime
      });

      console.log(`[FFMPEGVideoToImage] Frame extraction complete: ${image.toString()}`);
      return image;

    } catch (error) {
      throw new Error(`FFmpeg video-to-image failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  /**
   * Extract multiple frames from video
   */
  async extractMultipleFrames(input: VideoRole, options?: VideoToImageOptions): Promise<Image[]> {
    if (!options?.extractAll && !options?.frameRate) {
      throw new Error('extractAll or frameRate must be specified for multiple frame extraction');
    }

    const video = await input.asRole(Video);

    if (!this.client.extractFrames) {
      throw new Error('FFmpeg client does not support frame extraction');
    }

    try {
      const extractionOptions = {
        frameTime: options.frameTime,
        frameNumber: options.frameNumber,
        format: (options.format || this.config.outputFormat || 'jpg') as 'png' | 'jpg' | 'webp',
        width: options.width,
        height: options.height,
        quality: options.quality || this.config.defaultQuality || 90,
        extractAll: options.extractAll || false,
        frameRate: options.frameRate
      };

      const result = await this.client.extractFrames(video.data, extractionOptions);

      if (!result.success) {
        throw new Error(`Multiple frame extraction failed: ${result.error}`);
      }

      // Convert all frame buffers to Image assets
      const images: Image[] = [];
      for (let i = 0; i < result.frames.length; i++) {
        const frameBuffer = result.frames[i];
        const format = extractionOptions.format;
        
        const image = new Image(frameBuffer, format, {
          format: format,
          mimeType: `image/${format}`,
          width: result.width,
          height: result.height,
          sourceVideo: {
            frameTime: extractionOptions.frameTime,
            frameNumber: extractionOptions.frameNumber,
            videoDuration: video.getDuration?.(),
            videoDimensions: video.getDimensions?.()
          },
          frameIndex: i,
          extractionOptions: extractionOptions
        });
        images.push(image);
      }

      return images;
    } catch (error) {
      throw new Error(`Multiple frame extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }  /**
   * Check if FFmpeg client is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      // For now, assume FFmpeg client is available if it exists
      return this.client !== undefined;
    } catch {
      return false;
    }
  }

  /**
   * Get supported image formats for output
   */
  getSupportedFormats(): string[] {
    return ['png', 'jpg', 'webp', 'bmp'];
  }

  /**
   * Get model display name
   */
  getDisplayName(): string {
    return 'FFmpeg Video to Image Extractor';
  }
}

export default FFMPEGVideoToImageModel;
