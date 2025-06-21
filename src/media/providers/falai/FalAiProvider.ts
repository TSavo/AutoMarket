/**
 * fal.ai Provider with Dynamic Model Discovery
 * 
 * Provider that discovers fal.ai models dynamically and creates appropriate Model instances.
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
} from '../../types/provider';
import { v4 as uuidv4 } from 'uuid';
import { FalAiClient, FalAiConfig } from './FalAiClient';
import {
  TextToImageProvider,
  TextToVideoProvider,
  VideoToVideoProvider,
  TextToAudioProvider,
  withTextToImageProvider,
  withTextToVideoProvider,
  withVideoToVideoProvider,
  withTextToAudioProvider
} from '../../capabilities';
import { TextToImageModel } from '../../models/abstracts/TextToImageModel';
import { TextToVideoModel } from '../../models/abstracts/TextToVideoModel';
import { VideoToVideoModel } from '../../models/abstracts/VideoToVideoModel';
import { TextToAudioModel } from '../../models/abstracts/TextToAudioModel';

// Create the base provider class
class BaseFalAiProvider implements MediaProvider {
  readonly id = 'fal-ai';
  readonly name = 'fal.ai';
  readonly type = ProviderType.REMOTE;
  readonly capabilities = [
    MediaCapability.IMAGE_GENERATION,
    MediaCapability.IMAGE_UPSCALING,
    MediaCapability.IMAGE_ENHANCEMENT,
    MediaCapability.VIDEO_GENERATION,
    MediaCapability.VIDEO_ANIMATION,
    MediaCapability.VIDEO_UPSCALING,
    MediaCapability.AUDIO_GENERATION,
    MediaCapability.AUDIO_ENHANCEMENT
  ];

  private config?: ProviderConfig;
  private client?: FalAiClient;
  private discoveredModels = new Map<string, ProviderModel>();

  // MediaProvider interface requires models array, but we discover them dynamically
  get models(): ProviderModel[] {
    return Array.from(this.discoveredModels.values());
  }

  async configure(config: ProviderConfig): Promise<void> {
    this.config = config;
    
    if (!config.apiKey) {
      throw new Error('fal.ai API key is required');
    }

    const falConfig: FalAiConfig = {
      apiKey: config.apiKey,
      discovery: {
        openRouterApiKey: process.env.OPENROUTER_API_KEY, // For free model categorization
        maxCacheAge: 24 * 60 * 60 * 1000, // 24 hours
        cacheDir: './cache'
      }
    };

    this.client = new FalAiClient(falConfig);

    // Discover available models on initialization
    await this.discoverModels();
  }

  async isAvailable(): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    try {
      return await this.client.testConnection();
    } catch (error) {
      console.warn('fal.ai availability check failed:', error);
      return false;
    }
  }

  getModelsForCapability(capability: MediaCapability): ProviderModel[] {
    return this.models.filter(model => 
      model.capabilities.includes(capability)
    );
  }

  async generate(request: GenerationRequest): Promise<GenerationResult> {
    throw new Error('FalAiProvider should use Model instances for generation, not direct generation');
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

    // Discover the model using FalAiClient
    try {
      const metadata = await this.client.getModelMetadata(modelId);
      
      // Convert to ProviderModel format
      const providerModel: ProviderModel = {
        id: modelId,
        name: metadata.name || modelId,
        description: metadata.description || '',
        capabilities: this.mapCapabilities(metadata.category, metadata.capabilities),
        parameters: metadata.parameters || {},
        pricing: {
          inputCost: 0, // fal.ai uses per-generation pricing
          outputCost: 0,
          currency: 'USD'
        }
      };

      this.discoveredModels.set(modelId, providerModel);
      return providerModel;
    } catch (error) {
      throw new Error(`Failed to discover model '${modelId}': ${error.message}`);
    }
  }
  private mapCapabilities(category: string, capabilities: string[]): MediaCapability[] {
    const mappings: Record<string, MediaCapability[]> = {
      'text-to-image': [MediaCapability.IMAGE_GENERATION],
      'text-to-video': [MediaCapability.VIDEO_GENERATION],
      'image-to-video': [MediaCapability.VIDEO_ANIMATION],
      'video-to-video': [MediaCapability.VIDEO_UPSCALING, MediaCapability.VIDEO_FACE_SWAP],
      'image-to-image': [MediaCapability.IMAGE_UPSCALING, MediaCapability.IMAGE_ENHANCEMENT],
      'text-to-audio': [MediaCapability.AUDIO_GENERATION, MediaCapability.TEXT_TO_SPEECH],
      'audio-to-audio': [MediaCapability.AUDIO_ENHANCEMENT]
    };

    return mappings[category] || [];
  }

  /**
   * Discover models by scraping fal.ai exclusively (no static registry)
   */
  private async discoverModels(): Promise<void> {
    if (!this.client) return;

    try {
      console.log('[FalAiProvider] Starting dynamic model discovery...');
      
      // Use FalAiClient's discovery system to find models
      const models = await this.client.discoverModels({
        openRouterApiKey: process.env.OPENROUTER_API_KEY,
        cacheDir: './cache',
        maxCacheAge: 24 * 60 * 60 * 1000
      });

      console.log(`[FalAiProvider] Discovered ${models.length} models`);

      // Convert discovered models to ProviderModel format
      for (const model of models) {
        const providerModel: ProviderModel = {
          id: model.id,
          name: model.name || model.id,
          description: model.description || '',
          capabilities: this.mapCapabilities(model.category, model.capabilities),
          parameters: model.parameters || {},
          pricing: {
            inputCost: 0,
            outputCost: 0,
            currency: 'USD'
          }
        };

        this.discoveredModels.set(model.id, providerModel);
      }

      console.log(`[FalAiProvider] Categorized models by capability:`);
      console.log(`  - Text-to-Image: ${this.getModelsForCapability(MediaCapability.IMAGE_GENERATION).length}`);
      console.log(`  - Text-to-Video: ${this.getModelsForCapability(MediaCapability.VIDEO_GENERATION).length}`);
      console.log(`  - Image-to-Video: ${this.getModelsForCapability(MediaCapability.VIDEO_ANIMATION).length}`);
      console.log(`  - Video-to-Video: ${this.getModelsForCapability(MediaCapability.VIDEO_UPSCALING).length}`);
      console.log(`  - Text-to-Audio: ${this.getModelsForCapability(MediaCapability.AUDIO_GENERATION).length}`);

    } catch (error) {
      console.warn('[FalAiProvider] Model discovery failed:', error);
      // Continue with empty model set - models can be discovered on-demand
    }
  }  async createTextToImageModel(modelId: string): Promise<TextToImageModel> {
    const modelMetadata = await this.getModelMetadata(modelId);
    
    // Create and return FalTextToImageModel instance for specific text-to-image model
    const { FalTextToImageModel } = await import('./FalTextToImageModel');

    return new FalTextToImageModel({
      client: this.client!,
      modelMetadata,
      falAiClient: this.client!
    });
  }

  async createTextToVideoModel(modelId: string): Promise<TextToVideoModel> {
    const modelMetadata = await this.getModelMetadata(modelId);
    
    // Create and return FalTextToVideoModel instance for specific text-to-video model
    const { FalTextToVideoModel } = await import('./FalTextToVideoModel');
    
    return new FalTextToVideoModel({
      client: this.client!,
      modelMetadata,
      falAiClient: this.client!
    });
  }

  async createVideoToVideoModel(modelId: string): Promise<VideoToVideoModel> {
    const modelMetadata = await this.getModelMetadata(modelId);
    
    // Create and return FalVideoToVideoModel instance for specific video-to-video model
    const { FalVideoToVideoModel } = await import('./FalVideoToVideoModel');
    
    return new FalVideoToVideoModel({
      client: this.client!,
      modelMetadata,
      falAiClient: this.client!
    });
  }

  async createTextToAudioModel(modelId: string): Promise<TextToAudioModel> {
    const modelMetadata = await this.getModelMetadata(modelId);
    
    // Create and return FalTextToAudioModel instance for specific text-to-audio model
    const { FalTextToAudioModel } = await import('./FalTextToAudioModel');

    return new FalTextToAudioModel({
      client: this.client!,
      modelMetadata,
      falAiClient: this.client!
    });
  }

  async createImageToImageModel(modelId: string): Promise<any> {
    const modelMetadata = await this.getModelMetadata(modelId);
    
    // Create and return FalImageToImageModel instance for specific image-to-image model
    const { FalImageToImageModel } = await import('./FalImageToImageModel');

    return new FalImageToImageModel({
      client: this.client!,
      modelMetadata,
      falAiClient: this.client!
    });
  }

  // Helper methods
  private async getModelMetadata(modelId: string) {
    if (!this.client) {
      throw new Error('Provider not configured');
    }

    return await this.client.getModelMetadata(modelId);
  }
}

// Apply the provider role mixins
const FalAiProviderWithTextToImage = withTextToImageProvider(BaseFalAiProvider);
const FalAiProviderWithTextToVideo = withTextToVideoProvider(FalAiProviderWithTextToImage);
const FalAiProviderWithVideoToVideo = withVideoToVideoProvider(FalAiProviderWithTextToVideo);
const FalAiProviderWithTextToAudio = withTextToAudioProvider(FalAiProviderWithVideoToVideo);

// Export the final provider class with all role capabilities
export class FalAiProvider extends FalAiProviderWithTextToAudio 
  implements TextToImageProvider, TextToVideoProvider, VideoToVideoProvider, TextToAudioProvider {
    // Override to ensure our implementation is used instead of mixin fallback
  async createTextToVideoModel(modelId: string): Promise<TextToVideoModel> {
    console.log('[FalAiProvider] Creating TextToVideoModel for:', modelId);
    const modelMetadata = await (this as any).getModelMetadata(modelId);    
    // Create and return FalTextToVideoModel instance for specific text-to-video model
    const { FalTextToVideoModel } = await import('./FalTextToVideoModel');
    
    return new FalTextToVideoModel({
      client: (this as any).client!,
      modelMetadata,
      falAiClient: (this as any).client!
    });
  }
  
  // The mixin classes handle all the other provider role implementations
}

export default FalAiProvider;
