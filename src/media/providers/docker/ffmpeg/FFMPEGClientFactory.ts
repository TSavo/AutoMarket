/**
 * FFMPEG Client Factory
 * 
 * Factory for creating FFMPEG clients with the ability to switch between
 * API service client and local client implementations.
 */

import { FFMPEGAPIClient, FFMPEGClientConfig } from './FFMPEGAPIClient';
import { FFMPEGLocalClient, FFMPEGLocalConfig } from './FFMPEGLocalClient';

export type FFMPEGClientType = 'api' | 'local';

export interface FFMPEGFactoryConfig {
  type: FFMPEGClientType;
  apiConfig?: FFMPEGClientConfig;
  localConfig?: FFMPEGLocalConfig;
}

/**
 * Common interface that both clients implement
 */
export interface IFFMPEGClient {
  checkHealth(): Promise<any>;
  extractAudio(videoData: any, options?: any): Promise<any>;
  convertAudio(audioData: any, options?: any): Promise<any>;
  downloadFile(outputPath: string): Promise<Buffer>;
  getServiceInfo(): Promise<any>;
  testConnection(): Promise<boolean>;
  composeVideo(videoBuffers: Buffer[], options?: any): Promise<any>;
  filterVideo(videoData: any, options?: any): Promise<any>;
  filterMultipleVideos(videoBuffers: Buffer[], options?: any): Promise<any>;
  getVideoMetadata(videoData: any): Promise<any>;
}

/**
 * Factory class for creating FFMPEG clients
 */
export class FFMPEGClientFactory {
  private static defaultConfig: FFMPEGFactoryConfig = {
    type: 'api',
    apiConfig: {
      baseUrl: 'http://localhost:9000'
    },
    localConfig: {}
  };

  /**
   * Create an FFMPEG client based on configuration
   */
  static create(config?: Partial<FFMPEGFactoryConfig>): IFFMPEGClient {
    // Use a local default config to avoid static property issues
    const defaultConfig: FFMPEGFactoryConfig = {
      type: 'api',
      apiConfig: {
        baseUrl: 'http://localhost:9000'
      },
      localConfig: {}
    };

    const finalConfig = { ...defaultConfig, ...config };

    switch (finalConfig.type) {
      case 'api':
        if (!finalConfig.apiConfig) {
          throw new Error('API config is required when type is "api"');
        }
        return new FFMPEGAPIClient(finalConfig.apiConfig);

      case 'local':
        return new FFMPEGLocalClient(finalConfig.localConfig || {});

      default:
        throw new Error(`Unknown FFMPEG client type: ${finalConfig.type}`);
    }
  }

  /**
   * Create an API client
   */
  static createAPIClient(config: FFMPEGClientConfig): FFMPEGAPIClient {
    return new FFMPEGAPIClient(config);
  }

  /**
   * Create a local client
   */
  static createLocalClient(config?: FFMPEGLocalConfig): FFMPEGLocalClient {
    return new FFMPEGLocalClient(config);
  }

  /**
   * Set default configuration
   */
  static setDefaultConfig(config: Partial<FFMPEGFactoryConfig>): void {
    this.defaultConfig = { ...this.defaultConfig, ...config };
  }

  /**
   * Get current default configuration
   */
  static getDefaultConfig(): FFMPEGFactoryConfig {
    return {
      type: 'api',
      apiConfig: {
        baseUrl: 'http://localhost:9000'
      },
      localConfig: {}
    };
  }

  /**
   * Create client from environment variables
   */
  static createFromEnv(): IFFMPEGClient {
    const type = (process.env.FFMPEG_CLIENT_TYPE as FFMPEGClientType) || 'api';
    
    const config: FFMPEGFactoryConfig = {
      type,
      apiConfig: {
        baseUrl: process.env.FFMPEG_API_URL || 'http://localhost:9000',
        timeout: process.env.FFMPEG_API_TIMEOUT ? parseInt(process.env.FFMPEG_API_TIMEOUT) : undefined,
        maxRetries: process.env.FFMPEG_API_MAX_RETRIES ? parseInt(process.env.FFMPEG_API_MAX_RETRIES) : undefined,
        retryDelay: process.env.FFMPEG_API_RETRY_DELAY ? parseInt(process.env.FFMPEG_API_RETRY_DELAY) : undefined
      },
      localConfig: {
        ffmpegPath: process.env.FFMPEG_PATH,
        ffprobePath: process.env.FFPROBE_PATH,
        tempDir: process.env.FFMPEG_TEMP_DIR,
        timeout: process.env.FFMPEG_LOCAL_TIMEOUT ? parseInt(process.env.FFMPEG_LOCAL_TIMEOUT) : undefined,
        maxRetries: process.env.FFMPEG_LOCAL_MAX_RETRIES ? parseInt(process.env.FFMPEG_LOCAL_MAX_RETRIES) : undefined,
        retryDelay: process.env.FFMPEG_LOCAL_RETRY_DELAY ? parseInt(process.env.FFMPEG_LOCAL_RETRY_DELAY) : undefined
      }
    };

    return this.create(config);
  }
}

/**
 * Wrapper class that provides a unified interface and can switch between implementations
 */
export class FFMPEGClientWrapper implements IFFMPEGClient {
  private client: IFFMPEGClient;
  private config: FFMPEGFactoryConfig;

  constructor(config?: Partial<FFMPEGFactoryConfig>) {
    this.config = { ...FFMPEGClientFactory.getDefaultConfig(), ...config };
    this.client = FFMPEGClientFactory.create(this.config);
  }

  /**
   * Switch to a different client type
   */
  switchTo(type: FFMPEGClientType, config?: any): void {
    this.config.type = type;
    if (type === 'api' && config) {
      this.config.apiConfig = { ...this.config.apiConfig, ...config };
    } else if (type === 'local' && config) {
      this.config.localConfig = { ...this.config.localConfig, ...config };
    }
    this.client = FFMPEGClientFactory.create(this.config);
  }

  /**
   * Get current client type
   */
  getCurrentType(): FFMPEGClientType {
    return this.config.type;
  }

  /**
   * Get current client instance
   */
  getCurrentClient(): IFFMPEGClient {
    return this.client;
  }

  // Delegate all methods to the current client
  async checkHealth() {
    return this.client.checkHealth();
  }

  async extractAudio(videoData: any, options?: any) {
    return this.client.extractAudio(videoData, options);
  }

  async convertAudio(audioData: any, options?: any) {
    return this.client.convertAudio(audioData, options);
  }

  async downloadFile(outputPath: string): Promise<Buffer> {
    return this.client.downloadFile(outputPath);
  }

  async getServiceInfo() {
    return this.client.getServiceInfo();
  }

  async testConnection(): Promise<boolean> {
    return this.client.testConnection();
  }

  async composeVideo(videoBuffers: Buffer[], options?: any) {
    return this.client.composeVideo(videoBuffers, options);
  }

  async filterVideo(videoData: any, options?: any) {
    return this.client.filterVideo(videoData, options);
  }

  async filterMultipleVideos(videoBuffers: Buffer[], options?: any) {
    return this.client.filterMultipleVideos(videoBuffers, options);
  }

  async getVideoMetadata(videoData: any) {
    return this.client.getVideoMetadata(videoData);
  }
}

// Export convenience functions
export const createFFMPEGClient = FFMPEGClientFactory.create;
export const createFFMPEGAPIClient = FFMPEGClientFactory.createAPIClient;
export const createFFMPEGLocalClient = FFMPEGClientFactory.createLocalClient;
export const createFFMPEGClientFromEnv = FFMPEGClientFactory.createFromEnv;

// Default export
export default FFMPEGClientFactory;
