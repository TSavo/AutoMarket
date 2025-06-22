/**
 * Together AI Text-to-Image Model
 * 
 * Concrete implementation of TextToImageModel for Together.ai's image generation API.
 * Supports FLUX and other image generation models.
 */

import { TextToImageModel, TextToImageOptions } from '../../models/abstracts/TextToImageModel';
import { Image, TextRole } from '../../assets/roles';
import { ModelMetadata } from '../../models/abstracts/Model';
import { TogetherAPIClient, TogetherModel } from './TogetherAPIClient';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface TogetherTextToImageOptions extends TextToImageOptions {
  model?: string;
  prompt?: string;
  negative_prompt?: string;
  width?: number;
  height?: number;
  steps?: number;
  n?: number;
  response_format?: 'url' | 'b64_json';
  seed?: number;
}

export interface TogetherTextToImageConfig {
  apiClient: TogetherAPIClient;
  modelId: string;
  modelMetadata?: TogetherModel; // Dynamic model metadata from API
  metadata?: Partial<ModelMetadata>;
}

export class TogetherTextToImageModel extends TextToImageModel {
  private apiClient: TogetherAPIClient;
  private modelId: string;
  private modelMetadata?: TogetherModel;

  constructor(config: TogetherTextToImageConfig) {
    const metadata: ModelMetadata = {
      id: config.modelId,
      name: config.metadata?.name || `Together ${config.modelId}`,
      description: config.metadata?.description || `Together AI text-to-image model: ${config.modelId}`,
      version: config.metadata?.version || '1.0.0',
      provider: 'together',
      capabilities: ['image-generation'],
      inputTypes: ['text'],
      outputTypes: ['image'],
      ...config.metadata
    };

    super(metadata);
    this.apiClient = config.apiClient;
    this.modelId = config.modelId;
    this.modelMetadata = config.modelMetadata;
  }
  /**
   * Transform text to image using Together AI
   */
  async transform(input: TextRole, options?: TogetherTextToImageOptions): Promise<Image> {
    const startTime = Date.now();

    // Get text from the TextRole
    const text = await input.asText();

    // Validate text data
    if (!text.isValid()) {
      throw new Error('Invalid text data provided');
    }

    try {
      // Prepare request payload dynamically based on model's actual parameters
      const requestPayload = this.prepareTogetherInput(text.content, options);

      // Make request to Together AI image generation endpoint
      const response = await this.makeImageRequest(requestPayload);

      // Calculate processing time
      const processingTime = Date.now() - startTime;

      // Handle response and download image
      if (!response.data || response.data.length === 0) {
        throw new Error('No image data in response from Together AI');
      }

      const imageResult = response.data[0];
      let imageUrl: string;

      if (imageResult.url) {
        imageUrl = imageResult.url;
      } else if (imageResult.b64_json) {
        // For base64, we'd need to create a data URL or save to temp file
        throw new Error('Base64 image format not yet supported - use URL format');
      } else {
        throw new Error('No image URL received from Together AI');
      }

      // Download image following Replicate pattern
      console.log(`[TogetherTextToImage] Downloading image from: ${imageUrl}`);
      const imageBuffer = await this.downloadImage(imageUrl);

      // Save to temporary file
      const tempDir = os.tmpdir();
      const tempFileName = `together-image-${Date.now()}.png`;
      const localPath = path.join(tempDir, tempFileName);
      fs.writeFileSync(localPath, imageBuffer);

      console.log(`[TogetherTextToImage] Image saved to: ${localPath}`);      // Use SmartAssetFactory to create Asset with automatic metadata extraction
      const { AssetLoader } = await import('../../assets/SmartAssetFactory');
      const smartAsset = await AssetLoader.load(localPath);
      const image = await (smartAsset as any).asImage();

      // Add our custom metadata to the image
      if (image.metadata) {
        Object.assign(image.metadata, {
          url: imageUrl,
          localPath: localPath,
          fileSize: imageBuffer.length,
          processingTime,
          model: this.modelId,
          provider: 'together',
          prompt: text.content,
          negativePrompt: options?.negativePrompt,
          seed: options?.seed
        });
      }

      console.log(`[TogetherTextToImage] Image metadata: ${JSON.stringify(image.getDimensions())}, size: ${(imageBuffer.length / 1024).toFixed(1)}KB`);

      return image;

    } catch (error) {
      throw new Error(`Together AI image generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Make image generation request to Together AI
   */
  private async makeImageRequest(payload: any): Promise<any> {
    try {
      console.log(`[TogetherTextToImage] Making image request with payload:`, JSON.stringify(payload, null, 2));

      // Try the correct Together AI image generation endpoint
      const response = await (this.apiClient as any).client.post('/images/generations', payload);

      console.log(`[TogetherTextToImage] Response status: ${response.status}`);
      console.log(`[TogetherTextToImage] Response data:`, JSON.stringify(response.data, null, 2).substring(0, 500));

      return response.data;
    } catch (error) {
      console.error(`[TogetherTextToImage] Image request failed:`, error);

      if (error.response) {
        console.error(`[TogetherTextToImage] Error response:`, error.response.data);
        const errorMessage = error.response.data?.error?.message || error.response.statusText;
        throw new Error(`Together AI API error (${error.response.status}): ${errorMessage}`);
      } else if (error.request) {
        console.error(`[TogetherTextToImage] No response received:`, error.request);
        throw new Error('Together AI API request failed: No response received');
      } else {
        console.error(`[TogetherTextToImage] Request setup error:`, error.message);
        throw new Error(`Together AI API request failed: ${error.message}`);
      }
    }
  }

  /**
   * Check if the model is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      return await this.apiClient.testConnection();
    } catch (error) {
      console.warn(`Together AI image model ${this.modelId} availability check failed:`, error);
      return false;
    }
  }

  /**
   * Get model-specific information
   */
  getModelInfo(): { id: string; provider: string; capabilities: string[] } {
    return {
      id: this.modelId,
      provider: 'together',
      capabilities: ['image-generation', 'text-to-image']
    };
  }

  /**
   * Get supported parameters for this model
   */
  getSupportedParameters(): string[] {
    return [
      'width',
      'height',
      'steps',
      'seed',
      'negativePrompt',
      'negative_prompt',
      'n',
      'response_format'
    ];
  }

  /**
   * Get model display name
   */
  getDisplayName(): string {
    // Convert model ID to readable name
    const parts = this.modelId.split('/');
    if (parts.length >= 2) {
      const [org, model] = parts;
      return `${org.charAt(0).toUpperCase() + org.slice(1)} ${model.replace(/-/g, ' ')}`;
    }
    return this.modelId;
  }

  /**
   * Check if this is a free model
   */
  async isFreeModel(): Promise<boolean> {
    try {
      const modelInfo = await this.apiClient.getModelInfo(this.modelId);
      if (modelInfo?.pricing) {
        return modelInfo.pricing.input === 0 && modelInfo.pricing.output === 0;
      }
      // If no pricing info, check if it's a known free model
      const freeModels = [
        'black-forest-labs/FLUX.1-schnell-Free',
        'black-forest-labs/FLUX.1-schnell',
        'black-forest-labs/FLUX.1-dev'
      ];
      return freeModels.includes(this.modelId);
    } catch (error) {
      console.warn(`Could not determine if model ${this.modelId} is free:`, error);
      return false;
    }
  }

  /**
   * Prepare input for Together AI image generation based on model's actual parameters
   */
  private prepareTogetherInput(prompt: string, options?: TogetherTextToImageOptions): any {
    const input: any = {
      model: this.modelId,
      prompt: prompt,
      response_format: options?.response_format || 'url',
      n: options?.n || 1
    };

    // Get the model's actual parameter schema if available
    const modelParams = this.modelMetadata?.pricing ? {} : {}; // TODO: Get actual parameter schema from API

    // Add parameters dynamically based on what the model supports
    // Use options if provided, otherwise use sensible defaults

    if (options?.negative_prompt !== undefined || options?.negativePrompt !== undefined) {
      input.negative_prompt = options?.negative_prompt || options?.negativePrompt;
    }

    if (options?.width !== undefined) {
      input.width = options.width;
    } else {
      input.width = 1024; // Default
    }

    if (options?.height !== undefined) {
      input.height = options.height;
    } else {
      input.height = 1024; // Default
    }

    if (options?.steps !== undefined) {
      // Apply model-specific constraints if we know them
      input.steps = this.constrainStepsForModel(options.steps);
    } else {
      // Use model-appropriate default
      input.steps = this.getDefaultStepsForModel();
    }

    if (options?.seed !== undefined) {
      input.seed = options.seed;
    }

    // Remove undefined values
    Object.keys(input).forEach(key => {
      if (input[key] === undefined) {
        delete input[key];
      }
    });

    return input;
  }

  /**
   * Apply model-specific step constraints
   */
  private constrainStepsForModel(requestedSteps: number): number {
    // Apply known constraints for specific models
    if (this.modelId.includes('FLUX.1-schnell')) {
      return Math.min(Math.max(requestedSteps, 1), 4);
    }

    if (this.modelId.includes('FLUX.1-dev') || this.modelId.includes('FLUX.1-pro')) {
      return Math.min(Math.max(requestedSteps, 1), 50);
    }

    // For unknown models, use reasonable bounds
    return Math.min(Math.max(requestedSteps, 1), 20);
  }

  /**
   * Get default steps for model
   */
  private getDefaultStepsForModel(): number {
    if (this.modelId.includes('FLUX.1-schnell')) {
      return 4; // Max for schnell
    }

    if (this.modelId.includes('FLUX.1-dev') || this.modelId.includes('FLUX.1-pro')) {
      return 20; // Good quality for dev/pro
    }

    return 10; // Conservative default
  }

  /**
   * Download image from URL following Replicate pattern
   */
  private async downloadImage(url: string, timeout: number = 600000): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const request = require('https').get(url, (response: any) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Download failed with status ${response.statusCode}`));
          return;
        }

        const chunks: Buffer[] = [];

        response.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });

        response.on('end', () => {
          const buffer = Buffer.concat(chunks);
          console.log(`[TogetherTextToImage] Download complete: ${(buffer.length / 1024).toFixed(2)} KB`);
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
   * Get recommended image dimensions for this model (dynamic based on model metadata)
   */
  getRecommendedDimensions(): { width: number; height: number }[] {
    // If we have model metadata with dimension constraints, use those
    if (this.modelMetadata?.context_length) {
      // Use model metadata to determine optimal dimensions
      // This is a placeholder - real implementation would parse model schema
    }

    // FLUX models typically work well with these dimensions
    if (this.modelId.includes('FLUX')) {
      return [
        { width: 1024, height: 1024 }, // Square
        { width: 1152, height: 896 },  // Landscape
        { width: 896, height: 1152 },  // Portrait
        { width: 1344, height: 768 },  // Wide landscape
        { width: 768, height: 1344 }   // Tall portrait
      ];
    }

    // Default dimensions
    return [
      { width: 512, height: 512 },
      { width: 768, height: 768 },
      { width: 1024, height: 1024 }
    ];
  }

  /**
   * Get model-specific parameter constraints (dynamic based on model metadata)
   */
  getParameterConstraints(): Record<string, any> {
    // TODO: Parse actual parameter schema from model metadata
    // For now, use known constraints for specific models

    if (this.modelId.includes('FLUX.1-schnell')) {
      return {
        steps: { min: 1, max: 4, default: 4 },
        width: { min: 256, max: 1440, default: 1024 },
        height: { min: 256, max: 1440, default: 1024 }
      };
    }

    if (this.modelId.includes('FLUX.1-dev') || this.modelId.includes('FLUX.1-pro')) {
      return {
        steps: { min: 1, max: 50, default: 20 },
        width: { min: 256, max: 1440, default: 1024 },
        height: { min: 256, max: 1440, default: 1024 }
      };
    }

    // Default constraints - these should eventually come from model metadata
    return {
      steps: { min: 1, max: 20, default: 10 },
      width: { min: 256, max: 2048, default: 1024 },
      height: { min: 256, max: 2048, default: 1024 }
    };
  }
}
