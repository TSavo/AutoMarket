import {
  MediaProvider,
  ProviderType,
  MediaCapability,
  ProviderModel,
  ProviderConfig
} from '../../types/provider';
import { TextToTextProvider } from '../../capabilities';
import { GoogleTextToTextModel } from './GoogleTextToTextModel';
import { ProviderRegistry } from '../../registry/ProviderRegistry';
import { GoogleAPIClient } from './GoogleAPIClient';

export class GoogleProvider implements MediaProvider, TextToTextProvider {
  readonly id = 'google';
  readonly name = 'Google Gemini';
  readonly type = ProviderType.REMOTE;
  readonly capabilities = [MediaCapability.TEXT_TO_TEXT];
  readonly models: ProviderModel[] = [
    {
      id: 'gemini-pro',
      name: 'Gemini Pro',
      capabilities: [MediaCapability.TEXT_TO_TEXT],
      parameters: {}
    }
  ];

  private config?: ProviderConfig;
  private apiClient?: GoogleAPIClient;

  async configure(config: ProviderConfig): Promise<void> {
    this.config = config;
    if (!config.apiKey) {
      throw new Error('Google API key is required');
    }
    this.apiClient = new GoogleAPIClient({ apiKey: config.apiKey, baseUrl: config.baseUrl });
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
    return new GoogleTextToTextModel({ apiClient: this.apiClient, modelId });
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

ProviderRegistry.getInstance().register('google', GoogleProvider);
