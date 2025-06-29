/**
 * ZonosDockerProvider
 * 
 * Provider for Zonos TTS models via Docker containers.
 * Based on ChatterboxDockerProvider and KokoroDockerProvider patterns.
 */

import { MediaProvider, ProviderConfig, ProviderModel, ProviderType } from '../../../types/provider';
import { TextToAudioProvider } from '../../../capabilities/interfaces/TextToAudioProvider';
import { TextToAudioModel } from '../../../models/abstracts/TextToAudioModel';
import { MediaCapability } from '../../../types/provider';
import { DockerComposeService } from '../../../services/DockerComposeService'; // Updated import
import { ZonosTextToAudioModel } from './ZonosTextToAudioModel';
import { ZonosAPIClient } from './ZonosAPIClient';

/**
 * Provider for Zonos TTS models via Docker
 */
export class ZonosDockerProvider implements MediaProvider, TextToAudioProvider {
  readonly id = 'zonos-docker';
  readonly name = 'Zonos TTS (Docker)';
  readonly type = ProviderType.LOCAL;
  readonly capabilities = [MediaCapability.TEXT_TO_AUDIO];
  
  private dockerServiceManager?: DockerComposeService; // Updated property
  private apiClient?: ZonosAPIClient;

  constructor() {
    // Initialize lazily to avoid startup overhead
  }

  /**
   * Get models array for MediaProvider interface
   */
  get models(): ProviderModel[] {
    return this.getModelsForCapability(MediaCapability.TEXT_TO_AUDIO);
  }

  /**
   * Get API client instance (lazy initialization)
   */
  private getAPIClient(): ZonosAPIClient {
    if (!this.apiClient) {
      this.apiClient = new ZonosAPIClient();
    }
    return this.apiClient;
  }

  /**
   * Start the Docker service
   */
  async startService(): Promise<boolean> {
    if (!this.dockerServiceManager) {
      throw new Error('Docker service manager not initialized for ZonosDockerProvider');
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
      throw new Error('Docker service manager not initialized for ZonosDockerProvider');
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
      'zonos-tts',
      'zonos-docker-tts',
      'zonos-styletts2'
    ];
  }

  /**
   * Create a model instance
   */
  async createModel(modelId: string): Promise<TextToAudioModel> {
    return this.createTextToAudioModel(modelId);
  }

  /**
   * Create a text-to-speech model instance (TextToAudioProvider interface)
   */
  async createTextToAudioModel(modelId: string): Promise<TextToAudioModel> {
    if (!this.supportsTextToAudioModel(modelId)) {
      throw new Error(`Model '${modelId}' is not supported by Zonos Docker provider`);
    }

    // Get Docker service and API client
    // Removed direct call to getDockerService()
    const apiClient = this.getAPIClient();

    return new ZonosTextToAudioModel({
      dockerService: this.dockerServiceManager!, // Use the manager directly
      apiClient
    });
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
      description: 'Provides Zonos StyleTTS2 models via Docker containers',
      dockerImage: 'kprinssu/zonos:latest',
      defaultPort: 7860,
      capabilities: [
        'text-to-speech',
        'voice-cloning',
        'emotion-control',
        'style-control',
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
        this.apiClient = new ZonosAPIClient({ baseUrl: `http://localhost:${port}` });
      }
    }
    // Docker providers typically don't need API keys, but may need service URLs
    if (config.baseUrl && !this.apiClient) {
      this.apiClient = new ZonosAPIClient({ baseUrl: config.baseUrl });
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
    if (capability !== MediaCapability.TEXT_TO_AUDIO) {
      return [];
    }

    return this.getAvailableModels().map(modelId => ({
      id: modelId,
      name: this.getModelDisplayName(modelId),
      description: `Zonos StyleTTS2 model: ${modelId}`,
      capabilities: [MediaCapability.TEXT_TO_AUDIO],
      parameters: {
        // Emotion configuration
        happiness: { type: 'number', min: 0.0, max: 1.0, default: 1.0, description: 'Happiness emotion level' },
        sadness: { type: 'number', min: 0.0, max: 1.0, default: 0.05, description: 'Sadness emotion level' },
        neutral: { type: 'number', min: 0.0, max: 1.0, default: 0.2, description: 'Neutral emotion level' },
        
        // Voice conditioning
        speakingRate: { type: 'number', min: 5.0, max: 30.0, default: 15.0, description: 'Speaking rate (words per minute)' },
        pitchStd: { type: 'number', min: 0.0, max: 300.0, default: 45.0, description: 'Pitch variation' },
        vqScore: { type: 'number', min: 0.5, max: 0.8, default: 0.78, description: 'Voice quality score' },
        
        // Generation parameters
        cfgScale: { type: 'number', min: 1.0, max: 5.0, default: 2.0, description: 'Classifier-free guidance scale' },
        seed: { type: 'number', description: 'Random seed for reproducible output' },
        
        // Model selection
        modelChoice: { 
          type: 'string', 
          enum: ['Zyphra/Zonos-v0.1-transformer', 'Zyphra/Zonos-v0.1-hybrid'], 
          default: 'Zyphra/Zonos-v0.1-transformer',
          description: 'Zonos model variant to use'
        },
        
        // Audio input for voice cloning
        speakerAudio: { type: 'string', description: 'Path to speaker audio file for voice cloning' },
        language: { type: 'string', default: 'en-us', description: 'Target language' }
      }
    }));
  }

  /**
   * Get model display name
   */
  private getModelDisplayName(modelId: string): string {
    const displayNames: Record<string, string> = {
      'zonos-tts': 'Zonos TTS',
      'zonos-docker-tts': 'Zonos TTS (Docker)',
      'zonos-styletts2': 'Zonos StyleTTS2'
    };

    return displayNames[modelId] || modelId;
  }

  /**
   * Get provider name
   */
  getName(): string {
    return 'zonos-docker';
  }

  /**
   * Get provider ID
   */
  getId(): string {
    return 'zonos-docker';
  }

  /**
   * Get provider type
   */
  getType(): string {
    return 'docker';
  }

  /**
   * Get provider metadata
   */
  getMetadata(): any {
    return {
      dockerImage: 'kprinssu/zonos:latest',
      port: 7860,
      healthCheckEndpoint: '/',
      supportsVoiceCloning: true,
      supportsEmotionControl: true,
      supportedLanguages: ['en-us', 'en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh'],
      outputFormats: ['wav', 'mp3']
    };
  }

  /**
   * Get provider version
   */
  getVersion(): string {
    return '1.0.0';
  }

  /**
   * Get supported capabilities
   */
  getCapabilities(): MediaCapability[] {
    return [MediaCapability.TEXT_TO_AUDIO];
  }

  /**
   * Get all supported models
   */
  getSupportedModels(): string[] {
    return this.getAvailableModels();
  }

  /**
   * Get model by ID
   */
  async getModel(modelId: string): Promise<TextToAudioModel> {
    return this.createTextToAudioModel(modelId);
  }

  /**
   * Get provider description
   */
  getDescription(): string {
    return 'Zonos StyleTTS2 text-to-speech provider with Docker containerization';
  }

  /**
   * Get pricing information (if any)
   */
  getPricing(): any {
    return {
      type: 'free',
      description: 'Local Docker-based inference, no API costs'
    };
  }

  /**
   * Get rate limits (if any)
   */
  getRateLimits(): any {
    return {
      type: 'hardware-limited',
      description: 'Limited by local hardware resources'
    };
  }

  /**
   * Get health status
   */
  async getHealth(): Promise<any> {
    const status = await this.getServiceStatus();
    return {
      status: status.healthy ? 'healthy' : 'unhealthy',
      running: status.running,
      error: status.error
    };
  }

  /**
   * Test provider connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const apiClient = this.getAPIClient();
      return await apiClient.isAvailable();
    } catch {
      return false;
    }
  }

}

// Self-register with the provider registry
import { ProviderRegistry } from '../../../registry/ProviderRegistry';
ProviderRegistry.getInstance().register('zonos-docker', ZonosDockerProvider);