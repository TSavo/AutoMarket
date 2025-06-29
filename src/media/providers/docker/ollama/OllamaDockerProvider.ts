import {
  MediaProvider,
  ProviderType,
  MediaCapability,
  ProviderModel,
  ProviderConfig,
} from '../../../types/provider';
import { OllamaAPIClient } from './OllamaAPIClient';
import { TextToTextProvider } from '../../../capabilities';
import { TextToTextModel } from '../../../models/abstracts/TextToTextModel';
import { OllamaTextToTextModel } from './OllamaTextToTextModel';
import { DockerComposeService } from '../../../services/DockerComposeService';

export class OllamaDockerProvider implements MediaProvider, TextToTextProvider {
  readonly id = 'ollama-docker';
  readonly name = 'Ollama Docker Provider';
  readonly type = ProviderType.LOCAL;
  readonly capabilities = [MediaCapability.TEXT_TO_TEXT];
  readonly models: ProviderModel[] = [];

  private dockerServiceManager?: DockerComposeService;
  private apiClient?: OllamaAPIClient;

  protected async getAPIClient(): Promise<OllamaAPIClient> {
    if (!this.apiClient) {
      this.apiClient = new OllamaAPIClient();
    }
    return this.apiClient;
  }

  async startService(): Promise<boolean> {
    if (!this.dockerServiceManager) {
      throw new Error('Docker service manager not initialized for OllamaDockerProvider');
    }
    const started = await this.dockerServiceManager.startService();
    if (started) {
      return this.dockerServiceManager.waitForHealthy(30000);
    }
    return false;
  }

  async stopService(): Promise<boolean> {
    if (!this.dockerServiceManager) {
      throw new Error('Docker service manager not initialized for OllamaDockerProvider');
    }
    return this.dockerServiceManager.stopService();
  }

  async getServiceStatus(): Promise<{ running: boolean; healthy: boolean; error?: string }> {
    if (!this.dockerServiceManager) {
      return {
        running: false,
        healthy: false,
        error: 'Docker service manager not initialized'
      };
    }
    const status = await this.dockerServiceManager.getServiceStatus();
    return { running: status.running, healthy: status.health === 'healthy', error: status.state === 'error' ? status.state : undefined };
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
    if (!this.dockerServiceManager) {
      return false;
    }
    return this.dockerServiceManager.isServiceHealthy();
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
    this.config = config;
    if (config.serviceUrl) {
      const { ServiceRegistry } = await import('../../../registry/ServiceRegistry');
      const serviceRegistry = ServiceRegistry.getInstance();
      this.dockerServiceManager = await serviceRegistry.getService(config.serviceUrl, config.serviceConfig) as DockerComposeService;
      const serviceInfo = this.dockerServiceManager.getServiceInfo();
      if (serviceInfo.ports && serviceInfo.ports.length > 0) {
        const port = serviceInfo.ports[0];
        this.apiClient = new OllamaAPIClient({ baseUrl: `http://localhost:${port}` });
      }
    }
    // No special configuration for now
    if (config.baseUrl && !this.apiClient) {
      this.apiClient = new OllamaAPIClient({ baseUrl: config.baseUrl });
    }
  }
}

import { ProviderRegistry } from '../../../registry/ProviderRegistry';
ProviderRegistry.getInstance().register('ollama', OllamaDockerProvider);