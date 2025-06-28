/**
 * WaveSpeedProvider - Provider for WaveSpeedAI
 *
 * This provider integrates with the WaveSpeedAI API to offer
 * text-to-image and text-to-video generation capabilities.
 */

import {
  MediaProvider,
  ProviderType,
  MediaCapability,
  ProviderModel,
  ProviderConfig,
} from '../../types/provider';
import { WaveSpeedClient, WaveSpeedConfig } from './WaveSpeedClient';
import { TextToImageProvider, TextToVideoProvider } from '../../capabilities';
import { TextToImageModel } from '../../models/abstracts/TextToImageModel';
import { TextToVideoModel } from '../../models/abstracts/TextToVideoModel';

export class WaveSpeedProvider implements MediaProvider, TextToImageProvider, TextToVideoProvider {
  readonly id = 'wavespeed';
  readonly name = 'WaveSpeedAI';
  readonly type = ProviderType.REMOTE;

  private config?: ProviderConfig;
  private client?: WaveSpeedClient;
  private _models?: ProviderModel[];
  private _capabilities?: MediaCapability[];

  constructor() {
    // Auto-configure from environment variables
    const apiKey = process.env.WAVESPEED_API_KEY;
    if (apiKey) {
      this.configure({ apiKey });
    }
  }

  get capabilities(): MediaCapability[] {
    if (!this._capabilities) {
      // Initialize with all supported capabilities
      this._capabilities = [
        MediaCapability.TEXT_TO_IMAGE,
        MediaCapability.TEXT_TO_VIDEO,
        MediaCapability.IMAGE_TO_VIDEO,
        MediaCapability.IMAGE_TO_IMAGE,
        MediaCapability.VIDEO_TO_VIDEO,
        MediaCapability.TEXT_TO_AUDIO,
        MediaCapability.IMAGE_TO_3D
      ];
    }
    return this._capabilities;
  }

  get models(): ProviderModel[] {
    // Models are loaded dynamically, return cached models or empty array
    return this._models || [];
  }

  async configure(config: ProviderConfig): Promise<void> {
    this.config = config;
    if (!config.apiKey) {
      throw new Error('WaveSpeedAI API key is required');
    }
    
    const waveSpeedConfig: WaveSpeedConfig = {
      apiKey: config.apiKey,
      discovery: {
        openRouterApiKey: process.env.OPENROUTER_API_KEY,
        cacheDir: './cache/wavespeed',
        maxCacheAge: 24 * 60 * 60 * 1000 // 24 hours
      }
    };
    
    this.client = new WaveSpeedClient(waveSpeedConfig);
    
    // Load models dynamically after configuration
    await this.loadModels();
  }

  /**
   * Load models dynamically from the API
   */
  private async loadModels(): Promise<void> {
    if (!this.client) {
      throw new Error('Client not configured');
    }
    
    try {
      this._models = await this.client.getProviderModels();
      console.log(`WaveSpeedAI: Loaded ${this._models.length} models dynamically`);
    } catch (error) {
      console.warn('Failed to load WaveSpeedAI models dynamically, using fallback:', error);
      // Fallback to a minimal set of models
      this._models = [
        {
          id: 'wavespeed-ai/flux-dev',
          name: 'FLUX.1 [dev]',
          description: 'FLUX dev text-to-image model',
          capabilities: [MediaCapability.TEXT_TO_IMAGE],
          parameters: {}
        },
        {
          id: 'wavespeed-ai/wan-2.1/t2v-480p',
          name: 'WAN 2.1 Text-to-Video',
          description: 'WAN 2.1 text-to-video model',
          capabilities: [MediaCapability.TEXT_TO_VIDEO],
          parameters: {}
        }
      ];
    }
  }

  async isAvailable(): Promise<boolean> {
    if (!this.client) {
      return false;
    }
    return this.client.testConnection();
  }

  getModelsForCapability(capability: MediaCapability): ProviderModel[] {
    return this.models.filter(model => 
      model.capabilities.includes(capability)
    );
  }

  async getModel(modelId: string): Promise<any> {
    if (!this.client) {
      throw new Error('Provider not configured');
    }

    const model = this.models.find(m => m.id === modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    // Return appropriate model instance based on capabilities
    if (model.capabilities.includes(MediaCapability.TEXT_TO_IMAGE)) {
      return this.createTextToImageModel(modelId);
    }
    if (model.capabilities.includes(MediaCapability.TEXT_TO_VIDEO)) {
      return this.createTextToVideoModel(modelId);
    }
    
    throw new Error(`No implementation available for model ${modelId} capabilities: ${model.capabilities.join(', ')}`);
  }

  async getHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    uptime: number;
    activeJobs: number;
    queuedJobs: number;
    lastError?: string;
  }> {
    const isAvailable = await this.isAvailable();
    return {
      status: isAvailable ? 'healthy' : 'unhealthy',
      uptime: 0, // WaveSpeedAI doesn't provide uptime info
      activeJobs: 0, // WaveSpeedAI doesn't provide job info
      queuedJobs: 0,
      lastError: isAvailable ? undefined : 'Connection test failed'
    };
  }

  async createTextToImageModel(modelId: string): Promise<TextToImageModel> {
    if (!this.client) {
      throw new Error('Provider not configured');
    }
    // This is a placeholder. A concrete TextToImageModel implementation is needed.
    throw new Error('Method not implemented.');
  }

  async createTextToVideoModel(modelId: string): Promise<TextToVideoModel> {
    if (!this.client) {
      throw new Error('Provider not configured');
    }
    // This is a placeholder. A concrete TextToVideoModel implementation is needed.
    throw new Error('Method not implemented.');
  }

  // Placeholder for provider role methods
  getSupportedTextToImageModels(): string[] {
    return ['flux-pro'];
  }

  supportsTextToImageModel(modelId: string): boolean {
    return this.getSupportedTextToImageModels().includes(modelId);
  }

  getSupportedTextToVideoModels(): string[] {
    return ['wan-2.1'];
  }

  supportsTextToVideoModel(modelId: string): boolean {
    return this.getSupportedTextToVideoModels().includes(modelId);
  }

  // ServiceManagement interface implementation
  async startService(): Promise<boolean> {
    // Remote API - no service to start
    return true;
  }

  async stopService(): Promise<boolean> {
    // Remote API - no service to stop  
    return true;
  }

  async getServiceStatus(): Promise<{ running: boolean; healthy: boolean; error?: string }> {
    const isAvailable = await this.isAvailable();
    return {
      running: true, // Remote APIs are always "running"
      healthy: isAvailable,
      error: isAvailable ? undefined : 'API connection failed'
    };
  }
}

// Self-register with the provider registry
import { ProviderRegistry } from '../../registry/ProviderRegistry';
ProviderRegistry.getInstance().register('wavespeed', WaveSpeedProvider);
