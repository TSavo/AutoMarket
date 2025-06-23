import {
  MediaProvider,
  ProviderType,
  MediaCapability,
  ProviderModel,
  ProviderConfig,
} from '../../../types/provider';
import { OllamaDockerService } from '../../../services/OllamaDockerService';
import { OllamaAPIClient } from './OllamaAPIClient';
import { TextToTextProvider } from '../../../capabilities';
import { TextToTextModel } from '../../../models/abstracts/TextToTextModel';
import { OllamaTextToTextModel } from './OllamaTextToTextModel';

export class OllamaDockerProvider implements MediaProvider, TextToTextProvider {
  readonly id = 'ollama-docker';
  readonly name = 'Ollama Docker Provider';
  readonly type = ProviderType.LOCAL;
  readonly capabilities = [MediaCapability.TEXT_TO_TEXT];
  readonly models: ProviderModel[] = [];

  private dockerService?: OllamaDockerService;
  private apiClient?: OllamaAPIClient;

  protected async getDockerService(): Promise<OllamaDockerService> {
    if (!this.dockerService) {
      this.dockerService = new OllamaDockerService();
    }
    return this.dockerService;
  }

  protected async getAPIClient(): Promise<OllamaAPIClient> {
    if (!this.apiClient) {
      this.apiClient = new OllamaAPIClient();
    }
    return this.apiClient;
  }

  async startService(): Promise<boolean> {
    const svc = await this.getDockerService();
    const started = await svc.startService();
    if (started) {
      return svc.waitForHealthy(30000);
    }
    return false;
  }

  async stopService(): Promise<boolean> {
    const svc = await this.getDockerService();
    return svc.stopService();
  }

  async getServiceStatus(): Promise<{ running: boolean; healthy: boolean; error?: string }> {
    try {
      const status = await (await this.getDockerService()).getServiceStatus();
      return { running: status.running, healthy: status.health === 'healthy' };
    } catch (error) {
      return { running: false, healthy: false, error: (error as Error).message };
    }
  }

  getAvailableModels(): string[] {
    return ['llama2', 'llama3', 'mistral', 'phi'];
  }

  supportsTextToTextModel(modelId: string): boolean {
    return typeof modelId === 'string' && modelId.length > 0;
  }

  getSupportedTextToTextModels(): string[] {
    return this.getAvailableModels();
  }

  async createTextToTextModel(modelId: string): Promise<TextToTextModel> {
    const apiClient = await this.getAPIClient();
    return new OllamaTextToTextModel({ apiClient, modelId });
  }

  async isAvailable(): Promise<boolean> {
    const svc = await this.getDockerService();
    return svc.isHealthy();
  }

  getModelsForCapability(capability: MediaCapability): ProviderModel[] {
    if (capability === MediaCapability.TEXT_TO_TEXT) {
      return this.getAvailableModels().map(id => ({
        id,
        name: `Ollama ${id}`,
        description: `Local Ollama model: ${id}`,
        capabilities: [MediaCapability.TEXT_TO_TEXT],
        parameters: {},
        pricing: { inputCost: 0, outputCost: 0, currency: 'USD' },
      }));
    }
    return [];
  }

  async getModel(modelId: string): Promise<any> {
    return this.createTextToTextModel(modelId);
  }

  async getHealth() {
    const status = await this.getServiceStatus();
    return {
      status: status.healthy ? 'healthy' as const : 'unhealthy' as const,
      uptime: process.uptime(),
      activeJobs: 0,
      queuedJobs: 0,
    };
  }

  async configure(config: ProviderConfig): Promise<void> {
    // No special configuration for now
    if (config.baseUrl) {
      this.apiClient = new OllamaAPIClient({ baseUrl: config.baseUrl });
    }
  }
}

import { ProviderRegistry } from '../../../registry/ProviderRegistry';
ProviderRegistry.getInstance().register('ollama', OllamaDockerProvider);
