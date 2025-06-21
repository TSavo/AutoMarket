/**
 * ReplicateTextToVideoModel - Implements TextToVideoModel for Replicate text-to-video models
 * 
 * Takes Replicate text-to-video model metadata and uses Replicate API for video generation
 */

import { ModelMetadata } from '../../models/abstracts/Model';
import { TextToVideoModel, TextToVideoOptions } from '../../models/abstracts/TextToVideoModel';
import { Video, TextRole } from '../../assets/roles';
import { ReplicateClient, ReplicateModelMetadata } from './ReplicateClient';
import { SmartAssetFactory } from '../../assets/SmartAssetFactory';
import Replicate from 'replicate';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface ReplicateModelConfig {
  client: ReplicateClient;
  modelMetadata: ReplicateModelMetadata;
  replicateClient: Replicate;
}

/**
 * ReplicateTextToVideoModel - Implements TextToVideoModel for Replicate models like Luma, Runway, etc.
 */
export class ReplicateTextToVideoModel extends TextToVideoModel {
  private client: ReplicateClient;
  private modelMetadata: ReplicateModelMetadata;
  private replicateClient: Replicate;

  constructor(config: ReplicateModelConfig) {
    // Create metadata for TextToVideoModel
    const metadata: ModelMetadata = {
      id: config.modelMetadata.id,
      name: config.modelMetadata.name || config.modelMetadata.id,
      description: config.modelMetadata.description || '',
      version: '1.0.0',
      provider: 'replicate',
      capabilities: ['text-to-video'],
      inputTypes: ['text'],
      outputTypes: ['video']
    };

    super(metadata);

    this.client = config.client;
    this.modelMetadata = config.modelMetadata;
    this.replicateClient = config.replicateClient;
  }
  /**
   * Transform text to video using specific Replicate text-to-video model
   */
  async transform(input: TextRole, options?: TextToVideoOptions): Promise<Video> {
    // Get text from the TextRole
    const text = await input.asText();

    if (!text.isValid()) {
      throw new Error('Invalid text data provided');
    }

    try {
      // Prepare input for this specific Replicate text-to-video model
      const replicateInput = this.prepareReplicateInput(text.content, options);

      console.log(`[ReplicateTextToVideo] Generating video with model: ${this.modelMetadata.id}`);
      console.log(`[ReplicateTextToVideo] Input:`, replicateInput);

      // Create prediction using Replicate API
      const prediction = await this.replicateClient.predictions.create({
        version: this.modelMetadata.id,
        input: replicateInput
      });

      // Wait for completion (simplified - you'd want to poll properly)
      console.log(`[ReplicateTextToVideo] Prediction created: ${prediction.id}`);
      const finalPrediction = await this.waitForPrediction(prediction.id);      if (finalPrediction.status === 'succeeded') {
        console.log(`[ReplicateTextToVideo] Video generated:`, finalPrediction.output);
        
        // Create Video from result URL - ACTUALLY DOWNLOAD THE FILE
        const video = await this.createVideoFromUrl(
          Array.isArray(finalPrediction.output) ? finalPrediction.output[0] : finalPrediction.output,
          {
            originalText: text.content,
            modelUsed: this.modelMetadata.id,
            options: options,
            predictionId: prediction.id
          }
        );

        return video;
      } else if (finalPrediction.status === 'failed') {
        throw new Error(String(finalPrediction.error) || 'Video generation failed');
      } else {
        throw new Error(`Video generation in unexpected state: ${finalPrediction.status}`);
      }
    } catch (error) {
      throw new Error(`Replicate text-to-video failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  /**
   * Create Video object from URL - ACTUALLY DOWNLOADS THE FILE
   */
  private async createVideoFromUrl(url: string, metadata: any = {}): Promise<Video> {
    try {
      console.log(`[ReplicateTextToVideo] Downloading video from: ${url}`);
      
      // Download the video file to a temporary location
      const videoBuffer = await this.downloadFile(url);
      
      // Create a local file path
      const tempDir = path.join(os.tmpdir(), 'replicate-videos');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      const filename = `video_${Date.now()}_${Math.random().toString(36).substring(7)}.mp4`;
      const localPath = path.join(tempDir, filename);
        // Save the video to disk
      fs.writeFileSync(localPath, videoBuffer);
        console.log(`[ReplicateTextToVideo] Video saved to: ${localPath} (${(videoBuffer.length / 1024 / 1024).toFixed(2)} MB)`);
      
      // Use SmartAssetFactory to create Asset with automatic metadata extraction
      console.log(`[ReplicateTextToVideo] Loading video asset with metadata extraction...`);
      const smartAsset = SmartAssetFactory.load(localPath);
      const video = await (smartAsset as any).asVideo();
      
      // Add our custom metadata to the video
      if (video.metadata) {
        Object.assign(video.metadata, {
          url: url,
          localPath: localPath,
          fileSize: videoBuffer.length,
          ...metadata // custom metadata from Replicate
        });
      }
      
      console.log(`[ReplicateTextToVideo] Video metadata: duration=${video.getDuration()}s, dimensions=${JSON.stringify(video.getDimensions())}`);
      
      return video;
      
    } catch (error) {
      console.error(`[ReplicateTextToVideo] Failed to download video:`, error);
      
      // Fallback: create Video with URL only (but log the failure)
      console.warn(`[ReplicateTextToVideo] Falling back to URL-only Video object`);
      return new Video(
        Buffer.alloc(0),
        'mp4',
        {
          format: 'mp4',
          url: url,
          downloadError: error.message,
          ...metadata
        },
        { url }
      );
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
          
          // Show download progress for large files
          if (contentLength > 0) {
            const progress = ((totalSize / contentLength) * 100).toFixed(1);
            if (totalSize % (1024 * 1024) < chunk.length) { // Log every ~1MB
              console.log(`[ReplicateTextToVideo] Download progress: ${progress}% (${(totalSize / 1024 / 1024).toFixed(1)}MB)`);
            }
          }
        });
        
        response.on('end', () => {
          const buffer = Buffer.concat(chunks);
          console.log(`[ReplicateTextToVideo] Download complete: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);
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
   * Prepare input for specific Replicate text-to-video model based on its parameters
   */
  private prepareReplicateInput(text: string, options?: TextToVideoOptions): any {
    const input: any = {
      prompt: text
    };

    // Get the model's actual parameter schema
    const params = this.modelMetadata.parameters || {};

    // Dynamically map options to model parameters based on discovered schema
    if (options) {
      Object.entries(options).forEach(([optionKey, optionValue]) => {
        if (optionValue !== undefined) {
          // Try to find matching parameter in model schema
          const matchingParam = this.findMatchingParameter(optionKey, params);
          
          if (matchingParam) {
            console.log(`[ReplicateTextToVideo] Mapping ${optionKey} -> ${matchingParam} = ${optionValue}`);
            input[matchingParam] = optionValue;
          } else {
            console.log(`[ReplicateTextToVideo] No matching parameter for ${optionKey}, trying direct mapping`);
            // Try direct mapping as fallback
            if (params[optionKey]) {
              input[optionKey] = optionValue;
            }
          }
        }
      });
    }

    // Add any required default parameters from model metadata
    Object.keys(params).forEach(paramName => {
      const param = params[paramName];
      if (param.default !== undefined && !(paramName in input)) {
        console.log(`[ReplicateTextToVideo] Adding default parameter: ${paramName} = ${param.default}`);
        input[paramName] = param.default;
      }
    });

    console.log(`[ReplicateTextToVideo] Final input parameters:`, Object.keys(input));
    return input;
  }
  /**
   * Find matching parameter name in model schema - FULLY DYNAMIC
   */
  private findMatchingParameter(optionKey: string, params: any): string | null {
    // Direct match first
    if (params[optionKey]) {
      return optionKey;
    }

    // Check if any parameter name contains the option key (case insensitive)
    for (const paramName of Object.keys(params)) {
      const lowerParamName = paramName.toLowerCase();
      const lowerOptionKey = optionKey.toLowerCase();
      
      // Exact match
      if (lowerParamName === lowerOptionKey) {
        return paramName;
      }
      
      // Contains match (e.g., 'duration' matches 'video_duration')
      if (lowerParamName.includes(lowerOptionKey) || lowerOptionKey.includes(lowerParamName)) {
        console.log(`[ReplicateTextToVideo] Found fuzzy match: ${optionKey} -> ${paramName}`);
        return paramName;
      }
    }

    // Log available parameters for debugging
    console.log(`[ReplicateTextToVideo] No match for '${optionKey}'. Available parameters:`, Object.keys(params));
    return null;
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
   * Wait for prediction to complete by polling
   */
  private async waitForPrediction(predictionId: string, maxWaitTime: number = 300000): Promise<any> {
    const startTime = Date.now();
    let attempt = 0;
    
    while (Date.now() - startTime < maxWaitTime) {
      attempt++;
      const prediction = await this.replicateClient.predictions.get(predictionId);
      
      console.log(`[ReplicateTextToVideo] Poll #${attempt}: ${prediction.status}`);
      
      if (prediction.status === 'succeeded' || prediction.status === 'failed') {
        return prediction;
      }
      
      // Wait before next poll (exponential backoff)
      const waitTime = Math.min(1000 * Math.pow(1.5, attempt - 1), 10000);
      console.log(`[ReplicateTextToVideo] Waiting ${waitTime}ms before next poll...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
      throw new Error(`Video generation timed out after ${maxWaitTime}ms`);
  }

  /**
   * Get supported video formats
   */
  getSupportedFormats(): string[] {
    return ['mp4', 'webm', 'mov'];
  }

  /**
   * Get available aspect ratios for this model
   */
  getSupportedAspectRatios(): string[] {
    return ['16:9', '9:16', '1:1', '4:3'];
  }

  /**
   * Get supported video duration range
   */
  getSupportedDurationRange(): { min: number; max: number } {
    return { min: 1, max: 10 }; // Replicate models typically support 1-10 seconds
  }

  /**
   * Get maximum resolution supported by this model
   */
  getMaxResolution(): { width: number; height: number } {
    return { width: 1280, height: 720 }; // Most Replicate models support up to 720p
  }

  /**
   * Estimate processing time for a given prompt and options
   */
  estimateProcessingTime(prompt: string, options?: any): number {
    const duration = options?.duration || 5;
    const complexity = prompt.length > 100 ? 1.5 : 1.0;
    // Replicate models are typically slower, estimate ~20-30 seconds per second of video
    return duration * 25000 * complexity; // milliseconds
  }

  /**
   * Check if this model supports specific features
   */
  supportsFeature(feature: string): boolean {
    const supportedFeatures = ['text-to-video', 'custom-duration'];
    return supportedFeatures.includes(feature);
  }
}

export default ReplicateTextToVideoModel;
