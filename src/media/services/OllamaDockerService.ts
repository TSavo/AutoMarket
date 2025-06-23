import { DockerComposeService, DockerComposeConfig } from '../../services/DockerComposeService';

export interface OllamaDockerConfig {
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

export class OllamaDockerService {
  private dockerService: DockerComposeService;
  private config: OllamaDockerConfig;

  constructor(config: OllamaDockerConfig = {}) {
    this.config = {
      baseUrl: config.baseUrl || 'http://localhost:11434',
      serviceName: config.serviceName || 'ollama',
      composeFile: config.composeFile || 'services/ollama/docker-compose.yml',
      containerName: config.containerName || 'ollama-service',
      healthCheckUrl: config.healthCheckUrl || 'http://localhost:11434/api/tags',
      workingDirectory: config.workingDirectory || process.cwd(),
    };

    const dockerConfig: DockerComposeConfig = {
      composeFile: this.config.composeFile!,
      serviceName: this.config.serviceName!,
      containerName: this.config.containerName!,
      healthCheckUrl: this.config.healthCheckUrl!,
      workingDirectory: this.config.workingDirectory!,
    };

    this.dockerService = new DockerComposeService(dockerConfig);
  }

  async startService(): Promise<boolean> {
    try {
      return await this.dockerService.startService();
    } catch (error) {
      console.error('[OllamaDockerService] Failed to start service:', error);
      return false;
    }
  }

  async stopService(): Promise<boolean> {
    try {
      return await this.dockerService.stopService();
    } catch (error) {
      console.error('[OllamaDockerService] Failed to stop service:', error);
      return false;
    }
  }

  async getServiceStatus(): Promise<ServiceStatus> {
    try {
      const status = await this.dockerService.getServiceStatus();
      return {
        running: status.running,
        health: (status.health as ServiceStatus['health']) || 'none',
        state: status.state || 'unknown',
        containerId: status.containerName,
      };
    } catch (error) {
      console.error('[OllamaDockerService] Failed to get service status:', error);
      return { running: false, health: 'unhealthy', state: 'error' };
    }
  }

  async waitForHealthy(timeoutMs: number = 60000): Promise<boolean> {
    try {
      return await this.dockerService.waitForHealthy(timeoutMs);
    } catch (error) {
      console.error('[OllamaDockerService] Service health check failed:', error);
      return false;
    }
  }

  isRunning(): Promise<boolean> {
    return this.getServiceStatus().then(status => status.running).catch(() => false);
  }

  isHealthy(): Promise<boolean> {
    return this.getServiceStatus().then(status => status.running && status.health === 'healthy').catch(() => false);
  }

  getConfig(): OllamaDockerConfig {
    return { ...this.config };
  }

  getDockerServiceInfo() {
    const dockerConfig = this.dockerService.getConfig();
    return {
      containerName: dockerConfig.containerName,
      dockerImage: 'ollama/ollama:latest',
      ports: [11434],
      composeService: dockerConfig.serviceName,
      composeFile: dockerConfig.composeFile,
      healthCheckUrl: dockerConfig.healthCheckUrl || `${this.config.baseUrl}/api/tags`,
      network: 'ollama-network',
      serviceDirectory: 'services/ollama',
    };
  }

  getDockerComposeService(): DockerComposeService {
    return this.dockerService;
  }
}
