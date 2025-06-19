/**
 * FFMPEGDockerProvider
 * 
 * Provider implementation for FFMPEG models running in Docker containers.
 * Manages the Docker service lifecycle and provides model implementations.
 * Implements VideoToAudioProvider role.
 */

import { LocalProvider } from '../registry/BaseProvider';
import { FFMPEGDockerService } from '../services/FFMPEGDockerService';
import { FFMPEGAPIClient } from '../clients/FFMPEGAPIClient';
import { FFMPEGDockerModel } from '../models/FFMPEGDockerModel';
import { VideoToAudioModel } from '../models/VideoToAudioModel';
import { VideoToAudioProvider } from '../registry/ProviderRoles';

export interface FFMPEGDockerProviderConfig {
  baseUrl?: string;
  serviceName?: string;
  composeFile?: string;
  containerName?: string;
  healthCheckUrl?: string;
  workingDirectory?: string;
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
}

/**
 * FFMPEG Docker Provider - implements VideoToAudioProvider role
 */
export class FFMPEGDockerProvider extends LocalProvider implements VideoToAudioProvider {
  readonly id = 'ffmpeg-docker';
  readonly name = 'FFMPEG Docker Provider';
  readonly type = 'local' as const;

  private dockerService: FFMPEGDockerService | null = null;
  private apiClient: FFMPEGAPIClient | null = null;
  private config: FFMPEGDockerProviderConfig;

  constructor(config: FFMPEGDockerProviderConfig = {}) {
    super();
    
    this.config = {
      baseUrl: 'http://localhost:8006',
      serviceName: 'ffmpeg-service',
      composeFile: 'services/ffmpeg/docker-compose.yml',
      containerName: 'ffmpeg-service',
      maxRetries: 3,
      retryDelay: 1000,
      timeout: 300000, // 5 minutes
      ...config
    };
  }

  /**
   * Get supported models
   */
  getSupportedModels(): string[] {
    return ['ffmpeg-extract-audio', 'ffmpeg-video-to-audio'];
  }

  /**
   * Check if provider supports a specific model
   */
  supportsModel(modelId: string): boolean {
    return this.getSupportedModels().includes(modelId);
  }

  /**
   * Get Docker service instance (lazy initialization)
   */
  protected async getDockerService(): Promise<FFMPEGDockerService> {
    if (!this.dockerService) {
      this.dockerService = new FFMPEGDockerService({
        baseUrl: this.config.baseUrl,
        serviceName: this.config.serviceName,
        composeFile: this.config.composeFile,
        containerName: this.config.containerName,
        healthCheckUrl: this.config.healthCheckUrl,
        workingDirectory: this.config.workingDirectory
      });
    }
    return this.dockerService;
  }

  /**
   * Get API client instance (lazy initialization)
   */
  protected async getAPIClient(): Promise<FFMPEGAPIClient> {
    if (!this.apiClient) {
      this.apiClient = new FFMPEGAPIClient({
        baseUrl: this.config.baseUrl!,
        timeout: this.config.timeout,
        maxRetries: this.config.maxRetries,
        retryDelay: this.config.retryDelay
      });
    }
    return this.apiClient;
  }

  /**
   * Get provider context for model implementations
   */
  protected async getProviderContext(): Promise<{
    dockerService: FFMPEGDockerService;
    apiClient: FFMPEGAPIClient;
  }> {
    const dockerService = await this.getDockerService();
    const apiClient = await this.getAPIClient();
    
    return {
      dockerService,
      apiClient
    };
  }

  /**
   * Check if provider is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const dockerService = await this.getDockerService();
      const apiClient = await this.getAPIClient();
      
      // Check if Docker service is healthy
      const isHealthy = await dockerService.isHealthy();
      if (isHealthy) {
        return true;
      }

      // Try to test API connection directly
      return await apiClient.testConnection();
    } catch (error) {
      console.warn('⚠️ FFMPEG Docker provider availability check failed:', error.message);
      return false;
    }
  }

  /**
   * Create a model instance
   */
  async createModel(modelId: string): Promise<VideoToAudioModel> {
    if (!this.supportsModel(modelId)) {
      throw new Error(`Model '${modelId}' not supported by FFMPEGDockerProvider`);
    }

    const dockerService: FFMPEGDockerService = await this.getDockerService();
    const apiClient: FFMPEGAPIClient = await this.getAPIClient();

    // Create Docker-specific model with injected dependencies
    const model: FFMPEGDockerModel = new FFMPEGDockerModel({
      dockerService,
      apiClient
    });

    return model;
  }

  /**
   * Create a video-to-audio model instance (VideoToAudioProvider interface)
   */
  async createVideoToAudioModel(modelId: string): Promise<VideoToAudioModel> {
    return this.createModel(modelId);
  }

  /**
   * Get supported video-to-audio models
   */
  getSupportedVideoToAudioModels(): string[] {
    return this.getSupportedModels();
  }

  /**
   * Check if provider supports a specific video-to-audio model
   */
  supportsVideoToAudioModel(modelId: string): boolean {
    return this.supportsModel(modelId);
  }

  /**
   * Start the underlying Docker service
   */
  async startService(): Promise<boolean> {
    try {
      const dockerService = await this.getDockerService();
      return await dockerService.startService();
    } catch (error) {
      console.error('❌ Failed to start FFMPEG Docker service:', error);
      return false;
    }
  }

  /**
   * Stop the underlying Docker service
   */
  async stopService(): Promise<boolean> {
    try {
      const dockerService = await this.getDockerService();
      return await dockerService.stopService();
    } catch (error) {
      console.error('❌ Failed to stop FFMPEG Docker service:', error);
      return false;
    }
  }

  /**
   * Get service status
   */
  async getServiceStatus(): Promise<{ running: boolean; healthy: boolean; error?: string }> {
    try {
      const dockerService = await this.getDockerService();
      const status = await dockerService.getServiceStatus();
      
      return {
        running: status.running,
        healthy: status.health === 'healthy',
        error: status.health === 'unhealthy' ? 'Service is unhealthy' : undefined
      };
    } catch (error) {
      return {
        running: false,
        healthy: false,
        error: error.message
      };
    }
  }

  /**
   * Get provider information
   */
  getInfo(): {
    id: string;
    name: string;
    type: 'local' | 'remote';
    status: 'available' | 'unavailable' | 'error';
    supportedModels: string[];
    roles: string[];
    dockerInfo?: any;
  } {
    const dockerInfo = this.dockerService?.getDockerServiceInfo();
    
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      status: 'available', // TODO: Make this dynamic based on actual status
      supportedModels: this.getSupportedModels(),
      roles: ['video-to-audio'],
      dockerInfo
    };
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    try {
      if (this.dockerService) {
        await this.dockerService.cleanup();
      }
    } catch (error) {
      console.warn('⚠️ Warning: Could not clean up FFMPEG provider resources:', error.message);
    }
  }

  /**
   * Get service logs for debugging
   */
  async getLogs(lines: number = 100): Promise<string> {
    try {
      const dockerService = await this.getDockerService();
      return await dockerService.getLogs(lines);
    } catch (error) {
      return `Error getting logs: ${error.message}`;
    }
  }
}
