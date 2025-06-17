/**
 * Replicate MediaTransformer Implementation
 * 
 * Provides unified MediaTransformer interface for Replicate's multi-modal capabilities:
 * - text → image (FLUX 1.1 Pro Ultra)
 * - image → enhanced_image (Real-ESRGAN upscaling)
 * - image → video (Stable Video Diffusion)
 */

import Replicate from 'replicate';
import { v4 as uuidv4 } from 'uuid';
import {
  MediaTransformer,
  MediaInput,
  MediaOutput,
  MediaType,
  TransformCapability,
  createMediaOutput
} from '../types/MediaTransformer';

export interface ReplicateConfig {
  apiKey: string;
  timeout?: number;
}

export interface ReplicateTransformOptions {
  // FLUX 1.1 Pro Ultra options
  negative_prompt?: string;
  width?: number;
  height?: number;
  num_inference_steps?: number;
  guidance_scale?: number;
  raw?: boolean;
  aspect_ratio?: string;
  
  // Real-ESRGAN options
  scale?: number;
  face_enhance?: boolean;
  
  // Stable Video Diffusion options
  motion_bucket_id?: number;
  fps?: number;
  num_frames?: number;
  
  // Model selection
  model?: 'flux-1.1-pro-ultra' | 'real-esrgan' | 'stable-video-diffusion';
}

/**
 * Replicate MediaTransformer
 * 
 * Abstracts Replicate's various AI models into simple MediaTransformer interface
 */
export class ReplicateTransformer implements MediaTransformer {
  readonly id = 'replicate';
  readonly name = 'Replicate AI Platform';
  readonly type = 'remote' as const;
  
  readonly transforms: TransformCapability[] = [
    {
      input: 'text',
      output: 'image',
      description: 'Generate ultra high-quality images from text using FLUX 1.1 Pro Ultra'
    },
    {
      input: 'image',
      output: 'image',
      description: 'Upscale and enhance images using Real-ESRGAN'
    },
    {
      input: 'image',
      output: 'video',
      description: 'Generate videos from static images using Stable Video Diffusion'
    }
  ];

  private config?: ReplicateConfig;
  private client?: Replicate;
  private isConfigured = false;

  constructor(config?: ReplicateConfig) {
    if (config) {
      this.configure(config);
    }
  }

  /**
   * Configure the Replicate transformer
   */
  configure(config: ReplicateConfig): void {
    this.config = config;
    
    // Initialize Replicate client
    this.client = new Replicate({
      auth: config.apiKey
    });
    
    this.isConfigured = true;
  }
  async isAvailable(): Promise<boolean> {
    if (!this.isConfigured || !this.client) {
      return false;
    }

    try {
      // Test with a simple API call - just check the client is configured
      return this.config?.apiKey ? this.config.apiKey.length > 10 : false;
    } catch (error) {
      console.warn('Replicate transformer not available:', error);
      return false;
    }
  }
  async transform(input: MediaInput | MediaInput[], outputType: MediaType, options?: ReplicateTransformOptions): Promise<MediaOutput> {
    if (!this.isConfigured || !this.client) {
      throw new Error('Replicate transformer not configured. Call configure() first.');
    }

    // Replicate primarily handles single inputs, but we support the interface
    const singleInput = Array.isArray(input) ? input[0] : input;

    // Determine which model to use based on input/output types
    const model = options?.model || this.selectModel(singleInput.type, outputType);
    
    let result: any;

    switch (model) {
      case 'flux-1.1-pro-ultra':
        result = await this.generateImage(singleInput, options);
        break;
      case 'real-esrgan':
        result = await this.enhanceImage(singleInput, options);
        break;
      case 'stable-video-diffusion':
        result = await this.generateVideo(singleInput, options);
        break;
      default:
        throw new Error(`Unsupported transformation: ${singleInput.type} → ${outputType}`);
    }

    return this.processResult(result, outputType);
  }

  getInfo() {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      transforms: this.transforms,
      status: this.isConfigured ? 'available' as const : 'unavailable' as const
    };
  }

  /**
   * Select the appropriate Replicate model based on input/output types
   */
  private selectModel(inputType: MediaType, outputType: MediaType): string {
    if (inputType === 'text' && outputType === 'image') {
      return 'flux-1.1-pro-ultra';
    }
    if (inputType === 'image' && outputType === 'image') {
      return 'real-esrgan';
    }
    if (inputType === 'image' && outputType === 'video') {
      return 'stable-video-diffusion';
    }
    
    throw new Error(`No Replicate model available for transformation: ${inputType} → ${outputType}`);
  }

  /**
   * Generate image using FLUX 1.1 Pro Ultra
   */
  private async generateImage(input: MediaInput, options?: ReplicateTransformOptions) {
    const prompt = input.data.toString();
    const modelVersion = 'black-forest-labs/flux-1.1-pro-ultra';
    
    return this.client!.run(modelVersion, {
      input: {
        prompt,
        negative_prompt: options?.negative_prompt || 'low quality, bad quality, sketches',
        width: options?.width || 2752,
        height: options?.height || 1536,
        num_inference_steps: options?.num_inference_steps || 30,
        guidance_scale: options?.guidance_scale || 7.5,
        raw: options?.raw ?? true, // Default to raw=true for natural images
        aspect_ratio: options?.aspect_ratio || "16:9"
      }
    });
  }

  /**
   * Enhance image using Real-ESRGAN
   */
  private async enhanceImage(input: MediaInput, options?: ReplicateTransformOptions) {
    const modelVersion = 'nightmareai/real-esrgan';
    
    return this.client!.run(modelVersion, {
      input: {
        image: input.data.toString(), // Should be image URL or data URI
        scale: options?.scale || 4,
        face_enhance: options?.face_enhance || false
      }
    });
  }

  /**
   * Generate video using Stable Video Diffusion
   */
  private async generateVideo(input: MediaInput, options?: ReplicateTransformOptions) {
    const modelVersion = 'stability-ai/stable-video-diffusion';
    
    return this.client!.run(modelVersion, {
      input: {
        image: input.data.toString(), // Should be image URL or data URI
        motion_bucket_id: options?.motion_bucket_id || 127,
        fps: options?.fps || 6,
        num_frames: options?.num_frames || 25
      }
    });
  }

  /**
   * Process Replicate result into MediaOutput
   */
  private processResult(result: any, outputType: MediaType): MediaOutput {
    let outputData: string;
    let metadata: Record<string, any> = {
      provider: 'replicate',
      timestamp: new Date().toISOString()
    };

    // Replicate returns either a single URL or an array of URLs
    if (Array.isArray(result)) {
      outputData = result[0]; // Take the first result
      metadata.alternativeOutputs = result.slice(1); // Store additional outputs if any
    } else if (typeof result === 'string') {
      outputData = result;
    } else {
      throw new Error('Unexpected result format from Replicate');
    }

    if (!outputData) {
      throw new Error('No output data found in Replicate response');
    }

    return createMediaOutput(outputType, outputData, metadata);
  }
}

/**
 * Factory function to create a configured Replicate transformer
 */
export function createReplicateTransformer(config: ReplicateConfig): ReplicateTransformer {
  return new ReplicateTransformer(config);
}

/**
 * Create Replicate transformer from environment variables
 */
export function createReplicateTransformerFromEnv(): ReplicateTransformer {
  const apiKey = process.env.REPLICATE_API_TOKEN;
  
  if (!apiKey) {
    throw new Error('REPLICATE_API_TOKEN environment variable is required');
  }

  return createReplicateTransformer({ apiKey });
}
