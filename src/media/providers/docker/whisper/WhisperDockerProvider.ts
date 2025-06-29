/**
 * WhisperDockerProvider
 * 
 * Provider implementation for Whisper STT models running in Docker containers.
 * Manages the Docker service lifecycle and provides model implementations.
 */

import { 
  MediaProvider,
  ProviderType,
  MediaCapability,
  ProviderModel,
  ProviderConfig
} from '../../../types/provider';
import { WhisperDockerService } from '../../../services/WhisperDockerService';
import { WhisperAPIClient } from './WhisperAPIClient';
import { WhisperDockerModel } from './WhisperDockerModel';
import { AudioToTextProvider } from '../../../capabilities';
import { AudioToTextModel } from '../../../models/abstracts/AudioToTextModel';

/**
 * Provider for Whisper STT models via Docker
 */
export class WhisperDockerProvider implements MediaProvider, AudioToTextProvider {
  readonly id = 'whisper-docker';
  readonly name = 'Whisper Docker Provider';
  readonly type = ProviderType.LOCAL;
  readonly capabilities = [MediaCapability.AUDIO_TO_TEXT];
  readonly models: ProviderModel[] = [];

  private dockerServiceManager?: DockerComposeService;
  private apiClient?: WhisperAPIClient;

  

  /**
   * Get the API client instance
   */
  protected async getAPIClient(): Promise<WhisperAPIClient> {
    if (!this.apiClient) {
      this.apiClient = new WhisperAPIClient();
    }
    return this.apiClient;
  }

  /**
   * Start the Docker service
   */
  async startService(): Promise<boolean> {
    if (!this.dockerServiceManager) {
      throw new Error('Docker service manager not initialized for WhisperDockerProvider');
    }
    const started = await this.dockerServiceManager.startService();
    
    if (started) {
      // Wait for service to be healthy
      const healthy = await this.dockerServiceManager.waitForHealthy(30000);
      return healthy;
    }
    
    return false;
  }

  /**
   * Stop the Docker service
   */
  async stopService(): Promise<boolean> {
    if (!this.dockerServiceManager) {
      throw new Error('Docker service manager not initialized for WhisperDockerProvider');
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
      'whisper-stt',
      'whisper-base',
      'whisper-small',
      'whisper-medium',
      'whisper-large'
    ];
  }

  /**
   * Create a model instance
   */
  async createModel(modelId: string): Promise<AudioToTextModel> {
    if (!this.supportsModel(modelId)) {
      throw new Error(`Model '${modelId}' not supported by WhisperDockerProvider`);
    }

    const dockerService = await this.getDockerService();
    const apiClient = await this.getAPIClient();

    // Create Docker-specific model with injected dependencies
    const model = new WhisperDockerModel({
      dockerService,
      apiClient
    });

    return model;
  }

  /**
   * Create an audio-to-text model instance (AudioToTextProvider interface)
   */
  async createAudioToTextModel(modelId: string): Promise<AudioToTextModel> {
    return this.createModel(modelId);
  }

  /**
   * Get supported audio-to-text models (AudioToTextProvider interface)
   */
  getSupportedAudioToTextModels(): string[] {
    return this.getAvailableModels();
  }

  /**
   * Check if provider supports a specific audio-to-text model (AudioToTextProvider interface)
   */
  supportsAudioToTextModel(modelId: string): boolean {
    return this.supportsModel(modelId);
  }

  /**
   * Create a speech-to-text model instance (SpeechToTextProvider interface - alias)
   */
  async createSpeechToTextModel(modelId: string): Promise<AudioToTextModel> {
    return this.createAudioToTextModel(modelId);
  }

  /**
   * Get supported speech-to-text models (SpeechToTextProvider interface - alias)
   */
  getSupportedSpeechToTextModels(): string[] {
    return this.getSupportedAudioToTextModels();
  }

  /**
   * Check if provider supports a specific STT model (SpeechToTextProvider interface - alias)
   */
  supportsSpeechToTextModel(modelId: string): boolean {
    return this.supportsAudioToTextModel(modelId);
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
      description: 'Provides Whisper STT models via Docker containers',
      dockerImage: 'onerahmet/openai-whisper-asr-webservice:latest',
      defaultPort: 9000,
      capabilities: [
        'speech-to-text',
        'transcription',
        'translation',
        'multiple-languages'
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
        this.apiClient = new WhisperAPIClient({ baseUrl: `http://localhost:${port}` });
      }
    }
    // Docker providers typically don't need API keys, but may need service URLs
    if (config.baseUrl && !this.apiClient) {
      this.apiClient = new WhisperAPIClient({ baseUrl: config.baseUrl });
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
    if (capability === MediaCapability.AUDIO_TO_TEXT) {
      return this.models;
    }
    return [];
  }

  /**
   * Get model by ID
   */
  async getModel(modelId: string): Promise<any> {
    // Return a Whisper model instance
    return new WhisperDockerModel();
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
ProviderRegistry.getInstance().register('whisper', WhisperDockerProvider);
