/**
 * Provider Registry API
 * Singleton registry for managing all media providers
 */

import { MediaProvider, ProviderRegistry as IProviderRegistry, MediaCapability } from '../../../../media/types/provider';

class ProviderRegistry implements IProviderRegistry {
  private static instance: ProviderRegistry;
  private providers = new Map<string, MediaProvider>();

  static getInstance(): ProviderRegistry {
    if (!ProviderRegistry.instance) {
      ProviderRegistry.instance = new ProviderRegistry();
    }
    return ProviderRegistry.instance;
  }

  register(provider: MediaProvider): void {
    this.providers.set(provider.id, provider);
  }

  getProviders(): MediaProvider[] {
    return Array.from(this.providers.values());
  }

  getProvidersForCapability(capability: MediaCapability): MediaProvider[] {
    return this.getProviders().filter(provider => 
      provider.capabilities.includes(capability)
    );
  }

  getProvider(id: string): MediaProvider | undefined {
    return this.providers.get(id);
  }

  findBestProvider(capability: MediaCapability, criteria?: {
    maxCost?: number;
    preferLocal?: boolean;
    excludeProviders?: string[];
  }): MediaProvider | undefined {
    const providers = this.getProvidersForCapability(capability);
    
    if (criteria?.excludeProviders) {
      const filtered = providers.filter(p => !criteria.excludeProviders!.includes(p.id));
      if (filtered.length > 0) return filtered[0];
    }

    if (criteria?.preferLocal) {
      const localProvider = providers.find(p => p.type === 'local');
      if (localProvider) return localProvider;
    }

    return providers[0]; // Return first available
  }
}

export default ProviderRegistry;
