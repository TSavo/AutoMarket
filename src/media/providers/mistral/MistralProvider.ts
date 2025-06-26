import {
  MediaProvider,
  ProviderType,
  MediaCapability,
  ProviderModel,
  ProviderConfig
} from '../../types/provider';
import { TextToTextProvider } from '../../capabilities';
import { MistralTextToTextModel } from './MistralTextToTextModel';
import { ProviderRegistry } from '../../registry/ProviderRegistry';
import { MistralAPIClient } from './MistralAPIClient';

export class MistralProvider implements MediaProvider, TextToTextProvider {
  readonly id = 'mistral';
  readonly name = 'Mistral AI';
  readonly type = ProviderType.REMOTE;
  readonly capabilities = [MediaCapability.TEXT_TO_TEXT];
  readonly models: ProviderModel[] = [
    {
      id: 'mistral-medium',
      name: 'Mistral Medium',
      capabilities: [MediaCapability.TEXT_TO_TEXT],
      parameters: {}
    }
  ];

  private config?: ProviderConfig;
  private apiClient?: MistralAPIClient;

  async configure(config: ProviderConfig): Promise<void> {
    this.config = config;
    if (!config.apiKey) {
      throw new Error('Mistral API key is required');
    }
    this.apiClient = new MistralAPIClient({ apiKey: config.apiKey, baseUrl: config.baseUrl });
  }

  async isAvailable(): Promise<boolean> {
    if (!this.apiClient) return false;
    return this.apiClient.testConnection();
  }

  getModelsForCapability(capability: MediaCapability): ProviderModel[] {
    return capability === MediaCapability.TEXT_TO_TEXT ? this.models : [];
  }

  async getModel(modelId: string): Promise<any> {
    if (!this.apiClient) {
      throw new Error('Provider not configured');
    }
    return new MistralTextToTextModel({ apiClient: this.apiClient, modelId });
  }

  // Missing TextToTextProvider methods
  createTextToTextModel(modelId: string): Promise<any> {
    return this.getModel(modelId);
  }

  getSupportedTextToTextModels(): string[] {
    return this.models.filter(m => m.capabilities.includes(MediaCapability.TEXT_TO_TEXT)).map(m => m.id);
  }

  supportsTextToTextModel(modelId: string): boolean {
    return this.models.some(m => m.id === modelId && m.capabilities.includes(MediaCapability.TEXT_TO_TEXT));
  }

  async startService(): Promise<boolean> {
    try {
      if (!this.apiClient) return false;
      return await this.apiClient.testConnection();
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

  async getHealth(): Promise<any> {
    return {
      status: this.config?.apiKey ? 'healthy' : 'unavailable',
      uptime: 0,
      activeJobs: 0,
      queuedJobs: 0
    };
  }
}

ProviderRegistry.getInstance().register('mistral', MistralProvider);
