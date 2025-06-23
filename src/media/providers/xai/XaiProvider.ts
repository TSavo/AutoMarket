import {
  MediaProvider,
  ProviderType,
  MediaCapability,
  ProviderModel,
  ProviderConfig
} from '../../types/provider';
import { TextToTextProvider } from '../../capabilities';
import { XaiTextToTextModel } from './XaiTextToTextModel';
import { ProviderRegistry } from '../../registry/ProviderRegistry';
import { XaiAPIClient } from './XaiAPIClient';

export class XaiProvider implements MediaProvider, TextToTextProvider {
  readonly id = 'xai';
  readonly name = 'xAI';
  readonly type = ProviderType.REMOTE;
  readonly capabilities = [MediaCapability.TEXT_TO_TEXT];
  readonly models: ProviderModel[] = [
    {
      id: 'grok-1',
      name: 'Grok-1',
      capabilities: [MediaCapability.TEXT_TO_TEXT],
      parameters: {}
    }
  ];

  private config?: ProviderConfig;
  private apiClient?: XaiAPIClient;

  async configure(config: ProviderConfig): Promise<void> {
    this.config = config;
    if (!config.apiKey) {
      throw new Error('xAI API key is required');
    }
    this.apiClient = new XaiAPIClient({ apiKey: config.apiKey, baseUrl: config.baseUrl });
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
    return new XaiTextToTextModel({ apiClient: this.apiClient, modelId });
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

ProviderRegistry.getInstance().register('xai', XaiProvider);
