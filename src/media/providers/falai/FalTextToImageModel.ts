/**
 * Fal.ai Text-to-Image Model Implementation
 * 
 * Specific model implementation for fal.ai text-to-image models.
 * Implements TextToImageModel interface and uses fal.ai API.
 */

import { ModelMetadata } from '../../models/abstracts/Model';
import { TextToImageModel, TextToImageOptions } from '../../models/abstracts/TextToImageModel';
import { Image, ImageFormat, TextRole, Text } from '../../assets/roles';
import { FalAiClient, FalModelMetadata } from './FalAiClient';
import { SmartAssetFactory } from '../../assets/SmartAssetFactory';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { createGenerationPrompt, extractInputContent } from '../../utils/GenerationPromptHelper';

export interface FalModelConfig {
  client: FalAiClient;
  modelMetadata: FalModelMetadata;
  falAiClient: FalAiClient;
}

/**
 * FalTextToImageModel - Implements TextToImageModel for fal.ai models like FLUX, SDXL, etc.
 */
export class FalTextToImageModel extends TextToImageModel {
  private client: FalAiClient;
  private modelMetadata: FalModelMetadata;
  private falAiClient: FalAiClient;

  constructor(config: FalModelConfig) {
    // Create metadata for TextToImageModel
    const metadata: ModelMetadata = {
      id: config.modelMetadata.id,
      name: config.modelMetadata.name || config.modelMetadata.id,
      description: config.modelMetadata.description || '',
      version: '1.0.0',
      provider: 'fal-ai',
      capabilities: ['text-to-image'],
      inputTypes: ['text'],
      outputTypes: ['image']
    };

    super(metadata);

    this.client = config.client;
    this.modelMetadata = config.modelMetadata;
    this.falAiClient = config.falAiClient;
  }

  /**
   * Transform text to image using specific fal.ai text-to-image model
   */
  async transform(input: TextRole | TextRole[] | string | string[], options?: TextToImageOptions): Promise<Image> {
    // Handle array input - get first element for single image generation
    const inputRole = Array.isArray(input) ? input[0] : input;

    // Cast input to Text
    // Handle both TextRole and string inputs
    let text: Text;
    if (typeof inputRole === 'string') {
      text = Text.fromString(inputRole);
    } else {
      text = await inputRole.asRole(Text);
    }

    if (!text.isValid()) {
      throw new Error('Invalid text data provided');
    }

    try {
      // Prepare input for this specific fal.ai text-to-image model
      const falInput = this.prepareFalInput(text.content, options);

      console.log(`[FalTextToImage] Generating image with model: ${this.modelMetadata.id}`);
      console.log(`[FalTextToImage] Input:`, falInput);      // Create request using fal.ai API
      const result = await this.falAiClient.invoke({
        model: this.modelMetadata.id,
        input: falInput,
        logs: true
      });      console.log(`[FalTextToImage] Generation completed:`, result);      if (result.data) {
        // Handle different output formats from fal.ai
        let imageUrl: string;
        
        // Check for nested data structure first
        const responseData = result.data.data || result.data;
        
        if (Array.isArray(responseData.images)) {
          // Multiple images - take first one
          imageUrl = responseData.images[0].url;
        } else if (responseData.image) {
          // Single image object
          imageUrl = typeof responseData.image === 'string' 
            ? responseData.image 
            : responseData.image.url;
        } else if (typeof responseData === 'string') {
          // Direct URL
          imageUrl = responseData;
        } else {
          throw new Error('Unexpected output format from fal.ai');
        }

        console.log(`[FalTextToImage] Image generated:`, imageUrl);
          // Create Image from result URL - ACTUALLY DOWNLOAD THE FILE
        const image = await this.createImageFromUrl(
          imageUrl,
          {
            originalText: text.content,
            modelUsed: this.modelMetadata.id,
            options: options,
            requestId: result.requestId,            generation_prompt: createGenerationPrompt({
              input: input, // RAW input object to preserve generation chain
              options: options,
              modelId: this.modelMetadata.id,
              modelName: this.modelMetadata.name,
              provider: 'fal-ai',
              transformationType: 'text-to-image',
              modelMetadata: {
                falModelParameters: this.modelMetadata.parameters,
                modelVersion: this.modelMetadata.id
              },
              requestId: result.requestId
            })
          }
        );

        return image;
      } else {
        throw new Error(`fal.ai generation failed: No data returned`);
      }

    } catch (error) {
      throw new Error(`fal.ai text-to-image failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create Image object from URL - ACTUALLY DOWNLOADS THE FILE
   */
  private async createImageFromUrl(url: string, metadata: any = {}): Promise<Image> {
    try {
      console.log(`[FalTextToImage] Downloading image from: ${url}`);
      
      // Download the image to a temporary file
      const imageBuffer = await this.downloadFile(url);
      
      // Save to temporary file
      const tempDir = os.tmpdir();
      const filename = `fal-image-${Date.now()}.${this.getImageFormat(url)}`;
      const localPath = path.join(tempDir, filename);
      
      // Save the image to disk
      fs.writeFileSync(localPath, imageBuffer);
      
      console.log(`[FalTextToImage] Image saved to: ${localPath} (${(imageBuffer.length / 1024).toFixed(2)} KB)`);      // Use SmartAssetFactory to create Asset with automatic metadata extraction
      const smartAsset = await SmartAssetFactory.load(localPath);
      const image = await (smartAsset as any).asRole(Image);
      
      // Add our custom metadata to the image
      if (image.metadata) {
        Object.assign(image.metadata, {
          url: url,
          localPath: localPath,
          fileSize: imageBuffer.length,
          ...metadata // custom metadata from fal.ai
        });
      }
      
      console.log(`[FalTextToImage] Image metadata: ${JSON.stringify(image.getDimensions())}, size: ${(imageBuffer.length / 1024).toFixed(1)}KB`);
      
      return image;
      
    } catch (error) {
      throw new Error(`Failed to create image from URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
          
          if (contentLength > 0) {
            const progress = (totalSize / contentLength * 100).toFixed(1);
            console.log(`[FalTextToImage] Download progress: ${progress}%`);
          }
        });
        
        response.on('end', () => {
          const buffer = Buffer.concat(chunks);
          console.log(`[FalTextToImage] Download complete: ${(buffer.length / 1024).toFixed(2)} KB`);
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
   * Prepare input for specific fal.ai text-to-image model based on its parameters
   */
  private prepareFalInput(prompt: string, options?: TextToImageOptions): any {
    const input: any = {
      prompt: prompt
    };

    // Add model-specific parameters based on the model's parameter schema
    const params = this.modelMetadata.parameters || {};

    // Common fal.ai text-to-image parameters
    if (options?.width && params.width) {
      input.image_size = `${options.width}x${options.height || options.width}`;
    } else if (options?.aspectRatio) {
      input.aspect_ratio = options.aspectRatio;
    }

    if (options?.seed && params.seed) {
      input.seed = options.seed;
    }

    if (options?.steps && params.num_inference_steps) {
      input.num_inference_steps = options.steps;
    }

    if (options?.guidanceScale && params.guidance_scale) {
      input.guidance_scale = options.guidanceScale;
    }

    if (options?.negativePrompt && params.negative_prompt) {
      input.negative_prompt = options.negativePrompt;
    }    // FLUX-specific parameters
    if (this.modelMetadata.id.includes('flux')) {
      if (typeof options?.quality === 'string') {
        input.num_inference_steps = options.quality === 'high' ? 28 : 4;
      } else if (typeof options?.quality === 'number') {
        input.num_inference_steps = options.quality;
      }
    }

    return input;
  }

  /**
   * Get image format from URL
   */
  private getImageFormat(url: string): string {
    const urlPath = new URL(url).pathname.toLowerCase();
    if (urlPath.includes('.jpg') || urlPath.includes('.jpeg')) return 'jpg';
    if (urlPath.includes('.png')) return 'png';
    if (urlPath.includes('.webp')) return 'webp';
    return 'jpg'; // Default
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
   * Get supported image formats
   */
  getSupportedFormats(): ImageFormat[] {
    // fal.ai typically supports these formats
    return ['jpg', 'png', 'webp'];
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

export default FalTextToImageModel;
