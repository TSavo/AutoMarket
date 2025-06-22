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
    MediaCapability.TEXT_TO_IMAGE,
    MediaCapability.TEXT_TO_VIDEO,
    MediaCapability.IMAGE_TO_VIDEO,
    MediaCapability.VIDEO_TO_VIDEO,
    MediaCapability.TEXT_TO_AUDIO
  ];
  protected config?: ProviderConfig;
  protected client?: FalAiClient;  protected discoveredModels = new Map<string, ProviderModel>();
  private configurationPromise: Promise<void> | null = null;
  private modelMetadataCache = new Map<string, Promise<ProviderModel>>();/**
   * Constructor automatically configures from environment variables
   */
  constructor() {
    // Auto-configure from environment variables (store the promise)
    this.configurationPromise = this.autoConfigureFromEnv().catch(error => {
      // Silent fail - provider will just not be available until manually configured
      this.configurationPromise = null;
    });
  }

  /**
   * Automatically configure from environment variables
   */
  private async autoConfigureFromEnv(): Promise<void> {
    const apiKey = process.env.FALAI_API_KEY;
    
    if (apiKey) {
      try {        await this.configure({
          apiKey,
          timeout: 600000, // Longer timeout for AI model processing
          retries: 2
        });
      } catch (error) {
        console.warn(`[FalAiProvider] Auto-configuration failed: ${error.message}`);
        throw error;
      }
    } else {
      throw new Error('No FALAI_API_KEY found in environment');
    }
  }

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
    };    this.client = new FalAiClient(falConfig);

    // Models will be discovered dynamically when requested
    // No upfront discovery to avoid memory issues
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
  }  async getModelMetadata(modelId: string): Promise<ProviderModel> {
    if (!this.client) {
      await this.ensureConfigured();
    }

    // Check if we have a cached promise for this model
    if (this.modelMetadataCache.has(modelId)) {
      return await this.modelMetadataCache.get(modelId)!;
    }

    // Wrap the discoveryPromise to auto-remove on error
    const discoveryPromise = this.discoverSingleModel(modelId).catch(err => {
      this.modelMetadataCache.delete(modelId);
      throw err;
    });
    this.modelMetadataCache.set(modelId, discoveryPromise);

    return await discoveryPromise;
  }
  private async discoverSingleModel(modelId: string): Promise<ProviderModel> {
    try {
      // Add a timeout: if getModelMetadata takes >60s, reject
      const timeoutMs = 60000;
      let timeoutId: NodeJS.Timeout | undefined;
      const metadataPromise = this.client!.getModelMetadata(modelId);
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('getModelMetadata timeout')), timeoutMs);
      });
      
      try {
        const metadata = await Promise.race([metadataPromise, timeoutPromise]);
        // Clear timeout when main promise resolves
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        
        // Type guard for metadata
        if (!metadata || typeof metadata !== 'object') {
          throw new Error('getModelMetadata did not return an object');
        }
        const meta = metadata as any;
        // Convert to ProviderModel format
        const providerModel: ProviderModel = {
          id: modelId,
          name: meta.name || modelId,
          description: meta.description || '',
          capabilities: this.mapCapabilities(meta.category, meta.capabilities),
          parameters: meta.parameters || {},
          pricing: {
            inputCost: 0, // fal.ai uses per-generation pricing
            outputCost: 0,
            currency: 'USD'
          }
        };
        // Cache the discovered model
        this.discoveredModels.set(modelId, providerModel);
        return providerModel;
        
      } catch (timeoutError) {
        // Ensure timeout is cleared even on error
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        throw timeoutError;
      }
    } catch (error) {
      this.modelMetadataCache.delete(modelId);      throw new Error(`Failed to discover model '${modelId}': ${error.message}`);
    }
  }

  private reverseMapCapabilities(capabilities: MediaCapability[]): string {
    const reverseMappings: Record<string, string> = {
      [MediaCapability.TEXT_TO_IMAGE]: 'text-to-image',
      [MediaCapability.TEXT_TO_VIDEO]: 'text-to-video',
      [MediaCapability.IMAGE_TO_VIDEO]: 'image-to-video',
      [MediaCapability.VIDEO_TO_VIDEO]: 'video-to-video',
      [MediaCapability.IMAGE_TO_IMAGE]: 'image-to-image',
      [MediaCapability.TEXT_TO_AUDIO]: 'text-to-audio',
      [MediaCapability.AUDIO_TO_AUDIO]: 'audio-to-audio'
    };

    return capabilities.length > 0 ? reverseMappings[capabilities[0]] || 'unknown' : 'unknown';
  }

  private mapCapabilities(category: string, capabilities: string[]): MediaCapability[] {
    const mappings: Record<string, MediaCapability[]> = {
      'text-to-image': [MediaCapability.TEXT_TO_IMAGE],
      'text-to-video': [MediaCapability.TEXT_TO_VIDEO],
      'image-to-video': [MediaCapability.IMAGE_TO_VIDEO],
      'video-to-video': [MediaCapability.VIDEO_TO_VIDEO],
      'image-to-image': [MediaCapability.IMAGE_TO_IMAGE],
      'text-to-audio': [MediaCapability.TEXT_TO_AUDIO],
      'audio-to-audio': [MediaCapability.AUDIO_TO_AUDIO]
    };

    return mappings[category] || [];
  }
  /**
   * Discover models by scraping fal.ai exclusively (no static registry)
   * NOTE: This method is deprecated - models are now discovered dynamically on-demand
   */
  private async discoverModels(): Promise<void> {    // No longer used - models are discovered dynamically when requested
  }
  
  async createTextToImageModel(modelId: string): Promise<TextToImageModel> {
    const modelMetadata = await this.getFalModelMetadata(modelId);
      // Create and return FalTextToImageModel instance for specific text-to-image model
    const { FalTextToImageModel } = await import('./FalTextToImageModel');

    const modelInstance = new FalTextToImageModel({
      client: this.client!,
      modelMetadata,
      falAiClient: this.client!
    });

    return modelInstance;
  }

  async createTextToVideoModel(modelId: string): Promise<TextToVideoModel> {
    const modelMetadata = await this.getFalModelMetadata(modelId);
    
    // Create and return FalTextToVideoModel instance for specific text-to-video model
    const { FalTextToVideoModel } = await import('./FalTextToVideoModel');
    
    return new FalTextToVideoModel({
      client: this.client!,
      modelMetadata,
      falAiClient: this.client!
    });
  }

  async createVideoToVideoModel(modelId: string): Promise<VideoToVideoModel> {
    const modelMetadata = await this.getFalModelMetadata(modelId);
    
    // Create and return FalVideoToVideoModel instance for specific video-to-video model
    const { FalVideoToVideoModel } = await import('./FalVideoToVideoModel');
    
    return new FalVideoToVideoModel({
      client: this.client!,
      modelMetadata,
      falAiClient: this.client!
    });
  }

  async createTextToAudioModel(modelId: string): Promise<TextToAudioModel> {
    const modelMetadata = await this.getFalModelMetadata(modelId);
    
    // Create and return FalTextToAudioModel instance for specific text-to-audio model
    const { FalTextToAudioModel } = await import('./FalTextToAudioModel');

    return new FalTextToAudioModel({
      client: this.client!,
      modelMetadata,
      falAiClient: this.client!
    });
  }

  async createImageToImageModel(modelId: string): Promise<any> {
    const modelMetadata = await this.getFalModelMetadata(modelId);
    
    // Create and return FalImageToImageModel instance for specific image-to-image model
    const { FalImageToImageModel } = await import('./FalImageToImageModel');

    return new FalImageToImageModel({
      client: this.client!,
      modelMetadata,
      falAiClient: this.client!
    });
  }

  async createImageToVideoModel(modelId: string): Promise<any> {
    const modelMetadata = await this.getFalModelMetadata(modelId);
    
    // Create and return FalImageToVideoModel instance for specific image-to-video model
    const { FalImageToVideoModel } = await import('./FalImageToVideoModel');

    return new FalImageToVideoModel({
      client: this.client!,
      modelMetadata,
      falAiClient: this.client!
    });
  }  // Helper methods
  private async getFalModelMetadata(modelId: string) {
    // Ensure we're configured before proceeding
    if (!this.client) {
      await this.ensureConfigured();
    }    // Check if we already have this in our in-memory cache to avoid recursion
    if (this.modelMetadataCache.has(modelId)) {
      const cachedProviderModel = await this.modelMetadataCache.get(modelId)!;
      // Convert from ProviderModel back to raw FalAi format
      return {
        id: cachedProviderModel.id,
        name: cachedProviderModel.name,
        description: cachedProviderModel.description || 'No description',
        category: this.reverseMapCapabilities(cachedProviderModel.capabilities),
        parameters: cachedProviderModel.parameters,
        capabilities: cachedProviderModel.capabilities.map(cap => cap.toLowerCase().replace('_', '-')),
        tags: [],
        lastUpdated: Date.now()
      };
    }

    // Get the raw FAL metadata directly from client - no circular calls
    const meta = await this.client!.getModelMetadata(modelId);
    try {
      console.log(`[FalAiProvider] getFalModelMetadata typeof:`, typeof meta);
      if (meta && typeof meta === 'object') {
        const keys = Object.keys(meta);
        console.log(`[FalAiProvider] getFalModelMetadata keys:`, keys);
        if (keys.length > 0) {
          for (const k of keys) {
            const v = meta[k];
            if (typeof v === 'object' && v !== null) {
              console.log(`  - ${k}: object with keys [${Object.keys(v).slice(0,10).join(', ')}]`);
            } else {
              console.log(`  - ${k}:`, typeof v, v && v.length ? `(length: ${v.length})` : '');
            }
          }
        }
      }
      // Try to stringify, but catch errors
      let size = 0;
      try {
        const str = JSON.stringify(meta);
        size = Buffer.byteLength(str, 'utf8');
        console.log(`[FalAiProvider] getFalModelMetadata JSON size: ${size} bytes (${(size/1024/1024).toFixed(2)} MB)`);
      } catch (err) {
        console.log(`[FalAiProvider] getFalModelMetadata JSON.stringify error:`, err);
      }
    } catch (err) {
      console.log(`[FalAiProvider] getFalModelMetadata debug error:`, err);
    }
    return meta;
  }

  /**
   * Ensure the provider is configured (wait for auto-configuration to complete)
   */
  private async ensureConfigured(): Promise<void> {
    if (this.client) {
      return; // Already configured
    }
    
    // Wait for the configuration promise if it exists
    if (this.configurationPromise) {
      await this.configurationPromise;
    }
    
    if (!this.client) {
      throw new Error('Provider auto-configuration failed - no API key found in environment');
    }
  }  /**
   * Get a model instance by ID with automatic type detection.
   * This method enables the elegant getProvider().getModel().transform() pattern
   * by determining the correct Model class based on the model's capabilities.
   */  async getModel(modelId: string): Promise<any> {
    // Debug: who is calling this?
    const stack = new Error().stack;
    const caller = stack?.split('\n')[2]?.trim() || 'unknown';
    console.log(`[FalAiProvider] getModel called for ${modelId} by: ${caller}`);
    
    // Ensure we're configured before proceeding
    if (!this.client) {
      await this.ensureConfigured();
    }

    // Get standardized metadata with properly mapped capabilities (cached)
    const providerModel = await this.getModelMetadata(modelId);
    const capabilities = providerModel.capabilities || [];

    if (capabilities.includes(MediaCapability.TEXT_TO_IMAGE)) {
      return this.createTextToImageModel(modelId);
    }
    if (capabilities.includes(MediaCapability.TEXT_TO_VIDEO)) {
      return this.createTextToVideoModel(modelId);
    }
    if (capabilities.includes(MediaCapability.IMAGE_TO_VIDEO)) {
      return this.createImageToVideoModel(modelId);
    }
    if (capabilities.includes(MediaCapability.VIDEO_TO_VIDEO)) {
      return this.createVideoToVideoModel(modelId);
    }
    if (capabilities.includes(MediaCapability.TEXT_TO_AUDIO)) {
      return this.createTextToAudioModel(modelId);
    }
    if (capabilities.includes(MediaCapability.IMAGE_TO_IMAGE)) {
      return this.createImageToImageModel(modelId);
    }
    throw new Error(`No model implementation found for capabilities: ${capabilities.join(', ')}`);
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
  // No need for WithMetadata methods or overrides
}

export default FalAiProvider;

// Self-register with the provider registry
import { ProviderRegistry } from '../../registry/ProviderRegistry';
ProviderRegistry.getInstance().register('fal-ai', FalAiProvider);
