/**
 * FAL.ai Provider Adapter
 * 
 * Adapts the existing FAL.ai integration to the new MediaProvider interface
 */

import { 
  MediaProvider, 
  ProviderType, 
  MediaCapability, 
  ProviderModel, 
  ProviderConfig, 
  GenerationRequest, 
  GenerationResult, 
  JobStatus 
} from '@automarket/core';
import { v4 as uuidv4 } from 'uuid';
import * as fal from '@fal-ai/client';

export class FalAiAdapter implements MediaProvider {
  readonly id = 'fal-ai';
  readonly name = 'FAL.ai';
  readonly type = ProviderType.REMOTE;
  readonly capabilities = [
    MediaCapability.IMAGE_GENERATION,
    MediaCapability.VIDEO_ANIMATION,
    MediaCapability.VIDEO_GENERATION,
    MediaCapability.VIDEO_FACE_SWAP,
    MediaCapability.IMAGE_ENHANCEMENT
  ];

  readonly models: ProviderModel[] = [
    {
      id: 'framepack',
      name: 'FramePack Animation',
      description: 'Animate static images with AI',
      capabilities: [MediaCapability.VIDEO_ANIMATION],
      parameters: {
        prompt: { type: 'string', required: true },
        image_url: { type: 'string', required: true },
        num_frames: { type: 'number', default: 150, min: 50, max: 300 },
        fps: { type: 'number', default: 30, min: 15, max: 60 },
        guidance_scale: { type: 'number', default: 7.5, min: 1, max: 20 },
        video_length: { type: 'number', default: 5, min: 2, max: 10 },
        aspect_ratio: { type: 'string', default: '16:9', options: ['16:9', '9:16', '1:1'] },
        teacache: { type: 'boolean', default: true }
      },
      pricing: {
        inputCost: 0.15, // $0.15 per animation
        outputCost: 0,
        currency: 'USD'
      }
    },
    {
      id: 'flux-pro',
      name: 'FLUX Pro',
      description: 'High-quality image generation',
      capabilities: [MediaCapability.IMAGE_GENERATION],
      parameters: {
        prompt: { type: 'string', required: true },
        image_size: { type: 'string', default: 'landscape_4_3', options: ['square_hd', 'square', 'portrait_4_3', 'portrait_16_9', 'landscape_4_3', 'landscape_16_9'] },
        num_inference_steps: { type: 'number', default: 28, min: 1, max: 50 },
        guidance_scale: { type: 'number', default: 3.5, min: 1, max: 20 },
        num_images: { type: 'number', default: 1, min: 1, max: 4 }
      },
      pricing: {
        inputCost: 0.05,
        outputCost: 0,
        currency: 'USD'
      }
    },
    {
      id: 'runway-gen3',
      name: 'Runway Gen-3',
      description: 'Text-to-video generation',
      capabilities: [MediaCapability.VIDEO_GENERATION],
      parameters: {
        prompt: { type: 'string', required: true },
        duration: { type: 'number', default: 5, min: 2, max: 10 },
        aspect_ratio: { type: 'string', default: '16:9', options: ['16:9', '9:16', '1:1'] },
        resolution: { type: 'string', default: '720p', options: ['480p', '720p', '1080p'] }
      },
      pricing: {
        inputCost: 0.50, // $0.50 per video
        outputCost: 0,
        currency: 'USD'
      }
    },
    {
      id: 'face-swap',
      name: 'Face Swap',
      description: 'Swap faces in videos and images',
      capabilities: [MediaCapability.VIDEO_FACE_SWAP],
      parameters: {
        source_image: { type: 'file', required: true },
        target_video: { type: 'file', required: true },
        face_restore: { type: 'boolean', default: true },
        background_enhance: { type: 'boolean', default: true }
      },
      pricing: {
        inputCost: 0.25,
        outputCost: 0,
        currency: 'USD'
      }
    }
  ];

  private config?: ProviderConfig;
  private apiKey?: string;

  async configure(config: ProviderConfig): Promise<void> {
    this.config = config;
    this.apiKey = config.apiKey;
    
    if (!this.apiKey) {
      throw new Error('FAL.ai API key is required');
    }

    // Configure the FAL client
    fal.config({
      credentials: this.apiKey
    });
  }

  async isAvailable(): Promise<boolean> {
    if (!this.apiKey) {
      return false;
    }

    try {
      // Test with a simple API call - check if we can access the API
      // FAL doesn't have a health endpoint, so we'll just verify the key format
      return this.apiKey.startsWith('fal_') || this.apiKey.length > 10;
    } catch (error) {
      console.warn('FAL.ai provider not available:', error);
      return false;
    }
  }

  getModelsForCapability(capability: MediaCapability): ProviderModel[] {
    return this.models.filter(model => model.capabilities.includes(capability));
  }

  async generate(request: GenerationRequest): Promise<GenerationResult> {
    if (!this.apiKey) {
      throw new Error('Provider not configured');
    }

    const model = this.models.find(m => m.id === request.modelId);
    if (!model) {
      throw new Error(`Model ${request.modelId} not found`);
    }

    try {
      let result: any;

      switch (request.modelId) {
        case 'framepack':
          result = await this.animateImage(request);
          break;
        case 'flux-pro':
          result = await this.generateImage(request);
          break;
        case 'runway-gen3':
          result = await this.generateVideo(request);
          break;
        case 'face-swap':
          result = await this.swapFace(request);
          break;
        default:
          throw new Error(`Model ${request.modelId} not implemented`);
      }

      return {
        jobId: result.requestId || uuidv4(),
        status: JobStatus.COMPLETED,
        outputs: [{
          type: request.capability.includes('video') ? 'video' : 'image',
          url: result.video || result.images?.[0]?.url || result.image?.url,
          metadata: {
            model: request.modelId,
            parameters: request.parameters,
            ...result
          }
        }],
        cost: this.calculateCost(request, model)
      };
    } catch (error) {
      return {
        jobId: uuidv4(),
        status: JobStatus.FAILED,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async animateImage(request: GenerationRequest) {
    return fal.subscribe("fal-ai/framepack", {
      input: {
        prompt: request.parameters.prompt,
        image_url: request.parameters.image_url,
        num_frames: request.parameters.num_frames || 150,
        fps: request.parameters.fps || 30,
        guidance_scale: request.parameters.guidance_scale || 7.5,
        seed: Math.floor(Math.random() * 1000000),
        teacache: request.parameters.teacache !== false,
        video_length: request.parameters.video_length || 5,
        aspect_ratio: request.parameters.aspect_ratio || "16:9"
      },
      logs: true
    });
  }

  private async generateImage(request: GenerationRequest) {
    return fal.subscribe("fal-ai/flux-pro", {
      input: {
        prompt: request.parameters.prompt,
        image_size: request.parameters.image_size || 'landscape_4_3',
        num_inference_steps: request.parameters.num_inference_steps || 28,
        guidance_scale: request.parameters.guidance_scale || 3.5,
        num_images: request.parameters.num_images || 1
      }
    });
  }

  private async generateVideo(request: GenerationRequest) {
    return fal.subscribe("fal-ai/runway-gen3", {
      input: {
        prompt: request.parameters.prompt,
        duration: request.parameters.duration || 5,
        aspect_ratio: request.parameters.aspect_ratio || '16:9',
        resolution: request.parameters.resolution || '720p'
      }
    });
  }

  private async swapFace(request: GenerationRequest) {
    return fal.subscribe("fal-ai/face-swap", {
      input: {
        source_image: request.parameters.source_image,
        target_video: request.parameters.target_video,
        face_restore: request.parameters.face_restore !== false,
        background_enhance: request.parameters.background_enhance !== false
      }
    });
  }

  private calculateCost(request: GenerationRequest, model: ProviderModel) {
    let multiplier = 1;
    
    // Adjust cost based on parameters
    if (request.modelId === 'framepack') {
      multiplier = (request.parameters.video_length || 5) / 5; // Base cost for 5 seconds
    } else if (request.modelId === 'flux-pro') {
      multiplier = request.parameters.num_images || 1;
    }

    return {
      amount: (model.pricing?.inputCost || 0) * multiplier,
      currency: model.pricing?.currency || 'USD'
    };
  }

  async getJobStatus(jobId: string): Promise<GenerationResult> {
    // FAL.ai jobs typically complete immediately with subscribe
    // For async jobs, we'd need to implement status checking
    return {
      jobId,
      status: JobStatus.COMPLETED
    };
  }

  async cancelJob(jobId: string): Promise<boolean> {
    // FAL.ai doesn't support job cancellation for most models
    return false;
  }

  async getHealth() {
    const isAvailable = await this.isAvailable();
    
    return {
      status: isAvailable ? 'healthy' as const : 'unhealthy' as const,
      uptime: 0,
      activeJobs: 0,
      queuedJobs: 0
    };
  }
}
