/**
 * ModelRegistry Tests
 * 
 * Tests for the ModelRegistry implementation in the Model-Registry architecture.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DefaultModelRegistry } from './ModelRegistry';
import {
  ModelDescriptor,
  ModelImplementation,
  ModelRegistryError,
  ModelNotFoundError
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

describe('ModelRegistry', () => {
  let registry: DefaultModelRegistry;
  let mockDescriptor: ModelDescriptor;

  beforeEach(() => {
    registry = new DefaultModelRegistry();
    
    mockDescriptor = {
      modelId: 'test-model',
      providerId: 'test-provider',
      name: 'Test Model',
      description: 'A test model for unit testing',
      version: '1.0.0',
      inputSchema: {
        text: {
          type: 'string',
          required: true,
          description: 'Input text to transform'
        }
      },
      outputSchema: {
        output: {
          type: 'string',
          description: 'Transformed output text'
        }
      },
      implementation: MockModelImplementation
    };
  });

  describe('register', () => {
    it('should register a valid model descriptor', () => {
      expect(() => registry.register(mockDescriptor)).not.toThrow();
      
      const retrieved = registry.getModelDescriptor('test-model', 'test-provider');
      expect(retrieved).toBeDefined();
      expect(retrieved?.modelId).toBe('test-model');
      expect(retrieved?.providerId).toBe('test-provider');
    });

    it('should throw error for invalid descriptor', () => {
      const invalidDescriptor = { ...mockDescriptor, modelId: '' };
      
      expect(() => registry.register(invalidDescriptor)).toThrow(ModelRegistryError);
    });

    it('should warn when overwriting existing registration', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      registry.register(mockDescriptor);
      registry.register(mockDescriptor); // Register again
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Overwriting existing registration")
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('unregister', () => {
    it('should unregister an existing model', () => {
      registry.register(mockDescriptor);
      
      expect(() => registry.unregister('test-model', 'test-provider')).not.toThrow();
      
      const retrieved = registry.getModelDescriptor('test-model', 'test-provider');
      expect(retrieved).toBeUndefined();
    });

    it('should throw error when unregistering non-existent model', () => {
      expect(() => registry.unregister('non-existent', 'test-provider'))
        .toThrow(ModelNotFoundError);
    });
  });

  describe('getModelDescriptor', () => {
    it('should return descriptor for registered model', () => {
      registry.register(mockDescriptor);
      
      const retrieved = registry.getModelDescriptor('test-model', 'test-provider');
      expect(retrieved).toEqual(mockDescriptor);
    });

    it('should return undefined for non-existent model', () => {
      const retrieved = registry.getModelDescriptor('non-existent', 'test-provider');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('getModelDescriptors', () => {
    it('should return all descriptors for a model across providers', () => {
      const descriptor2 = { ...mockDescriptor, providerId: 'provider-2' };
      
      registry.register(mockDescriptor);
      registry.register(descriptor2);
      
      const descriptors = registry.getModelDescriptors('test-model');
      expect(descriptors).toHaveLength(2);
      expect(descriptors.map(d => d.providerId)).toContain('test-provider');
      expect(descriptors.map(d => d.providerId)).toContain('provider-2');
    });

    it('should return empty array for non-existent model', () => {
      const descriptors = registry.getModelDescriptors('non-existent');
      expect(descriptors).toEqual([]);
    });
  });

  describe('getModelsForProvider', () => {
    it('should return models supported by a provider', () => {
      const descriptor2 = { ...mockDescriptor, modelId: 'model-2' };
      
      registry.register(mockDescriptor);
      registry.register(descriptor2);
      
      const models = registry.getModelsForProvider('test-provider');
      expect(models).toHaveLength(2);
      expect(models).toContain('test-model');
      expect(models).toContain('model-2');
      expect(models).toEqual(models.sort()); // Should be sorted
    });

    it('should return empty array for non-existent provider', () => {
      const models = registry.getModelsForProvider('non-existent');
      expect(models).toEqual([]);
    });
  });

  describe('getProvidersForModel', () => {
    it('should return providers that support a model', () => {
      const descriptor2 = { ...mockDescriptor, providerId: 'provider-2' };
      
      registry.register(mockDescriptor);
      registry.register(descriptor2);
      
      const providers = registry.getProvidersForModel('test-model');
      expect(providers).toHaveLength(2);
      expect(providers).toContain('test-provider');
      expect(providers).toContain('provider-2');
      expect(providers).toEqual(providers.sort()); // Should be sorted
    });

    it('should return empty array for non-existent model', () => {
      const providers = registry.getProvidersForModel('non-existent');
      expect(providers).toEqual([]);
    });
  });

  describe('getAllModels', () => {
    it('should return all registered models', () => {
      const descriptor2 = { ...mockDescriptor, modelId: 'model-2' };
      
      registry.register(mockDescriptor);
      registry.register(descriptor2);
      
      const models = registry.getAllModels();
      expect(models).toHaveLength(2);
      expect(models).toContain('test-model');
      expect(models).toContain('model-2');
      expect(models).toEqual(models.sort()); // Should be sorted
    });

    it('should return empty array when no models registered', () => {
      const models = registry.getAllModels();
      expect(models).toEqual([]);
    });
  });

  describe('getAllProviders', () => {
    it('should return all registered providers', () => {
      const descriptor2 = { ...mockDescriptor, providerId: 'provider-2' };
      
      registry.register(mockDescriptor);
      registry.register(descriptor2);
      
      const providers = registry.getAllProviders();
      expect(providers).toHaveLength(2);
      expect(providers).toContain('test-provider');
      expect(providers).toContain('provider-2');
      expect(providers).toEqual(providers.sort()); // Should be sorted
    });

    it('should return empty array when no providers registered', () => {
      const providers = registry.getAllProviders();
      expect(providers).toEqual([]);
    });
  });

  describe('validateDescriptor', () => {
    it('should validate a correct descriptor', () => {
      const result = registry.validateDescriptor(mockDescriptor);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should detect missing required fields', () => {
      const invalidDescriptor = { ...mockDescriptor, modelId: '' };
      
      const result = registry.validateDescriptor(invalidDescriptor);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('modelId is required');
    });

    it('should validate ID format', () => {
      const invalidDescriptor = { ...mockDescriptor, modelId: 'Invalid_ID!' };
      
      const result = registry.validateDescriptor(invalidDescriptor);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'modelId must contain only lowercase letters, numbers, and hyphens'
      );
    });

    it('should validate version format', () => {
      const invalidDescriptor = { ...mockDescriptor, version: 'invalid' };
      
      const result = registry.validateDescriptor(invalidDescriptor);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'version must follow semantic versioning (e.g., 1.0.0)'
      );
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', () => {
      const descriptor2 = { ...mockDescriptor, modelId: 'model-2' };
      const descriptor3 = { ...mockDescriptor, providerId: 'provider-2' };
      
      registry.register(mockDescriptor);
      registry.register(descriptor2);
      registry.register(descriptor3);
      
      const stats = registry.getStats();
      expect(stats.totalModels).toBe(2); // test-model, model-2
      expect(stats.totalProviders).toBe(2); // test-provider, provider-2
      expect(stats.modelsByProvider['test-provider']).toBe(2);
      expect(stats.modelsByProvider['provider-2']).toBe(1);
    });
  });

  describe('clear', () => {
    it('should clear all registrations', () => {
      registry.register(mockDescriptor);
      expect(registry.getAllModels()).toHaveLength(1);
      
      registry.clear();
      expect(registry.getAllModels()).toHaveLength(0);
      expect(registry.getAllProviders()).toHaveLength(0);
    });
  });
});
