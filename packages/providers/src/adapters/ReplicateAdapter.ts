/**
 * Replicate Provider Adapter
 * 
 * Adapts the existing Replicate integration to the new MediaProvider interface
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
import Replicate from 'replicate';

export class ReplicateAdapter implements MediaProvider {
  readonly id = 'replicate';
  readonly name = 'Replicate';
  readonly type = ProviderType.REMOTE;
  readonly capabilities = [
    MediaCapability.IMAGE_GENERATION,
    MediaCapability.IMAGE_UPSCALING,
    MediaCapability.IMAGE_ENHANCEMENT,
    MediaCapability.VIDEO_GENERATION,
    MediaCapability.VIDEO_ANIMATION,
    MediaCapability.MODEL_3D_GENERATION
  ];

  readonly models: ProviderModel[] = [
    {
      id: 'flux-1.1-pro-ultra',
      name: 'FLUX 1.1 Pro Ultra',
      description: 'High-quality image generation with FLUX',
      capabilities: [MediaCapability.IMAGE_GENERATION],
      parameters: {
        prompt: { type: 'string', required: true },
        negative_prompt: { type: 'string', default: 'low quality, bad quality, sketches' },
        width: { type: 'number', default: 1024, min: 256, max: 2048 },
        height: { type: 'number', default: 1024, min: 256, max: 2048 },
        num_inference_steps: { type: 'number', default: 25, min: 1, max: 50 },
        guidance_scale: { type: 'number', default: 7.5, min: 1, max: 20 },
        raw: { type: 'boolean', default: false }
      },
      pricing: {
        inputCost: 0.05, // $0.05 per generation
        outputCost: 0,
        currency: 'USD'
      }
    },
    {
      id: 'real-esrgan',
      name: 'Real-ESRGAN',
      description: 'Image upscaling and enhancement',
      capabilities: [MediaCapability.IMAGE_UPSCALING, MediaCapability.IMAGE_ENHANCEMENT],
      parameters: {
        image: { type: 'file', required: true },
        scale: { type: 'number', default: 4, options: [2, 4, 8] },
        face_enhance: { type: 'boolean', default: false }
      },
      pricing: {
        inputCost: 0.02,
        outputCost: 0,
        currency: 'USD'
      }
    },
    {
      id: 'stable-video-diffusion',
      name: 'Stable Video Diffusion',
      description: 'Generate videos from images',
      capabilities: [MediaCapability.VIDEO_GENERATION],
      parameters: {
        image: { type: 'file', required: true },
        motion_bucket_id: { type: 'number', default: 127, min: 1, max: 255 },
        fps: { type: 'number', default: 6, min: 5, max: 30 },
        num_frames: { type: 'number', default: 25, min: 14, max: 25 }
      },
      pricing: {
        inputCost: 0.10,
        outputCost: 0,
        currency: 'USD'
      }
    }
  ];

  private config?: ProviderConfig;
  private client?: Replicate;

  async configure(config: ProviderConfig): Promise<void> {
    this.config = config;
    
    if (!config.apiKey) {
      throw new Error('Replicate API key is required');
    }

    this.client = new Replicate({
      auth: config.apiKey
    });
  }

  async isAvailable(): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    try {
      // Test with a simple API call
      await this.client.models.list({ limit: 1 });
      return true;
    } catch (error) {
      console.warn('Replicate provider not available:', error);
      return false;
    }
  }

  getModelsForCapability(capability: MediaCapability): ProviderModel[] {
    return this.models.filter(model => model.capabilities.includes(capability));
  }

  async generate(request: GenerationRequest): Promise<GenerationResult> {
    if (!this.client) {
      throw new Error('Provider not configured');
    }

    const model = this.models.find(m => m.id === request.modelId);
    if (!model) {
      throw new Error(`Model ${request.modelId} not found`);
    }

    try {
      let prediction: any;

      switch (request.modelId) {
        case 'flux-1.1-pro-ultra':
          prediction = await this.generateImage(request);
          break;
        case 'real-esrgan':
          prediction = await this.enhanceImage(request);
          break;
        case 'stable-video-diffusion':
          prediction = await this.generateVideo(request);
          break;
        default:
          throw new Error(`Model ${request.modelId} not implemented`);
      }

      return {
        jobId: prediction.id,
        status: this.mapStatus(prediction.status),
        outputs: prediction.status === 'succeeded' ? [{
          type: request.capability.includes('video') ? 'video' : 'image',
          url: Array.isArray(prediction.output) ? prediction.output[0] : prediction.output,
          metadata: {
            model: request.modelId,
            parameters: request.parameters
          }
        }] : undefined,
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

  private async generateImage(request: GenerationRequest) {
    const modelVersion = 'black-forest-labs/flux-1.1-pro-ultra';
    
    return this.client!.run(modelVersion, {
      input: {
        prompt: request.parameters.prompt,
        negative_prompt: request.parameters.negative_prompt || 'low quality, bad quality, sketches',
        width: request.parameters.width || 1024,
        height: request.parameters.height || 1024,
        num_inference_steps: request.parameters.num_inference_steps || 25,
        guidance_scale: request.parameters.guidance_scale || 7.5,
        raw: request.parameters.raw || false,
        aspect_ratio: "16:9"
      }
    });
  }

  private async enhanceImage(request: GenerationRequest) {
    const modelVersion = 'nightmareai/real-esrgan';
    
    return this.client!.run(modelVersion, {
      input: {
        image: request.parameters.image,
        scale: request.parameters.scale || 4,
        face_enhance: request.parameters.face_enhance || false
      }
    });
  }

  private async generateVideo(request: GenerationRequest) {
    const modelVersion = 'stability-ai/stable-video-diffusion';
    
    return this.client!.run(modelVersion, {
      input: {
        image: request.parameters.image,
        motion_bucket_id: request.parameters.motion_bucket_id || 127,
        fps: request.parameters.fps || 6,
        num_frames: request.parameters.num_frames || 25
      }
    });
  }

  private mapStatus(status: string): JobStatus {
    switch (status) {
      case 'starting':
      case 'processing': return JobStatus.RUNNING;
      case 'succeeded': return JobStatus.COMPLETED;
      case 'failed': return JobStatus.FAILED;
      case 'canceled': return JobStatus.CANCELLED;
      default: return JobStatus.PENDING;
    }
  }

  private calculateCost(request: GenerationRequest, model: ProviderModel) {
    return {
      amount: model.pricing?.inputCost || 0,
      currency: model.pricing?.currency || 'USD'
    };
  }

  async getJobStatus(jobId: string): Promise<GenerationResult> {
    if (!this.client) {
      throw new Error('Provider not configured');
    }

    try {
      const prediction = await this.client.predictions.get(jobId);
      
      return {
        jobId,
        status: this.mapStatus(prediction.status),
        outputs: prediction.status === 'succeeded' ? [{
          type: prediction.output?.includes('.mp4') ? 'video' : 'image',
          url: Array.isArray(prediction.output) ? prediction.output[0] : prediction.output,
          metadata: prediction.metrics
        }] : undefined,
        progress: prediction.status === 'processing' ? 50 : undefined // Replicate doesn't provide detailed progress
      };
    } catch (error) {
      return {
        jobId,
        status: JobStatus.FAILED,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async cancelJob(jobId: string): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    try {
      await this.client.predictions.cancel(jobId);
      return true;
    } catch (error) {
      return false;
    }
  }

  async getHealth() {
    const isAvailable = await this.isAvailable();
    
    return {
      status: isAvailable ? 'healthy' as const : 'unhealthy' as const,
      uptime: 0, // Not applicable for remote services
      activeJobs: 0, // Would need to track this separately
      queuedJobs: 0
    };
  }
}
