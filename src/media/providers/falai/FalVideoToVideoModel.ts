/**
 * Fal.ai Video-to-Video Model Implementation
 * 
 * Specific model implementation for fal.ai video-to-video models.
 * Implements VideoToVideoModel interface and uses fal.ai API.
 */

import { ModelMetadata } from '../../models/abstracts/Model';
import { VideoToVideoModel, VideoCompositionOptions, VideoCompositionResult } from '../../models/abstracts/VideoToVideoModel';
import { Video, VideoRole } from '../../assets/roles';
import { FalAiClient, FalModelMetadata } from './FalAiClient';
import { SmartAssetFactory } from '../../assets/SmartAssetFactory';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface FalModelConfig {
  client: FalAiClient;
  modelMetadata: FalModelMetadata;
  falAiClient: FalAiClient;
}

/**
 * FalVideoToVideoModel - Implements VideoToVideoModel for fal.ai models like face-swap, video enhancement, etc.
 */
export class FalVideoToVideoModel extends VideoToVideoModel {
  private client: FalAiClient;
  private modelMetadata: FalModelMetadata;
  private falAiClient: FalAiClient;

  constructor(config: FalModelConfig) {
    // Create metadata for VideoToVideoModel
    const metadata: ModelMetadata = {
      id: config.modelMetadata.id,
      name: config.modelMetadata.name || config.modelMetadata.id,
      description: config.modelMetadata.description || '',
      version: '1.0.0',
      provider: 'fal-ai',
      capabilities: ['video-to-video'],
      inputTypes: ['video'],
      outputTypes: ['video']
    };

    super(metadata);

    this.client = config.client;
    this.modelMetadata = config.modelMetadata;
    this.falAiClient = config.falAiClient;
  }
  /**
   * Transform video to video using specific fal.ai video-to-video model
   */
  async transform(baseVideo: VideoRole, overlayVideos: VideoRole | VideoRole[], options?: VideoCompositionOptions): Promise<VideoCompositionResult> {
    // Cast input to Video
    const video = await baseVideo.asVideo();

    if (!video.isValid()) {
      throw new Error('Invalid video data provided');
    }

    try {
      // Upload video to fal.ai
      console.log(`[FalVideoToVideo] Uploading video to fal.ai...`);
      const uploadResult = await this.falAiClient.uploadAsset(video.data, 'input_video.mp4');
      const videoUrl = uploadResult.url;
      console.log(`[FalVideoToVideo] Video uploaded: ${videoUrl}`);

      // Handle overlay video if provided (for face swap, etc.)
      let overlayVideoUrl: string | undefined;
      if (overlayVideos && !Array.isArray(overlayVideos)) {
        const overlay = await overlayVideos.asVideo();
        console.log(`[FalVideoToVideo] Uploading overlay video to fal.ai...`);
        const overlayUploadResult = await this.falAiClient.uploadAsset(overlay.data, 'overlay_video.mp4');
        overlayVideoUrl = overlayUploadResult.url;
        console.log(`[FalVideoToVideo] Overlay video uploaded: ${overlayVideoUrl}`);
      }

      // Prepare input for this specific fal.ai video-to-video model
      const falInput = this.prepareFalInput(videoUrl, overlayVideoUrl, options);

      console.log(`[FalVideoToVideo] Processing video with model: ${this.modelMetadata.id}`);
      console.log(`[FalVideoToVideo] Input:`, falInput);

      // Create request using fal.ai API
      const result = await this.falAiClient.invoke({
        model: this.modelMetadata.id,
        input: falInput,
        logs: true
      });

      console.log(`[FalVideoToVideo] Processing completed:`, result);

      if (result.data) {
        // Handle different output formats from fal.ai
        let resultVideoUrl: string;
        
        if (Array.isArray(result.data.videos)) {
          // Multiple videos - take first one
          resultVideoUrl = result.data.videos[0].url;
        } else if (result.data.video) {
          // Single video object
          resultVideoUrl = typeof result.data.video === 'string' 
            ? result.data.video 
            : result.data.video.url;
        } else if (typeof result.data === 'string') {
          // Direct URL
          resultVideoUrl = result.data;
        } else {
          throw new Error('Unexpected output format from fal.ai');
        }

        console.log(`[FalVideoToVideo] Video processed:`, resultVideoUrl);
          // Create Video from result URL - ACTUALLY DOWNLOAD THE FILE
        const resultVideo = await this.createVideoFromUrl(
          resultVideoUrl,
          {
            originalVideoSize: video.getSize(),
            modelUsed: this.modelMetadata.id,
            options: options,
            requestId: result.requestId
          }
        );

        // Return VideoCompositionResult
        const compositionResult: VideoCompositionResult = {
          composedVideo: resultVideo,
          metadata: {
            duration: resultVideo.getDuration() || 0,
            resolution: `${resultVideo.getDimensions()?.width || 0}x${resultVideo.getDimensions()?.height || 0}`,
            aspectRatio: `${resultVideo.getDimensions()?.width || 16}:${resultVideo.getDimensions()?.height || 9}`,
            framerate: 30, // Default framerate
            baseVideoInfo: {
              duration: video.getDuration() || 0,
              resolution: `${video.getDimensions()?.width || 0}x${video.getDimensions()?.height || 0}`
            },
            overlayInfo: {
              count: overlayVideoUrl ? 1 : 0,
              overlays: overlayVideoUrl ? [{
                index: 0,
                startTime: 0,
                duration: resultVideo.getDuration() || 0,
                position: 'overlay',
                finalSize: { 
                  width: resultVideo.getDimensions()?.width || 0, 
                  height: resultVideo.getDimensions()?.height || 0 
                }
              }] : []
            }
          }
        };

        return compositionResult;
      } else {
        throw new Error(`fal.ai generation failed: No data returned`);
      }

    } catch (error) {
      throw new Error(`fal.ai video-to-video failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create Video object from URL - ACTUALLY DOWNLOADS THE FILE
   */
  private async createVideoFromUrl(url: string, metadata: any = {}): Promise<Video> {
    try {
      console.log(`[FalVideoToVideo] Downloading video from: ${url}`);
      
      // Download the video to a temporary file
      const videoBuffer = await this.downloadFile(url);
      
      // Save to temporary file
      const tempDir = os.tmpdir();
      const filename = `fal-vid2vid-${Date.now()}.mp4`;
      const localPath = path.join(tempDir, filename);
      
      // Save the video to disk
      fs.writeFileSync(localPath, videoBuffer);
      
      console.log(`[FalVideoToVideo] Video saved to: ${localPath} (${(videoBuffer.length / 1024 / 1024).toFixed(2)} MB)`);
      
      // Use SmartAssetFactory to create Asset with automatic metadata extraction
      console.log(`[FalVideoToVideo] Loading video asset with metadata extraction...`);
      const smartAsset = SmartAssetFactory.load(localPath);
      const video = await (smartAsset as any).asVideo();
      
      // Add our custom metadata to the video
      if (video.metadata) {
        Object.assign(video.metadata, {
          url: url,
          localPath: localPath,
          fileSize: videoBuffer.length,
          ...metadata // custom metadata from fal.ai
        });
      }
      
      console.log(`[FalVideoToVideo] Video metadata: duration=${video.getDuration()}s, dimensions=${JSON.stringify(video.getDimensions())}`);
      
      return video;
      
    } catch (error) {
      throw new Error(`Failed to create video from URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Download file from URL and return Buffer
   */
  private async downloadFile(url: string, timeout: number = 120000): Promise<Buffer> {
    const https = require('https');
    const http = require('http');
    
    return new Promise((resolve, reject) => {
      const client = url.startsWith('https:') ? https : http;
      
      const request = client.get(url, (response: any) => {
        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
          return;
        }
        
        const chunks: Buffer[] = [];
        let totalSize = 0;
        const contentLength = parseInt(response.headers['content-length'] || '0');
        
        response.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
          totalSize += chunk.length;
          
          if (contentLength > 0) {
            const progress = (totalSize / contentLength * 100).toFixed(1);
            console.log(`[FalVideoToVideo] Download progress: ${progress}%`);
          }
        });
        
        response.on('end', () => {
          const buffer = Buffer.concat(chunks);
          console.log(`[FalVideoToVideo] Download complete: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);
          resolve(buffer);
        });
        
        response.on('error', reject);
      });
      
      request.on('error', reject);
      request.setTimeout(timeout, () => {
        request.destroy();
        reject(new Error(`Download timeout after ${timeout}ms`));
      });
    });
  }

  /**
   * Prepare input for specific fal.ai video-to-video model based on its parameters
   */
  private prepareFalInput(videoUrl: string, overlayVideoUrl?: string, options?: VideoCompositionOptions): any {
    const input: any = {
      video_url: videoUrl
    };

    // Add model-specific parameters based on the model's parameter schema
    const params = this.modelMetadata.parameters || {};    // Face swap specific parameters
    if (this.modelMetadata.id.includes('face-swap')) {
      if (overlayVideoUrl && params.target_video) {
        input.target_video = overlayVideoUrl;
      }
      // Use opacity as similarity measure for face swap
      if (options?.opacity && params.similarity) {
        input.similarity = options.opacity;
      }
    }

    // Video enhancement specific parameters
    if (this.modelMetadata.id.includes('enhance') || this.modelMetadata.id.includes('upscale')) {
      // Use outputResolution for scale
      if (options?.outputResolution && params.scale) {
        const resolution = options.outputResolution.split('x');
        const width = parseInt(resolution[0]);
        const height = parseInt(resolution[1]);
        input.scale = Math.max(width / 1920, height / 1080); // Scale relative to 1080p
      }
      // Default denoise to true for enhancement
      if (params.denoise) {
        input.denoise = true;
      }
    }

    // General video processing parameters
    if (options?.outputFormat && params.output_format) {
      input.output_format = options.outputFormat;
    }

    if (options?.outputQuality && params.quality) {
      input.quality = options.outputQuality;
    }

    return input;
  }

  /**
   * Check if model is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      return await this.client.testConnection();
    } catch {
      return false;
    }
  }

  /**
   * Get supported video formats
   */
  getSupportedFormats(): string[] {
    // fal.ai typically supports these formats
    return ['mp4', 'webm', 'mov'];
  }

  /**
   * Get model display name
   */
  getDisplayName(): string {
    return this.modelMetadata.name || this.modelMetadata.id;
  }

  /**
   * Get model-specific parameters
   */
  getSupportedParameters(): string[] {
    return Object.keys(this.modelMetadata.parameters || {});
  }
}

export default FalVideoToVideoModel;
