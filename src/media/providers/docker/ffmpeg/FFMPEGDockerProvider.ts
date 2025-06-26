/**
 * FFMPEGDockerProvider
 * 
 * Local Docker-based provider for FFMPEG video/audio processing.
 * Uses Docker containers to provide video transformation capabilities.
 */

import { 
  MediaProvider,
  MediaCapability, 
  ProviderType, 
  ProviderModel, 
  ProviderConfig 
} from '../../../types/provider';
import { AudioToAudioProvider } from '../../../capabilities/interfaces/AudioToAudioProvider';
import { VideoToAudioProvider } from '../../../capabilities/interfaces/VideoToAudioProvider';
import { FFMPEGDockerService } from '../../../services/FFMPEGDockerService';

export interface FFMPEGDockerConfig extends ProviderConfig {
  dockerImage?: string;
  containerName?: string;
  enableGPU?: boolean;
  maxConcurrent?: number;
}

/**
 * Provider for FFMPEG Docker-based media processing
 */
export class FFMPEGDockerProvider implements MediaProvider, AudioToAudioProvider, VideoToAudioProvider {
  readonly id = 'ffmpeg-docker';
  readonly name = 'FFMPEG Docker Provider';
  readonly type = ProviderType.LOCAL;  readonly capabilities = [
    MediaCapability.TEXT_TO_VIDEO,
    MediaCapability.IMAGE_TO_VIDEO,
    MediaCapability.VIDEO_TO_VIDEO,
    MediaCapability.VIDEO_TO_IMAGE,
    MediaCapability.VIDEO_TO_AUDIO,
    MediaCapability.AUDIO_TO_AUDIO,
    MediaCapability.AUDIO_TO_TEXT // Music generation is similar to audio synthesis
  ];

  private config: FFMPEGDockerConfig = {};
  private dockerService: FFMPEGDockerService;
  /**
   * Constructor automatically configures from environment variables
   */
  constructor() {
    this.dockerService = new FFMPEGDockerService();
    // Auto-configure from environment variables (async but non-blocking)
    this.autoConfigureFromEnv().catch(error => {
      // Silent fail - provider will just not be available until manually configured
    });
  }

  /**
   * Automatically configure from environment variables
   */
  private async autoConfigureFromEnv(): Promise<void> {
    const serviceUrl = process.env.FFMPEG_SERVICE_URL || 'http://localhost:8006';
    
    try {      await this.configure({
        baseUrl: serviceUrl,
        timeout: 600000, // Longer timeout for video processing
        retries: 1
      });
    } catch (error) {
      console.warn(`[FFMPEGDockerProvider] Auto-configuration failed: ${error.message}`);
    }
  }

  getType(): ProviderType {
    return ProviderType.LOCAL;
  }

  getName(): string {
    return this.name;
  }

  getDescription(): string {
    return 'Local Docker-based FFMPEG provider for video/audio processing';
  }  getSupportedCapabilities(): MediaCapability[] {
    return this.capabilities;
  }

  getModelsForCapability(capability: MediaCapability): ProviderModel[] {
    return this.models.filter(model => model.capabilities.includes(capability));
  }

  async getHealth(): Promise<{ 
    status: 'healthy' | 'unhealthy' | 'degraded'; 
    uptime: number; 
    activeJobs: number; 
    queuedJobs: number; 
    lastError?: string 
  }> {
    try {
      const isAvailable = await this.isAvailable();
      return {
        status: isAvailable ? 'healthy' : 'unhealthy',
        uptime: Date.now(), // Mock uptime
        activeJobs: 0,
        queuedJobs: 0,
        lastError: isAvailable ? undefined : 'Docker service not available'
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        uptime: 0,
        activeJobs: 0,
        queuedJobs: 0,
        lastError: error.message
      };
    }
  }  get models(): ProviderModel[] {
    return [
      {
        id: 'ffmpeg-video-composer',
        name: 'FFMPEG Video Composer',
        description: 'Video composition and editing using FFMPEG',
        capabilities: [MediaCapability.TEXT_TO_VIDEO, MediaCapability.IMAGE_TO_VIDEO],
        pricing: { inputCost: 0, outputCost: 0, currency: 'USD' },
        limits: { maxInputSize: 1000000000, maxOutputSize: 1000000000, rateLimit: 10 },
        parameters: {}
      },
      {
        id: 'ffmpeg-video-filter',
        name: 'FFMPEG Video Filter',
        description: 'Video filtering and effects using FFMPEG',
        capabilities: [MediaCapability.VIDEO_TO_VIDEO, MediaCapability.VIDEO_TO_IMAGE],
        pricing: { inputCost: 0, outputCost: 0, currency: 'USD' },
        limits: { maxInputSize: 1000000000, maxOutputSize: 1000000000, rateLimit: 10 },
        parameters: {}
      },      {
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
  async configure(config: FFMPEGDockerConfig): Promise<void> {
    this.config = { ...this.config, ...config };
    
    // TODO: Configure the Docker service when methods are available
    // await this.dockerService.configure({
    //   dockerImage: config.dockerImage || 'jrottenberg/ffmpeg:latest',
    //   containerName: config.containerName || 'ffmpeg-processor',
    //   enableGPU: config.enableGPU || false,
    //   maxConcurrent: config.maxConcurrent || 2
    // });
  }

  async isAvailable(): Promise<boolean> {
    try {
      // TODO: Use actual service method when available
      // return await this.dockerService.isAvailable();
      return false; // Temporarily return false until service methods are implemented
    } catch {
      return false;
    }
  }

  async getStatus(): Promise<'online' | 'offline' | 'error'> {
    const available = await this.isAvailable();
    return available ? 'online' : 'offline';
  }
  // Video Model Creation Methods - TODO: Implement when model classes are available
  /*
  async createVideoComposerModel(modelId: string): Promise<FFMPEGVideoComposerModel> {
    if (!await this.isAvailable()) {
      throw new Error('FFMPEG Docker service is not available');
    }

    return new FFMPEGVideoComposerModel({
      id: modelId,
      name: 'FFMPEG Video Composer',
      description: 'Docker-based FFMPEG video composition',
      dockerService: this.dockerService,
      config: this.config
    });
  }

  async createVideoFilterModel(modelId: string): Promise<FFMPEGVideoFilterModel> {
    if (!await this.isAvailable()) {
      throw new Error('FFMPEG Docker service is not available');
    }

    return new FFMPEGVideoFilterModel({
      id: modelId,
      name: 'FFMPEG Video Filter',
      description: 'Docker-based FFMPEG video filtering',
      dockerService: this.dockerService,
      config: this.config
    });
  }

  async createVideoToAudioModel(modelId: string): Promise<FFMPEGVideoToAudioModel> {
    if (!await this.isAvailable()) {
      throw new Error('FFMPEG Docker service is not available');
    }

    return new FFMPEGVideoToAudioModel({
      id: modelId,
      name: 'FFMPEG Video to Audio',
      description: 'Docker-based FFMPEG audio extraction',
      dockerService: this.dockerService,
      config: this.config
    });
  }
  */

  // Service Management - TODO: Implement when service methods are available
  async start(): Promise<void> {
    // TODO: await this.dockerService.start();
    console.log('FFMPEG Docker service start - not implemented yet');
  }

  async stop(): Promise<void> {
    // TODO: await this.dockerService.stop();
    console.log('FFMPEG Docker service stop - not implemented yet');
  }

  async restart(): Promise<void> {
    // TODO: await this.dockerService.restart();
    console.log('FFMPEG Docker service restart - not implemented yet');
  }

  async cleanup(): Promise<void> {
    // TODO: await this.dockerService.cleanup();
    console.log('FFMPEG Docker service cleanup - not implemented yet');
  }

  // Health Check
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    details: Record<string, any>;
  }> {
    try {
      const isAvailable = await this.isAvailable();
      // TODO: const containerStatus = await this.dockerService.getContainerStatus();
      
      return {
        status: isAvailable ? 'healthy' : 'unhealthy',
        details: {
          dockerAvailable: isAvailable,
          // containerStatus,
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
  }  /**
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
    if (model.capabilities.includes(MediaCapability.AUDIO_TO_AUDIO)) {
      const { FFMPEGAudioToAudioModel } = await import('./FFMPEGAudioToAudioModel');
      const { FFMPEGAPIClient } = await import('./FFMPEGAPIClient');
      
      const apiClient = new FFMPEGAPIClient({
        baseUrl: this.config?.baseUrl || 'http://localhost:8006',
        timeout: this.config?.timeout || 300000
      });

      return new FFMPEGAudioToAudioModel({
        apiClient,
        dockerService: this.dockerService,
        baseUrl: this.config?.baseUrl || 'http://localhost:8006',
        timeout: this.config?.timeout || 300000
      });
    }

    if (model.capabilities.includes(MediaCapability.VIDEO_TO_AUDIO)) {
      const { FFMPEGDockerModel } = await import('./FFMPEGDockerModel');
      const { FFMPEGAPIClient } = await import('./FFMPEGAPIClient');
      
      const apiClient = new FFMPEGAPIClient({
        baseUrl: this.config?.baseUrl || 'http://localhost:8006',
        timeout: this.config?.timeout || 300000
      });

      return new FFMPEGDockerModel({
        dockerService: this.dockerService,
        apiClient
      });
    }    throw new Error(`Model type not implemented for '${modelId}' in FFMPEG provider`);
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
      // Start the docker service
      await this.start();
      return true;
    } catch (error) {
      console.error('Failed to start FFMPEG service:', error);
      return false;
    }
  }

  async stopService(): Promise<boolean> {
    try {
      // Stop the docker service
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
        error: health.lastError
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
import { ProviderRegistry } from '../../../registry/ProviderRegistry';
ProviderRegistry.getInstance().register('ffmpeg-docker', FFMPEGDockerProvider);
