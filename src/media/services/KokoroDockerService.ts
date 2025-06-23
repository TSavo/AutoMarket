/**
 * KokoroDockerService
 * 
 * Pure Docker management for Kokoro TTS service.
 * Handles only Docker operations (start, stop, health checks).
 * Based on ChatterboxDockerService pattern.
 */

import { DockerComposeService, DockerComposeConfig } from '../../services/DockerComposeService';

export interface KokoroDockerConfig {
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
 * Docker service manager for Kokoro TTS
 */
export class KokoroDockerService {
  private dockerService: DockerComposeService;
  private config: KokoroDockerConfig;

  constructor(config: KokoroDockerConfig = {}) {
    this.config = {
      baseUrl: 'http://localhost:8005',
      serviceName: 'kokoro-tts-server',
      composeFile: 'services/kokoro/docker-compose.yml',
      containerName: 'kokoro-tts-server',
      ...config
    };

    // Initialize Docker Compose service
    const dockerConfig: DockerComposeConfig = {
      serviceName: this.config.serviceName!,
      composeFile: this.config.composeFile!,
      containerName: this.config.containerName!,
      healthCheckUrl: this.config.healthCheckUrl || `${this.config.baseUrl}/health`,
      workingDirectory: this.config.workingDirectory
    };

    this.dockerService = new DockerComposeService(dockerConfig);
  }

  /**
   * Start the Kokoro Docker service
   */
  async startService(): Promise<boolean> {
    console.log('[KokoroDocker] Starting Kokoro TTS Docker service...');
    return await this.dockerService.startService();
  }

  /**
   * Stop the Kokoro Docker service
   */
  async stopService(): Promise<boolean> {
    console.log('[KokoroDocker] Stopping Kokoro TTS Docker service...');
    return await this.dockerService.stopService();
  }

  /**
   * Restart the Kokoro Docker service
   */
  async restartService(): Promise<boolean> {
    console.log('[KokoroDocker] Restarting Kokoro TTS Docker service...');
    return await this.dockerService.restartService();
  }

  /**
   * Get the current status of the Kokoro service
   */
  async getServiceStatus(): Promise<ServiceStatus> {
    const status = await this.dockerService.getServiceStatus();
    return {
      running: status.running,
      health: (status.health as 'healthy' | 'unhealthy' | 'starting' | 'none') || 'none',
      state: status.state || 'unknown',
      containerId: status.containerName // Use containerName as containerId
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
  getDockerConfig(): KokoroDockerConfig {
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
      dockerImage: 'kprinssu/kokoro-fastapi:latest',
      ports: [8005],
      composeService: this.config.serviceName!,
      composeFile: this.config.composeFile!,
      healthCheckUrl: this.config.healthCheckUrl || `${this.config.baseUrl}/health`,
      network: 'kokoro-network',
      serviceDirectory: 'services/kokoro'
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
      const status = await this.getServiceStatus();
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
   */  async getLogs(lines: number = 100): Promise<string> {
    try {
      const dockerConfig = this.dockerService.getConfig();
      const { execAsync } = await import('../utils/execAsync');
      const { stdout } = await execAsync(
        `docker logs --tail ${lines} ${dockerConfig.containerName}`
      );
      return stdout;
    } catch (error) {
      console.error('[KokoroDocker] Failed to get logs:', error);
      return `Failed to get logs: ${error}`;
    }
  }

  /**
   * Execute a command inside the Docker container
   */  async execInContainer(command: string): Promise<string> {
    try {
      const dockerConfig = this.dockerService.getConfig();
      const { execAsync } = await import('../utils/execAsync');
      const { stdout } = await execAsync(
        `docker exec ${dockerConfig.containerName} ${command}`
      );
      return stdout;
    } catch (error) {
      console.error('[KokoroDocker] Failed to execute command in container:', error);
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
  }> {    try {
      const dockerConfig = this.dockerService.getConfig();
      const { execAsync } = await import('../utils/execAsync');
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
}
