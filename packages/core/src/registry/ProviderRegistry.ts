/**
 * Provider Registry Implementation
 * 
 * Manages all available media providers and provides intelligent selection
 * based on capabilities, cost, and availability.
 */

import { 
  MediaProvider, 
  ProviderRegistry as IProviderRegistry, 
  MediaCapability 
} from '../types/provider';

export class ProviderRegistry implements IProviderRegistry {
  private providers = new Map<string, MediaProvider>();
  private capabilityIndex = new Map<MediaCapability, Set<string>>();

  /**
   * Register a new provider
   */
  register(provider: MediaProvider): void {
    this.providers.set(provider.id, provider);
    
    // Update capability index
    provider.capabilities.forEach(capability => {
      if (!this.capabilityIndex.has(capability)) {
        this.capabilityIndex.set(capability, new Set());
      }
      this.capabilityIndex.get(capability)!.add(provider.id);
    });

    console.log(`Registered provider: ${provider.name} (${provider.id}) with capabilities: ${provider.capabilities.join(', ')}`);
  }

  /**
   * Get all registered providers
   */
  getProviders(): MediaProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get providers that support a specific capability
   */
  getProvidersForCapability(capability: MediaCapability): MediaProvider[] {
    const providerIds = this.capabilityIndex.get(capability);
    if (!providerIds) {
      return [];
    }

    return Array.from(providerIds)
      .map(id => this.providers.get(id))
      .filter((provider): provider is MediaProvider => provider !== undefined);
  }

  /**
   * Get a specific provider by ID
   */
  getProvider(id: string): MediaProvider | undefined {
    return this.providers.get(id);
  }

  /**
   * Find the best provider for a capability based on availability and cost
   */
  async findBestProvider(
    capability: MediaCapability, 
    criteria: {
      maxCost?: number;
      preferLocal?: boolean;
      excludeProviders?: string[];
    } = {}
  ): Promise<MediaProvider | undefined> {
    const candidates = this.getProvidersForCapability(capability);
    
    if (candidates.length === 0) {
      return undefined;
    }

    // Filter out excluded providers
    const filtered = candidates.filter(provider => 
      !criteria.excludeProviders?.includes(provider.id)
    );

    if (filtered.length === 0) {
      return undefined;
    }

    // Check availability for all candidates
    const availableProviders: MediaProvider[] = [];
    for (const provider of filtered) {
      try {
        const isAvailable = await provider.isAvailable();
        if (isAvailable) {
          availableProviders.push(provider);
        }
      } catch (error) {
        console.warn(`Provider ${provider.id} availability check failed:`, error);
      }
    }

    if (availableProviders.length === 0) {
      return undefined;
    }

    // Apply selection criteria
    let scored = availableProviders.map(provider => ({
      provider,
      score: this.calculateProviderScore(provider, capability, criteria)
    }));

    // Sort by score (higher is better)
    scored.sort((a, b) => b.score - a.score);

    return scored[0].provider;
  }

  /**
   * Calculate a score for provider selection
   */
  private calculateProviderScore(
    provider: MediaProvider, 
    capability: MediaCapability, 
    criteria: {
      maxCost?: number;
      preferLocal?: boolean;
      excludeProviders?: string[];
    }
  ): number {
    let score = 100; // Base score

    // Prefer local providers if requested
    if (criteria.preferLocal && provider.type === 'local') {
      score += 50;
    } else if (criteria.preferLocal && provider.type === 'remote') {
      score -= 25;
    }

    // Consider cost if specified
    const models = provider.getModelsForCapability(capability);
    if (models.length > 0 && criteria.maxCost !== undefined) {
      const avgCost = models.reduce((sum, model) => {
        const cost = model.pricing?.inputCost || 0;
        return sum + cost;
      }, 0) / models.length;

      if (avgCost > criteria.maxCost) {
        score -= 100; // Heavily penalize if over budget
      } else {
        // Prefer cheaper options
        score += (criteria.maxCost - avgCost) / criteria.maxCost * 25;
      }
    }

    // Prefer providers with more models for the capability
    score += models.length * 5;

    return score;
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    totalProviders: number;
    localProviders: number;
    remoteProviders: number;
    capabilityCoverage: Record<MediaCapability, number>;
  } {
    const providers = this.getProviders();
    
    return {
      totalProviders: providers.length,
      localProviders: providers.filter(p => p.type === 'local').length,
      remoteProviders: providers.filter(p => p.type === 'remote').length,
      capabilityCoverage: Object.values(MediaCapability).reduce((acc, capability) => {
        acc[capability] = this.getProvidersForCapability(capability).length;
        return acc;
      }, {} as Record<MediaCapability, number>)
    };
  }

  /**
   * Unregister a provider
   */
  unregister(providerId: string): boolean {
    const provider = this.providers.get(providerId);
    if (!provider) {
      return false;
    }

    // Remove from main registry
    this.providers.delete(providerId);

    // Remove from capability index
    provider.capabilities.forEach(capability => {
      const providerSet = this.capabilityIndex.get(capability);
      if (providerSet) {
        providerSet.delete(providerId);
        if (providerSet.size === 0) {
          this.capabilityIndex.delete(capability);
        }
      }
    });

    console.log(`Unregistered provider: ${provider.name} (${providerId})`);
    return true;
  }
}
