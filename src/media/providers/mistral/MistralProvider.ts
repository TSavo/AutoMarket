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

  async configure(config: ProviderConfig): Promise<void> {
    this.config = config;
  }

  async isAvailable(): Promise<boolean> {
    return !!this.config?.apiKey;
  }

  getModelsForCapability(capability: MediaCapability): ProviderModel[] {
    return capability === MediaCapability.TEXT_TO_TEXT ? this.models : [];
  }

  async getModel(modelId: string): Promise<any> {
    return new MistralTextToTextModel({ modelId });
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
