/**
 * WhisperDockerService
 * 
 * Pure Docker management for Whisper STT service.
 * Handles only Docker operations (start, stop, health checks).
 * Extracted from WhisperSTTService for separation of concerns.
 */

import { DockerComposeService, DockerComposeConfig } from '../../services/DockerComposeService';

export interface WhisperDockerConfig {
  baseUrl?: string;
  serviceName?: string;
  composeFile?: string;
  containerName?: string;
  healthCheckUrl?: string;
  workingDirectory?: string;
}

export interface ServiceStatus {
  running: boolean;
  health: 'healthy' | 'unhealthy' | 'starting' | 'none';
  state: string;
  containerId?: string;
}

/**
 * Docker service manager for Whisper STT
 */
export class WhisperDockerService {
  private dockerService: DockerComposeService;
  private config: WhisperDockerConfig;

  constructor(config: WhisperDockerConfig = {}) {
    this.config = {
      baseUrl: 'http://localhost:9000',
      serviceName: 'whisper',
      composeFile: 'services/whisper/docker-compose.yml',
      containerName: 'whisper-service',
      ...config
    };

    // Initialize Docker Compose service
    const dockerConfig: DockerComposeConfig = {
      serviceName: this.config.serviceName!,
      composeFile: this.config.composeFile!,
      containerName: this.config.containerName!,
      healthCheckUrl: this.config.healthCheckUrl || `${this.config.baseUrl}/asr`,
      workingDirectory: this.config.workingDirectory
    };

    this.dockerService = new DockerComposeService(dockerConfig);
  }

  /**
   * Start the Whisper Docker service
   */
  async startService(): Promise<boolean> {
    console.log('[WhisperDocker] Starting Whisper STT Docker service...');
    return await this.dockerService.startService();
  }

  /**
   * Stop the Whisper Docker service
   */
  async stopService(): Promise<boolean> {
    console.log('[WhisperDocker] Stopping Whisper STT Docker service...');
    return await this.dockerService.stopService();
  }

  /**
   * Restart the Whisper Docker service
   */
  async restartService(): Promise<boolean> {
    console.log('[WhisperDocker] Restarting Whisper STT Docker service...');
    return await this.dockerService.restartService();
  }

  /**
   * Get the current status of the Whisper service
   */
  async getServiceStatus(): Promise<ServiceStatus> {
    const status = await this.dockerService.getServiceStatus();
    return {
      running: status.running,
      health: (status.health as 'healthy' | 'unhealthy' | 'starting' | 'none') || 'none',
      state: status.state || 'unknown',
      containerId: status.containerName || 'unknown'
    };
  }

  /**
   * Check if the service is healthy
   */
  async isServiceHealthy(): Promise<boolean> {
    const status = await this.getServiceStatus();
    return status.running && status.health === 'healthy';
  }

  /**
   * Check if the service is running (regardless of health)
   */
  async isServiceRunning(): Promise<boolean> {
    const status = await this.getServiceStatus();
    return status.running;
  }

  /**
   * Wait for the service to become healthy
   */
  async waitForHealthy(timeoutMs: number = 600000): Promise<boolean> {
    return await this.dockerService.waitForHealthy(timeoutMs);
  }

  /**
   * Get Docker service configuration
   */
  getDockerConfig(): WhisperDockerConfig {
    return { ...this.config };
  }

  /**
   * Get detailed service information
   */
  getServiceInfo(): {
    containerName: string;
    dockerImage: string;
    ports: number[];
    composeService: string;
    composeFile: string;
    healthCheckUrl: string;
    network: string;
    serviceDirectory: string;
  } {
    return {
      containerName: this.config.containerName!,
      dockerImage: 'onerahmet/openai-whisper-asr-webservice:latest',
      ports: [9000],
      composeService: this.config.serviceName!,
      composeFile: this.config.composeFile!,
      healthCheckUrl: this.config.healthCheckUrl || `${this.config.baseUrl}/asr`,
      network: 'whisper-network',
      serviceDirectory: 'services/whisper'
    };
  }

  /**
   * Get Docker Compose service instance (for advanced operations)
   */
  getDockerComposeService(): DockerComposeService {
    return this.dockerService;
  }

  /**
   * Check if Docker and Docker Compose are available
   */
  async checkDockerAvailability(): Promise<{
    dockerAvailable: boolean;
    composeAvailable: boolean;
    error?: string;
  }> {
    try {
      // This would typically check if docker and docker-compose commands are available
      // For now, we'll delegate to the DockerComposeService
      await this.dockerService.getServiceStatus();
      return {
        dockerAvailable: true,
        composeAvailable: true
      };
    } catch (error) {
      return {
        dockerAvailable: false,
        composeAvailable: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get logs from the Docker container
   */
  async getLogs(lines: number = 100): Promise<string> {
    try {
      const dockerConfig = this.dockerService.getConfig();
      const { execAsync } = await import('../../media/utils/execAsync');
      const { stdout } = await execAsync(
        `docker logs --tail ${lines} ${dockerConfig.containerName}`
      );
      return stdout;
    } catch (error) {
      console.error('[WhisperDocker] Failed to get logs:', error);
      return `Failed to get logs: ${error}`;
    }
  }

  /**
   * Execute a command inside the Docker container
   */
  async execInContainer(command: string): Promise<string> {
    try {
      const dockerConfig = this.dockerService.getConfig();
      const { execAsync } = await import('../../media/utils/execAsync');
      const { stdout } = await execAsync(
        `docker exec ${dockerConfig.containerName} ${command}`
      );
      return stdout;
    } catch (error) {
      console.error('[WhisperDocker] Failed to execute command in container:', error);
      throw error;
    }
  }

  /**
   * Get container resource usage stats
   */
  async getContainerStats(): Promise<{
    cpuUsage?: string;
    memoryUsage?: string;
    networkIO?: string;
    error?: string;
  }> {
    try {
      const dockerConfig = this.dockerService.getConfig();
      const { execAsync } = await import('../../media/utils/execAsync');
      const { stdout } = await execAsync(
        `docker stats ${dockerConfig.containerName} --no-stream --format "table {{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"`
      );
      
      const lines = stdout.trim().split('\n');
      if (lines.length >= 2) {
        const [cpu, memory, network] = lines[1].split('\t');
        return {
          cpuUsage: cpu?.trim(),
          memoryUsage: memory?.trim(),
          networkIO: network?.trim()
        };
      }
      
      return { error: 'No stats available' };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Get supported audio formats for Whisper
   */
  getSupportedFormats(): string[] {
    return [
      'mp3', 'wav', 'flac', 'm4a', 'ogg', 
      'wma', 'aac', 'opus', 'webm'
    ];
  }

  /**
   * Get supported languages for Whisper
   */
  getSupportedLanguages(): string[] {
    return [
      'auto', 'en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko',
      'zh', 'ar', 'hi', 'nl', 'sv', 'da', 'no', 'fi', 'pl', 'tr'
    ];
  }

  /**
   * Validate if an audio format is supported
   */
  validateAudioFormat(filePath: string): boolean {
    const extension = filePath.split('.').pop()?.toLowerCase();
    return extension ? this.getSupportedFormats().includes(extension) : false;
  }
}
