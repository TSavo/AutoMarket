/**
 * KokoroDockerProvider
 * 
 * Provider implementation for Kokoro TTS models running in Docker containers.
 * Follows the same pattern as ChatterboxDockerProvider.
 */

import { 
  MediaProvider,
  ProviderType,
  MediaCapability,
  ProviderModel,
  ProviderConfig
} from '../../../types/provider';
import { KokoroDockerService } from '../../../services/KokoroDockerService';
import { KokoroAPIClient } from './KokoroAPIClient';
import { KokoroDockerModel } from './KokoroDockerModel';
import { TextToAudioModel } from '../../../models/abstracts/TextToAudioModel';
import { TextToAudioProvider } from '../../../capabilities';

/**
 * Provider for Kokoro TTS models via Docker
 */
export class KokoroDockerProvider implements MediaProvider, TextToAudioProvider {
  readonly id = 'kokoro-docker';
  readonly name = 'Kokoro Docker Provider';
  readonly type = ProviderType.LOCAL;
  readonly capabilities = [MediaCapability.TEXT_TO_AUDIO];
  readonly models: ProviderModel[] = [];

  private dockerServiceManager?: DockerComposeService;
  private apiClient?: KokoroAPIClient;

  

  /**
   * Get the API client instance
   */
  protected async getAPIClient(): Promise<KokoroAPIClient> {
    if (!this.apiClient) {
      this.apiClient = new KokoroAPIClient();
    }
    return this.apiClient;
  }

  /**
   * Start the Docker service
   */
  async startService(): Promise<boolean> {
    if (!this.dockerServiceManager) {
      throw new Error('Docker service manager not initialized for KokoroDockerProvider');
    }
    const started: boolean = await this.dockerServiceManager.startService();

    if (started) {
      // Wait for service to be healthy
      const healthy: boolean = await this.dockerServiceManager.waitForHealthy(30000);
      return healthy;
    }

    return false;
  }

  /**
   * Stop the Docker service
   */
  async stopService(): Promise<boolean> {
    if (!this.dockerServiceManager) {
      throw new Error('Docker service manager not initialized for KokoroDockerProvider');
    }
    return await this.dockerServiceManager.stopService();
  }

  /**
   * Get service status
   */
  async getServiceStatus(): Promise<{
    running: boolean;
    healthy: boolean;
    error?: string;
  }> {
    if (!this.dockerServiceManager) {
      return {
        running: false,
        healthy: false,
        error: 'Docker service manager not initialized'
      };
    }
    const status = await this.dockerServiceManager.getServiceStatus();

    return {
      running: status.running || false,
      healthy: status.health === 'healthy',
      error: status.state === 'error' ? status.state : undefined
    };
  }

  /**
   * Get available models from this provider
   */
  getAvailableModels(): string[] {
    return [
      'kokoro-tts',
      'kokoro-82m',
      'kokoro-styletts2'
    ];
  }

  /**
   * Create a model instance
   */
  async createModel(modelId: string): Promise<TextToAudioModel> {
    if (!this.supportsModel(modelId)) {
      throw new Error(`Model '${modelId}' not supported by KokoroDockerProvider`);
    }

    const dockerService: KokoroDockerService = await this.getDockerService();
    const apiClient: KokoroAPIClient = await this.getAPIClient();

    // Create Docker-specific model with injected dependencies
    const model: KokoroDockerModel = new KokoroDockerModel({
      dockerService,
      apiClient
    });

    return model;
  }

  /**
   * Create a text-to-speech model instance (TextToAudioProvider interface)
   */
  async createTextToAudioModel(modelId: string): Promise<TextToAudioModel> {
    return this.createModel(modelId);
  }

  /**
   * Get supported text-to-audio models (TextToAudioProvider interface)
   */
  getSupportedTextToAudioModels(): string[] {
    return this.getAvailableModels();
  }

  /**
   * Check if provider supports a specific TTS model (TextToAudioProvider interface)
   */
  supportsTextToAudioModel(modelId: string): boolean {
    return this.supportsModel(modelId);
  }

  /**
   * Check if provider supports a specific model
   */
  supportsModel(modelId: string): boolean {
    return this.getAvailableModels().includes(modelId);
  }

  /**
   * Get provider information
   */
  getInfo() {
    return {
      description: 'Provides Kokoro StyleTTS2 models via Docker containers',
      dockerImage: 'kprinssu/kokoro-fastapi:latest',
      defaultPort: 8005,
      capabilities: [
        'text-to-speech',
        'style-control',
        'voice-selection',
        'fast-generation'
      ]
    };
  }

  /**
   * Configure the provider
   */
  async configure(config: ProviderConfig): Promise<void> {
    this.config = config;
    if (config.serviceUrl) {
      const { ServiceRegistry } = await import('../../../registry/ServiceRegistry');
      const serviceRegistry = ServiceRegistry.getInstance();
      this.dockerServiceManager = await serviceRegistry.getService(config.serviceUrl, config.serviceConfig) as DockerComposeService;
      const serviceInfo = this.dockerServiceManager.getServiceInfo();
      if (serviceInfo.ports && serviceInfo.ports.length > 0) {
        const port = serviceInfo.ports[0];
        this.apiClient = new KokoroAPIClient({ baseUrl: `http://localhost:${port}` });
      }
    }
    // Docker providers typically don't need API keys, but may need service URLs
    if (config.baseUrl && !this.apiClient) {
      this.apiClient = new KokoroAPIClient({ baseUrl: config.baseUrl });
    }
  }

  /**
   * Check if provider is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const status = await this.getServiceStatus();
      return status.running && status.healthy;
    } catch {
      return false;
    }
  }

  /**
   * Get models for specific capability
   */
  getModelsForCapability(capability: MediaCapability): ProviderModel[] {
    if (capability === MediaCapability.TEXT_TO_AUDIO) {
      return this.models;
    }
    return [];
  }

  /**
   * Get model by ID
   */
  async getModel(modelId: string): Promise<any> {
    // Return a Kokoro model instance
    const apiClient = await this.getAPIClient();
    return new KokoroDockerModel();
  }

  /**
   * Get provider health status
   */
  async getHealth(): Promise<any> {
    const status = await this.getServiceStatus();
    return {
      status: status.healthy ? 'healthy' : 'unhealthy',
      details: status
    };
  }

  
}



// Self-register with the provider registry
import { ProviderRegistry } from '../../../registry/ProviderRegistry';
ProviderRegistry.getInstance().register('kokoro-docker', KokoroDockerProvider);
