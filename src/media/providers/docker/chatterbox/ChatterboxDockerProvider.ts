/**
 * ChatterboxDockerProvider
 * 
 * Provider implementation for Chatterbox TTS models running in Docker containers.
 * Manages the Docker service lifecycle and provides model implementations.
 */

import { ChatterboxDockerService } from '../../../services/ChatterboxDockerService';
import { ChatterboxAPIClient } from './ChatterboxAPIClient';
import { ChatterboxDockerModel } from './ChatterboxDockerModel';
import { TextToAudioModel } from '../../../models/abstracts/TextToAudioModel';
import { TextToAudioProvider } from '../../../capabilities';

/**
 * Provider for Chatterbox TTS models via Docker
 */
export class ChatterboxDockerProvider implements TextToAudioProvider {
  readonly id = 'chatterbox-docker';
  readonly name = 'Chatterbox Docker Provider';

  private dockerService?: ChatterboxDockerService;
  private apiClient?: ChatterboxAPIClient;

  /**
   * Get the Docker service instance
   */
  protected async getDockerService(): Promise<ChatterboxDockerService> {
    if (!this.dockerService) {
      this.dockerService = new ChatterboxDockerService();
    }
    return this.dockerService;
  }

  /**
   * Get the API client instance
   */
  protected async getAPIClient(): Promise<ChatterboxAPIClient> {
    if (!this.apiClient) {
      this.apiClient = new ChatterboxAPIClient();
    }
    return this.apiClient;
  }

  /**
   * Start the Docker service
   */
  async startService(): Promise<boolean> {
    try {
      const dockerService: ChatterboxDockerService = await this.getDockerService();
      const started: boolean = await dockerService.startService();

      if (started) {
        // Wait for service to be healthy
        const healthy: boolean = await dockerService.waitForHealthy(30000);
        return healthy;
      }

      return false;
    } catch (error) {
      console.error('Failed to start Chatterbox Docker service:', error);
      return false;
    }
  }

  /**
   * Stop the Docker service
   */
  async stopService(): Promise<boolean> {
    try {
      const dockerService: ChatterboxDockerService = await this.getDockerService();
      return await dockerService.stopService();
    } catch (error) {
      console.error('Failed to stop Chatterbox Docker service:', error);
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
      const dockerService: ChatterboxDockerService = await this.getDockerService();
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
      'chatterbox-tts',
      'chatterbox-base',
      'chatterbox-voice-clone'
    ];
  }

  /**
   * Create a model instance
   */
  async createModel(modelId: string): Promise<TextToAudioModel> {
    if (!this.supportsModel(modelId)) {
      throw new Error(`Model '${modelId}' not supported by ChatterboxDockerProvider`);
    }

    const dockerService: ChatterboxDockerService = await this.getDockerService();
    const apiClient: ChatterboxAPIClient = await this.getAPIClient();

    // Create Docker-specific model with injected dependencies
    const model: ChatterboxDockerModel = new ChatterboxDockerModel({
      dockerService,
      apiClient
    });

    return model;
  }

  /**
   * Create a text-to-speech model instance (TextToSpeechProvider interface)
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
      description: 'Provides Chatterbox TTS models via Docker containers',
      dockerImage: 'chatterbox-tts:latest',
      defaultPort: 8000,
      capabilities: [
        'text-to-speech',
        'voice-cloning',
        'emotion-control',
        'style-control'
      ]
    };
  }

  /**
   * Check if provider is available and healthy
   */
  async isAvailable(): Promise<boolean> {
    try {
      const dockerService: ChatterboxDockerService = await this.getDockerService();
      const isHealthy: boolean = await dockerService.isServiceHealthy();

      if (isHealthy) {
        // Also check API client connectivity
        const apiClient: ChatterboxAPIClient = await this.getAPIClient();
        return await apiClient.checkHealth();
      }

      return false;
    } catch (error) {
      console.warn('ChatterboxDockerProvider availability check failed:', error);
      return false;
    }
  }

  /**
   * Initialize the provider (start services if needed)
   */
  async initialize(): Promise<void> {
    console.log('🚀 Initializing Chatterbox Docker Provider...');

    const started: boolean = await this.startService();
    if (!started) {
      throw new Error('Failed to start Chatterbox Docker service');
    }

    console.log('✅ Chatterbox Docker Provider initialized successfully');
  }

  /**
   * Cleanup the provider (stop services)
   */
  async cleanup(): Promise<void> {
    console.log('🛑 Cleaning up Chatterbox Docker Provider...');
    
    await this.stopService();
    
    console.log('✅ Chatterbox Docker Provider cleaned up');
  }
}

/**
 * Default instance for easy importing
 */
export const chatterboxDockerProvider: ChatterboxDockerProvider = new ChatterboxDockerProvider();
