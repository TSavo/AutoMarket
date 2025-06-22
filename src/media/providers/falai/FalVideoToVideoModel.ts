/**
 * Fal.ai Video-to-Video Model Implementation
 * 
 * Specific model implementation for fal.ai video-to-video models.
 * Implements VideoToVideoModel interface and uses fal.ai API.
 */

import { ModelMetadata } from '../../models/abstracts/Model';
import { VideoToVideoModel, VideoCompositionOptions } from '../../models/abstracts/VideoToVideoModel';
import { Video, VideoRole } from '../../assets/roles';
import { FalAiClient, FalModelMetadata } from './FalAiClient';
import { SmartAssetFactory } from '../../assets/SmartAssetFactory';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { createGenerationPrompt } from '../../utils/GenerationPromptHelper';

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
  }  /**
   * Transform video to video using specific fal.ai video-to-video model
   */
  async transform(baseVideo: VideoRole | VideoRole[], options?: VideoCompositionOptions): Promise<Video> {
    if (!Array.isArray(baseVideo)) {
      baseVideo = [baseVideo];
    }
    const videos = await Promise.all(baseVideo.map(v => v.asVideo()));

    for (const video of videos) {
      if (!video.isValid()) {
        throw new Error('Invalid video data provided');
      }
    }

    try {
      // Upload primary video to fal.ai
      const primaryVideo = videos[0];
      console.log(`[FalVideoToVideo] Uploading primary video to fal.ai...`);
      const uploadResult = await this.falAiClient.uploadAsset(primaryVideo.data, 'primary_video.mp4');
      const primaryVideoUrl = uploadResult.url;
      console.log(`[FalVideoToVideo] Primary video uploaded: ${primaryVideoUrl}`);

      // Upload secondary video if provided (for face swap, etc.)
      let secondaryVideoUrl: string | undefined;
      if (videos.length > 1) {
        console.log(`[FalVideoToVideo] Uploading secondary video to fal.ai...`);
        const secondaryUploadResult = await this.falAiClient.uploadAsset(videos[1].data, 'secondary_video.mp4');
        secondaryVideoUrl = secondaryUploadResult.url;
        console.log(`[FalVideoToVideo] Secondary video uploaded: ${secondaryVideoUrl}`);
      }

      // Prepare input for this specific fal.ai video-to-video model
      const falInput = this.prepareFalInput(primaryVideoUrl, secondaryVideoUrl, options);

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
        }        console.log(`[FalVideoToVideo] Video processed:`, resultVideoUrl);
          // Create Video from result URL - ACTUALLY DOWNLOAD THE FILE
        const resultVideo = await this.createVideoFromUrl(
          resultVideoUrl,
          {
            originalVideoSize: primaryVideo.getSize(),
            modelUsed: this.modelMetadata.id,
            options: options,
            requestId: result.requestId,
            generation_prompt: createGenerationPrompt({
              input: `[Video: ${primaryVideo.getSize()} bytes]${videos.length > 1 ? ` + [Video: ${videos[1].getSize()} bytes]` : ''}`,
              options: options,
              modelId: this.modelMetadata.id,
              modelName: this.modelMetadata.name,
              provider: 'fal-ai',
              transformationType: 'video-to-video',
              modelMetadata: {
                falModelParameters: this.modelMetadata.parameters,
                modelVersion: this.modelMetadata.id
              },
              requestId: result.requestId
            })
          }
        );

        return resultVideo; // Return the video directly, not wrapped in VideoCompositionResult
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
      
      console.log(`[FalVideoToVideo] Video saved to: ${localPath} (${(videoBuffer.length / 1024 / 1024).toFixed(2)} MB)`);      // Use SmartAssetFactory to create Asset with automatic metadata extraction
      const smartAsset = await SmartAssetFactory.load(localPath);
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
  private prepareFalInput(primaryVideoUrl: string, secondaryVideoUrl?: string, options?: VideoCompositionOptions): any {
    const input: any = {};
    const params = this.modelMetadata.parameters || {};
    const modelId = this.modelMetadata.id.toLowerCase();

    // Face swap models
    if (modelId.includes('face-swap') || modelId.includes('faceswap')) {
      // Primary video is usually the target (where we want to put the face)
      input.target_video = primaryVideoUrl;
      
      // Secondary video is the source (face to extract)
      if (secondaryVideoUrl) {
        input.source_video = secondaryVideoUrl;
      } else {
        throw new Error('Face swap requires two videos: target video and source video with the face to swap');
      }
      
      // Face swap specific parameters
      if (options?.opacity !== undefined && params.similarity) {
        input.similarity = options.opacity;
      }
      if (params.face_restore) {
        input.face_restore = true;
      }
      if (params.background_enhance) {
        input.background_enhance = true;
      }
    }
    
    // Video enhancement/upscaling models
    else if (modelId.includes('enhance') || modelId.includes('upscale') || modelId.includes('interpolate')) {
      input.video_url = primaryVideoUrl;
      
      // Scale/resolution parameters
      if (options?.outputResolution && params.scale) {
        const resolution = options.outputResolution.split('x');
        const width = parseInt(resolution[0]);
        const height = parseInt(resolution[1]);
        input.scale = Math.max(width / 1920, height / 1080); // Scale relative to 1080p
      }
        // Quality parameters
      if (params.denoise) {
        input.denoise = true;
      }
      if (params.sharpen) {
        // For quality strings, convert to boolean based on quality level
        const qualityLevel = options?.outputQuality;
        input.sharpen = qualityLevel === 'high' || qualityLevel === 'ultra';
      }
    }
    
    // Style transfer or general video-to-video models
    else {
      input.video_url = primaryVideoUrl;
      
      // If there's a second video, it might be a style reference
      if (secondaryVideoUrl && params.style_video) {
        input.style_video = secondaryVideoUrl;
      } else if (secondaryVideoUrl && params.reference_video) {
        input.reference_video = secondaryVideoUrl;
      }
    }

    // General parameters that apply to most models
    if (options?.outputFormat && params.output_format) {
      input.output_format = options.outputFormat;
    }

    if (options?.outputQuality && params.quality) {
      input.quality = options.outputQuality;
    }

    // Add any additional model-specific parameters from options
    if (options?.customParameters) {
      Object.assign(input, options.customParameters);
    }

    console.log(`[FalVideoToVideo] Prepared input for ${modelId}:`, input);
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
