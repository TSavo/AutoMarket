/**
 * Creatify Provider Adapter (Remote)
 *
 * Adapts the existing Creatify API integration to the new MediaProvider interface
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
import { CreatifyApi } from '@tsavo/creatify-api-ts';

export class CreatifyAdapter implements MediaProvider {
  readonly id = 'creatify';
  readonly name = 'Creatify';
  readonly type = ProviderType.REMOTE;
  readonly capabilities = [
    MediaCapability.AVATAR_GENERATION,
    MediaCapability.TEXT_TO_SPEECH,
    MediaCapability.VIDEO_LIP_SYNC,
    MediaCapability.VOICE_CLONING
  ];

  readonly models: ProviderModel[] = [
    {
      id: 'avatar-v2',
      name: 'Creatify Avatar V2',
      description: 'High-quality avatar video generation',
      capabilities: [MediaCapability.AVATAR_GENERATION],
      parameters: {
        script: { type: 'string', required: true },
        avatarId: { type: 'string', required: true },
        voiceId: { type: 'string', required: true },
        aspectRatio: { type: 'string', default: '16:9', options: ['16:9', '9:16', '1:1'] }
      },
      pricing: {
        inputCost: 0.10, // $0.10 per generation
        outputCost: 0,
        currency: 'USD'
      },
      limits: {
        maxInputSize: 5000, // characters
        rateLimit: 10 // per minute
      }
    },
    {
      id: 'tts-premium',
      name: 'Creatify Premium TTS',
      description: 'Premium text-to-speech with natural voices',
      capabilities: [MediaCapability.TEXT_TO_SPEECH],
      parameters: {
        text: { type: 'string', required: true },
        voiceId: { type: 'string', required: true },
        speed: { type: 'number', default: 1.0, min: 0.5, max: 2.0 },
        emotion: { type: 'string', default: 'neutral', options: ['neutral', 'happy', 'sad', 'excited'] }
      },
      pricing: {
        inputCost: 0.02, // $0.02 per 1000 characters
        outputCost: 0,
        currency: 'USD'
      }
    },
    {
      id: 'lipsync-v3',
      name: 'Creatify Lip Sync V3',
      description: 'Advanced lip synchronization for videos',
      capabilities: [MediaCapability.VIDEO_LIP_SYNC],
      parameters: {
        videoUrl: { type: 'string', required: true },
        audioUrl: { type: 'string', required: true },
        faceDetection: { type: 'boolean', default: true }
      },
      pricing: {
        inputCost: 0.25, // $0.25 per minute of video
        outputCost: 0,
        currency: 'USD'
      }
    }
  ];

  private config?: ProviderConfig;
  private client?: CreatifyApi;
  private apiKey?: string;

  async configure(config: ProviderConfig): Promise<void> {
    this.config = config;
    this.apiKey = config.apiKey;

    if (!this.apiKey) {
      throw new Error('Creatify API key is required');
    }

    this.client = new CreatifyApi({
      apiKey: this.apiKey,
      timeout: config.timeout || 30000
    });
  }

  async isAvailable(): Promise<boolean> {
    if (!this.client || !this.apiKey) {
      return false;
    }

    try {
      // Test with a simple API call - get avatars list
      await this.client.avatar.getAvatars({ limit: 1 });
      return true;
    } catch (error) {
      console.warn('Creatify provider not available:', error);
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
      let response: any;

      switch (request.capability) {
        case MediaCapability.AVATAR_GENERATION:
          response = await this.generateAvatar(request);
          break;
        case MediaCapability.TEXT_TO_SPEECH:
          response = await this.generateTTS(request);
          break;
        case MediaCapability.VIDEO_LIP_SYNC:
          response = await this.generateLipSync(request);
          break;
        default:
          throw new Error(`Capability ${request.capability} not supported`);
      }

      return {
        jobId: response.data.jobId,
        status: this.mapStatus(response.data.status),
        outputs: response.data.status === 'completed' ? [{
          type: request.capability.includes('video') ? 'video' : 'audio',
          url: response.data.outputUrl,
          metadata: response.data.metadata
        }] : undefined,
        progress: response.data.progress,
        estimatedTimeRemaining: response.data.estimatedTime,
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

  private async generateAvatar(request: GenerationRequest) {
    return this.client!.avatar.createAvatarLipsync({
      script: request.parameters.script,
      avatar_id: request.parameters.avatarId,
      voice_id: request.parameters.voiceId,
      aspect_ratio: request.parameters.aspectRatio || '16:9'
    });
  }

  private async generateTTS(request: GenerationRequest) {
    return this.client!.textToSpeech.createTextToSpeech({
      text: request.parameters.text,
      voice_id: request.parameters.voiceId,
      speed: request.parameters.speed || 1.0,
      emotion: request.parameters.emotion || 'neutral'
    });
  }

  private async generateLipSync(request: GenerationRequest) {
    // Use the multi-avatar lipsync for single avatar with custom video
    return this.client!.avatar.createMultiAvatarLipsync({
      video_inputs: [{
        character: {
          type: "video",
          url: request.parameters.videoUrl
        },
        voice: {
          type: "audio",
          url: request.parameters.audioUrl
        }
      }],
      aspect_ratio: "16:9"
    });
  }

  private mapStatus(status: string): JobStatus {
    switch (status) {
      case 'pending': return JobStatus.PENDING;
      case 'processing': return JobStatus.RUNNING;
      case 'completed': return JobStatus.COMPLETED;
      case 'failed': return JobStatus.FAILED;
      case 'cancelled': return JobStatus.CANCELLED;
      default: return JobStatus.PENDING;
    }
  }

  private calculateCost(request: GenerationRequest, model: ProviderModel) {
    const inputCost = model.pricing?.inputCost || 0;
    let multiplier = 1;

    // Calculate based on input size
    if (request.capability === MediaCapability.TEXT_TO_SPEECH) {
      multiplier = Math.ceil((request.parameters.text?.length || 0) / 1000);
    }

    return {
      amount: inputCost * multiplier,
      currency: model.pricing?.currency || 'USD'
    };
  }

  async getJobStatus(jobId: string): Promise<GenerationResult> {
    if (!this.client) {
      throw new Error('Provider not configured');
    }

    try {
      const response = await this.client.get(`/jobs/${jobId}`);
      
      return {
        jobId,
        status: this.mapStatus(response.data.status),
        outputs: response.data.status === 'completed' ? [{
          type: response.data.outputType,
          url: response.data.outputUrl,
          metadata: response.data.metadata
        }] : undefined,
        progress: response.data.progress,
        estimatedTimeRemaining: response.data.estimatedTime
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
      await this.client.delete(`/jobs/${jobId}`);
      return true;
    } catch (error) {
      return false;
    }
  }

  async getHealth() {
    const isAvailable = await this.isAvailable();
    
    // Get usage stats if available
    let activeJobs = 0;
    let queuedJobs = 0;
    
    try {
      if (this.client) {
        const response = await this.client.get('/stats');
        activeJobs = response.data.activeJobs || 0;
        queuedJobs = response.data.queuedJobs || 0;
      }
    } catch (error) {
      // Stats not available
    }
    
    return {
      status: isAvailable ? 'healthy' as const : 'unhealthy' as const,
      uptime: 0, // Not applicable for remote services
      activeJobs,
      queuedJobs
    };
  }
}
