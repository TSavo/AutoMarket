/**
 * Fal.ai Image-to-Image Model Implementation
 * 
 * Specific model implementation for fal.ai image-to-image models.
 * Implements an interface for image transformation and uses fal.ai API.
 */

import { ModelMetadata } from '../../models/abstracts/Model';
import { Image, ImageFormat, ImageRole } from '../../assets/roles';
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

export interface ImageToImageOptions {
  prompt?: string; // For style transfer or enhancement guidance
  negativePrompt?: string;
  strength?: number; // How much to change the original image (0.0 to 1.0)
  scale?: number; // For upscaling models
  denoise?: boolean; // For enhancement models
  quality?: 'low' | 'medium' | 'high';
  format?: 'jpg' | 'png' | 'webp';
  seed?: number;
  guidanceScale?: number;
  steps?: number;
  [key: string]: any; // Allow model-specific parameters
}

/**
 * FalImageToImageModel - Implements Image-to-Image transformation for fal.ai models like Real-ESRGAN, Remove Background, etc.
 */
export class FalImageToImageModel {
  protected metadata: ModelMetadata;
  private client: FalAiClient;
  private modelMetadata: FalModelMetadata;
  private falAiClient: FalAiClient;

  constructor(config: FalModelConfig) {
    // Create metadata for ImageToImageModel
    this.metadata = {
      id: config.modelMetadata.id,
      name: config.modelMetadata.name || config.modelMetadata.id,
      description: config.modelMetadata.description || '',
      version: '1.0.0',
      provider: 'fal-ai',
      capabilities: ['image-to-image'],
      inputTypes: ['image'],
      outputTypes: ['image']
    };

    this.client = config.client;
    this.modelMetadata = config.modelMetadata;
    this.falAiClient = config.falAiClient;
  }

  /**
   * Transform image to image using specific fal.ai image-to-image model
   */
  async transform(input: ImageRole, options?: ImageToImageOptions): Promise<Image> {
    // Cast input to Image
    const image = await input.asImage();

    if (!image.isValid()) {
      throw new Error('Invalid image data provided');
    }

    try {
      // Upload image to fal.ai
      console.log(`[FalImageToImage] Uploading image to fal.ai...`);
      const uploadResult = await this.falAiClient.uploadAsset(image.data, 'input_image.jpg');
      const imageUrl = uploadResult.url;
      console.log(`[FalImageToImage] Image uploaded: ${imageUrl}`);

      // Prepare input for this specific fal.ai image-to-image model
      const falInput = this.prepareFalInput(imageUrl, options);

      console.log(`[FalImageToImage] Processing image with model: ${this.modelMetadata.id}`);
      console.log(`[FalImageToImage] Input:`, falInput);

      // Create request using fal.ai API
      const result = await this.falAiClient.invoke({
        model: this.modelMetadata.id,
        input: falInput,
        logs: true
      });

      console.log(`[FalImageToImage] Processing completed:`, result);

      if (result.data) {
        // Handle different output formats from fal.ai
        let resultImageUrl: string;
        
        if (Array.isArray(result.data.images)) {
          // Multiple images - take first one
          resultImageUrl = result.data.images[0].url;
        } else if (result.data.image) {
          // Single image object
          resultImageUrl = typeof result.data.image === 'string' 
            ? result.data.image 
            : result.data.image.url;
        } else if (typeof result.data === 'string') {
          // Direct URL
          resultImageUrl = result.data;
        } else {
          throw new Error('Unexpected output format from fal.ai');
        }

        console.log(`[FalImageToImage] Image processed:`, resultImageUrl);
        
        // Create Image from result URL - ACTUALLY DOWNLOAD THE FILE
        const resultImage = await this.createImageFromUrl(
          resultImageUrl,
          {
            originalImageSize: image.getSize(),
            modelUsed: this.modelMetadata.id,
            options: options,
            requestId: result.requestId
          }
        );

        return resultImage;
      } else {
        throw new Error(`fal.ai generation failed: No data returned`);
      }

    } catch (error) {
      throw new Error(`fal.ai image-to-image failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create Image object from URL - ACTUALLY DOWNLOADS THE FILE
   */
  private async createImageFromUrl(url: string, metadata: any = {}): Promise<Image> {
    try {
      console.log(`[FalImageToImage] Downloading image from: ${url}`);
      
      // Download the image to a temporary file
      const imageBuffer = await this.downloadFile(url);
      
      // Save to temporary file
      const tempDir = os.tmpdir();
      const filename = `fal-img2img-${Date.now()}.${this.getImageFormat(url)}`;
      const localPath = path.join(tempDir, filename);
      
      // Save the image to disk
      fs.writeFileSync(localPath, imageBuffer);
      
      console.log(`[FalImageToImage] Image saved to: ${localPath} (${(imageBuffer.length / 1024).toFixed(2)} KB)`);
      
      // Use SmartAssetFactory to create Asset with automatic metadata extraction
      console.log(`[FalImageToImage] Loading image asset with metadata extraction...`);
      const smartAsset = SmartAssetFactory.load(localPath);
      const image = await (smartAsset as any).asImage();
      
      // Add our custom metadata to the image
      if (image.metadata) {
        Object.assign(image.metadata, {
          url: url,
          localPath: localPath,
          fileSize: imageBuffer.length,
          ...metadata // custom metadata from fal.ai
        });
      }
      
      console.log(`[FalImageToImage] Image metadata: ${JSON.stringify(image.getDimensions())}, size: ${(imageBuffer.length / 1024).toFixed(1)}KB`);
      
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
            console.log(`[FalImageToImage] Download progress: ${progress}%`);
          }
        });
        
        response.on('end', () => {
          const buffer = Buffer.concat(chunks);
          console.log(`[FalImageToImage] Download complete: ${(buffer.length / 1024).toFixed(2)} KB`);
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
   * Prepare input for specific fal.ai image-to-image model based on its parameters
   */
  private prepareFalInput(imageUrl: string, options?: ImageToImageOptions): any {
    const input: any = {
      image_url: imageUrl
    };

    // Add model-specific parameters based on the model's parameter schema
    const params = this.modelMetadata.parameters || {};

    // Real-ESRGAN specific parameters
    if (this.modelMetadata.id.includes('real-esrgan') || this.modelMetadata.id.includes('upscal')) {
      if (options?.scale && params.scale) {
        input.scale = options.scale;
      } else {
        input.scale = 4; // Default 4x upscaling
      }
    }

    // Background removal specific parameters
    if (this.modelMetadata.id.includes('remove-background') || this.modelMetadata.id.includes('background')) {
      // Background removal typically doesn't need additional parameters
      input.return_mask = false; // Return the final image, not the mask
    }

    // Face restoration specific parameters
    if (this.modelMetadata.id.includes('restore-face') || this.modelMetadata.id.includes('face')) {
      if (options?.strength && params.weight) {
        input.weight = options.strength;
      }
      if (options?.denoise && params.has_aligned) {
        input.has_aligned = !options.denoise; // If denoise is enabled, assume face is not aligned
      }
    }

    // Style transfer specific parameters
    if (this.modelMetadata.id.includes('style') || this.modelMetadata.id.includes('transfer')) {
      if (options?.prompt && params.prompt) {
        input.prompt = options.prompt;
      }
      if (options?.strength && params.strength) {
        input.strength = options.strength;
      }
      if (options?.guidanceScale && params.guidance_scale) {
        input.guidance_scale = options.guidanceScale;
      }
    }

    // Image enhancement specific parameters
    if (this.modelMetadata.id.includes('enhance') || this.modelMetadata.id.includes('quality')) {
      if (options?.denoise && params.denoise) {
        input.denoise = options.denoise;
      }
      if (typeof options?.quality === 'string' && params.quality) {
        const qualityMap = { 'low': 0.3, 'medium': 0.7, 'high': 1.0 };
        input.quality = qualityMap[options.quality] || 0.7;
      }
    }

    // Colorization specific parameters
    if (this.modelMetadata.id.includes('colorize') || this.modelMetadata.id.includes('color')) {
      if (options?.prompt && params.prompt) {
        input.prompt = options.prompt; // Color guidance prompt
      }
    }

    // Common parameters
    if (options?.seed && params.seed) {
      input.seed = options.seed;
    }

    if (options?.steps && params.num_inference_steps) {
      input.num_inference_steps = options.steps;
    }

    if (options?.negativePrompt && params.negative_prompt) {
      input.negative_prompt = options.negativePrompt;
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

  /**
   * Get model metadata
   */
  getMetadata(): ModelMetadata {
    return { ...this.metadata };
  }

  /**
   * Get model ID
   */
  getId(): string {
    return this.metadata.id;
  }

  /**
   * Get model name
   */
  getName(): string {
    return this.metadata.name;
  }
}

export default FalImageToImageModel;
