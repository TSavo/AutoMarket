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

  private dockerService?: KokoroDockerService;
  private apiClient?: KokoroAPIClient;

  /**
   * Get the Docker service instance
   */
  protected async getDockerService(): Promise<KokoroDockerService> {
    if (!this.dockerService) {
      this.dockerService = new KokoroDockerService();
    }
    return this.dockerService;
  }

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
    try {
      const dockerService: KokoroDockerService = await this.getDockerService();
      const started: boolean = await dockerService.startService();

      if (started) {
        // Wait for service to be healthy
        const healthy: boolean = await dockerService.waitForHealthy(30000);
        return healthy;
      }

      return false;
    } catch (error) {
      console.error('Failed to start Kokoro Docker service:', error);
      return false;
    }
  }

  /**
   * Stop the Docker service
   */
  async stopService(): Promise<boolean> {
    try {
      const dockerService: KokoroDockerService = await this.getDockerService();
      return await dockerService.stopService();
    } catch (error) {
      console.error('Failed to stop Kokoro Docker service:', error);
      return false;
    }
  }

  /**
   * Get service status
   */
  async getServiceStatus(): Promise<{
    running: boolean;
    healthy: boolean;
    error?: string;
  }> {
    try {
      const dockerService: KokoroDockerService = await this.getDockerService();
      const status = await dockerService.getServiceStatus();

      return {
        running: status.running || false,
        healthy: status.health === 'healthy'
      };
    } catch (error) {
      return {
        running: false,
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
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
    // Docker providers typically don't need API keys, but may need service URLs
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

  /**
   * Initialize the provider (start services if needed)
   */
  async initialize(): Promise<void> {
    console.log('🚀 Initializing Kokoro Docker Provider...');

    const started: boolean = await this.startService();
    if (!started) {
      throw new Error('Failed to start Kokoro Docker service');
    }

    console.log('✅ Kokoro Docker Provider initialized successfully');
  }

  /**
   * Cleanup the provider (stop services)
   */
  async cleanup(): Promise<void> {
    console.log('🛑 Cleaning up Kokoro Docker Provider...');
    
    await this.stopService();
    
    console.log('✅ Kokoro Docker Provider cleaned up');
  }
}

/**
 * Default instance for easy importing
 */
export const kokoroDockerProvider: KokoroDockerProvider = new KokoroDockerProvider();

// Self-register with the provider registry
import { ProviderRegistry } from '../../../registry/ProviderRegistry';
ProviderRegistry.getInstance().register('kokoro-docker', KokoroDockerProvider);
