/**
 * Service Registry for Configuration-Driven Docker Services
 * 
 * Simple approach:
 * 1. Clone repo from GitHub URL
 * 2. Read prizm.service.yml configuration
 * 3. Return DockerService configured with that yml
 */

import { DockerComposeService } from '../../services/DockerComposeService';

/**
 * Docker service interface
 */
export interface DockerService {
  startService(): Promise<boolean>;
  stopService(): Promise<boolean>;
  restartService(): Promise<boolean>;
  getServiceStatus(): Promise<ServiceStatus>;
  isServiceHealthy(): Promise<boolean>;
  isServiceRunning(): Promise<boolean>;
  waitForHealthy(timeoutMs?: number): Promise<boolean>;
  getDockerComposeService(): DockerComposeService;
  getServiceInfo(): ServiceInfo;
}

/**
 * Service status interface
 */
export interface ServiceStatus {
  running: boolean;
  health: 'healthy' | 'unhealthy' | 'starting' | 'none';
  state: string;
  containerId?: string;
}

/**
 * Service information interface
 */
export interface ServiceInfo {
  containerName: string;
  dockerImage: string;
  ports: number[];
  composeService: string;
  composeFile: string;
  healthCheckUrl: string;
  network: string;
  serviceDirectory: string;
}

/**
 * Prizm Service Configuration (from prizm.service.yml)
 */
export interface PrizmServiceConfig {
  name: string;
  version: string;
  description?: string;
  docker: {
    composeFile: string;
    serviceName: string;
    image?: string;
    ports: number[];
    healthCheck?: {
      url: string;
      interval?: string;
      timeout?: string;
      retries?: number;
    };
    environment?: Record<string, string>;
    volumes?: string[];
  };
  capabilities?: string[];
  requirements?: {
    gpu?: boolean;
    memory?: string;
    cpu?: string;
  };
}

/**
 * Error thrown when a service is not found
 */
export class ServiceNotFoundError extends Error {
  constructor(id: string) {
    super(`Service '${id}' not found in registry`);
    this.name = 'ServiceNotFoundError';
  }
}

/**
 * Error thrown when a service cannot be created
 */
export class ServiceCreationError extends Error {
  constructor(id: string, reason: string) {
    super(`Failed to create service '${id}': ${reason}`);
    this.name = 'ServiceCreationError';
  }
}

/**
 * Service Registry - Configuration-driven Docker service loading
 */
export class ServiceRegistry {
  private static instance: ServiceRegistry;
  private serviceCache = new Map<string, DockerService>();

  private constructor() {}

  /**
   * Get the singleton instance
   */
  public static getInstance(): ServiceRegistry {
    if (!ServiceRegistry.instance) {
      ServiceRegistry.instance = new ServiceRegistry();
    }
    return ServiceRegistry.instance;
  }

  /**
   * Get a service by URL or ID
   * 
   * Simple process:
   * 1. Clone repo from GitHub URL
   * 2. Read prizm.service.yml
   * 3. Return DockerService configured with that yml
   */
  public async getService(identifier: string, config?: any): Promise<DockerService> {
    // Check cache first
    const cached = this.serviceCache.get(identifier);
    if (cached) {
      return cached;
    }

    console.log(`🔄 Loading service: ${identifier}`);

    try {
      // Parse identifier to determine loading method
      if (this.isGitHubUrl(identifier)) {
        return await this.loadServiceFromGitHub(identifier, config);
      } else {
        throw new ServiceNotFoundError(identifier);
      }
    } catch (error) {
      console.error(`❌ Failed to load service ${identifier}:`, error);
      throw new ServiceCreationError(identifier, error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Check if identifier is a GitHub URL
   */
  private isGitHubUrl(identifier: string): boolean {
    return identifier.startsWith('https://github.com/') || 
           identifier.startsWith('github:');
  }

  /**
   * Load service from GitHub repository
   * 1. Clone repo
   * 2. Read prizm.service.yml  
   * 3. Return configured DockerService
   */
  private async loadServiceFromGitHub(identifier: string, userConfig?: any): Promise<DockerService> {
    const { owner, repo, ref } = this.parseGitHubUrl(identifier);
    
    console.log(`📥 Cloning service repository: ${owner}/${repo}@${ref}`);

    const crypto = await import('crypto');
    const path = await import('path');
    const fs = await import('fs/promises');
    
    const tmpDir = path.join(process.cwd(), 'temp', 'services', crypto.randomBytes(8).toString('hex'));
    
    try {
      // Clean up any existing directory first
      await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
      await fs.mkdir(tmpDir, { recursive: true });

      // Clone the repository
      const { execSync } = await import('child_process');
      const repoUrl = `https://github.com/${owner}/${repo}.git`;
      const cloneCommand = `git clone --depth 1 --branch ${ref} "${repoUrl}" "${tmpDir}"`;
      
      try {
        execSync(cloneCommand, { stdio: 'pipe', timeout: 180000 });
      } catch (gitError) {
        // Fallback: try without branch specification
        const fallbackCommand = `git clone --depth 1 "${repoUrl}" "${tmpDir}"`;
        execSync(fallbackCommand, { stdio: 'pipe', timeout: 180000 });
      }

      // Read prizm.service.yml configuration
      const configPath = path.join(tmpDir, 'prizm.service.yml');
      const configExists = await fs.access(configPath).then(() => true).catch(() => false);
      
      if (!configExists) {
        throw new Error(`No prizm.service.yml found in repository ${owner}/${repo}`);
      }

      console.log(`📋 Reading service configuration from prizm.service.yml`);
      const configContent = await fs.readFile(configPath, 'utf-8');
      
      // Parse YAML configuration
      const yaml = await import('yaml');
      const serviceConfig: PrizmServiceConfig = yaml.parse(configContent);
      
      console.log(`✅ Loaded service config: ${serviceConfig.name} v${serviceConfig.version}`);

      // Create DockerService with the configuration
      const dockerService = new ConfigurableDockerService(tmpDir, serviceConfig, userConfig);
      
      // Cache the service
      this.serviceCache.set(identifier, dockerService);
      
      console.log(`✅ Service ready: ${serviceConfig.name}`);
      return dockerService;

    } catch (error) {
      // Cleanup on error
      await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
      throw error;
    }
  }

  /**
   * Parse GitHub URL into components
   */
  private parseGitHubUrl(identifier: string): { owner: string; repo: string; ref: string } {
    if (identifier.startsWith('https://github.com/')) {
      const url = identifier.replace('https://github.com/', '');
      const [ownerRepo, ref] = url.split('@');
      const [owner, repo] = ownerRepo.split('/');
      return { owner, repo, ref: ref || 'main' };
    } else if (identifier.startsWith('github:')) {
      const url = identifier.replace('github:', '');
      const [ownerRepo, ref] = url.split('@');
      const [owner, repo] = ownerRepo.split('/');
      return { owner, repo, ref: ref || 'main' };
    } else {
      throw new Error(`Invalid GitHub URL: ${identifier}`);
    }
  }

  /**
   * Clear the service cache
   */
  public clearCache(): void {
    this.serviceCache.clear();
  }

  /**
   * Get registry statistics
   */
  public getStats(): { cachedServices: number } {
    return { cachedServices: this.serviceCache.size };
  }
}

/**
 * ConfigurableDockerService - Generic Docker service configured from prizm.service.yml
 */
class ConfigurableDockerService implements DockerService {
  private dockerComposeService: DockerComposeService;
  private serviceConfig: PrizmServiceConfig;
  private serviceDirectory: string;

  constructor(serviceDirectory: string, serviceConfig: PrizmServiceConfig, userConfig?: any) {
    this.serviceDirectory = serviceDirectory;
    this.serviceConfig = serviceConfig;
    
    // Create DockerComposeService with the configuration
    this.dockerComposeService = new DockerComposeService({
      composeFile: this.serviceConfig.docker.composeFile,
      serviceName: this.serviceConfig.docker.serviceName,
      containerName: `${this.serviceConfig.name}-${this.serviceConfig.docker.serviceName}`,
      healthCheckUrl: this.serviceConfig.docker.healthCheck?.url || `http://localhost:${this.serviceConfig.docker.ports[0]}/health`,
      workingDirectory: serviceDirectory
    });
  }
  async startService(): Promise<boolean> {
    return this.dockerComposeService.startService();
  }

  async stopService(): Promise<boolean> {
    return this.dockerComposeService.stopService();
  }

  async restartService(): Promise<boolean> {
    return this.dockerComposeService.restartService();
  }

  async getServiceStatus(): Promise<ServiceStatus> {
    const status = await this.dockerComposeService.getServiceStatus();
    return {
      running: status.running,
      health: (status.health as 'healthy' | 'unhealthy' | 'starting' | 'none') || 'none',
      state: status.state || 'unknown',
      containerId: status.containerName
    };
  }

  async isServiceHealthy(): Promise<boolean> {
    const status = await this.getServiceStatus();
    return status.running && status.health === 'healthy';
  }

  async isServiceRunning(): Promise<boolean> {
    const status = await this.getServiceStatus();
    return status.running;
  }

  async waitForHealthy(timeoutMs: number = 120000): Promise<boolean> {
    return this.dockerComposeService.waitForHealthy(timeoutMs);
  }

  getDockerComposeService(): DockerComposeService {
    return this.dockerComposeService;
  }

  getServiceInfo(): ServiceInfo {
    return {
      containerName: `${this.serviceConfig.name}-${this.serviceConfig.docker.serviceName}`,
      dockerImage: this.serviceConfig.docker.image || 'unknown',
      ports: this.serviceConfig.docker.ports,
      composeService: this.serviceConfig.docker.serviceName,
      composeFile: this.serviceConfig.docker.composeFile,
      healthCheckUrl: this.serviceConfig.docker.healthCheck?.url || `http://localhost:${this.serviceConfig.docker.ports[0]}/health`,
      network: `${this.serviceConfig.name}-network`,
      serviceDirectory: this.serviceDirectory
    };
  }
}

/**
 * Convenience function to get the registry instance
 */
export function getServiceRegistry(): ServiceRegistry {
  return ServiceRegistry.getInstance();
}

export default ServiceRegistry;
