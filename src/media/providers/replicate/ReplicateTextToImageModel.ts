/**
 * ReplicateTextToImageModel - Implements TextToImageModel for Replicate text-to-image models
 * 
 * Takes Replicate text-to-image model metadata and uses Replicate API for image generation
 */

import { ModelMetadata } from '../../models/abstracts/Model';
import { TextToImageModel, TextToImageOptions } from '../../models/abstracts/TextToImageModel';
import { Image, ImageFormat, TextRole } from '../../assets/roles';
import { GenerationPrompt } from '../../assets/roles/types/metadata';
import { ReplicateClient, ReplicateModelMetadata } from './ReplicateClient';
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
 * ReplicateTextToImageModel - Implements TextToImageModel for Replicate models like FLUX, SDXL, etc.
 */
export class ReplicateTextToImageModel extends TextToImageModel {
  private client: ReplicateClient;
  private modelMetadata: ReplicateModelMetadata;
  private replicateClient: Replicate;

  constructor(config: ReplicateModelConfig) {
    // Create metadata for TextToImageModel
    const metadata: ModelMetadata = {
      id: config.modelMetadata.id,
      name: config.modelMetadata.name || config.modelMetadata.id,
      description: config.modelMetadata.description || '',
      version: '1.0.0',
      provider: 'replicate',
      capabilities: ['text-to-image'],
      inputTypes: ['text'],
      outputTypes: ['image']
    };

    super(metadata);

    this.client = config.client;
    this.modelMetadata = config.modelMetadata;
    this.replicateClient = config.replicateClient;
  }

  /**
   * Get the model ID
   */
  getId(): string {
    return this.metadata.id;
  }

  /**
   * Transform text to image using specific Replicate text-to-image model
   */
  async transform(input: TextRole | TextRole[], options?: TextToImageOptions): Promise<Image> {
    // Handle array input - get first element for single image generation
    const inputRole = Array.isArray(input) ? input[0] : input;

    // Cast input to Text
    const text = await inputRole.asText();

    if (!text.isValid()) {
      throw new Error('Invalid text data provided');
    }

    try {
      // Prepare input for this specific Replicate text-to-image model
      const replicateInput = this.prepareReplicateInput(text.content, options);

      console.log(`[ReplicateTextToImage] Generating image with model: ${this.modelMetadata.id}`);
      console.log(`[ReplicateTextToImage] Input:`, replicateInput);

      // Create prediction using Replicate API
      const prediction = await this.replicateClient.predictions.create({
        version: this.modelMetadata.id,
        input: replicateInput
      });      // Wait for completion with proper polling
      console.log(`[ReplicateTextToImage] Prediction created: ${prediction.id}`);
      console.log(`[ReplicateTextToImage] Waiting for completion...`);
      
      const finalPrediction = await this.pollPrediction(prediction.id);

      if (finalPrediction.status === 'succeeded') {
        console.log(`[ReplicateTextToImage] Image generated:`, finalPrediction.output);
          // Create Image from result URL - ACTUALLY DOWNLOAD THE FILE
        const image = await this.createImageFromUrl(
          Array.isArray(finalPrediction.output) ? finalPrediction.output[0] : finalPrediction.output,
          {
            originalText: text.content,
            modelUsed: this.modelMetadata.id,
            options: options,
            predictionId: prediction.id,
            generation_prompt: this.createGenerationPrompt(inputRole, options)
          }
        );

        return image;
      } else if (finalPrediction.status === 'failed') {
        throw new Error(String(finalPrediction.error) || 'Image generation failed');
      } else {
        throw new Error(`Image generation in unexpected state: ${finalPrediction.status}`);
      }
    } catch (error) {
      throw new Error(`Replicate text-to-image failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Poll prediction until completion with exponential backoff
   */
  private async pollPrediction(predictionId: string, maxWaitTime: number = 300000): Promise<any> {
    const startTime = Date.now();
    let attempt = 0;
    
    while (Date.now() - startTime < maxWaitTime) {
      const prediction = await this.replicateClient.predictions.get(predictionId);
      
      console.log(`[ReplicateTextToImage] Poll attempt ${++attempt}: ${prediction.status}`);
      
      if (prediction.status === 'succeeded' || prediction.status === 'failed' || prediction.status === 'canceled') {
        return prediction;
      }
      
      // Exponential backoff: 1s, 2s, 4s, 8s, then 10s max
      const delay = Math.min(Math.pow(2, attempt - 1) * 1000, 10000);
      console.log(`[ReplicateTextToImage] Waiting ${delay}ms before next poll...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    throw new Error(`Prediction timed out after ${maxWaitTime}ms`);
  }

  /**
   * Create Image object from URL - ACTUALLY DOWNLOADS THE FILE
   */
  private async createImageFromUrl(url: string, metadata: any = {}): Promise<Image> {
    try {
      console.log(`[ReplicateTextToImage] Downloading image from: ${url}`);
      
      // Download the image file
      const imageBuffer = await this.downloadFile(url);
      
      // Create a local file path
      const tempDir = path.join(os.tmpdir(), 'replicate-images');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      // Determine file extension from URL or content type
      const urlExt = path.extname(new URL(url).pathname);
      const extension = urlExt || '.png';
      const format = extension.replace('.', '');
      const filename = `image_${Date.now()}_${Math.random().toString(36).substring(7)}${extension}`;
      const localPath = path.join(tempDir, filename);
      
      // Save the image to disk
      fs.writeFileSync(localPath, imageBuffer);
      
      console.log(`[ReplicateTextToImage] Image saved to: ${localPath} (${(imageBuffer.length / 1024).toFixed(2)} KB)`);
        // Create Image object with REAL image data
      return new Image(
        imageBuffer, // ACTUAL image data, not empty buffer!
        format as ImageFormat,
        {
          url: url,
          localPath: localPath,
          fileSize: imageBuffer.length,
          format: format as ImageFormat,
          ...metadata
        },
        { 
          url,
          localPath,
          sourceFile: localPath
        }
      );
      
    } catch (error) {
      console.error(`[ReplicateTextToImage] Failed to download image:`, error);
      
      // Fallback: create Image with URL only (but log the failure)
      console.warn(`[ReplicateTextToImage] Falling back to URL-only Image object`);
      return new Image(
        Buffer.alloc(0),
        'png',
        {
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
  private async downloadFile(url: string, timeout: number = 600000): Promise<Buffer> {
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
          
          // Show download progress for larger images
          if (contentLength > 0) {
            const progress = ((totalSize / contentLength) * 100).toFixed(1);
            if (totalSize % (256 * 1024) < chunk.length) { // Log every ~256KB for images
              console.log(`[ReplicateTextToImage] Download progress: ${progress}% (${(totalSize / 1024).toFixed(1)}KB)`);
            }
          }
        });
        
        response.on('end', () => {
          const buffer = Buffer.concat(chunks);
          console.log(`[ReplicateTextToImage] Download complete: ${(buffer.length / 1024).toFixed(2)} KB`);
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
   * Prepare input for specific Replicate text-to-image model based on its parameters
   */
  private prepareReplicateInput(text: string, options?: TextToImageOptions): any {
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
            console.log(`[ReplicateTextToImage] Mapping ${optionKey} -> ${matchingParam} = ${optionValue}`);
            input[matchingParam] = optionValue;
          } else {
            console.log(`[ReplicateTextToImage] No matching parameter for ${optionKey}, trying direct mapping`);
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
        console.log(`[ReplicateTextToImage] Adding default parameter: ${paramName} = ${param.default}`);
        input[paramName] = param.default;
      }
    });

    console.log(`[ReplicateTextToImage] Final input parameters:`, Object.keys(input));
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
      
      // Contains match (e.g., 'width' matches 'image_width')
      if (lowerParamName.includes(lowerOptionKey) || lowerOptionKey.includes(lowerParamName)) {
        console.log(`[ReplicateTextToImage] Found fuzzy match: ${optionKey} -> ${paramName}`);
        return paramName;
      }
    }

    // Log available parameters for debugging
    console.log(`[ReplicateTextToImage] No match for '${optionKey}'. Available parameters:`, Object.keys(params));
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
   * Create generation prompt metadata
   */
  private createGenerationPrompt(inputRole: TextRole, options?: TextToImageOptions): GenerationPrompt {
    return {
      input: inputRole, // RAW input object to preserve generation chain
      options: options || {},
      modelId: this.modelMetadata.id,
      modelName: this.modelMetadata.name || this.modelMetadata.id,
      provider: 'replicate',
      transformationType: 'text-to-image',
      timestamp: new Date(),
      metadata: {
        replicateModelParameters: this.modelMetadata.parameters,
        modelVersion: this.modelMetadata.id
      }
    };
  }
}

export default ReplicateTextToImageModel;
