/**
 * Service Registry for Configuration-Driven Service Management
 * 
 * Manages Docker services in two ways:
 * 1. Static services: Class-based services that self-register
 * 2. Dynamic services: Configuration-driven services from GitHub repos with prizm.service.yml
 */

import { DockerComposeService } from '../../services/DockerComposeService';

/**
 * Common interface that all Docker services must implement
 */
export interface DockerService {
  startService(): Promise<boolean>;
  stopService(): Promise<boolean>;
  restartService(): Promise<boolean>;
  getServiceStatus(): Promise<any>;
  isServiceHealthy(): Promise<boolean>;
  isServiceRunning(): Promise<boolean>;
  waitForHealthy(timeoutMs?: number): Promise<boolean>;
  getDockerComposeService(): DockerComposeService;
  getServiceInfo(): any;
}

/**
 * Constructor type for static services
 */
export type ServiceConstructor = new (config?: any) => DockerService;

/**
 * Service configuration from prizm.service.yml
 */
export interface ServiceConfig {
  name: string;
  description?: string;
  version?: string;
  compose: {
    file: string;                    // docker-compose.yml path
    service: string;                 // service name in compose file
    healthCheck?: string;            // health check URL path
    ports?: number[];               // exposed ports
  };
  environment?: Record<string, string>;
  volumes?: string[];
  networks?: string[];
  dependencies?: string[];           // other services this depends on
  metadata?: {
    provider?: string;              // which provider this service is for
    capabilities?: string[];        // what this service provides
    tags?: string[];               // categorization tags
  };
}

/**
 * Service status information
 */
export interface ServiceStatus {
  running: boolean;
  health: 'healthy' | 'unhealthy' | 'starting' | 'none';
  state: string;
  containerId?: string;
}

/**
 * Parsed service identifier for configuration loading
 */
interface ParsedServiceIdentifier {
  type: 'github' | 'static';
  owner?: string;
  repo?: string;
  ref?: string;
  staticId?: string;
}

/**
 * Docker service wrapper that manages a configuration-driven service
 */
export class ConfigurableDockerService {
  private dockerService: DockerComposeService;
  private config: ServiceConfig;
  private repoPath?: string;

  constructor(config: ServiceConfig, repoPath?: string) {
    this.config = config;
    this.repoPath = repoPath;
      // Create DockerComposeService with the configuration
    const composePath = repoPath 
      ? `${repoPath}/${config.compose.file}`
      : config.compose.file;
      
    this.dockerService = new DockerComposeService({
      composeFile: composePath,
      serviceName: config.compose.service,
      containerName: config.compose.service, // Use service name as container name
      healthCheckUrl: config.compose.healthCheck ? 
        `http://localhost:${config.compose.ports?.[0] || 8080}${config.compose.healthCheck}` : 
        undefined,
      workingDirectory: repoPath
    });
  }
  async startService(): Promise<boolean> {
    return this.dockerService.startService();
  }

  async stopService(): Promise<boolean> {
    return this.dockerService.stopService();
  }

  async restartService(): Promise<boolean> {
    return this.dockerService.restartService();
  }

  async getServiceStatus(): Promise<any> {
    return this.dockerService.getServiceStatus();
  }

  async isServiceHealthy(): Promise<boolean> {
    const status = await this.getServiceStatus();
    return status.running && status.health === 'healthy';
  }

  async isServiceRunning(): Promise<boolean> {
    const status = await this.getServiceStatus();
    return status.running;
  }

  async waitForHealthy(timeoutMs: number = 60000): Promise<boolean> {
    return this.dockerService.waitForHealthy(timeoutMs);
  }

  getDockerComposeService(): DockerComposeService {
    return this.dockerService;
  }

  getServiceInfo() {
    return {
      name: this.config.name,
      description: this.config.description,
      version: this.config.version,
      containerName: this.config.compose.service,
      dockerImage: 'from-compose', // Will be read from compose file
      ports: this.config.compose.ports || [],
      composeService: this.config.compose.service,
      composeFile: this.config.compose.file,
      healthCheckUrl: this.config.compose.healthCheck || '',
      network: 'default',
      serviceDirectory: this.repoPath || '.',
      metadata: this.config.metadata
    };
  }

  getConfig(): ServiceConfig {
    return { ...this.config };
  }
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
 * Service Registry - Singleton for managing Docker service constructors
 * 
 * Supports:
 * - Lazy instantiation via constructors
 * - Auto-configuration from environment
 * - Dynamic loading from URLs/packages
 * - Error handling and graceful fallbacks
 */
export class ServiceRegistry {
  private static instance: ServiceRegistry;
  private services = new Map<string, ServiceConstructor>();
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
   * Register a service constructor
   */
  public register(id: string, serviceClass: ServiceConstructor): void {
    this.services.set(id, serviceClass);
  }

  /**
   * Get available service IDs
   */
  public getAvailableServices(): string[] {
    return Array.from(this.services.keys());
  }

  /**
   * Check if a service is registered
   */
  public hasService(id: string): boolean {
    return this.services.has(id);
  }

  /**
   * Get a service by ID or URL with lazy instantiation
   */
  public async getService(identifier: string, config?: any): Promise<DockerService> {
    // Handle static services (existing behavior)
    if (this.services.has(identifier)) {
      // Check cache first
      const cached = this.serviceCache.get(identifier);
      if (cached) {
        return cached;
      }

      // Get constructor
      const ServiceClass = this.services.get(identifier)!;
      try {
        // Create service instance
        const service = new ServiceClass(config);
        
        // Cache for future use
        this.serviceCache.set(identifier, service);
        
        return service;
      } catch (error) {
        throw new ServiceCreationError(identifier, error instanceof Error ? error.message : String(error));
      }
    }

    // Handle dynamic services (new behavior)
    if (this.isDynamicIdentifier(identifier)) {
      return this.loadDynamicService(identifier, config);
    }

    throw new ServiceNotFoundError(identifier);
  }

  /**
   * Check if identifier is a dynamic service (URL, package name, etc.)
   */
  private isDynamicIdentifier(identifier: string): boolean {
    return identifier.startsWith('http') || 
           identifier.startsWith('@') || 
           identifier.includes('/') ||
           identifier.startsWith('npm:') ||
           identifier.startsWith('github:') ||
           identifier.startsWith('file:');
  }

  /**
   * Load a dynamic service from URL, package, etc.
   */
  private async loadDynamicService(identifier: string, config?: any): Promise<DockerService> {
    // Check cache first
    const cached = this.serviceCache.get(identifier);
    if (cached) {
      return cached;
    }

    console.log(`🔄 Loading dynamic service: ${identifier}`);

    try {
      // Parse the identifier
      const parsed = this.parseIdentifier(identifier);
      
      // Load based on type
      let service: DockerService;
      switch (parsed.type) {
        case 'npm':
          service = await this.loadNpmService(parsed, config);
          break;
        case 'github':
          service = await this.loadGitHubService(parsed, config);
          break;
        case 'file':
          service = await this.loadFileService(parsed, config);
          break;
        default:
          throw new Error(`Unsupported service type: ${parsed.type}`);
      }

      // Validate service implements interface
      await this.validateService(service);

      // Cache the service
      this.serviceCache.set(identifier, service);

      console.log(`✅ Dynamic service loaded: ${identifier}`);
      return service;

    } catch (error) {
      console.error(`❌ Failed to load dynamic service ${identifier}:`, error);
      throw new ServiceCreationError(identifier, error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Parse service identifier into type and details
   */
  private parseIdentifier(identifier: string): ParsedServiceIdentifier {    // npm: @scope/package@version or npm:package@version
    if (identifier.startsWith('@') || identifier.startsWith('npm:')) {
      const cleanId = identifier.replace(/^npm:/, '');
      
      if (cleanId.startsWith('@')) {
        // Handle @scope/package@version
        const parts = cleanId.split('@');
        if (parts.length >= 3) {
          // @scope/package@version -> ['', 'scope/package', 'version']
          const packageName = `@${parts[1]}`;
          const version = parts[2];
          return { type: 'npm', packageName, version };
        } else {
          // @scope/package -> ['', 'scope/package']
          const packageName = `@${parts[1]}`;
          return { type: 'npm', packageName, version: 'latest' };
        }
      } else {
        // Handle regular package@version
        const [packageName, version] = cleanId.split('@');
        return { type: 'npm', packageName, version: version || 'latest' };
      }
    }

    // GitHub: https://github.com/owner/repo or github:owner/repo@ref
    if (identifier.startsWith('https://github.com/') || identifier.startsWith('github:')) {
      let cleanId = identifier;
      if (identifier.startsWith('https://github.com/')) {
        cleanId = identifier.replace('https://github.com/', '');
      } else {
        cleanId = identifier.replace('github:', '');
      }
      
      const [ownerRepo, ref] = cleanId.split('@');
      const [owner, repo] = ownerRepo.split('/');
      
      return {
        type: 'github',
        owner,
        repo,
        ref: ref || 'main'
      };
    }

    // File: file:///path/to/service
    if (identifier.startsWith('file:')) {
      return {
        type: 'file',
        path: identifier.replace('file://', '')
      };
    }

    throw new Error(`Cannot parse service identifier: ${identifier}`);
  }

  /**
   * Load service from npm package
   */
  private async loadNpmService(parsed: ParsedServiceIdentifier, config?: any): Promise<DockerService> {
    const { packageName, version } = parsed;
    
    if (!packageName) {
      throw new Error('Package name is required for npm service');
    }
    
    // For now, attempt dynamic import (assumes package is already installed)
    try {
      const serviceModule = await import(packageName);
      const ServiceClass = serviceModule.default || serviceModule[Object.keys(serviceModule)[0]];
      
      if (!ServiceClass) {
        throw new Error('No default export found in service package');
      }

      return new ServiceClass(config);
    } catch (error) {
      throw new Error(`Failed to load npm service ${packageName}@${version}: ${error.message}`);
    }
  }
  /**
   * Load service from GitHub repository
   */
  private async loadGitHubService(parsed: ParsedServiceIdentifier, config?: any): Promise<DockerService> {
    const { owner, repo, ref } = parsed;
    
    if (!owner || !repo) {
      throw new Error('Owner and repo are required for GitHub service');
    }

    console.log(`📥 Downloading GitHub service: ${owner}/${repo}@${ref}`);

    try {
      // Create temp directory for cloning
      const crypto = await import('crypto');
      const path = await import('path');
      const fs = await import('fs/promises');
      
      const tmpDir = path.join(process.cwd(), 'temp', 'services', crypto.randomBytes(8).toString('hex'));
        // Ensure temp directory exists
      await fs.mkdir(tmpDir, { recursive: true });

      // Clean up any existing directory first
      try {
        await fs.rm(tmpDir, { recursive: true, force: true });
        await fs.mkdir(tmpDir, { recursive: true });
      } catch (cleanupError) {
        // Ignore cleanup errors
      }

      // Use git clone
      console.log(`🌀 Cloning repository: ${owner}/${repo}@${ref}`);
      
      const { execSync } = await import('child_process');
      
      // Clone the repository
      const repoUrl = `https://github.com/${owner}/${repo}.git`;
      const cloneCommand = `git clone --depth 1 --branch ${ref} "${repoUrl}" "${tmpDir}"`;
      
      try {
        execSync(cloneCommand, { 
          stdio: 'pipe',
          timeout: 180000 // 3 minute timeout
        });
      } catch (gitError) {
        // Fallback: try cloning without branch specification
        const fallbackCommand = `git clone --depth 1 "${repoUrl}" "${tmpDir}"`;
        execSync(fallbackCommand, { 
          stdio: 'pipe',
          timeout: 180000 
        });
      }

      // Check for package.json and install dependencies if needed
      const packageJsonPath = path.join(tmpDir, 'package.json');
      const packageExists = await fs.access(packageJsonPath).then(() => true).catch(() => false);
      
      if (packageExists) {
        console.log(`📦 Installing dependencies for ${owner}/${repo}...`);
        try {
          execSync('npm install --production --silent', { 
            cwd: tmpDir, 
            stdio: 'pipe',
            timeout: 300000 // 5 minute timeout
          });
        } catch (error) {
          console.warn(`Warning: Failed to install dependencies: ${error.message}`);
        }
      }

      // Check for TypeScript and compile if needed
      const tsConfigPath = path.join(tmpDir, 'tsconfig.json');
      const tsConfigExists = await fs.access(tsConfigPath).then(() => true).catch(() => false);
      
      if (tsConfigExists) {
        console.log(`🔨 Compiling TypeScript for ${owner}/${repo}...`);
        try {
          execSync('npx tsc --noEmit false --outDir dist', { 
            cwd: tmpDir, 
            stdio: 'pipe',
            timeout: 180000 // 3 minute timeout
          });
        } catch (error) {
          console.warn(`Warning: TypeScript compilation failed: ${error.message}`);
        }
      }

      // Load service metadata if available
      const prizmConfigPath = path.join(tmpDir, 'prizm.config.json');
      let prizmConfig = null;
      try {
        const configContent = await fs.readFile(prizmConfigPath, 'utf-8');
        prizmConfig = JSON.parse(configContent);
        console.log(`📋 Loaded Prizm config: ${JSON.stringify(prizmConfig, null, 2)}`);
      } catch (error) {
        console.log(`ℹ️ No prizm.config.json found, using defaults`);
      }

      // Determine entry point
      let entryPoint = path.join(tmpDir, 'index.js');
      if (packageExists) {
        const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
        if (packageJson.main) {
          entryPoint = path.join(tmpDir, packageJson.main);
        }
      }

      // Check if dist directory exists (for compiled TypeScript)
      const distDir = path.join(tmpDir, 'dist');
      const distExists = await fs.access(distDir).then(() => true).catch(() => false);
      if (distExists) {
        entryPoint = path.join(distDir, 'index.js');
      }

      // Also check for src/index.ts if no compiled version
      if (!await fs.access(entryPoint).then(() => true).catch(() => false)) {
        const srcIndex = path.join(tmpDir, 'src', 'index.ts');
        if (await fs.access(srcIndex).then(() => true).catch(() => false)) {
          entryPoint = srcIndex;
        }
      }      // Load the service
      console.log(`🚀 Loading service from: ${entryPoint}`);
      const absoluteEntryPoint = path.resolve(entryPoint);
      
      // For TypeScript files, use tsx for dynamic loading
      let serviceModule;
      if (entryPoint.endsWith('.ts')) {
        try {
          process.env.TSX_TSCONFIG_PATH = path.join(tmpDir, 'tsconfig.json');
          // Convert Windows path to file:// URL for import
          const fileUrl = `file://${absoluteEntryPoint.replace(/\\/g, '/')}`;
          serviceModule = await import(fileUrl);
        } catch (error) {
          throw new Error(`Failed to load TypeScript service: ${error.message}`);
        }
      } else {
        // Regular JavaScript import - convert to file:// URL on Windows
        delete require.cache[absoluteEntryPoint];
        const fileUrl = `file://${absoluteEntryPoint.replace(/\\/g, '/')}`;
        serviceModule = await import(fileUrl);
      }
      
      const ServiceClass = serviceModule.default || serviceModule[Object.keys(serviceModule)[0]];
      
      if (!ServiceClass) {
        throw new Error('No default export found in service package');
      }

      const service = new ServiceClass(config);

      // Cleanup temp files after successful load
      setTimeout(async () => {
        try {
          await fs.rm(tmpDir, { recursive: true, force: true });
          console.log(`🧹 Cleaned up temp files for ${owner}/${repo}`);
        } catch (error) {
          console.warn(`Warning: Failed to cleanup temp files: ${error.message}`);
        }
      }, 5000); // 5 second delay to allow module to fully load

      console.log(`✅ Successfully loaded GitHub service: ${owner}/${repo}@${ref}`);
      return service;

    } catch (error) {
      throw new Error(`Failed to load GitHub service ${owner}/${repo}@${ref}: ${error.message}`);
    }
  }

  /**
   * Load service from local file
   */
  private async loadFileService(parsed: ParsedServiceIdentifier, config?: any): Promise<DockerService> {
    const { path } = parsed;
    
    if (!path) {
      throw new Error('File path is required for file service');
    }
    
    try {
      const serviceModule = await import(path);
      const ServiceClass = serviceModule.default || serviceModule[Object.keys(serviceModule)[0]];
      
      if (!ServiceClass) {
        throw new Error('No default export found in service file');
      }

      return new ServiceClass(config);
    } catch (error) {
      throw new Error(`Failed to load file service ${path}: ${error.message}`);
    }
  }

  /**
   * Validate that a loaded service implements the DockerService interface
   */
  private async validateService(service: any): Promise<void> {
    const requiredMethods = [
      'startService', 'stopService', 'restartService', 
      'getServiceStatus', 'isServiceHealthy', 'isServiceRunning',
      'waitForHealthy', 'getDockerComposeService', 'getServiceInfo'
    ];

    for (const method of requiredMethods) {
      if (typeof service[method] !== 'function') {
        throw new Error(`Service missing required method: ${method}`);
      }
    }

    // Additional validation could include:
    // - Check service configuration
    // - Validate Docker Compose files
    // - Security scanning
  }

  /**
   * Get all services as instances
   */
  public async getServices(): Promise<DockerService[]> {
    const services: DockerService[] = [];
    
    for (const [id] of Array.from(this.services)) {
      try {
        const service = await this.getService(id);
        services.push(service);
      } catch (error) {
        console.warn(`Failed to create service ${id}:`, error);
      }
    }
    
    return services;
  }

  /**
   * Start all registered services
   */
  public async startAllServices(): Promise<{ [id: string]: boolean }> {
    const results: { [id: string]: boolean } = {};
    const services = await this.getServices();
    
    for (const service of services) {
      const serviceInfo = service.getServiceInfo();
      try {
        results[serviceInfo.composeService] = await service.startService();
      } catch (error) {
        console.error(`Failed to start service ${serviceInfo.composeService}:`, error);
        results[serviceInfo.composeService] = false;
      }
    }
    
    return results;
  }

  /**
   * Stop all registered services
   */
  public async stopAllServices(): Promise<{ [id: string]: boolean }> {
    const results: { [id: string]: boolean } = {};
    const services = await this.getServices();
    
    for (const service of services) {
      const serviceInfo = service.getServiceInfo();
      try {
        results[serviceInfo.composeService] = await service.stopService();
      } catch (error) {
        console.error(`Failed to stop service ${serviceInfo.composeService}:`, error);
        results[serviceInfo.composeService] = false;
      }
    }
    
    return results;
  }

  /**
   * Get health status of all services
   */
  public async getAllServiceStatus(): Promise<{ [id: string]: ServiceStatus }> {
    const statuses: { [id: string]: ServiceStatus } = {};
    const services = await this.getServices();
    
    for (const service of services) {
      const serviceInfo = service.getServiceInfo();
      try {
        statuses[serviceInfo.composeService] = await service.getServiceStatus();
      } catch (error) {
        console.error(`Failed to get status for service ${serviceInfo.composeService}:`, error);
        statuses[serviceInfo.composeService] = {
          running: false,
          health: 'unhealthy',
          state: 'error'
        };
      }
    }
    
    return statuses;
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
  public getStats(): {
    totalServices: number;
    cachedServices: number;
  } {
    return {
      totalServices: this.services.size,
      cachedServices: this.serviceCache.size
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
