/**
 * OpenAI Text-to-Image Model
 * 
 * Concrete implementation of TextToImageModel for OpenAI's DALL-E models.
 * Supports DALL-E 2 and DALL-E 3 image generation.
 */

import { TextToImageModel, TextToImageOptions } from '../../models/abstracts/TextToImageModel';
import { Image, TextRole } from '../../assets/roles';
import { ImageFormat } from '../../assets/roles/types';
import { ModelMetadata } from '../../models/abstracts/Model';
import { OpenAIAPIClient } from './OpenAIAPIClient';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { createGenerationPrompt } from '../../utils/GenerationPromptHelper';

export interface OpenAITextToImageOptions extends TextToImageOptions {
  model?: string;
  prompt?: string;
  n?: number;
  size?: '256x256' | '512x512' | '1024x1024' | '1792x1024' | '1024x1792';
  quality?: 'standard' | 'hd';
  response_format?: 'url' | 'b64_json';
  style?: 'vivid' | 'natural';
  user?: string;
}

export interface OpenAITextToImageConfig {
  apiClient: OpenAIAPIClient;
  modelId: string;
  metadata?: Partial<ModelMetadata>;
}

export class OpenAITextToImageModel extends TextToImageModel {
  private apiClient: OpenAIAPIClient;
  private modelId: string;

  constructor(config: OpenAITextToImageConfig) {
    const metadata: ModelMetadata = {
      id: config.modelId,
      name: config.metadata?.name || `OpenAI ${config.modelId}`,
      description: config.metadata?.description || `OpenAI text-to-image model: ${config.modelId}`,
      version: config.metadata?.version || '1.0.0',
      provider: 'openai',
      capabilities: ['image-generation', 'text-to-image'],
      inputTypes: ['text'],
      outputTypes: ['image'],
      ...config.metadata
    };

    super(metadata);
    this.apiClient = config.apiClient;
    this.modelId = config.modelId;
  }

  /**
   * Transform text to image using OpenAI DALL-E
   */
  async transform(input: TextRole | TextRole[], options?: OpenAITextToImageOptions): Promise<Image> {
    const startTime = Date.now();

    // Handle array input - get first element for single image generation
    const inputRole = Array.isArray(input) ? input[0] : input;

    // Get text from the TextRole
    const text = await inputRole.asText();

    // Validate text data
    if (!text.isValid()) {
      throw new Error('Invalid text data provided');
    }

    try {
      console.log(`[OpenAITextToImage] Generating image with model: ${this.modelId}`);
      console.log(`[OpenAITextToImage] Prompt: "${text.content}"`);

      // Prepare request for OpenAI DALL-E API
      const imageRequest = {
        model: this.modelId,
        prompt: text.content,
        n: options?.n || 1,
        size: options?.size || '1024x1024',
        quality: options?.quality || 'standard',
        response_format: 'url' as const, // Always use URL for easier handling
        style: options?.style || 'vivid'
      };

      // Generate image using OpenAI API
      const response = await this.apiClient.generateImage(imageRequest);

      if (!response.data || response.data.length === 0) {
        throw new Error('No image data received from OpenAI');
      }

      const imageData = response.data[0];
      if (!imageData.url) {
        throw new Error('No image URL received from OpenAI');
      }

      console.log(`[OpenAITextToImage] Image generated successfully: ${imageData.url}`);

      // Download the image to a temporary file
      const tempDir = os.tmpdir();
      const fileName = `openai_image_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.png`;
      const tempFilePath = path.join(tempDir, fileName);

      await this.downloadImage(imageData.url, tempFilePath);

      // Read the image file into a Buffer
      const imageBuffer = fs.readFileSync(tempFilePath);

      // Calculate processing time
      const processingTime = Date.now() - startTime;

      // Create Image result
      const result = new Image(
        imageBuffer,
        'png',
        {
          format: 'png' as ImageFormat,
          processingTime,
          model: this.modelId,
          provider: 'openai',
          prompt: text.content,
          revisedPrompt: imageData.revised_prompt,
          size: options?.size || '1024x1024',
          quality: options?.quality || 'standard',
          style: options?.style || 'vivid',
          originalUrl: imageData.url,
          generation_prompt: createGenerationPrompt({
            input: input, // RAW input object to preserve generation chain
            options: options,
            modelId: this.modelId,
            modelName: this.modelId,
            provider: 'openai',
            transformationType: 'text-to-image',
            processingTime
          })
        },
        text.sourceAsset // Preserve source Asset reference
      );

      return result;

    } catch (error) {
      throw new Error(`OpenAI image generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Download image from URL to local file
   */
  private async downloadImage(url: string, filePath: string): Promise<void> {
    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'stream'
    });

    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
  }

  /**
   * Check if the model is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      return await this.apiClient.testConnection();
    } catch (error) {
      console.warn(`OpenAI image model ${this.modelId} availability check failed:`, error);
      return false;
    }
  }

  /**
   * Get model-specific information
   */
  getModelInfo(): { id: string; provider: string; capabilities: string[] } {
    return {
      id: this.modelId,
      provider: 'openai',
      capabilities: ['image-generation', 'text-to-image']
    };
  }

  /**
   * Get supported parameters for this model
   */
  getSupportedParameters(): string[] {
    const baseParams = [
      'n',
      'size',
      'response_format'
    ];

    // DALL-E 3 specific parameters
    if (this.modelId.includes('dall-e-3')) {
      return [
        ...baseParams,
        'quality',
        'style'
      ];
    }

    return baseParams;
  }

  /**
   * Get supported image sizes for this model
   */
  getSupportedSizes(): string[] {
    if (this.modelId.includes('dall-e-3')) {
      return ['1024x1024', '1792x1024', '1024x1792'];
    } else if (this.modelId.includes('dall-e-2')) {
      return ['256x256', '512x512', '1024x1024'];
    }
    
    return ['1024x1024']; // Default fallback
  }

  /**
   * Get supported quality levels for this model
   */
  getSupportedQualities(): string[] {
    if (this.modelId.includes('dall-e-3')) {
      return ['standard', 'hd'];
    }
    
    return ['standard']; // DALL-E 2 only supports standard quality
  }

  /**
   * Get supported styles for this model
   */
  getSupportedStyles(): string[] {
    if (this.modelId.includes('dall-e-3')) {
      return ['vivid', 'natural'];
    }
    
    return []; // DALL-E 2 doesn't support style selection
  }

  /**
   * Get maximum prompt length for this model
   */
  getMaxPromptLength(): number {
    if (this.modelId.includes('dall-e-3')) {
      return 4000; // DALL-E 3 supports longer prompts
    } else if (this.modelId.includes('dall-e-2')) {
      return 1000; // DALL-E 2 has shorter prompt limit
    }
    
    return 1000; // Default fallback
  }

  /**
   * Get cost per image for this model
   */
  getCostPerImage(): number {
    const costs: Record<string, Record<string, number>> = {
      'dall-e-3': {
        'standard_1024x1024': 0.04,
        'standard_1024x1792': 0.08,
        'standard_1792x1024': 0.08,
        'hd_1024x1024': 0.08,
        'hd_1024x1792': 0.12,
        'hd_1792x1024': 0.12
      },
      'dall-e-2': {
        '1024x1024': 0.02,
        '512x512': 0.018,
        '256x256': 0.016
      }
    };

    // Find matching model costs
    for (const [modelName, modelCosts] of Object.entries(costs)) {
      if (this.modelId.includes(modelName)) {
        // Return the base cost (can be refined based on size/quality)
        return Object.values(modelCosts)[0];
      }
    }

    return 0.04; // Default fallback
  }

  /**
   * Estimate cost for image generation with given options
   */
  estimateCost(options?: OpenAITextToImageOptions): number {
    const n = options?.n || 1;
    const size = options?.size || '1024x1024';
    const quality = options?.quality || 'standard';

    if (this.modelId.includes('dall-e-3')) {
      const key = `${quality}_${size}`;
      const costs = {
        'standard_1024x1024': 0.04,
        'standard_1024x1792': 0.08,
        'standard_1792x1024': 0.08,
        'hd_1024x1024': 0.08,
        'hd_1024x1792': 0.12,
        'hd_1792x1024': 0.12
      };
      return (costs[key as keyof typeof costs] || 0.04) * n;
    } else if (this.modelId.includes('dall-e-2')) {
      const costs = {
        '1024x1024': 0.02,
        '512x512': 0.018,
        '256x256': 0.016
      };
      return (costs[size as keyof typeof costs] || 0.02) * n;
    }

    return 0.04 * n; // Default fallback
  }
}
