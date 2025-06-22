/**
 * Fal.ai Text-to-Video Model Implementation
 * 
 * Specific model implementation for fal.ai text-to-video models.
 * Implements TextToVideoModel interface and uses fal.ai API.
 */

import { ModelMetadata } from '../../models/abstracts/Model';
import { TextToVideoModel, TextToVideoOptions } from '../../models/abstracts/TextToVideoModel';
import { Video, TextRole } from '../../assets/roles';
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
 * FalTextToVideoModel - Implements TextToVideoModel for fal.ai models like Runway Gen3, Luma Dream Machine, etc.
 */
export class FalTextToVideoModel extends TextToVideoModel {
  private client: FalAiClient;
  private modelMetadata: FalModelMetadata;
  private falAiClient: FalAiClient;

  constructor(config: FalModelConfig) {
    // Create metadata for TextToVideoModel
    const metadata: ModelMetadata = {
      id: config.modelMetadata.id,
      name: config.modelMetadata.name || config.modelMetadata.id,
      description: config.modelMetadata.description || '',
      version: '1.0.0',
      provider: 'fal-ai',
      capabilities: ['text-to-video'],
      inputTypes: ['text'],
      outputTypes: ['video']
    };

    super(metadata);

    this.client = config.client;
    this.modelMetadata = config.modelMetadata;
    this.falAiClient = config.falAiClient;
  }

  /**
   * Transform text to video using specific fal.ai text-to-video model
   */
  async transform(input: TextRole | TextRole[], options?: TextToVideoOptions): Promise<Video> {
    // Handle array input - get first element for single video generation
    const inputRole = Array.isArray(input) ? input[0] : input;

    // Cast input to Text
    const text = await inputRole.asText();

    if (!text.isValid()) {
      throw new Error('Invalid text data provided');
    }

    try {
      // Prepare input for this specific fal.ai text-to-video model
      const falInput = this.prepareFalInput(text.content, options);

      console.log(`[FalTextToVideo] Generating video with model: ${this.modelMetadata.id}`);
      console.log(`[FalTextToVideo] Input:`, falInput);

      // Create request using fal.ai API
      const result = await this.falAiClient.invoke({
        model: this.modelMetadata.id,
        input: falInput,
        logs: true
      });

      console.log(`[FalTextToVideo] Generation completed:`, result);

      if (result.data) {
        // Handle different output formats from fal.ai
        let videoUrl: string;
        
        if (Array.isArray(result.data.videos)) {
          // Multiple videos - take first one
          videoUrl = result.data.videos[0].url;
        } else if (result.data.video) {
          // Single video object
          videoUrl = typeof result.data.video === 'string' 
            ? result.data.video 
            : result.data.video.url;
        } else if (typeof result.data === 'string') {
          // Direct URL
          videoUrl = result.data;
        } else {
          throw new Error('Unexpected output format from fal.ai');
        }

        console.log(`[FalTextToVideo] Video generated:`, videoUrl);
          // Create Video from result URL - ACTUALLY DOWNLOAD THE FILE
        const video = await this.createVideoFromUrl(
          videoUrl,
          {
            originalText: text.content,
            modelUsed: this.modelMetadata.id,
            options: options,
            requestId: result.requestId,
            generation_prompt: createGenerationPrompt({
              input: input, // RAW input object to preserve generation chain
              options: options,
              modelId: this.modelMetadata.id,
              modelName: this.modelMetadata.name,
              provider: 'fal-ai',
              transformationType: 'text-to-video',
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
      throw new Error(`fal.ai text-to-video failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create Video object from URL - ACTUALLY DOWNLOADS THE FILE
   */
  private async createVideoFromUrl(url: string, metadata: any = {}): Promise<Video> {
    try {
      console.log(`[FalTextToVideo] Downloading video from: ${url}`);
      
      // Download the video to a temporary file
      const videoBuffer = await this.downloadFile(url);
      
      // Save to temporary file
      const tempDir = os.tmpdir();
      const filename = `fal-video-${Date.now()}.mp4`;
      const localPath = path.join(tempDir, filename);
      
      // Save the video to disk
      fs.writeFileSync(localPath, videoBuffer);
      
      console.log(`[FalTextToVideo] Video saved to: ${localPath} (${(videoBuffer.length / 1024 / 1024).toFixed(2)} MB)`);      // Use SmartAssetFactory to create Asset with automatic metadata extraction
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
      
      console.log(`[FalTextToVideo] Video metadata: duration=${video.getDuration()}s, dimensions=${JSON.stringify(video.getDimensions())}`);
      
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
            console.log(`[FalTextToVideo] Download progress: ${progress}%`);
          }
        });
        
        response.on('end', () => {
          const buffer = Buffer.concat(chunks);
          console.log(`[FalTextToVideo] Download complete: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);
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
   * Prepare input for specific fal.ai text-to-video model based on its parameters
   */
  private prepareFalInput(prompt: string, options?: TextToVideoOptions): any {
    const input: any = {
      prompt: prompt
    };

    // Add model-specific parameters based on the model's parameter schema
    const params = this.modelMetadata.parameters || {};

    // Common fal.ai text-to-video parameters
    if (options?.duration && params.duration) {
      input.duration = options.duration;
    }

    if (options?.aspectRatio && params.aspect_ratio) {
      input.aspect_ratio = options.aspectRatio;
    }

    if (options?.width && options?.height && params.resolution) {
      input.resolution = `${options.width}x${options.height}`;
    }

    if (options?.seed && params.seed) {
      input.seed = options.seed;
    }

    if (options?.fps && params.fps) {
      input.fps = options.fps;
    }

    if (options?.motionStrength && params.motion_strength) {
      input.motion_strength = options.motionStrength;
    }

    if (options?.negativePrompt && params.negative_prompt) {
      input.negative_prompt = options.negativePrompt;
    }

    // Runway Gen3 specific parameters
    if (this.modelMetadata.id.includes('runway')) {
      if (options?.loop && params.loop) {
        input.loop = options.loop;
      }
    }

    // Luma Dream Machine specific parameters
    if (this.modelMetadata.id.includes('luma')) {
      // Luma has specific aspect ratio options
      if (options?.aspectRatio) {
        const aspectRatioMap: Record<string, string> = {
          '16:9': 'landscape',
          '9:16': 'portrait',
          '1:1': 'square'
        };
        input.aspect_ratio = aspectRatioMap[options.aspectRatio] || 'landscape';
      }
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

  /**
   * Get available aspect ratios for this model
   */
  getSupportedAspectRatios(): string[] {
    // Common aspect ratios supported by fal.ai models
    return ['16:9', '9:16', '1:1', '4:3', '3:4', '21:9'];
  }

  /**
   * Get supported video duration range
   */
  getSupportedDurationRange(): { min: number; max: number } {
    // fal.ai models typically support 1-30 seconds
    return { min: 1, max: 30 };
  }

  /**
   * Get maximum resolution supported by this model
   */
  getMaxResolution(): { width: number; height: number } {
    // Most fal.ai models support up to 1080p
    return { width: 1920, height: 1080 };
  }

  /**
   * Estimate processing time for a given prompt and options
   */
  estimateProcessingTime(prompt: string, options?: any): number {
    const duration = options?.duration || 5;
    const complexity = prompt.length > 100 ? 1.5 : 1.0;
    // Estimate ~10-15 seconds per second of video
    return duration * 12000 * complexity; // milliseconds
  }

  /**
   * Check if this model supports specific features
   */
  supportsFeature(feature: string): boolean {
    const supportedFeatures = ['text-to-video', 'custom-duration', 'aspect-ratio'];
    return supportedFeatures.includes(feature);
  }
}

export default FalTextToVideoModel;
