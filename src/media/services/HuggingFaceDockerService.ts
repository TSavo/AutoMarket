/**
 * HuggingFaceDockerService
 * 
 * Pure Docker management for HuggingFace text-to-image service.
 * Handles only Docker operations (start, stop, health checks).
 * Follows the established pattern from other Docker services.
 */

import { DockerComposeService, DockerComposeConfig } from '../../services/DockerComposeService';

export interface HuggingFaceDockerConfig {
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
 * Docker service management for HuggingFace text-to-image service
 */
export class HuggingFaceDockerService {
  private dockerService: DockerComposeService;
  private config: HuggingFaceDockerConfig;

  constructor(config: HuggingFaceDockerConfig = {}) {
    this.config = {
      baseUrl: config.baseUrl || 'http://localhost:8007',
      serviceName: config.serviceName || 'huggingface-text-to-image',
      composeFile: config.composeFile || 'services/huggingface/docker-compose.yml',
      containerName: config.containerName || 'huggingface-text-to-image',
      healthCheckUrl: config.healthCheckUrl || 'http://localhost:8007/health',
      workingDirectory: config.workingDirectory || process.cwd()
    };

    const dockerConfig: DockerComposeConfig = {
      composeFile: this.config.composeFile!,
      serviceName: this.config.serviceName!,
      containerName: this.config.containerName!,
      healthCheckUrl: this.config.healthCheckUrl!,
      workingDirectory: this.config.workingDirectory!
    };

    this.dockerService = new DockerComposeService(dockerConfig);
  }

  /**
   * Start the HuggingFace Docker service
   */
  async startService(): Promise<boolean> {
    try {
      console.log('[HuggingFaceDockerService] Starting HuggingFace text-to-image service...');
      return await this.dockerService.startService();
    } catch (error) {
      console.error('[HuggingFaceDockerService] Failed to start service:', error);
      return false;
    }
  }

  /**
   * Stop the HuggingFace Docker service
   */
  async stopService(): Promise<boolean> {
    try {
      console.log('[HuggingFaceDockerService] Stopping HuggingFace text-to-image service...');
      return await this.dockerService.stopService();
    } catch (error) {
      console.error('[HuggingFaceDockerService] Failed to stop service:', error);
      return false;
    }
  }

  /**
   * Get service status
   */
  async getServiceStatus(): Promise<ServiceStatus> {
    try {
      const status = await this.dockerService.getServiceStatus();
      return {
        running: status.running,
        health: (status.health as 'healthy' | 'unhealthy' | 'starting' | 'none') || 'none',
        state: status.state || 'unknown',
        containerId: status.containerName // Use containerName as containerId
      };
    } catch (error) {
      console.error('[HuggingFaceDockerService] Failed to get service status:', error);
      return {
        running: false,
        health: 'unhealthy',
        state: 'error'
      };
    }
  }

  /**
   * Wait for service to be healthy
   */
  async waitForHealthy(timeoutMs: number = 120000): Promise<boolean> {
    try {
      console.log('[HuggingFaceDockerService] Waiting for service to be healthy...');
      return await this.dockerService.waitForHealthy(timeoutMs);
    } catch (error) {
      console.error('[HuggingFaceDockerService] Service health check failed:', error);
      return false;
    }
  }

  /**
   * Check if service is running
   */
  async isRunning(): Promise<boolean> {
    try {
      const status = await this.getServiceStatus();
      return status.running;
    } catch {
      return false;
    }
  }

  /**
   * Check if service is healthy
   */
  async isHealthy(): Promise<boolean> {
    try {
      const status = await this.getServiceStatus();
      return status.running && status.health === 'healthy';
    } catch {
      return false;
    }
  }

  /**
   * Restart the service
   */
  async restartService(): Promise<boolean> {
    try {
      console.log('[HuggingFaceDockerService] Restarting HuggingFace text-to-image service...');
      return await this.dockerService.restartService();
    } catch (error) {
      console.error('[HuggingFaceDockerService] Failed to restart service:', error);
      return false;
    }
  }

  /**
   * Get service logs
   */
  async getLogs(lines: number = 100): Promise<string> {
    try {
      return await this.dockerService.getServiceLogs(lines);
    } catch (error) {
      console.error('[HuggingFaceDockerService] Failed to get logs:', error);
      return `Error getting logs: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  /**
   * Get configuration
   */
  getConfig(): HuggingFaceDockerConfig {
    return { ...this.config };
  }

  /**
   * Get Docker service management information
   */
  getDockerServiceInfo() {
    const dockerConfig = this.dockerService.getConfig();
    return {
      containerName: dockerConfig.containerName,
      dockerImage: 'huggingface-text-to-image:latest',
      ports: [8007],
      command: `docker-compose -f ${dockerConfig.composeFile} up -d ${dockerConfig.serviceName}`,
      composeService: dockerConfig.serviceName,
      composeFile: dockerConfig.composeFile,
      healthCheckUrl: dockerConfig.healthCheckUrl || `${this.config.baseUrl}/health`,
      network: 'huggingface-network',
      serviceDirectory: 'services/huggingface'
    };
  }

  /**
   * Build the Docker image
   */
  async buildImage(): Promise<boolean> {
    try {
      console.log('[HuggingFaceDockerService] Building HuggingFace Docker image...');
      // DockerComposeService doesn't have build method, use docker-compose build directly
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);
      
      const buildCmd = `docker-compose -f ${this.config.composeFile} build`;
      await execAsync(buildCmd, { cwd: this.config.workingDirectory });
      return true;
    } catch (error) {
      console.error('[HuggingFaceDockerService] Failed to build image:', error);
      return false;
    }
  }

  /**
   * Pull the latest image
   */
  async pullImage(): Promise<boolean> {
    try {
      console.log('[HuggingFaceDockerService] Pulling HuggingFace Docker image...');
      // DockerComposeService doesn't have pull method, use docker-compose pull directly
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);
      
      const pullCmd = `docker-compose -f ${this.config.composeFile} pull`;
      await execAsync(pullCmd, { cwd: this.config.workingDirectory });
      return true;
    } catch (error) {
      console.error('[HuggingFaceDockerService] Failed to pull image:', error);
      return false;
    }
  }

  /**
   * Get container resource usage
   */
  async getResourceUsage(): Promise<any> {
    try {
      // This would require docker stats command - not implemented in base service
      console.log('[HuggingFaceDockerService] Resource usage monitoring not implemented yet');
      return null;
    } catch (error) {
      console.error('[HuggingFaceDockerService] Failed to get resource usage:', error);
      return null;
    }
  }

  /**
   * Execute a command in the container
   */
  async executeCommand(command: string): Promise<string> {
    try {
      // DockerComposeService doesn't expose executeCommand publicly
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);
      
      const execCmd = `docker-compose -f ${this.config.composeFile} exec ${this.config.serviceName} ${command}`;
      const { stdout } = await execAsync(execCmd, { cwd: this.config.workingDirectory });
      return stdout.trim();
    } catch (error) {
      console.error('[HuggingFaceDockerService] Failed to execute command:', error);
      throw error;
    }
  }
}
