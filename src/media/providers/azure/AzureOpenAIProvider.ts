import {
  MediaProvider,
  ProviderType,
  MediaCapability,
  ProviderModel,
  ProviderConfig
} from '../../types/provider';
import { TextToTextProvider } from '../../capabilities';
import { AzureOpenAITextToTextModel } from './AzureOpenAITextToTextModel';
import { ProviderRegistry } from '../../registry/ProviderRegistry';
import { AzureOpenAIAPIClient } from './AzureOpenAIAPIClient';

export class AzureOpenAIProvider implements MediaProvider, TextToTextProvider {
  readonly id = 'azure-openai';
  readonly name = 'Azure OpenAI';
  readonly type = ProviderType.REMOTE;
  readonly capabilities = [MediaCapability.TEXT_TO_TEXT];
  readonly models: ProviderModel[] = [
    {
      id: 'gpt-4o',
      name: 'GPT-4o',
      capabilities: [MediaCapability.TEXT_TO_TEXT],
      parameters: {}
    }
  ];

  private config?: ProviderConfig;
  private apiClient?: AzureOpenAIAPIClient;

  async configure(config: ProviderConfig): Promise<void> {
    this.config = config;
    if (!config.apiKey || !config.baseUrl) {
      throw new Error('Azure OpenAI apiKey and baseUrl are required');
    }
    this.apiClient = new AzureOpenAIAPIClient({ apiKey: config.apiKey, baseUrl: config.baseUrl });
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
    return new AzureOpenAITextToTextModel({ apiClient: this.apiClient, modelId });
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

ProviderRegistry.getInstance().register('azure-openai', AzureOpenAIProvider);
