/**
 * Anthropic Provider with TextToText Support
 *
 * Provider that integrates with Anthropic's Claude API.
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
import { AnthropicAPIClient, AnthropicConfig } from './AnthropicAPIClient';
import { TextToTextProvider } from '../../capabilities';
import { TextToTextModel } from '../../models/abstracts/TextToTextModel';
import { AnthropicTextToTextModel } from './AnthropicTextToTextModel';

export class AnthropicProvider implements MediaProvider, TextToTextProvider {
  readonly id = 'anthropic';
  readonly name = 'Anthropic';
  readonly type = ProviderType.REMOTE;
  readonly capabilities = [MediaCapability.TEXT_TO_TEXT, MediaCapability.TEXT_TO_TEXT];

  private config?: ProviderConfig;
  private apiClient?: AnthropicAPIClient;
  private discoveredModels = new Map<string, ProviderModel>();
  private configurationPromise: Promise<void> | null = null;

  constructor() {
    this.configurationPromise = this.autoConfigureFromEnv().catch(() => {
      this.configurationPromise = null;
    });
  }

  get models(): ProviderModel[] {
    return Array.from(this.discoveredModels.values());
  }

  async configure(config: ProviderConfig): Promise<void> {
    this.config = config;

    if (!config.apiKey) {
      throw new Error('Anthropic API key is required');
    }

    const anthropicConfig: AnthropicConfig = {
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      timeout: config.timeout
    };

    this.apiClient = new AnthropicAPIClient(anthropicConfig);

    await this.discoverModels();
  }

  async isAvailable(): Promise<boolean> {
    if (!this.apiClient) {
      return false;
    }

    try {
      return await this.apiClient.testConnection();
    } catch (error) {
      console.warn('Anthropic availability check failed:', error);
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
      activeJobs: 0,
      queuedJobs: 0,
      lastError: isAvailable ? undefined : 'API connection failed'
    };
  }

  async createTextToTextModel(modelId: string): Promise<TextToTextModel> {
    if (!this.apiClient) {
      throw new Error('Provider not configured');
    }

    if (!this.supportsTextToTextModel(modelId)) {
      throw new Error(`Model '${modelId}' is not supported by Anthropic provider`);
    }

    return new AnthropicTextToTextModel({ apiClient: this.apiClient, modelId });
  }

  async getModel(modelId: string): Promise<any> {
    if (!this.apiClient) {
      await this.ensureConfigured();
    }

    await this.ensureModelsDiscovered();

    return this.createTextToTextModel(modelId);
  }

  supportsTextToTextModel(modelId: string): boolean {
    return this.discoveredModels.has(modelId);
  }

  private async discoverModels(): Promise<void> {
    if (!this.apiClient) return;

    try {
      const models = await this.apiClient.getAvailableModels();

      if (!models || models.length === 0) {
        this.populateDefaultModels();
        return;
      }

      models.forEach(model => {
        const providerModel: ProviderModel = {
          id: model.id,
          name: model.id,
          description: `Anthropic model: ${model.id}`,
          capabilities: [MediaCapability.TEXT_TO_TEXT, MediaCapability.TEXT_TO_TEXT],
          parameters: {
            temperature: { type: 'number', min: 0, max: 1, default: 0.7 },
            max_tokens: { type: 'number', min: 1, max: 4096, default: 1024 },
            top_p: { type: 'number', min: 0, max: 1, default: 1 }
          }
        };
        this.discoveredModels.set(model.id, providerModel);
      });
    } catch (error) {
      console.warn('[AnthropicProvider] Model discovery failed, using static list:', error);
      this.populateDefaultModels();
    }
  }

  private populateDefaultModels() {
    const modelIds = [
      'claude-3-7-sonnet-latest',
      'claude-3-7-sonnet-20250219',
      'claude-3-5-haiku-latest',
      'claude-3-5-haiku-20241022',
      'claude-sonnet-4-20250514',
      'claude-sonnet-4-0',
      'claude-4-sonnet-20250514',
      'claude-3-5-sonnet-latest',
      'claude-3-5-sonnet-20241022',
      'claude-3-5-sonnet-20240620',
      'claude-opus-4-0',
      'claude-opus-4-20250514',
      'claude-4-opus-20250514',
      'claude-3-opus-latest',
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
      'claude-2.1',
      'claude-2.0'
    ];

    modelIds.forEach(id => {
      const providerModel: ProviderModel = {
        id,
        name: id,
        description: `Anthropic model: ${id}`,
        capabilities: [MediaCapability.TEXT_TO_TEXT, MediaCapability.TEXT_TO_TEXT],
        parameters: {
          temperature: { type: 'number', min: 0, max: 1, default: 0.7 },
          max_tokens: { type: 'number', min: 1, max: 4096, default: 1024 },
          top_p: { type: 'number', min: 0, max: 1, default: 1 }
        }
      };
      this.discoveredModels.set(id, providerModel);
    });
  }

  private async autoConfigureFromEnv(): Promise<void> {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (apiKey) {
      await this.configure({ apiKey, timeout: 300000, retries: 3 });
    } else {
      throw new Error('No ANTHROPIC_API_KEY found in environment');
    }
  }

  private async ensureConfigured(): Promise<void> {
    if (this.apiClient) return;

    if (this.configurationPromise) {
      await this.configurationPromise;
    }

    if (!this.apiClient) {
      throw new Error('Provider auto-configuration failed - no API key found');
    }
  }

  private async ensureModelsDiscovered(): Promise<void> {
    if (this.discoveredModels.size > 0) return;

    if (!this.apiClient) {
      await this.ensureConfigured();
    }

    await this.discoverModels();
  }

  // Missing TextToTextProvider methods
  getSupportedTextToTextModels(): string[] {
    return Array.from(this.discoveredModels.keys()).filter(id => 
      this.discoveredModels.get(id)?.capabilities.includes(MediaCapability.TEXT_TO_TEXT)
    );
  }

  async startService(): Promise<boolean> {
    try {
      await this.ensureConfigured();
      return true;
    } catch (error) {
      return false;
    }
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
    };
  }
}

import { ProviderRegistry } from '../../registry/ProviderRegistry';
ProviderRegistry.getInstance().register('anthropic', AnthropicProvider);
