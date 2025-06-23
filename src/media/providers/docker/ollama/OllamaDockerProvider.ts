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

  private discoveredModels: string[] = [];
  private discoveryPromise: Promise<void> | null = null;

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

  private async ensureModelsDiscovered(): Promise<void> {
    if (this.discoveredModels.length === 0) {
      await this.discoverModels();
    }
  }

  private async discoverModels(): Promise<void> {
    if (this.discoveryPromise) {
      return this.discoveryPromise;
    }

    this.discoveryPromise = (async () => {
      try {
        const client = await this.getAPIClient();
        const models = await client.listModels();
        if (models && models.length > 0) {
          this.discoveredModels = models;
        }
      } catch (error) {
        console.warn('[OllamaDockerProvider] Failed to discover models:', error);
      }
    })();

    await this.discoveryPromise;
    this.discoveryPromise = null;
  }

  async startService(): Promise<boolean> {
    const svc = await this.getDockerService();
    const started = await svc.startService();
    if (started) {
      const healthy = await svc.waitForHealthy(30000);
      if (healthy) {
        await this.discoverModels();
      }
      return healthy;
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
    return this.discoveredModels.length > 0
      ? this.discoveredModels
      : ['llama2', 'llama3', 'mistral', 'phi'];
  }

  supportsTextToTextModel(modelId: string): boolean {
    if (this.discoveredModels.length === 0) {
      return typeof modelId === 'string' && modelId.length > 0;
    }
    return this.discoveredModels.includes(modelId);
  }

  getSupportedTextToTextModels(): string[] {
    return this.getAvailableModels();
  }

  async createTextToTextModel(modelId: string): Promise<TextToTextModel> {
    await this.ensureModelsDiscovered();
    const apiClient = await this.getAPIClient();
    await apiClient.pullModel(modelId);
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
    await this.ensureModelsDiscovered();
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
    await this.discoverModels();
  }
}

import { ProviderRegistry } from '../../../registry/ProviderRegistry';
ProviderRegistry.getInstance().register('ollama', OllamaDockerProvider);
