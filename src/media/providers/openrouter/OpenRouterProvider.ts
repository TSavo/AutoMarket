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
  readonly type = ProviderType.REMOTE;
  readonly capabilities = [
    MediaCapability.TEXT_GENERATION,
    MediaCapability.TEXT_TO_TEXT
  ];

  private config?: ProviderConfig;
  private apiClient?: OpenRouterAPIClient;
  private discoveredModels = new Map<string, ProviderModel>();

  // Pre-configured popular models (can be extended with dynamic discovery)
  private popularModels = [
    'anthropic/claude-3.5-sonnet',
    'anthropic/claude-3-haiku',
    'openai/gpt-4o',
    'openai/gpt-4o-mini', 
    'openai/gpt-3.5-turbo',
    'google/gemini-pro-1.5',
    'meta-llama/llama-3.2-90b-vision-instruct',
    'meta-llama/llama-3.1-70b-instruct',
    'qwen/qwen-2.5-72b-instruct',
    'deepseek/deepseek-chat',
    'deepseek/deepseek-r1-distill-llama-70b', // Free model
    'mistralai/mixtral-8x7b-instruct',
    'microsoft/phi-3-medium-4k-instruct'
  ];

  get models(): ProviderModel[] {
    // Return discovered models if available, otherwise return popular models
    if (this.discoveredModels.size > 0) {
      return Array.from(this.discoveredModels.values());
    }

    return this.popularModels.map(modelId => ({
      id: modelId,
      name: this.getModelDisplayName(modelId),
      description: `OpenRouter model: ${modelId}`,
      capabilities: [MediaCapability.TEXT_GENERATION, MediaCapability.TEXT_TO_TEXT],
      parameters: {
        temperature: { type: 'number', min: 0, max: 2, default: 0.7 },
        max_tokens: { type: 'number', min: 1, max: 4096, default: 1024 },
        top_p: { type: 'number', min: 0, max: 1, default: 1 }
      },
      pricing: {
        inputCost: 0, // Would need real pricing data from OpenRouter
        outputCost: 0,
        currency: 'USD'
      }
    }));
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
    if (capability === MediaCapability.TEXT_GENERATION || capability === MediaCapability.TEXT_TO_TEXT) {
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
  }

  getSupportedTextToTextModels(): string[] {
    return this.models.map(model => model.id);
  }

  supportsTextToTextModel(modelId: string): boolean {
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

  // Helper methods
  private async discoverModels(): Promise<void> {
    if (!this.apiClient) {
      return;
    }

    try {
      const availableModels = await this.apiClient.getAvailableModels();
      
      for (const model of availableModels) {
        const providerModel: ProviderModel = {
          id: model.id,
          name: model.name,
          description: model.description || `OpenRouter model: ${model.id}`,
          capabilities: [MediaCapability.TEXT_GENERATION, MediaCapability.TEXT_TO_TEXT],
          parameters: {
            temperature: { type: 'number', min: 0, max: 2, default: 0.7 },
            max_tokens: { type: 'number', min: 1, max: 4096, default: 1024 },
            top_p: { type: 'number', min: 0, max: 1, default: 1 }
          }
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
  }
}
