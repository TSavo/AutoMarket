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
    return new GoogleTextToTextModel({ modelId });
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
