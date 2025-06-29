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
  ProviderConfig,
  DockerBackedMediaProvider
} from '../../types/provider';
import { DockerComposeService } from '../../../services/DockerComposeService';
import { AudioToAudioProvider } from '../../capabilities/interfaces/AudioToAudioProvider';
import { VideoToAudioProvider } from '../../capabilities/interfaces/VideoToAudioProvider';
import { VideoToVideoProvider } from '../../capabilities/interfaces/VideoToVideoProvider';
import { VideoToImageProvider } from '../../capabilities/interfaces/VideoToImageProvider';
import { IFFMPEGClient } from './IFFMPEGClient';
import { VideoRole, Image } from '../../assets/roles';
import { VideoToImageOptions } from '../../models/abstracts/VideoToImageModel';

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
export class FFMPEGProvider implements MediaProvider, AudioToAudioProvider, VideoToAudioProvider, VideoToVideoProvider, VideoToImageProvider, DockerBackedMediaProvider {
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
  private dockerServiceManager?: DockerComposeService;

  /**
   * Constructor can take a pre-configured FFMPEG client
   */
  constructor(client?: IFFMPEGClient) {
    this.client = client;
    
    // Auto-configure from environment variables (async but non-blocking)
    this.autoConfigureFromEnv().then(() => {
      // If client is still not set after auto-configuration, initialize default
      if (!this.client) {
        this.initializeDefaultClient();
      }
    }).catch(error => {
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

  async configure(config: FFMPEGProviderConfig, dockerServiceAdapter?: DockerBackedMediaProviderAdapter): Promise<void> {
    this.config = { ...this.config, ...config };
    
    if (dockerServiceAdapter) {
      this.dockerServiceManager = dockerServiceAdapter.getDockerServiceManager();
      const serviceInfo = this.dockerServiceManager.getConfig();
      if (serviceInfo.ports && serviceInfo.ports.length > 0) {
        const port = serviceInfo.ports[0];
        this.config.baseUrl = this.config.baseUrl || `http://localhost:${port}`;
        console.log(`🔗 Provider configured to use service at: ${this.config.baseUrl}`);
      }
    } else if (config.serviceUrl) {
      const { ServiceRegistry } = await import('../../registry/ServiceRegistry');
      const serviceRegistry = ServiceRegistry.getInstance();
      this.dockerServiceManager = await serviceRegistry.getService(config.serviceUrl, config.serviceConfig) as DockerComposeService;
      const serviceInfo = this.dockerServiceManager.getConfig();
      if (serviceInfo.ports && serviceInfo.ports.length > 0) {
        const port = serviceInfo.ports[0];
        this.config.baseUrl = this.config.baseUrl || `http://localhost:${port}`;
        console.log(`🔗 Provider configured to use service at: ${this.config.baseUrl}`);
      }
    }

    // If a client was provided in config, use it
    if (config.client) {
      this.client = config.client;
    }

    // If no client is set, create a default Docker client
    if (!this.client) {
      await this.initializeDefaultClient();
    }
  }

  getDockerServiceManager(): DockerComposeService {
    if (!this.dockerServiceManager) {
      throw new Error('DockerComposeService manager not initialized for FFMPEGProvider');
    }
    return this.dockerServiceManager;
  }

  
  private async initializeDefaultClient(): Promise<void> {
    try {
      // Try to create Docker client first (existing behavior)
      const { FFMPEGAPIClient } = await import('../docker/ffmpeg/FFMPEGAPIClient');
      
      this.client = new FFMPEGAPIClient({
        baseUrl: this.config.baseUrl || 'http://localhost:8006',
        timeout: this.config.timeout || 300000
      });

      console.log(`✅ FFMPEG Provider initialized with Docker client. Base URL: ${this.config.baseUrl || 'http://localhost:8006'}`);
    } catch (error) {
      console.warn('⚠️ Failed to initialize Docker client, FFMPEG provider will be unavailable:', (error as Error).message);
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
      },
      {
        id: 'ffmpeg-video-to-image',
        name: 'FFMPEG Video to Image',
        description: 'Extract frames from video as images using FFMPEG',
        capabilities: [MediaCapability.VIDEO_TO_IMAGE],
        pricing: { inputCost: 0, outputCost: 0, currency: 'USD' },
        limits: { maxInputSize: 1000000000, maxOutputSize: 1000000000, rateLimit: 10 },
        parameters: {
          frameTime: { type: 'number', description: 'Time in seconds to extract frame from' },
          frameNumber: { type: 'number', description: 'Specific frame number to extract' },
          format: { type: 'string', description: 'Output image format (png, jpg, webp)', default: 'png' },
          width: { type: 'number', description: 'Output width in pixels' },
          height: { type: 'number', description: 'Output height in pixels' },
          quality: { type: 'number', description: 'Image quality (1-100)', default: 90 }
        }
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
        status: 'healthy',
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
          error: (error as Error).message,
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
   * Get a model instance by ID
   */
  async getModel(modelId: string): Promise<any> {
    if (!await this.isAvailable()) {
      throw new Error('FFMPEG provider is not available');
    }

    // Handle "default" model ID by picking the first available model
    let actualModelId = modelId;
    if (modelId === 'default') {
      const availableModels = this.models;
      if (availableModels.length > 0) {
        actualModelId = availableModels[0].id;
      } else {
        throw new Error('No models available in FFMPEG provider');
      }
    }

    // Check if the model exists
    const model = this.models.find(m => m.id === actualModelId);
    if (!model) {
      throw new Error(`Model '${actualModelId}' not found in FFMPEG provider. Available models: ${this.models.map(m => m.id).join(', ')}`);
    }

    return await this.createModelInstance(model);
  }

  /**
   * Get a model instance by capability (picks the first available model for that capability)
   */
  async getModelByCapability(capability: MediaCapability): Promise<any> {
    if (!await this.isAvailable()) {
      throw new Error('FFMPEG provider is not available');
    }

    // Find the first model that supports the requested capability
    const capableModel = this.models.find(m => m.capabilities.includes(capability));
    if (!capableModel) {
      throw new Error(`No models available for capability ${capability} in FFMPEG provider`);
    }

    return await this.createModelInstance(capableModel);
  }

  /**
   * Create a model instance from a model definition
   */
  private async createModelInstance(model: ProviderModel): Promise<any> {
    // Create the appropriate model based on capabilities
    if (model.capabilities.includes(MediaCapability.VIDEO_TO_IMAGE)) {
      const { FFMPEGVideoToImageModel } = await import('./FFMPEGVideoToImageModel');
        return new FFMPEGVideoToImageModel({
        client: this.client!,
        enableGPU: this.config?.enableGPU,
        outputFormat: 'jpg',  // Use JPG as default format
        defaultQuality: 90
      });
    }

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

    throw new Error(`Model type not implemented for '${model.id}' (capabilities: ${model.capabilities.join(', ')}) in FFMPEG provider`);
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

  // VideoToImageProvider implementation
  getSupportedVideoToImageModels(): string[] {
    return this.getModelsForCapability(MediaCapability.VIDEO_TO_IMAGE).map(m => m.id);
  }

  async extractFrames(input: VideoRole | VideoRole[], modelId: string, options?: VideoToImageOptions): Promise<Image> {
    const model = this.models.find(m => m.id === modelId);
    if (!model || !model.capabilities.includes(MediaCapability.VIDEO_TO_IMAGE)) {
      throw new Error(`Model ${modelId} does not support video-to-image conversion`);
    }

    if (!this.client) {
      throw new Error('No FFMPEG client configured');
    }

    // Import and create the model
    const { FFMPEGVideoToImageModel } = await import('./FFMPEGVideoToImageModel');
    const videoToImageModel = new FFMPEGVideoToImageModel({
      client: this.client,
      enableGPU: this.config.enableGPU,
      outputFormat: 'jpg',  // Use JPG as default format
      defaultQuality: 90
    });

    return await videoToImageModel.transform(input, options);
  }

  async extractMultipleFrames(input: VideoRole, modelId: string, options: VideoToImageOptions): Promise<Image[]> {
    const model = this.models.find(m => m.id === modelId);
    if (!model || !model.capabilities.includes(MediaCapability.VIDEO_TO_IMAGE)) {
      throw new Error(`Model ${modelId} does not support video-to-image conversion`);
    }

    if (!this.client) {
      throw new Error('No FFMPEG client configured');
    }

    // Import and create the model
    const { FFMPEGVideoToImageModel } = await import('./FFMPEGVideoToImageModel');
    const videoToImageModel = new FFMPEGVideoToImageModel({
      client: this.client,
      enableGPU: this.config.enableGPU,
      outputFormat: options?.format as 'png' | 'jpg' | 'webp',
      defaultQuality: options?.quality
    });

    return await videoToImageModel.extractMultipleFrames(input, options);
  }

  // ServiceManagement interface implementation (inherited from both provider interfaces)
  async startService(): Promise<boolean> {
    if (!this.dockerServiceManager) {
      throw new Error('Docker service manager not initialized for FFMPEGProvider');
    }
    return this.dockerServiceManager.startService();
  }

  async stopService(): Promise<boolean> {
    if (!this.dockerServiceManager) {
      throw new Error('Docker service manager not initialized for FFMPEGProvider');
    }
    return this.dockerServiceManager.stopService();
  }

  async getServiceStatus(): Promise<{ running: boolean; healthy: boolean; error?: string }> {
    if (!this.dockerServiceManager) {
      throw new Error('Docker service manager not initialized for FFMPEGProvider');
    }
    const status = await this.dockerServiceManager.getServiceStatus();
    return {
      running: status.running,
      healthy: status.health === 'healthy',
      error: status.state === 'error' ? status.state : undefined
    };
  }
}

// Self-register with the provider registry
import { ProviderRegistry } from '../../registry/ProviderRegistry';
ProviderRegistry.getInstance().register('ffmpeg', FFMPEGProvider);