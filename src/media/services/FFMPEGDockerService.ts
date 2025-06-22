/**
 * FFMPEGDockerService
 * 
 * Pure Docker management for FFMPEG service.
 * Handles only Docker operations (start, stop, health checks).
 * Extracted for separation of concerns following the established pattern.
 */

import { DockerComposeService, DockerComposeConfig } from '../../services/DockerComposeService';

export interface FFMPEGDockerConfig {
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
  containerName?: string;
}

/**
 * Docker service management for FFMPEG service
 */
export class FFMPEGDockerService {
  private dockerService: DockerComposeService;
  private config: FFMPEGDockerConfig;

  constructor(config: FFMPEGDockerConfig = {}) {
    this.config = {
      baseUrl: 'http://localhost:8006',
      serviceName: 'ffmpeg-service',
      composeFile: 'services/ffmpeg/docker-compose.yml',
      containerName: 'ffmpeg-service',
      workingDirectory: process.cwd(),
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
   * Start the FFMPEG Docker service
   */
  async startService(): Promise<boolean> {
    try {
      console.log('🎬 Starting FFMPEG Docker service...');
      const success = await this.dockerService.startService();
      
      if (success) {
        console.log('✅ FFMPEG Docker service started successfully');
      } else {
        console.error('❌ Failed to start FFMPEG Docker service');
      }
      
      return success;
    } catch (error) {
      console.error('❌ Error starting FFMPEG Docker service:', error);
      return false;
    }
  }

  /**
   * Stop the FFMPEG Docker service
   */
  async stopService(): Promise<boolean> {
    try {
      console.log('🛑 Stopping FFMPEG Docker service...');
      const success = await this.dockerService.stopService();
      
      if (success) {
        console.log('✅ FFMPEG Docker service stopped successfully');
      } else {
        console.error('❌ Failed to stop FFMPEG Docker service');
      }
      
      return success;
    } catch (error) {
      console.error('❌ Error stopping FFMPEG Docker service:', error);
      return false;
    }
  }

  /**
   * Restart the FFMPEG Docker service
   */
  async restartService(): Promise<boolean> {
    try {
      console.log('🔄 Restarting FFMPEG Docker service...');
      const success = await this.dockerService.restartService();
      
      if (success) {
        console.log('✅ FFMPEG Docker service restarted successfully');
      } else {
        console.error('❌ Failed to restart FFMPEG Docker service');
      }
      
      return success;
    } catch (error) {
      console.error('❌ Error restarting FFMPEG Docker service:', error);
      return false;
    }
  }

  /**
   * Get the status of the FFMPEG Docker service
   */
  async getServiceStatus(): Promise<ServiceStatus> {
    try {
      const status = await this.dockerService.getServiceStatus();
      
      return {
        running: status.running,
        health: (status.health as 'healthy' | 'unhealthy' | 'starting' | 'none') || 'none',
        state: status.state || 'unknown',
        containerName: status.containerName
      };
    } catch (error) {
      console.error('❌ Error getting FFMPEG Docker service status:', error);
      return {
        running: false,
        health: 'unhealthy',
        state: 'error'
      };
    }
  }

  /**
   * Check if the service is running and healthy
   */
  async isHealthy(): Promise<boolean> {
    try {
      const status = await this.getServiceStatus();
      return status.running && status.health === 'healthy';
    } catch (error) {
      return false;
    }
  }

  /**
   * Wait for the service to become healthy
   */
  async waitForHealthy(timeoutMs: number = 600000): Promise<boolean> {
    try {
      return await this.dockerService.waitForHealthy(timeoutMs);
    } catch (error) {
      console.error('❌ Timeout waiting for FFMPEG service to become healthy:', error);
      return false;
    }
  }

  /**
   * Get Docker service configuration
   */
  getConfig(): FFMPEGDockerConfig {
    return { ...this.config };
  }

  /**
   * Get Docker Compose service configuration
   */
  getDockerComposeConfig(): DockerComposeConfig {
    return this.dockerService.getConfig();
  }

  /**
   * Get service logs
   */
  async getLogs(lines: number = 100): Promise<string> {
    try {
      return await this.dockerService.getServiceLogs(lines);
    } catch (error) {
      console.error('❌ Error getting FFMPEG service logs:', error);
      return `Error getting logs: ${error.message}`;
    }
  }

  /**
   * Execute a command in the running container
   */
  /**
   * Clean up any temporary files or resources
   */
  async cleanup(): Promise<void> {
    try {
      // For now, just log that cleanup would happen
      // In the future, this could be implemented with container exec or volume management
      console.log('🧹 FFMPEG Docker service cleanup - temporary files would be cleaned here');
    } catch (error) {
      console.warn('⚠️ Warning: Could not clean up temporary files:', error.message);
    }
  }

  /**
   * Get Docker service management information
   */
  getDockerServiceInfo() {
    const dockerConfig = this.dockerService.getConfig();
    return {
      containerName: dockerConfig.containerName,
      dockerImage: 'ffmpeg-service:latest',
      ports: [8006],
      command: `docker-compose -f ${dockerConfig.composeFile} up -d ${dockerConfig.serviceName}`,
      composeService: dockerConfig.serviceName,
      composeFile: dockerConfig.composeFile,
      healthCheckUrl: dockerConfig.healthCheckUrl || `${this.config.baseUrl}/health`,
      network: 'ffmpeg-network',
      serviceDirectory: 'services/ffmpeg'
    };
  }
}
