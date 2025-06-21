/**
 * Replicate Provider with Multi-Role Support
 * 
 * Provider that discovers Replicate models dynamically and creates appropriate Model instances.
 * Uses the provider role system for multi-capability support.
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
} from '../types/provider';
import { v4 as uuidv4 } from 'uuid';
import { ReplicateClient, ReplicateConfig } from '../clients/ReplicateClient';
import {
  TextToImageProvider,
  TextToVideoProvider,
  VideoToVideoProvider,
  withTextToImageProvider,
  withTextToVideoProvider,
  withVideoToVideoProvider
} from './roles';
import { TextToAudioModel } from '@/media/models/TextToAudioModel';
import { TextToImageModel } from '@/media/models/TextToImageModel';
import { TextToVideoModel } from '@/media/models/TextToVideoModel';

// TODO: Import these when they're implemented
// import { TextToImageModel } from '../../../../src/media/models/TextToImageModel';
// import { TextToVideoModel } from '../../../../src/media/models/TextToVideoModel';
// import { VideoToVideoModel } from '../../../../src/media/models/VideoToVideoModel';

// Create the base provider class
class BaseReplicateProvider implements MediaProvider {
  readonly id = 'replicate';
  readonly name = 'Replicate';
  readonly type = ProviderType.REMOTE;  readonly capabilities = [
    MediaCapability.IMAGE_GENERATION,
    MediaCapability.IMAGE_UPSCALING,
    MediaCapability.IMAGE_ENHANCEMENT,
    MediaCapability.VIDEO_GENERATION,
    MediaCapability.VIDEO_ANIMATION,
    MediaCapability.VIDEO_UPSCALING
  ];

  private config?: ProviderConfig;
  private client?: ReplicateClient;
  private discoveredModels = new Map<string, ProviderModel>();

  // MediaProvider interface requires models array, but we discover them dynamically
  get models(): ProviderModel[] {
    return Array.from(this.discoveredModels.values());
  }

  async configure(config: ProviderConfig): Promise<void> {
    this.config = config;
    
    if (!config.apiKey) {
      throw new Error('Replicate API key is required');
    }

    const replicateConfig: ReplicateConfig = {
      apiKey: config.apiKey,
      discovery: {
        maxCacheAge: 24 * 60 * 60 * 1000, // 24 hours
        cacheDir: './cache'
      }
    };

    this.client = new ReplicateClient(replicateConfig);
  }

  async isAvailable(): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    try {
      return await this.client.testConnection();
    } catch (error) {
      console.warn('Replicate availability check failed:', error);
      return false;
    }
  }

  getModelsForCapability(capability: MediaCapability): ProviderModel[] {
    return this.models.filter(model => 
      model.capabilities.includes(capability)
    );
  }

  async generate(request: GenerationRequest): Promise<GenerationResult> {
    throw new Error('ReplicateProvider should use Model instances for generation, not direct generation');
  }

  async getJobStatus(jobId: string): Promise<GenerationResult> {
    throw new Error('Job status should be handled by Model instances');
  }

  async cancelJob(jobId: string): Promise<boolean> {
    throw new Error('Job cancellation should be handled by Model instances');
  }

  async getHealth() {
    const isAvailable = await this.isAvailable();
    
    return {
      status: isAvailable ? 'healthy' as const : 'unhealthy' as const,
      uptime: process.uptime(),
      activeJobs: 0, // Models handle their own jobs
      queuedJobs: 0
    };
  }

  // Helper methods for provider role system
  getSupportedModels(): string[] {
    return Array.from(this.discoveredModels.keys());
  }

  async getModel(modelId: string): Promise<any> {
    if (!this.client) {
      throw new Error('Provider not configured');
    }

    // Check if we've already discovered this model
    if (this.discoveredModels.has(modelId)) {
      return this.discoveredModels.get(modelId);
    }

    // Discover the model using ReplicateClient
    try {
      const metadata = await this.client.getModelMetadata(modelId);
        // Convert to ProviderModel format
      const providerModel: ProviderModel = {
        id: modelId,
        name: metadata.name || modelId,
        description: metadata.description || '',
        capabilities: this.mapCapabilities(metadata.category, metadata.capabilities),
        parameters: metadata.parameters || {},
        pricing: metadata.pricing ? {
          inputCost: 0, // Default cost - would need to parse from Replicate pricing
          outputCost: 0,
          currency: 'USD'
        } : undefined
      };

      this.discoveredModels.set(modelId, providerModel);
      return providerModel;
    } catch (error) {
      throw new Error(`Failed to discover model '${modelId}': ${error.message}`);
    }
  }

  private mapCapabilities(category: string, capabilities: string[]): MediaCapability[] {
    const mapped: MediaCapability[] = [];

    // Map from Replicate categories to our MediaCapability enum
    if (category.includes('image') || capabilities.includes('image_generation')) {
      mapped.push(MediaCapability.IMAGE_GENERATION);
    }
    if (category.includes('video') || capabilities.includes('video_generation')) {
      mapped.push(MediaCapability.VIDEO_GENERATION);
    }
    if (capabilities.includes('upscaling')) {
      mapped.push(MediaCapability.IMAGE_UPSCALING);
    }
    if (capabilities.includes('enhancement')) {
      mapped.push(MediaCapability.IMAGE_ENHANCEMENT);
    }

    return mapped.length > 0 ? mapped : [MediaCapability.IMAGE_GENERATION]; // fallback
  }

  async createTextToAudioModel(modelId: string): Promise<TextToAudioModel> {
    const modelMetadata = await this.getModelMetadata(modelId);
    
    // Create and return ReplicateTextToAudioModel instance for specific TTS model
    const { ReplicateTextToAudioModel } = await import('../../media/models/ReplicateTextToAudioModel');

    return new ReplicateTextToAudioModel({
      client: this.client!,
      modelMetadata,
      replicateClient: await this.getReplicateClient()
    });
  }

  // Model creation methods for provider roles
  async createTextToImageModel(modelId: string): Promise<TextToImageModel> {
    const modelMetadata = await this.getModelMetadata(modelId);
    
    // TODO: Create ReplicateTextToImageModel when TextToImageModel interface exists
    throw new Error('ReplicateTextToImageModel not yet implemented');
  }
  async createTextToVideoModel(modelId: string): Promise<TextToVideoModel> {
    const modelMetadata = await this.getModelMetadata(modelId);
    
    // Create and return ReplicateTextToVideoModel instance for specific text-to-video model
    const { ReplicateTextToVideoModel } = await import('../models/ReplicateTextToVideoModel');
    
    return new ReplicateTextToVideoModel({
      client: this.client!,
      modelMetadata,
      replicateClient: await this.getReplicateClient()
    });
  }

  async createVideoToVideoModel(modelId: string): Promise<any> {
    const modelMetadata = await this.getModelMetadata(modelId);
    
    // TODO: Create ReplicateVideoToVideoModel when VideoToVideoModel interface exists
    throw new Error('ReplicateVideoToVideoModel not yet implemented');
  }

  // Helper methods
  private async getModelMetadata(modelId: string) {
    if (!this.client) {
      throw new Error('Provider not configured');
    }

    return await this.client.getModelMetadata(modelId);
  }

  private async getReplicateClient() {
    if (!this.config?.apiKey) {
      throw new Error('Provider not configured with API key');
    }

    const Replicate = (await import('replicate')).default;
    return new Replicate({ auth: this.config.apiKey });
  }
}

// Apply the provider role mixins
const ReplicateProviderWithTextToImage = withTextToImageProvider(BaseReplicateProvider);
const ReplicateProviderWithTextToVideo = withTextToVideoProvider(ReplicateProviderWithTextToImage);
const ReplicateProviderWithVideoToVideo = withVideoToVideoProvider(ReplicateProviderWithTextToVideo);

// Export the final provider class with all role capabilities
export class ReplicateProvider extends ReplicateProviderWithVideoToVideo 
  implements TextToImageProvider, TextToVideoProvider, VideoToVideoProvider {
  
  // Override to ensure our implementation is used instead of mixin fallback
  async createTextToVideoModel(modelId: string): Promise<TextToVideoModel> {
    console.log('[ReplicateProvider] Creating TextToVideoModel for:', modelId);
    const modelMetadata = await (this as any).getModelMetadata(modelId);
    
    // Create and return ReplicateTextToVideoModel instance for specific text-to-video model
    const { ReplicateTextToVideoModel } = await import('../models/ReplicateTextToVideoModel');
    
    return new ReplicateTextToVideoModel({
      client: (this as any).client!,
      modelMetadata,
      replicateClient: await (this as any).getReplicateClient()
    });
  }
  
  // The mixin classes handle all the other provider role implementations
}

export default ReplicateProvider;
