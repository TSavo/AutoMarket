/**
 * FAL.ai MediaTransformer Implementation
 * 
 * Provides unified MediaTransformer interface for FAL.ai's multi-modal capabilities:
 * - text → image (FLUX Pro)
 * - text → video (Runway Gen-3)  
 * - image + text → video (FramePack Animation)
 * - source_image + target_video → face_swapped_video (Face Swap)
 */

import { v4 as uuidv4 } from 'uuid';
import {
  MediaTransformer,
  MediaInput,
  MediaOutput,
  MediaType,
  TransformCapability,
  createMediaOutput
} from '../types/MediaTransformer';

// Import FAL.ai client - handle both ESM and CommonJS like in existing code
let fal: any;
try {
  const falModule = require('@fal-ai/client');
  fal = falModule.fal;
} catch (error) {
  console.error('Error importing @fal-ai/client:', error);
  throw new Error('FAL.ai client not available');
}

export interface FalAiConfig {
  apiKey: string;
  timeout?: number;
}

export interface FalAiTransformOptions {
  // FramePack Animation options
  num_frames?: number;
  fps?: number;
  guidance_scale?: number;
  video_length?: number;
  aspect_ratio?: '16:9' | '9:16' | '1:1';
  
  // FLUX Pro options  
  image_size?: string;
  num_inference_steps?: number;
  num_images?: number;
  
  // Runway Gen-3 options
  duration?: number;
  resolution?: string;
  
  // Face Swap options
  face_restore?: boolean;
  background_enhance?: boolean;
  
  // Model selection
  model?: 'framepack' | 'flux-pro' | 'runway-gen3' | 'face-swap';
}

/**
 * FAL.ai MediaTransformer
 * 
 * Abstracts FAL.ai's various AI models into simple MediaTransformer interface
 */
export class FalAiTransformer implements MediaTransformer {
  readonly id = 'fal-ai';
  readonly name = 'FAL.ai Multi-Modal AI';
  readonly type = 'remote' as const;
  
  readonly transforms: TransformCapability[] = [
    {
      input: 'text',
      output: 'image',
      description: 'Generate high-quality images from text prompts using FLUX Pro'
    },
    {
      input: 'text', 
      output: 'video',
      description: 'Generate videos from text descriptions using Runway Gen-3'
    },
    {
      input: ['image', 'text'],
      output: 'video', 
      description: 'Animate static images with text prompts using FramePack'
    },
    {
      input: ['image', 'video'],
      output: 'video',
      description: 'Swap faces in videos using Face Swap technology'
    }
  ];

  private config?: FalAiConfig;
  private isConfigured = false;

  constructor(config?: FalAiConfig) {
    if (config) {
      this.configure(config);
    }
  }

  /**
   * Configure the FAL.ai transformer
   */
  configure(config: FalAiConfig): void {
    this.config = config;
    
    // Configure the FAL client
    fal.config({
      credentials: config.apiKey
    });
    
    this.isConfigured = true;
  }

  async isAvailable(): Promise<boolean> {
    if (!this.isConfigured || !this.config?.apiKey) {
      return false;
    }

    try {
      // Simple API key validation
      return this.config.apiKey.startsWith('fal_') || this.config.apiKey.length > 10;
    } catch (error) {
      console.warn('FAL.ai transformer not available:', error);
      return false;
    }
  }
  async transform(input: MediaInput | MediaInput[], outputType: MediaType, options?: FalAiTransformOptions): Promise<MediaOutput> {
    if (!this.isConfigured) {
      throw new Error('FAL.ai transformer not configured. Call configure() first.');
    }

    const inputs = Array.isArray(input) ? input : [input];
    const inputTypes = inputs.map(i => i.type);

    // Determine which model to use based on input/output types
    const model = options?.model || this.selectModel(inputTypes, outputType);
    
    let result: any;

    switch (model) {
      case 'flux-pro':
        result = await this.generateImage(inputs[0], options);
        break;
      case 'runway-gen3':
        result = await this.generateVideo(inputs[0], options);
        break;
      case 'framepack':
        result = await this.animateImage(inputs, options);
        break;
      case 'face-swap':
        result = await this.swapFace(inputs, options);
        break;
      default:
        throw new Error(`Unsupported transformation: ${JSON.stringify(inputTypes)} → ${outputType}`);
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
   * Select the appropriate FAL.ai model based on input/output types
   */
  private selectModel(inputTypes: MediaType[], outputType: MediaType): string {
    if (inputTypes.length === 1 && inputTypes[0] === 'text' && outputType === 'image') {
      return 'flux-pro';
    }
    if (inputTypes.length === 1 && inputTypes[0] === 'text' && outputType === 'video') {
      return 'runway-gen3';
    }
    if (inputTypes.includes('image') && inputTypes.includes('text') && outputType === 'video') {
      return 'framepack';
    }
    if (inputTypes.includes('image') && inputTypes.includes('video') && outputType === 'video') {
      return 'face-swap';
    }
    
    throw new Error(`No FAL.ai model available for transformation: ${JSON.stringify(inputTypes)} → ${outputType}`);
  }

  /**
   * Generate image using FLUX Pro
   */
  private async generateImage(input: MediaInput, options?: FalAiTransformOptions) {
    const prompt = input.data.toString();
    
    return fal.subscribe("fal-ai/flux-pro", {
      input: {
        prompt,
        image_size: options?.image_size || 'landscape_4_3',
        num_inference_steps: options?.num_inference_steps || 28,
        guidance_scale: options?.guidance_scale || 3.5,
        num_images: options?.num_images || 1
      }
    });
  }

  /**
   * Generate video using Runway Gen-3
   */
  private async generateVideo(input: MediaInput, options?: FalAiTransformOptions) {
    const prompt = input.data.toString();
    
    return fal.subscribe("fal-ai/runway-gen3", {
      input: {
        prompt,
        duration: options?.duration || 5,
        aspect_ratio: options?.aspect_ratio || '16:9',
        resolution: options?.resolution || '720p'
      }
    });
  }

  /**
   * Animate image using FramePack
   */
  private async animateImage(inputs: MediaInput[], options?: FalAiTransformOptions) {
    const imageInput = inputs.find(i => i.type === 'image');
    const textInput = inputs.find(i => i.type === 'text');
    
    if (!imageInput || !textInput) {
      throw new Error('FramePack requires both image and text inputs');
    }

    // Convert image to data URI if it's a file path
    let imageUrl: string;
    if (typeof imageInput.data === 'string' && !imageInput.data.startsWith('data:')) {
      // Assume it's a file path - in real implementation, would read file and convert to base64
      throw new Error('File path inputs not yet supported. Please provide base64 data URI for images.');
    } else {
      imageUrl = imageInput.data.toString();
    }

    const prompt = textInput.data.toString();
    
    return fal.subscribe("fal-ai/framepack", {
      input: {
        prompt,
        image_url: imageUrl,
        num_frames: options?.num_frames || 150,
        fps: options?.fps || 30,
        guidance_scale: options?.guidance_scale || 7.5,
        video_length: options?.video_length || 5,
        aspect_ratio: options?.aspect_ratio || "16:9",
        teacache: true,
        seed: Math.floor(Math.random() * 1000000)
      },
      logs: true
    });
  }

  /**
   * Swap face in video
   */
  private async swapFace(inputs: MediaInput[], options?: FalAiTransformOptions) {
    const imageInput = inputs.find(i => i.type === 'image');
    const videoInput = inputs.find(i => i.type === 'video');
    
    if (!imageInput || !videoInput) {
      throw new Error('Face swap requires both image and video inputs');
    }

    return fal.subscribe("fal-ai/face-swap", {
      input: {
        source_image: imageInput.data.toString(),
        target_video: videoInput.data.toString(),
        face_restore: options?.face_restore !== false,
        background_enhance: options?.background_enhance !== false
      }
    });
  }

  /**
   * Process FAL.ai result into MediaOutput
   */
  private processResult(result: any, outputType: MediaType): MediaOutput {
    let outputData: string;
    let metadata: Record<string, any> = {
      requestId: result.requestId,
      model: 'fal-ai',
      timestamp: new Date().toISOString()
    };

    // Extract the appropriate output URL based on type
    if (outputType === 'video') {
      outputData = result.data?.video?.url || result.data?.video_url || result.video;
    } else if (outputType === 'image') {
      outputData = result.data?.images?.[0]?.url || result.data?.image?.url || result.image;
    } else {
      throw new Error(`Unsupported output type: ${outputType}`);
    }

    if (!outputData) {
      throw new Error('No output data found in FAL.ai response');
    }

    // Add additional metadata from the response
    if (result.data) {
      metadata = { ...metadata, ...result.data };
    }

    return createMediaOutput(outputType, outputData, metadata);
  }
}

/**
 * Factory function to create a configured FAL.ai transformer
 */
export function createFalAiTransformer(config: FalAiConfig): FalAiTransformer {
  return new FalAiTransformer(config);
}

/**
 * Create FAL.ai transformer from environment variables
 */
export function createFalAiTransformerFromEnv(): FalAiTransformer {
  const apiKey = process.env.FALAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('FALAI_API_KEY environment variable is required');
  }

  return createFalAiTransformer({ apiKey });
}
