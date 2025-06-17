/**
 * Model Tests
 * 
 * Unit tests for the abstract Model base class.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Model, ModelMetadata, TransformationResult } from './Model';

// Concrete test implementation of Model
class TestModel extends Model<string, string> {
  async transform(input: string): Promise<TransformationResult<string>> {
    if (!input) {
      return this.createErrorResult('Input is required');
    }
    
    const { result, time } = await this.measureTime(async () => {
      return input.toUpperCase();
    });
    
    return this.createSuccessResult(result, { processingTime: time });
  }

  getInputSchema() {
    return { type: 'string' };
  }

  getOutputSchema() {
    return { type: 'string' };
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }
}

describe('Model', () => {
  let model: TestModel;
  let metadata: ModelMetadata;

  beforeEach(() => {
    metadata = {
      id: 'test-model',
      name: 'Test Model',
      description: 'A test model for unit testing',
      version: '1.0.0',
      provider: 'test-provider',
      capabilities: ['test-capability', 'transform'],
      inputTypes: ['string'],
      outputTypes: ['string']
    };

    model = new TestModel(metadata);
  });

  describe('constructor', () => {
    it('should initialize with provided metadata', () => {
      expect(model.getMetadata()).toEqual(metadata);
    });
  });

  describe('getters', () => {
    it('should return correct ID', () => {
      expect(model.getId()).toBe('test-model');
    });

    it('should return correct name', () => {
      expect(model.getName()).toBe('Test Model');
    });

    it('should return correct description', () => {
      expect(model.getDescription()).toBe('A test model for unit testing');
    });

    it('should return correct version', () => {
      expect(model.getVersion()).toBe('1.0.0');
    });

    it('should return correct provider', () => {
      expect(model.getProvider()).toBe('test-provider');
    });

    it('should return capabilities array', () => {
      expect(model.getCapabilities()).toEqual(['test-capability', 'transform']);
    });

    it('should return input types array', () => {
      expect(model.getInputTypes()).toEqual(['string']);
    });

    it('should return output types array', () => {
      expect(model.getOutputTypes()).toEqual(['string']);
    });
  });

  describe('capability checking', () => {
    it('should check if model has capability', () => {
      expect(model.hasCapability('test-capability')).toBe(true);
      expect(model.hasCapability('transform')).toBe(true);
      expect(model.hasCapability('nonexistent')).toBe(false);
    });

    it('should check input type support', () => {
      expect(model.supportsInputType('string')).toBe(true);
      expect(model.supportsInputType('number')).toBe(false);
    });

    it('should check output type support', () => {
      expect(model.supportsOutputType('string')).toBe(true);
      expect(model.supportsOutputType('number')).toBe(false);
    });
  });

  describe('transform', () => {
    it('should transform input successfully', async () => {
      const result = await model.transform('hello');

      expect(result.success).toBe(true);
      expect(result.data).toBe('HELLO');
      expect(result.metadata?.modelUsed).toBe('test-model');
      expect(result.metadata?.provider).toBe('test-provider');
      expect(result.metadata?.processingTime).toBeTypeOf('number');
    });

    it('should handle transformation errors', async () => {
      const result = await model.transform('');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Input is required');
      expect(result.metadata?.modelUsed).toBe('test-model');
      expect(result.metadata?.provider).toBe('test-provider');
    });
  });

  describe('result creation helpers', () => {
    it('should create success result with metadata', () => {
      const result = (model as any).createSuccessResult('test-data', { custom: 'metadata' });

      expect(result).toEqual({
        success: true,
        data: 'test-data',
        metadata: {
          modelUsed: 'test-model',
          provider: 'test-provider',
          custom: 'metadata'
        }
      });
    });

    it('should create error result with metadata', () => {
      const result = (model as any).createErrorResult('test error', { custom: 'metadata' });

      expect(result).toEqual({
        success: false,
        error: 'test error',
        metadata: {
          modelUsed: 'test-model',
          provider: 'test-provider',
          custom: 'metadata'
        }
      });
    });
  });

  describe('validation', () => {
    it('should validate input by default', () => {
      expect((model as any).validateInput('test')).toBe(true);
      expect((model as any).validateInput(null)).toBe(false);
      expect((model as any).validateInput(undefined)).toBe(false);
    });

    it('should validate output by default', () => {
      expect((model as any).validateOutput('test')).toBe(true);
      expect((model as any).validateOutput(null)).toBe(false);
      expect((model as any).validateOutput(undefined)).toBe(false);
    });
  });

  describe('measureTime', () => {
    it('should measure execution time', async () => {
      const { result, time } = await (model as any).measureTime(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'test-result';
      });

      expect(result).toBe('test-result');
      expect(time).toBeGreaterThanOrEqual(10);
      expect(time).toBeLessThan(100); // Should be reasonable
    });
  });

  describe('string representation', () => {
    it('should return correct string representation', () => {
      const str = model.toString();
      expect(str).toBe('Test Model (test-model) v1.0.0 by test-provider');
    });

    it('should return correct JSON representation', () => {
      const json = model.toJSON();
      expect(json).toEqual(metadata);
    });
  });

  describe('metadata immutability', () => {
    it('should return copy of metadata to prevent mutation', () => {
      const meta1 = model.getMetadata();
      const meta2 = model.getMetadata();

      expect(meta1).toEqual(meta2);
      expect(meta1).not.toBe(meta2); // Different objects

      // Mutating returned metadata shouldn't affect internal state
      meta1.name = 'Modified Name';
      expect(model.getName()).toBe('Test Model');
    });

    it('should return copy of capabilities array', () => {
      const caps1 = model.getCapabilities();
      const caps2 = model.getCapabilities();

      expect(caps1).toEqual(caps2);
      expect(caps1).not.toBe(caps2); // Different arrays

      // Mutating returned array shouldn't affect internal state
      caps1.push('new-capability');
      expect(model.getCapabilities()).toEqual(['test-capability', 'transform']);
    });
  });
});
