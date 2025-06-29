/**
 * Fal.ai Image-to-Video Model Implementation
 * 
 * Specific model implementation for fal.ai image-to-video models.
 * Implements ImageToVideoModel interface and uses fal.ai API.
 */

import { ModelMetadata } from '../../models/abstracts/Model';
import { ImageToVideoModel, ImageToVideoOptions } from '../../models/abstracts/ImageToVideoModel';
import { Video, ImageRole, Image } from '../../assets/roles';
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
 * FalImageToVideoModel - Implements ImageToVideoModel for fal.ai models like FramePack, Stable Video Diffusion, etc.
 */
export class FalImageToVideoModel extends ImageToVideoModel {
  private client: FalAiClient;
  private modelMetadata: FalModelMetadata;
  private falAiClient: FalAiClient;

  constructor(config: FalModelConfig) {
    // Create metadata for ImageToVideoModel
    const metadata: ModelMetadata = {
      id: config.modelMetadata.id,
      name: config.modelMetadata.name || config.modelMetadata.id,
      description: config.modelMetadata.description || '',
      version: '1.0.0',
      provider: 'fal-ai',
      capabilities: ['image-to-video'],
      inputTypes: ['image'],
      outputTypes: ['video']
    };

    super(metadata);

    this.client = config.client;
    this.modelMetadata = config.modelMetadata;
    this.falAiClient = config.falAiClient;
  }

  /**
   * Transform image to video using specific fal.ai image-to-video model
   */
  async transform(input: ImageRole | ImageRole[], options?: ImageToVideoOptions): Promise<Video> {
    // Handle array input - get first element for single video generation
    const inputRole = Array.isArray(input) ? input[0] : input;

    // Cast input to Image
    const image = await inputRole.asRole(Image);

    if (!image.isValid()) {
      throw new Error('Invalid image data provided');
    }

    try {      // Upload image to fal.ai - use the image data directly
      console.log(`[FalImageToVideo] Uploading image to fal.ai...`);
      const uploadResult = await this.falAiClient.uploadAsset(image.data, 'input_image.jpg');
      const imageUrl = uploadResult.url;
      console.log(`[FalImageToVideo] Image uploaded: ${imageUrl}`);

      // Prepare input for this specific fal.ai image-to-video model
      const falInput = this.prepareFalInput(imageUrl, options);

      console.log(`[FalImageToVideo] Generating video with model: ${this.modelMetadata.id}`);
      console.log(`[FalImageToVideo] Input:`, falInput);

      // Create request using fal.ai API
      const result = await this.falAiClient.invoke({
        model: this.modelMetadata.id,
        input: falInput,
        logs: true
      });

      console.log(`[FalImageToVideo] Generation completed:`, result);      if (result.data) {
        // Handle different output formats from fal.ai
        let videoUrl: string;
        
        // Check for nested data structure first
        const responseData = result.data.data || result.data;
        
        if (Array.isArray(responseData.videos)) {
          // Multiple videos - take first one
          videoUrl = responseData.videos[0].url;
        } else if (responseData.video) {
          // Single video object
          videoUrl = typeof responseData.video === 'string' 
            ? responseData.video 
            : responseData.video.url;        } else if (typeof responseData === 'string') {
          // Direct URL
          videoUrl = responseData;
        } else {
          throw new Error('Unexpected output format from fal.ai');
        }

        console.log(`[FalImageToVideo] Video generated:`, videoUrl);
          // Create Video from result URL - ACTUALLY DOWNLOAD THE FILE
        const video = await this.createVideoFromUrl(
          videoUrl,          {
            originalImageSize: image.getSize(),
            modelUsed: this.modelMetadata.id,
            options: options,
            requestId: result.requestId,
            generation_prompt: createGenerationPrompt({
              input: `[Image: ${image.getSize()} bytes]`, // Represent image input
              options: options,
              modelId: this.modelMetadata.id,
              modelName: this.modelMetadata.name,
              provider: 'fal-ai',
              transformationType: 'image-to-video',
              modelMetadata: {
                falModelParameters: this.modelMetadata.parameters,
                modelVersion: this.modelMetadata.id
              },
              requestId: result.requestId
            })
          }
        );

        return video;
      } else {
        throw new Error(`fal.ai generation failed: No data returned`);
      }

    } catch (error) {
      throw new Error(`fal.ai image-to-video failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create Video object from URL - ACTUALLY DOWNLOADS THE FILE
   */
  private async createVideoFromUrl(url: string, metadata: any = {}): Promise<Video> {
    try {
      console.log(`[FalImageToVideo] Downloading video from: ${url}`);
      
      // Download the video to a temporary file
      const videoBuffer = await this.downloadFile(url);
      
      // Save to temporary file
      const tempDir = os.tmpdir();
      const filename = `fal-img2vid-${Date.now()}.mp4`;
      const localPath = path.join(tempDir, filename);
      
      // Save the video to disk
      fs.writeFileSync(localPath, videoBuffer);
      
      console.log(`[FalImageToVideo] Video saved to: ${localPath} (${(videoBuffer.length / 1024 / 1024).toFixed(2)} MB)`);      // Use SmartAssetFactory to create Asset with automatic metadata extraction
      const smartAsset = await SmartAssetFactory.load(localPath);
      const video = await (smartAsset as any).asRole(Video);
      
      // Add our custom metadata to the video
      if (video.metadata) {
        Object.assign(video.metadata, {
          url: url,
          localPath: localPath,
          fileSize: videoBuffer.length,
          ...metadata // custom metadata from fal.ai
        });
      }
      
      console.log(`[FalImageToVideo] Video metadata: duration=${video.getDuration()}s, dimensions=${JSON.stringify(video.getDimensions())}`);
      
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
            console.log(`[FalImageToVideo] Download progress: ${progress}%`);
          }
        });
        
        response.on('end', () => {
          const buffer = Buffer.concat(chunks);
          console.log(`[FalImageToVideo] Download complete: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);
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
   * Prepare input for specific fal.ai image-to-video model based on its parameters
   */
  private prepareFalInput(imageUrl: string, options?: ImageToVideoOptions): any {
    const input: any = {
      image_url: imageUrl
    };

    // Add model-specific parameters based on the model's parameter schema
    const params = this.modelMetadata.parameters || {};

    // Common fal.ai image-to-video parameters
    if (options?.duration && params.duration) {
      input.duration = options.duration;
    }

    if (options?.fps && params.fps) {
      input.fps = options.fps;
    }

    if (options?.motionStrength && params.motion_strength) {
      input.motion_strength = options.motionStrength;
    }

    if (options?.motionBucketId && params.motion_bucket_id) {
      input.motion_bucket_id = options.motionBucketId;
    }

    if (options?.seed && params.seed) {
      input.seed = options.seed;
    }

    if (options?.guidanceScale && params.guidance_scale) {
      input.guidance_scale = options.guidanceScale;
    }

    if (options?.noiseAugStrength && params.noise_aug_strength) {
      input.noise_aug_strength = options.noiseAugStrength;
    }

    if (options?.prompt && params.prompt) {
      input.prompt = options.prompt;
    }

    if (options?.negativePrompt && params.negative_prompt) {
      input.negative_prompt = options.negativePrompt;
    }

    // FramePack specific parameters
    if (this.modelMetadata.id.includes('framepack')) {
      input.interpolation_steps = options?.interpolationSteps || 8;
      input.loop = options?.loop || false;
    }

    // Stable Video Diffusion specific parameters
    if (this.modelMetadata.id.includes('stable-video')) {
      input.num_frames = Math.min((options?.duration || 2) * (options?.fps || 25), 50); // Max 50 frames
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

export default FalImageToVideoModel;
