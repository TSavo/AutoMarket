/**
 * OpenRouter Provider with TextToText Support
 * 
 * Provider that integrates with OpenRouter's unified LLM API.
 * Provides access to multiple model providers through a single interface.
 */

import { 
  MediaProvider, 
  ProviderType, 
  MediaCapability, 
  ProviderModel, 
  ProviderConfig, 
  GenerationRequest, 
  GenerationResult 
} from '../../types/provider';
import { OpenRouterAPIClient, OpenRouterConfig } from './OpenRouterAPIClient';
import { TextToTextProvider } from '../../capabilities';
import { TextToTextModel } from '../../models/abstracts/TextToTextModel';
import { OpenRouterTextToTextModel } from './OpenRouterTextToTextModel';

export class OpenRouterProvider implements MediaProvider, TextToTextProvider {
  readonly id = 'openrouter';
  readonly name = 'OpenRouter';
  readonly type = ProviderType.REMOTE;  readonly capabilities = [
    MediaCapability.TEXT_TO_TEXT,
    MediaCapability.TEXT_TO_TEXT
  ];

  private config?: ProviderConfig;
  private apiClient?: OpenRouterAPIClient;
  private discoveredModels = new Map<string, ProviderModel>();
  private configurationPromise: Promise<void> | null = null;


  get models(): ProviderModel[] {
    // Return discovered models if available, otherwise return popular models

      return Array.from(this.discoveredModels.values());


  }

  async configure(config: ProviderConfig): Promise<void> {
    this.config = config;
    
    if (!config.apiKey) {
      throw new Error('OpenRouter API key is required');
    }

    const openRouterConfig: OpenRouterConfig = {
      apiKey: config.apiKey,
      httpReferer: 'https://automarket.ai',
      xTitle: 'AutoMarket AI'
    };

    this.apiClient = new OpenRouterAPIClient(openRouterConfig);

    // Optionally discover available models
    await this.discoverModels();
  }

  async isAvailable(): Promise<boolean> {
    if (!this.apiClient) {
      return false;
    }

    try {
      return await this.apiClient.testConnection();
    } catch (error) {
      console.warn('OpenRouter availability check failed:', error);
      return false;
    }
  }

  getModelsForCapability(capability: MediaCapability): ProviderModel[] {
    if (capability === MediaCapability.TEXT_TO_TEXT) {
      return this.models;
    }
    return [];
  }

  async getHealth() {
    const isAvailable = await this.isAvailable();
    
    return {
      status: isAvailable ? 'healthy' as const : 'unhealthy' as const,
      uptime: process.uptime(),
      activeJobs: 0, // Models handle their own jobs
      queuedJobs: 0,
      lastError: isAvailable ? undefined : 'API connection failed'
    };
  }

  // TextToTextProvider interface implementation
  async createTextToTextModel(modelId: string): Promise<TextToTextModel> {
    if (!this.apiClient) {
      throw new Error('Provider not configured');
    }

    if (!this.supportsTextToTextModel(modelId)) {
      throw new Error(`Model '${modelId}' is not supported by OpenRouter provider`);
    }

    return new OpenRouterTextToTextModel({
      apiClient: this.apiClient,
      modelId
    });
  }  /**
   * Get a model instance by ID with automatic type detection
   */
  async getModel(modelId: string): Promise<any> {
    // Ensure we're configured before proceeding
    if (!this.apiClient) {
      // Wait for auto-configuration to complete if it's in progress
      await this.ensureConfigured();
    }
    
    // Wait for model discovery to complete before creating model
    await this.ensureModelsDiscovered();
    
    // For OpenRouter, all models are text-to-text
    return this.createTextToTextModel(modelId);
  }

  getSupportedTextToTextModels(): string[] {
    return this.models.map(model => model.id);
  }
  supportsTextToTextModel(modelId: string): boolean {
    // If models haven't been discovered yet, assume the model is supported
    // This allows the provider to work even before model discovery completes
    if (this.discoveredModels.size === 0) {
      return true; // Optimistic assumption for popular models
    }
    
    return this.getSupportedTextToTextModels().includes(modelId);
  }

  // Service management (no-ops for remote API providers)
  async startService(): Promise<boolean> {
    return true; // Remote APIs are always "started"
  }

  async stopService(): Promise<boolean> {
    return true; // No service to stop for remote APIs
  }

  async getServiceStatus(): Promise<{ running: boolean; healthy: boolean; error?: string }> {
    const isAvailable = await this.isAvailable();
    return {
      running: true, // Remote APIs are always "running"
      healthy: isAvailable,
      error: isAvailable ? undefined : 'API connection failed'
    };
  }

  // MediaProvider interface methods (required but delegated to models)
  async generate(request: GenerationRequest): Promise<GenerationResult> {
    throw new Error('OpenRouterProvider should use Model instances for generation, not direct generation');
  }

  /**
   * Get free models available on OpenRouter
   */
  getFreeModels(): ProviderModel[] {
    return this.models.filter(model => 
      model.pricing?.inputCost === 0 && model.pricing?.outputCost === 0
    );
  }

  /**
   * Check if a specific model is free
   */
  isModelFree(modelId: string): boolean {
    const model = this.models.find(m => m.id === modelId);
    return model ? (model.pricing?.inputCost === 0 && model.pricing?.outputCost === 0) : false;
  }

  // Helper methods
  private async discoverModels(): Promise<void> {
    if (!this.apiClient) {
      return;
    }

    try {
      const availableModels = await this.apiClient.getAvailableModels();
        for (const model of availableModels) {
        console.log(`[OpenRouterProvider] Discovered model: ${model.id}`);
        
        // Parse pricing information if available
        let pricing: { inputCost?: number; outputCost?: number; currency: string } | undefined;
        if (model.pricing) {
          try {
            // OpenRouter pricing is in string format like "$0.0001" per token
            const inputCost = model.pricing.prompt ? parseFloat(model.pricing.prompt.replace('$', '')) : 0;
            const outputCost = model.pricing.completion ? parseFloat(model.pricing.completion.replace('$', '')) : 0;
            pricing = {
              inputCost,
              outputCost,
              currency: 'USD'
            };
          } catch (error) {
            console.warn(`[OpenRouterProvider] Failed to parse pricing for ${model.id}:`, error);
          }
        }
        
        const providerModel: ProviderModel = {
          id: model.id,
          name: model.name,
          description: model.description || `OpenRouter model: ${model.id}`,
          capabilities: [MediaCapability.TEXT_TO_TEXT, MediaCapability.TEXT_TO_TEXT],
          parameters: {
            temperature: { type: 'number', min: 0, max: 2, default: 0.7 },
            max_tokens: { type: 'number', min: 1, max: 4096, default: 1024 },
            top_p: { type: 'number', min: 0, max: 1, default: 1 }
          },
          ...(pricing && { pricing })
        };

        this.discoveredModels.set(model.id, providerModel);
      }

      console.log(`[OpenRouterProvider] Discovered ${this.discoveredModels.size} models`);
    } catch (error) {
      console.warn('[OpenRouterProvider] Model discovery failed, using popular models fallback:', error.message);
    }
  }

  private getModelDisplayName(modelId: string): string {
    const parts = modelId.split('/');
    if (parts.length === 2) {
      const [provider, model] = parts;
      return `${provider.charAt(0).toUpperCase() + provider.slice(1)} ${model}`;
    }
    return modelId;
  }  /**
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
    const apiKey = process.env.OPENROUTER_API_KEY;
    
    if (apiKey) {
      try {        await this.configure({
          apiKey,
          timeout: 300000,
          retries: 3
        });
      } catch (error) {
        console.warn(`[OpenRouterProvider] Auto-configuration failed: ${error.message}`);
        throw error;
      }
    } else {
      throw new Error('No OPENROUTER_API_KEY found in environment');
    }
  }

  /**
   * Ensure the provider is configured (wait for auto-configuration to complete)
   */
  private async ensureConfigured(): Promise<void> {
    if (this.apiClient) {
      return; // Already configured
    }
    
    // Wait for the configuration promise if it exists
    if (this.configurationPromise) {
      await this.configurationPromise;
    }
    
    if (!this.apiClient) {
      throw new Error('Provider auto-configuration failed - no API key found in environment');
    }
  }

  /**
   * Ensure models have been discovered
   */
  private async ensureModelsDiscovered(): Promise<void> {
    // If models are already discovered, no need to wait
    if (this.discoveredModels.size > 0) {
      return;
    }
    
    // If not configured yet, wait for configuration first
    if (!this.apiClient) {
      await this.ensureConfigured();
    }
    
    // Now discover models
    await this.discoverModels();
  }
}

// Self-register with the provider registry
import { ProviderRegistry } from '../../registry/ProviderRegistry';
ProviderRegistry.getInstance().register('openrouter', OpenRouterProvider);
