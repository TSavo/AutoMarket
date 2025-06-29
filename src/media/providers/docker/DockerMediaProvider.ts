import { MediaProvider, MediaCapability, ProviderType, ProviderModel, ProviderConfig } from '../../types/provider';
import { DockerComposeService } from '../../../services/DockerComposeService';

/**
 * A generic MediaProvider implementation for Docker-backed services.
 * This class wraps a DockerComposeService and exposes it as a MediaProvider.
 */
export class DockerMediaProvider implements MediaProvider {
  readonly id: string;
  readonly name: string;
  readonly type: ProviderType = ProviderType.LOCAL;
  readonly capabilities: MediaCapability[];
  readonly models: ProviderModel[] = []; // Docker-backed providers don't expose models directly

  private dockerServiceManager: DockerComposeService;

  constructor(dockerServiceManager: DockerComposeService, capabilities: MediaCapability[], id?: string, name?: string) {
    this.dockerServiceManager = dockerServiceManager;
    this.capabilities = capabilities;
    this.id = id || dockerServiceManager.getConfig().serviceName;
    this.name = name || `${this.id} (Docker)`;
  }

  async configure(config: ProviderConfig): Promise<void> {
    // Configuration for the underlying Docker service is handled by ServiceRegistry
    // This method can be used to pass additional configuration to the Docker service if needed
    console.log(`Configuring DockerMediaProvider for ${this.id} with config:`, config);
  }

  async isAvailable(): Promise<boolean> {
    const status = await this.dockerServiceManager.getServiceStatus();
    return status.running && status.health === 'healthy';
  }

  getModelsForCapability(capability: MediaCapability): ProviderModel[] {
    // Docker-backed providers don't expose models directly, but can indicate capabilities
    if (this.capabilities.includes(capability)) {
      return [{
        id: `${this.id}-${capability}`,
        name: `${this.name} ${capability}`,
        description: `Provides ${capability} via Docker service ${this.id}`,
        capabilities: [capability],
        parameters: {},
        pricing: { inputCost: 0, outputCost: 0, currency: 'USD' }
      }];
    }
    return [];
  }

  async getModel(modelId: string): Promise<any> {
    // This method should ideally be implemented by the actual provider that uses this Docker service
    // For now, return a dummy or throw an error if not overridden
    throw new Error(`getModel not implemented for DockerMediaProvider. Model ID: ${modelId}`);
  }

  async getHealth(): Promise<any> {
    const status = await this.dockerServiceManager.getServiceStatus();
    return {
      status: status.health,
      details: status
    };
  }

  // Implement ServiceManagement interface methods (delegating to DockerComposeService)
  async startService(): Promise<boolean> {
    return this.dockerServiceManager.startService();
  }

  async stopService(): Promise<boolean> {
    return this.dockerServiceManager.stopService();
  }

  async getServiceStatus(): Promise<any> {
    return this.dockerServiceManager.getServiceStatus();
  }
}
