/**
 * Provider Registry for Elegant Provider Management
 * 
 * Implements the singleton pattern with constructor-based registration
 * for lazy instantiation and auto-configuration of providers.
 */

import { MediaProvider, MediaCapability } from '../types/provider';
import { DockerBackedMediaProviderAdapter } from '../providers/docker/DockerBackedMediaProviderAdapter';

/**
 * Provider constructor type
 */
export type ProviderConstructor = new () => MediaProvider;

/**
 * Parsed provider identifier for dynamic loading
 */
interface ParsedProviderIdentifier {
  type: 'npm' | 'github' | 'file';
  packageName?: string;
  version?: string;
  owner?: string;
  repo?: string;
  ref?: string;
  path?: string;
  defaultService?: string; // Name of the service within docker-compose.yml to manage
}

/**
 * Error thrown when a provider is not found
 */
export class ProviderNotFoundError extends Error {
  constructor(id: string) {
    super(`Provider '${id}' not found in registry`);
    this.name = 'ProviderNotFoundError';
  }
}

/**
 * Error thrown when a provider cannot be created
 */
export class ProviderCreationError extends Error {
  constructor(id: string, reason: string) {
    super(`Failed to create provider '${id}': ${reason}`);
    this.name = 'ProviderCreationError';
  }
}

/**
 * Provider Registry - Singleton for managing provider constructors
 * 
 * Supports:
 * - Lazy instantiation via constructors
 * - Auto-configuration from environment
 * - Error handling and graceful fallbacks
 * - Type-safe provider access
 */
export class ProviderRegistry {
  private static instance: ProviderRegistry;
  private providers = new Map<string, ProviderConstructor>();
  private providerCache = new Map<string, MediaProvider>();

  private constructor() {}

  /**
   * Get the singleton instance
   */
  public static getInstance(): ProviderRegistry {
    if (!ProviderRegistry.instance) {
      ProviderRegistry.instance = new ProviderRegistry();
    }
    return ProviderRegistry.instance;
  }

  /**
   * Register a provider constructor
   */
  public register(id: string, providerClass: ProviderConstructor): void {
    this.providers.set(id, providerClass);
  }

  /**
   * Get available provider IDs
   */
  public getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Check if a provider is registered
   */
  public hasProvider(id: string): boolean {
    return this.providers.has(id);
  }
  /**
   * Get a provider by ID or URL with lazy instantiation
   */
  public async getProvider(identifier: string): Promise<MediaProvider> {
    // Handle static providers (existing behavior)
    if (this.providers.has(identifier)) {
      // Check cache first
      const cached = this.providerCache.get(identifier);
      if (cached) {
        return cached;
      }

      // Get constructor
      const ProviderClass = this.providers.get(identifier)!;
      try {
        // Create provider instance
        const provider = new ProviderClass();
        
        // Cache for future use
        this.providerCache.set(identifier, provider);
        
        return provider;
      } catch (error) {
        throw new ProviderCreationError(identifier, error instanceof Error ? error.message : String(error));
      }
    }

    // Handle dynamic providers (new behavior)
    if (this.isDynamicIdentifier(identifier)) {
      return this.loadDynamicProvider(identifier);
    }

    throw new ProviderNotFoundError(identifier);
  }

  /**
   * Check if identifier is a dynamic provider (URL, package name, etc.)
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
   * Load a dynamic provider from URL, package, etc.
   */
  private async loadDynamicProvider(identifier: string): Promise<MediaProvider> {
    // Check cache first
    const cached = this.providerCache.get(identifier);
    if (cached) {
      return cached;
    }

    console.log(`🔄 Loading dynamic provider: ${identifier}`);

    try {
      // Parse the identifier
      const parsed = this.parseIdentifier(identifier);
      
      // Load based on type
      let provider: MediaProvider;
      switch (parsed.type) {
        case 'npm':
          provider = await this.loadNpmProvider(parsed);
          break;
        case 'github':
          provider = await this.loadGitHubProvider(parsed);
          break;
        case 'file':
          provider = await this.loadFileProvider(parsed);
          break;
        default:
          throw new Error(`Unsupported provider type: ${parsed.type}`);
      }

      // Validate provider implements interface
      await this.validateProvider(provider);

      // Cache the provider
      this.providerCache.set(identifier, provider);

      console.log(`✅ Dynamic provider loaded: ${identifier}`);
      return provider;

    } catch (error) {
      console.error(`❌ Failed to load dynamic provider ${identifier}:`, error);
      throw new ProviderCreationError(identifier, error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Parse provider identifier into type and details
   */
  private parseIdentifier(identifier: string): ParsedProviderIdentifier {    // npm: @scope/package@version or npm:package@version
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

    // File: file:///path/to/provider
    if (identifier.startsWith('file:')) {
      return {
        type: 'file',
        path: identifier.replace('file://', '')
      };
    }

    throw new Error(`Cannot parse provider identifier: ${identifier}`);
  }
  /**
   * Load provider from npm package
   */
  private async loadNpmProvider(parsed: ParsedProviderIdentifier): Promise<MediaProvider> {
    const { packageName, version } = parsed;
    
    if (!packageName) {
      throw new Error('Package name is required for npm provider');
    }
    
    // For now, attempt dynamic import (assumes package is already installed)
    try {
      const providerModule = await import(packageName);
      const ProviderClass = providerModule.default || providerModule[Object.keys(providerModule)[0]];
      
      if (!ProviderClass) {
        throw new Error('No default export found in provider package');
      }

      return new ProviderClass();
    } catch (error) {
      throw new Error(`Failed to load npm provider ${packageName}@${version}: ${error.message}`);
    }
  }  /**
   * Load provider from GitHub repository
   */
  private async loadGitHubProvider(parsed: ParsedProviderIdentifier): Promise<MediaProvider> {
    const { owner, repo, ref } = parsed;
    
    if (!owner || !repo) {
      throw new Error('Owner and repo are required for GitHub provider');
    }

    console.log(`📥 Downloading GitHub provider: ${owner}/${repo}@${ref}`);

    try {
      const crypto = await import('crypto');
      const path = await import('path');
      const fs = await import('fs/promises');
      const { execSync } = await import('child_process');
      const { DockerComposeService } = await import('../../services/DockerComposeService');

      const tmpDir = path.join(process.cwd(), 'temp', 'providers', crypto.randomBytes(8).toString('hex'));
      await fs.mkdir(tmpDir, { recursive: true });

      try {
        await fs.rm(tmpDir, { recursive: true, force: true });
        await fs.mkdir(tmpDir, { recursive: true });
      } catch (cleanupError) {
        // Ignore cleanup errors
      }

      console.log(`🌀 Cloning repository: ${owner}/${repo}@${ref}`);
      const repoUrl = `https://github.com/${owner}/${repo}.git`;
      const cloneCommand = `git clone --depth 1 --branch ${ref} "${repoUrl}" "${tmpDir}"`;
      
      try {
        execSync(cloneCommand, { 
          stdio: 'pipe',
          timeout: 180000 
        });
      } catch (gitError) {
        const fallbackCommand = `git clone --depth 1 "${repoUrl}" "${tmpDir}"`;
        execSync(fallbackCommand, { 
          stdio: 'pipe',
          timeout: 180000 
        });
      }

      const composeFilePath = path.join(tmpDir, 'docker-compose.yml');
      const serviceConfigPath = path.join(tmpDir, 'prizm.service.json');

      try {
        await fs.access(composeFilePath);
      } catch {
        throw new Error(`GitHub provider ${owner}/${repo} does not contain a docker-compose.yml`);
      }

      let serviceMetadata: any = {};
      try {
        const metadataContent = await fs.readFile(serviceConfigPath, 'utf-8');
        serviceMetadata = JSON.parse(metadataContent);
        console.log(`📋 Loaded Prizm service config: ${JSON.stringify(serviceMetadata, null, 2)}`);
      } catch (error) {
        console.log(`ℹ️ No prizm.service.json found for ${owner}/${repo}, using defaults. Error: ${error.message}`);
      }

      const dockerComposeService = new DockerComposeService({
        serviceName: serviceMetadata.serviceName || parsed.repo,
        composeFile: composeFilePath,
        containerName: serviceMetadata.containerName || `${parsed.repo}-container`,
        healthCheckUrl: serviceMetadata.healthCheckUrl,
        workingDirectory: tmpDir,
        defaultService: serviceMetadata.defaultService
      });

      const capabilities = serviceMetadata.capabilities || [];
      const providerId = serviceMetadata.id || parsed.repo;
      const providerName = serviceMetadata.name || `${parsed.repo} (Docker)`;

      const adapter = new DockerBackedMediaProviderAdapter(dockerComposeService, capabilities, providerId, providerName);

      // Cleanup temp files after successful load
      setTimeout(async () => {
        try {
          await fs.rm(tmpDir, { recursive: true, force: true });
          console.log(`🧹 Cleaned up temp files for ${owner}/${repo}`);
        } catch (error) {
          console.warn(`Warning: Failed to cleanup temp files: ${error.message}`);
        }
      }, 5000);

      console.log(`✅ Successfully loaded GitHub provider: ${owner}/${repo}@${ref}`);
      return adapter;

    } catch (error) {
      throw new Error(`Failed to load GitHub provider ${owner}/${repo}@${ref}: ${error.message}`);
    }
  }
  /**
   * Load provider from local file
   */
  private async loadFileProvider(parsed: ParsedProviderIdentifier): Promise<MediaProvider> {
    const { path } = parsed;
    
    if (!path) {
      throw new Error('File path is required for file provider');
    }
    
    try {
      const fs = await import('fs/promises');
      const pathModule = await import('path');
      const { DockerComposeService } = await import('../../services/DockerComposeService');

      const serviceDirectory = pathModule.resolve(path);
      const composeFilePath = pathModule.join(serviceDirectory, 'docker-compose.yml');
      const serviceConfigPath = pathModule.join(serviceDirectory, 'prizm.service.json');

      try {
        await fs.access(composeFilePath);
      } catch {
        throw new Error(`File provider at ${path} does not contain a docker-compose.yml`);
      }

      let serviceMetadata: any = {};
      try {
        const metadataContent = await fs.readFile(serviceConfigPath, 'utf-8');
        serviceMetadata = JSON.parse(metadataContent);
        console.log(`📋 Loaded Prizm service config: ${JSON.stringify(serviceMetadata, null, 2)}`);
      } catch (error) {
        console.log(`ℹ️ No prizm.service.json found for file provider at ${path}, using defaults. Error: ${error.message}`);
      }

      const dockerComposeService = new DockerComposeService({
        serviceName: serviceMetadata.serviceName || pathModule.basename(serviceDirectory),
        composeFile: composeFilePath,
        containerName: serviceMetadata.containerName || `${pathModule.basename(serviceDirectory)}-container`,
        healthCheckUrl: serviceMetadata.healthCheckUrl,
        workingDirectory: serviceDirectory,
        defaultService: serviceMetadata.defaultService
      });

      const capabilities = serviceMetadata.capabilities || [];
      const providerId = serviceMetadata.id || pathModule.basename(serviceDirectory);
      const providerName = serviceMetadata.name || `${providerId} (Docker)`;

      const adapter = new DockerBackedMediaProviderAdapter(dockerComposeService, capabilities, providerId, providerName);

      console.log(`✅ Successfully loaded file provider: ${path}`);
      return adapter;

    } catch (error) {
      throw new Error(`Failed to load file provider ${path}: ${error.message}`);
    }
  }

  /**
   * Validate that a loaded provider implements the MediaProvider interface
   */
  private async validateProvider(provider: any): Promise<void> {
    const { DockerBackedMediaProviderAdapter } = await import('../providers/docker/DockerBackedMediaProviderAdapter');
    if (!(provider instanceof DockerBackedMediaProviderAdapter)) {
      throw new Error('Loaded provider is not an instance of DockerBackedMediaProviderAdapter');
    }
  }
  /**
   * Get providers by capability with priority ordering
   */  public async getProvidersByCapability(capability: MediaCapability): Promise<MediaProvider[]> {
    const providers: MediaProvider[] = [];

    // Define priority order for text-to-image providers
    const textToImagePriority = [
      'huggingface-docker', // #1 Priority - Dynamic model loading
      'falai',
      'together',
      'replicate'
    ];

    // For TEXT_TO_IMAGE capability, use priority order
    if (capability === MediaCapability.TEXT_TO_IMAGE) {
      // First, add providers in priority order
      for (const priorityId of textToImagePriority) {
        if (this.providers.has(priorityId)) {
          try {
            const provider = await this.getProvider(priorityId);
            if (provider.capabilities && provider.capabilities.includes(capability)) {
              providers.push(provider);
            }
          } catch (error) {
            console.warn(`Failed to create priority provider ${priorityId}:`, error);
          }
        }
      }

      // Then add any remaining providers not in priority list
      for (const [id] of Array.from(this.providers)) {
        if (!textToImagePriority.includes(id)) {
          try {
            const provider = await this.getProvider(id);
            if (provider.capabilities && provider.capabilities.includes(capability)) {
              providers.push(provider);
            }
          } catch (error) {
            console.warn(`Failed to create provider ${id}:`, error);
          }
        }
      }
    } else {
      // For other capabilities, use default order
      for (const [id] of Array.from(this.providers)) {
        try {
          const provider = await this.getProvider(id);
          if (provider.capabilities && provider.capabilities.includes(capability)) {
            providers.push(provider);
          }
        } catch (error) {
          console.warn(`Failed to create provider ${id}:`, error);
        }
      }
    }

    return providers;
  }

  /**
   * Get all providers as instances (for compatibility with old API)
   */
  public async getProviders(): Promise<MediaProvider[]> {
    const providers: MediaProvider[] = [];
    
    for (const [id] of Array.from(this.providers)) {
      try {
        const provider = await this.getProvider(id);
        providers.push(provider);
      } catch (error) {
        console.warn(`Failed to create provider ${id}:`, error);
      }
    }
    
    return providers;
  }

  /**
   * Find the best provider for a capability based on availability and criteria
   */
  public async findBestProvider(capability: MediaCapability, criteria?: {
    maxCost?: number;
    preferLocal?: boolean;
    excludeProviders?: string[];
  }): Promise<MediaProvider | undefined> {
    const providers = await this.getProvidersByCapability(capability);

    if (criteria?.excludeProviders) {
      const filtered = providers.filter(p => !criteria.excludeProviders!.includes(p.id));
      if (filtered.length > 0) return filtered[0];
    }

    // Special handling for text-to-image: prefer HuggingFace if available
    if (capability === MediaCapability.TEXT_TO_IMAGE) {
      const hfProvider = providers.find(p => p.id === 'huggingface-docker');
      if (hfProvider && await hfProvider.isAvailable()) {
        return hfProvider;
      }
    }

    if (criteria?.preferLocal) {
      const localProvider = providers.find(p => p.type === 'local');
      if (localProvider) return localProvider;
    }

    return providers[0]; // Return first available (already prioritized)
  }

  /**
   * Clear the provider cache
   */
  public clearCache(): void {
    this.providerCache.clear();
  }

  /**
   * Get registry statistics
   */
  public getStats(): {
    totalProviders: number;
    cachedProviders: number;
  } {
    return {
      totalProviders: this.providers.size,
      cachedProviders: this.providerCache.size
    };
  }
}

/**
 * Convenience function to get the registry instance
 */
export function getProviderRegistry(): ProviderRegistry {
  return ProviderRegistry.getInstance();
}

export default ProviderRegistry;
