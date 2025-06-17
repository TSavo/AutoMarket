/**
 * ProviderRegistry Tests
 * 
 * Tests for the ProviderRegistry implementation in the Model-Registry architecture.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DefaultProviderRegistry } from './ProviderRegistry';
import { DefaultModelRegistry } from './ModelRegistry';
import {
  Provider,
  ModelImplementation,
  ModelDescriptor,
  ProviderError,
  ProviderNotFoundError
} from './types';

// Mock model implementation for testing
class MockModelImplementation implements ModelImplementation {
  constructor(
    private providerContext: any,
    private descriptor: ModelDescriptor
  ) {}

  async transform(input: Record<string, any>): Promise<Record<string, any>> {
    return { output: `Transformed: ${input.text}` };
  }

  validateInput(input: Record<string, any>): boolean {
    return typeof input.text === 'string';
  }

  getInfo() {
    return {
      modelId: this.descriptor.modelId,
      providerId: this.descriptor.providerId,
      status: 'available' as const,
      version: this.descriptor.version,
      capabilities: ['text-transformation']
    };
  }
}

// Mock provider for testing
class MockProvider implements Provider {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly type: 'local' | 'remote',
    private supportedModelIds: string[] = []
  ) {}

  async getModel(modelId: string): Promise<ModelImplementation> {
    if (!this.supportsModel(modelId)) {
      throw new Error(`Model ${modelId} not supported`);
    }
    
    // Create a mock descriptor
    const descriptor: ModelDescriptor = {
      modelId,
      providerId: this.id,
      name: `Mock ${modelId}`,
      description: 'Mock model for testing',
      version: '1.0.0',
      inputSchema: { text: { type: 'string', required: true } },
      outputSchema: { output: { type: 'string' } },
      implementation: MockModelImplementation
    };
    
    return new MockModelImplementation({}, descriptor);
  }

  supportsModel(modelId: string): boolean {
    return this.supportedModelIds.includes(modelId);
  }

  getSupportedModels(): string[] {
    return [...this.supportedModelIds];
  }

  async isAvailable(): Promise<boolean> {
    return true; // Mock providers are always available
  }

  getInfo() {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      status: 'available' as const,
      supportedModels: this.getSupportedModels()
    };
  }
}

describe('ProviderRegistry', () => {
  let registry: DefaultProviderRegistry;
  let modelRegistry: DefaultModelRegistry;
  let mockProvider: MockProvider;

  beforeEach(() => {
    registry = new DefaultProviderRegistry();
    modelRegistry = new DefaultModelRegistry();
    mockProvider = new MockProvider('test-provider', 'Test Provider', 'local', ['test-model']);
  });

  describe('register', () => {
    it('should register a provider', () => {
      expect(() => registry.register(mockProvider)).not.toThrow();
      
      const retrieved = registry.getProvider('test-provider');
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('test-provider');
      expect(retrieved?.name).toBe('Test Provider');
    });

    it('should warn when overwriting existing registration', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      registry.register(mockProvider);
      registry.register(mockProvider); // Register again
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Overwriting existing registration")
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('unregister', () => {
    it('should unregister an existing provider', () => {
      registry.register(mockProvider);
      
      expect(() => registry.unregister('test-provider')).not.toThrow();
      
      const retrieved = registry.getProvider('test-provider');
      expect(retrieved).toBeUndefined();
    });

    it('should throw error when unregistering non-existent provider', () => {
      expect(() => registry.unregister('non-existent'))
        .toThrow(ProviderNotFoundError);
    });
  });

  describe('getProvider', () => {
    it('should return provider for registered ID', () => {
      registry.register(mockProvider);
      
      const retrieved = registry.getProvider('test-provider');
      expect(retrieved).toBe(mockProvider);
    });

    it('should return undefined for non-existent provider', () => {
      const retrieved = registry.getProvider('non-existent');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('getProviders', () => {
    it('should return all registered providers', () => {
      const provider2 = new MockProvider('provider-2', 'Provider 2', 'remote');
      
      registry.register(mockProvider);
      registry.register(provider2);
      
      const providers = registry.getProviders();
      expect(providers).toHaveLength(2);
      expect(providers.map(p => p.id)).toContain('test-provider');
      expect(providers.map(p => p.id)).toContain('provider-2');
    });

    it('should return empty array when no providers registered', () => {
      const providers = registry.getProviders();
      expect(providers).toEqual([]);
    });
  });

  describe('findProviders', () => {
    beforeEach(() => {
      const localProvider = new MockProvider('local-provider', 'Local Provider', 'local', ['model-1']);
      const remoteProvider = new MockProvider('remote-provider', 'Remote Provider', 'remote', ['model-2']);
      const multiProvider = new MockProvider('multi-provider', 'Multi Provider', 'local', ['model-1', 'model-2']);
      
      registry.register(localProvider);
      registry.register(remoteProvider);
      registry.register(multiProvider);
    });

    it('should find providers by type', () => {
      const localProviders = registry.findProviders({ type: 'local' });
      expect(localProviders).toHaveLength(2);
      expect(localProviders.every(p => p.type === 'local')).toBe(true);
      
      const remoteProviders = registry.findProviders({ type: 'remote' });
      expect(remoteProviders).toHaveLength(1);
      expect(remoteProviders[0].type).toBe('remote');
    });

    it('should find providers by model support', () => {
      const providersForModel1 = registry.findProviders({ supportsModel: 'model-1' });
      expect(providersForModel1).toHaveLength(2);
      expect(providersForModel1.map(p => p.id)).toContain('local-provider');
      expect(providersForModel1.map(p => p.id)).toContain('multi-provider');
      
      const providersForModel2 = registry.findProviders({ supportsModel: 'model-2' });
      expect(providersForModel2).toHaveLength(2);
      expect(providersForModel2.map(p => p.id)).toContain('remote-provider');
      expect(providersForModel2.map(p => p.id)).toContain('multi-provider');
    });

    it('should combine multiple criteria', () => {
      const localProvidersForModel1 = registry.findProviders({ 
        type: 'local', 
        supportsModel: 'model-1' 
      });
      expect(localProvidersForModel1).toHaveLength(2);
      expect(localProvidersForModel1.every(p => p.type === 'local')).toBe(true);
      expect(localProvidersForModel1.every(p => p.supportsModel('model-1'))).toBe(true);
    });
  });

  describe('getProvidersForModel', () => {
    it('should return providers that support a specific model', () => {
      const provider1 = new MockProvider('provider-1', 'Provider 1', 'local', ['test-model']);
      const provider2 = new MockProvider('provider-2', 'Provider 2', 'remote', ['test-model', 'other-model']);
      const provider3 = new MockProvider('provider-3', 'Provider 3', 'local', ['other-model']);
      
      registry.register(provider1);
      registry.register(provider2);
      registry.register(provider3);
      
      const providers = registry.getProvidersForModel('test-model');
      expect(providers).toHaveLength(2);
      expect(providers.map(p => p.id)).toContain('provider-1');
      expect(providers.map(p => p.id)).toContain('provider-2');
      expect(providers.map(p => p.id)).not.toContain('provider-3');
    });
  });

  describe('getProvidersByType', () => {
    it('should return providers by type', () => {
      const localProvider = new MockProvider('local-provider', 'Local Provider', 'local');
      const remoteProvider = new MockProvider('remote-provider', 'Remote Provider', 'remote');
      
      registry.register(localProvider);
      registry.register(remoteProvider);
      
      const localProviders = registry.getProvidersByType('local');
      expect(localProviders).toHaveLength(1);
      expect(localProviders[0].type).toBe('local');
      
      const remoteProviders = registry.getProvidersByType('remote');
      expect(remoteProviders).toHaveLength(1);
      expect(remoteProviders[0].type).toBe('remote');
    });
  });

  describe('findBestProvider', () => {
    beforeEach(() => {
      const localProvider = new MockProvider('local-provider', 'Local Provider', 'local', ['test-model']);
      const remoteProvider = new MockProvider('remote-provider', 'Remote Provider', 'remote', ['test-model']);
      
      registry.register(localProvider);
      registry.register(remoteProvider);
    });

    it('should prefer local providers when requested', async () => {
      const bestProvider = await registry.findBestProvider('test-model', { preferLocal: true });
      expect(bestProvider).toBeDefined();
      expect(bestProvider?.type).toBe('local');
    });

    it('should exclude specified providers', async () => {
      const bestProvider = await registry.findBestProvider('test-model', { 
        excludeProviders: ['local-provider'] 
      });
      expect(bestProvider).toBeDefined();
      expect(bestProvider?.id).toBe('remote-provider');
    });

    it('should return undefined if no providers support the model', async () => {
      const bestProvider = await registry.findBestProvider('non-existent-model');
      expect(bestProvider).toBeUndefined();
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', () => {
      const localProvider = new MockProvider('local-provider', 'Local Provider', 'local', ['model-1']);
      const remoteProvider = new MockProvider('remote-provider', 'Remote Provider', 'remote', ['model-2']);
      
      registry.register(localProvider);
      registry.register(remoteProvider);
      
      const stats = registry.getStats();
      expect(stats.totalProviders).toBe(2);
      expect(stats.localProviders).toBe(1);
      expect(stats.remoteProviders).toBe(1);
      expect(stats.modelsByProvider['local-provider']).toEqual(['model-1']);
      expect(stats.modelsByProvider['remote-provider']).toEqual(['model-2']);
    });
  });

  describe('clear', () => {
    it('should clear all registrations', () => {
      registry.register(mockProvider);
      expect(registry.getProviders()).toHaveLength(1);
      
      registry.clear();
      expect(registry.getProviders()).toHaveLength(0);
    });
  });
});
