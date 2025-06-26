/**
 * FFMPEGProvider
 * 
 * Generic provider for FFMPEG video/audio processing.
 * Can work with either Docker-based or local FFMPEG clients.
 */

import { 
  MediaProvider,
  MediaCapability, 
  ProviderType, 
  ProviderModel, 
  ProviderConfig 
} from '../../types/provider';
import { AudioToAudioProvider } from '../../capabilities/interfaces/AudioToAudioProvider';
import { VideoToAudioProvider } from '../../capabilities/interfaces/VideoToAudioProvider';
import { VideoToVideoProvider } from '../../capabilities/interfaces/VideoToVideoProvider';
import { IFFMPEGClient } from './IFFMPEGClient';

export interface FFMPEGProviderConfig extends ProviderConfig {
  client?: IFFMPEGClient;
  baseUrl?: string;
  timeout?: number;
  // Docker-specific options (when using Docker client)
  dockerImage?: string;
  containerName?: string;
  enableGPU?: boolean;
  maxConcurrent?: number;
}

/**
 * Provider for FFMPEG-based media processing
 * Works with any FFMPEG client implementation (Docker or local)
 */
export class FFMPEGProvider implements MediaProvider, AudioToAudioProvider, VideoToAudioProvider, VideoToVideoProvider {
  readonly id = 'ffmpeg';
  readonly name = 'FFMPEG Provider';
  readonly type = ProviderType.LOCAL;
  readonly capabilities = [
    MediaCapability.TEXT_TO_VIDEO,
    MediaCapability.IMAGE_TO_VIDEO,
    MediaCapability.VIDEO_TO_VIDEO,
    MediaCapability.VIDEO_TO_IMAGE,
    MediaCapability.VIDEO_TO_AUDIO,
    MediaCapability.AUDIO_TO_AUDIO,
    MediaCapability.AUDIO_TO_TEXT
  ];

  private config: FFMPEGProviderConfig = {};
  private client?: IFFMPEGClient;

  /**
   * Constructor can take a pre-configured FFMPEG client
   */
  constructor(client?: IFFMPEGClient) {
    this.client = client;
    
    // Auto-configure from environment variables (async but non-blocking)
    this.autoConfigureFromEnv().catch(error => {
      console.warn('Failed to auto-configure FFMPEG provider from environment:', error.message);
    });
  }

  private async autoConfigureFromEnv(): Promise<void> {
    const envConfig: FFMPEGProviderConfig = {};

    // Check for base URL configuration
    if (process.env.FFMPEG_SERVICE_URL) {
      envConfig.baseUrl = process.env.FFMPEG_SERVICE_URL;
    }

    // Check for timeout configuration
    if (process.env.FFMPEG_TIMEOUT) {
      const timeout = parseInt(process.env.FFMPEG_TIMEOUT);
      if (!isNaN(timeout)) {
        envConfig.timeout = timeout;
      }
    }

    // Docker-specific configuration
    if (process.env.FFMPEG_DOCKER_IMAGE) {
      envConfig.dockerImage = process.env.FFMPEG_DOCKER_IMAGE;
    }

    if (process.env.FFMPEG_CONTAINER_NAME) {
      envConfig.containerName = process.env.FFMPEG_CONTAINER_NAME;
    }

    if (process.env.FFMPEG_ENABLE_GPU) {
      envConfig.enableGPU = process.env.FFMPEG_ENABLE_GPU.toLowerCase() === 'true';
    }

    // Apply configuration if any environment variables were found
    if (Object.keys(envConfig).length > 0) {
      await this.configure(envConfig);
    }
  }

  async configure(config: FFMPEGProviderConfig): Promise<void> {
    this.config = { ...this.config, ...config };
    
    // If a client was provided in config, use it
    if (config.client) {
      this.client = config.client;
    }

    // If no client is set, create a default Docker client
    if (!this.client) {
      await this.initializeDefaultClient();
    }
  }
  private async initializeDefaultClient(): Promise<void> {
    try {
      // Try to create Docker client first (existing behavior)
      const { FFMPEGAPIClient } = await import('../docker/ffmpeg/FFMPEGAPIClient');
      
      this.client = new FFMPEGAPIClient({
        baseUrl: this.config.baseUrl || 'http://localhost:8006',
        timeout: this.config.timeout || 300000
      });

      console.log('✅ FFMPEG Provider initialized with Docker client');
    } catch (error) {
      console.warn('⚠️ Failed to initialize Docker client, FFMPEG provider will be unavailable:', error.message);
    }
  }

  async isAvailable(): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    try {
      return await this.client.testConnection();
    } catch (error) {
      return false;
    }
  }

  async start(): Promise<void> {
    if (!this.client) {
      await this.initializeDefaultClient();
    }

    // If using Docker client, start the service
    if (this.client && 'dockerService' in this.client) {
      const dockerService = (this.client as any).dockerService;
      if (dockerService && typeof dockerService.startService === 'function') {
        await dockerService.startService();
      }
    }
  }

  async stop(): Promise<void> {
    // If using Docker client, stop the service
    if (this.client && 'dockerService' in this.client) {
      const dockerService = (this.client as any).dockerService;
      if (dockerService && typeof dockerService.stopService === 'function') {
        await dockerService.stopService();
      }
    }
  }
  get models(): ProviderModel[] {
    return [
      {
        id: 'ffmpeg-video-filter',
        name: 'FFMPEG Video Filter',
        description: 'Video filtering and effects using FFMPEG',
        capabilities: [MediaCapability.VIDEO_TO_VIDEO],
        pricing: { inputCost: 0, outputCost: 0, currency: 'USD' },
        limits: { maxInputSize: 1000000000, maxOutputSize: 1000000000, rateLimit: 10 },
        parameters: {}
      },
      {
        id: 'ffmpeg-video-to-audio',
        name: 'FFMPEG Video to Audio',
        description: 'Extract audio from video using FFMPEG',
        capabilities: [MediaCapability.VIDEO_TO_AUDIO],
        pricing: { inputCost: 0, outputCost: 0, currency: 'USD' },
        limits: { maxInputSize: 1000000000, maxOutputSize: 1000000000, rateLimit: 10 },
        parameters: {}
      },
      {
        id: 'ffmpeg-audio-to-audio',
        name: 'FFMPEG Audio Converter',
        description: 'Convert audio formats and apply audio processing using FFMPEG',
        capabilities: [MediaCapability.AUDIO_TO_AUDIO],
        pricing: { inputCost: 0, outputCost: 0, currency: 'USD' },
        limits: { maxInputSize: 1000000000, maxOutputSize: 1000000000, rateLimit: 10 },
        parameters: {}
      }
    ];
  }

  getModelsForCapability(capability: MediaCapability): ProviderModel[] {
    return this.models.filter(model => model.capabilities.includes(capability));
  }

  getSupportedModels(): string[] {
    return this.models.map(model => model.id);
  }

  supportsModel(modelId: string): boolean {
    return this.getSupportedModels().includes(modelId);
  }

  async getHealth(): Promise<any> {
    try {
      if (!this.client) {
        return {
          status: 'unhealthy',
          details: { error: 'No FFMPEG client configured' }
        };
      }

      const healthResult = await this.client.checkHealth();
      return {
        status: healthResult.status,
        details: {
          clientType: this.getClientType(),
          version: healthResult.version,
          uptime: healthResult.uptime,
          config: this.config
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error.message,
          config: this.config
        }
      };
    }
  }

  private getClientType(): string {
    if (!this.client) return 'none';
    
    // Try to detect client type based on constructor name or properties
    const clientName = this.client.constructor.name;
    if (clientName.includes('Docker')) return 'docker';
    if (clientName.includes('Local')) return 'local';
    return 'unknown';
  }

  /**
   * Get a model instance by ID with automatic type detection
   */
  async getModel(modelId: string): Promise<any> {
    if (!await this.isAvailable()) {
      throw new Error('FFMPEG provider is not available');
    }

    // Check if the model exists
    const model = this.models.find(m => m.id === modelId);
    if (!model) {
      throw new Error(`Model '${modelId}' not found in FFMPEG provider`);
    }    // Create the appropriate model based on capabilities
    if (model.capabilities.includes(MediaCapability.VIDEO_TO_VIDEO)) {
      const { FFMPEGVideoToVideoModel } = await import('./FFMPEGVideoToVideoModel');
      
      return new FFMPEGVideoToVideoModel(
        (this.client as any)?.dockerService,
        this.client as any // Cast to any since it implements IFFMPEGClient
      );
    }

    if (model.capabilities.includes(MediaCapability.AUDIO_TO_AUDIO)) {
      const { FFMPEGAudioToAudioModel } = await import('../docker/ffmpeg/FFMPEGAudioToAudioModel');
      
      return new FFMPEGAudioToAudioModel({
        apiClient: this.client as any, // Cast to any since it implements IFFMPEGClient
        baseUrl: this.config?.baseUrl || 'http://localhost:8006',
        timeout: this.config?.timeout || 300000
      });
    }

    if (model.capabilities.includes(MediaCapability.VIDEO_TO_AUDIO)) {
      const { FFMPEGDockerModel } = await import('../docker/ffmpeg/FFMPEGDockerModel');
      
      return new FFMPEGDockerModel({
        dockerService: (this.client as any)?.dockerService,
        apiClient: this.client as any // Cast to any since it implements IFFMPEGClient
      });
    }

    throw new Error(`Model type not implemented for '${modelId}' in FFMPEG provider`);
  }

  // AudioToAudioProvider interface implementation
  async createAudioToAudioModel(modelId: string) {
    return this.getModel(modelId);
  }

  getSupportedAudioToAudioModels(): string[] {
    return this.getModelsForCapability(MediaCapability.AUDIO_TO_AUDIO).map(m => m.id);
  }

  supportsAudioToAudioModel(modelId: string): boolean {
    const model = this.models.find(m => m.id === modelId);
    return model ? model.capabilities.includes(MediaCapability.AUDIO_TO_AUDIO) : false;
  }

  // VideoToVideoProvider interface implementation
  async createVideoToVideoModel(modelId: string) {
    return this.getModel(modelId);
  }

  getSupportedVideoToVideoModels(): string[] {
    return this.getModelsForCapability(MediaCapability.VIDEO_TO_VIDEO).map(m => m.id);
  }

  supportsVideoToVideoModel(modelId: string): boolean {
    const model = this.models.find(m => m.id === modelId);
    return model ? model.capabilities.includes(MediaCapability.VIDEO_TO_VIDEO) : false;
  }

  // VideoToAudioProvider interface implementation
  async createVideoToAudioModel(modelId: string) {
    return this.getModel(modelId);
  }

  getSupportedVideoToAudioModels(): string[] {
    return this.getModelsForCapability(MediaCapability.VIDEO_TO_AUDIO).map(m => m.id);
  }

  supportsVideoToAudioModel(modelId: string): boolean {
    const model = this.models.find(m => m.id === modelId);
    return model ? model.capabilities.includes(MediaCapability.VIDEO_TO_AUDIO) : false;
  }

  // ServiceManagement interface implementation (inherited from both provider interfaces)
  async startService(): Promise<boolean> {
    try {
      await this.start();
      return true;
    } catch (error) {
      console.error('Failed to start FFMPEG service:', error);
      return false;
    }
  }

  async stopService(): Promise<boolean> {
    try {
      await this.stop();
      return true;
    } catch (error) {
      console.error('Failed to stop FFMPEG service:', error);
      return false;
    }
  }

  async getServiceStatus(): Promise<{ running: boolean; healthy: boolean; error?: string }> {
    try {
      const isAvailable = await this.isAvailable();
      const health = await this.getHealth();
      
      return {
        running: isAvailable,
        healthy: health.status === 'healthy',
        error: health.details?.error
      };
    } catch (error) {
      return {
        running: false,
        healthy: false,
        error: error.message
      };
    }
  }
}

// Self-register with the provider registry
import { ProviderRegistry } from '../../registry/ProviderRegistry';
ProviderRegistry.getInstance().register('ffmpeg', FFMPEGProvider);
