/**
 * WhisperDockerProvider
 * 
 * Provider implementation for Whisper STT models running in Docker containers.
 * Manages the Docker service lifecycle and provides model implementations.
 */

import { WhisperDockerService } from '../services/WhisperDockerService';
import { WhisperAPIClient } from '../clients/WhisperAPIClient';
import { WhisperDockerModel } from '../models/WhisperDockerModel';
import { AudioToTextProvider } from './roles';
import { AudioToTextModel } from '../models/AudioToTextModel';

/**
 * Provider for Whisper STT models via Docker
 */
export class WhisperDockerProvider implements AudioToTextProvider {
  readonly id = 'whisper-docker';
  readonly name = 'Whisper Docker Provider';

  private dockerService?: WhisperDockerService;
  private apiClient?: WhisperAPIClient;

  /**
   * Get the Docker service instance
   */
  protected async getDockerService(): Promise<WhisperDockerService> {
    if (!this.dockerService) {
      this.dockerService = new WhisperDockerService();
    }
    return this.dockerService;
  }

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
    try {
      const dockerService = await this.getDockerService();
      const started = await dockerService.startService();
      
      if (started) {
        // Wait for service to be healthy
        const healthy = await dockerService.waitForHealthy(30000);
        return healthy;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to start Whisper Docker service:', error);
      return false;
    }
  }

  /**
   * Stop the Docker service
   */
  async stopService(): Promise<boolean> {
    try {
      const dockerService = await this.getDockerService();
      return await dockerService.stopService();
    } catch (error) {
      console.error('Failed to stop Whisper Docker service:', error);
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
      const dockerService = await this.getDockerService();
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
   * Check if provider is available and healthy
   */
  async isAvailable(): Promise<boolean> {
    try {
      const dockerService = await this.getDockerService();
      const isHealthy = await dockerService.isServiceHealthy();
      
      if (isHealthy) {
        // Also check API client connectivity
        const apiClient = await this.getAPIClient();
        return await apiClient.checkHealth();
      }
      
      return false;
    } catch (error) {
      console.warn('WhisperDockerProvider availability check failed:', error);
      return false;
    }
  }

  /**
   * Initialize the provider (start services if needed)
   */
  async initialize(): Promise<void> {
    console.log('🚀 Initializing Whisper Docker Provider...');
    
    const started = await this.startService();
    if (!started) {
      throw new Error('Failed to start Whisper Docker service');
    }
    
    console.log('✅ Whisper Docker Provider initialized successfully');
  }

  /**
   * Cleanup the provider (stop services)
   */
  async cleanup(): Promise<void> {
    console.log('🛑 Cleaning up Whisper Docker Provider...');
    
    await this.stopService();
    
    console.log('✅ Whisper Docker Provider cleaned up');
  }
}

/**
 * Default instance for easy importing
 */
export const whisperDockerProvider = new WhisperDockerProvider();
