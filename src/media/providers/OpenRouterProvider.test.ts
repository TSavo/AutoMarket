/**
 * OpenRouter Provider Tests
 *
 * Unit and integration tests for the OpenRouter provider implementation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OpenRouterProvider } from './OpenRouterProvider';
import { MediaCapability, ProviderType } from '../types/provider';
import { Text } from '../assets/roles';

// Mock the OpenRouterAPIClient
vi.mock('../clients/OpenRouterAPIClient', () => ({
  OpenRouterAPIClient: vi.fn().mockImplementation(() => ({
    testConnection: vi.fn().mockResolvedValue(true),
    getAvailableModels: vi.fn().mockResolvedValue([
      {
        id: 'test/model-1',
        name: 'Test Model 1',
        description: 'A test model'
      }
    ]),
    generateText: vi.fn().mockResolvedValue('Generated text response')
  }))
}));

describe('OpenRouterProvider', () => {
  let provider: OpenRouterProvider;

  beforeEach(() => {
    provider = new OpenRouterProvider();
  });

  describe('Basic Properties', () => {
    it('should have correct provider metadata', () => {
      expect(provider.id).toBe('openrouter');
      expect(provider.name).toBe('OpenRouter');
      expect(provider.type).toBe(ProviderType.REMOTE);
      expect(provider.capabilities).toContain(MediaCapability.TEXT_GENERATION);
      expect(provider.capabilities).toContain(MediaCapability.TEXT_TO_TEXT);
    });

    it('should have popular models available', () => {
      const models = provider.models;
      expect(models.length).toBeGreaterThan(0);
      expect(models[0]).toHaveProperty('id');
      expect(models[0]).toHaveProperty('name');
      expect(models[0]).toHaveProperty('capabilities');
      expect(models[0].capabilities).toContain(MediaCapability.TEXT_GENERATION);
    });
  });

  describe('Configuration', () => {
    it('should configure successfully with API key', async () => {
      await expect(provider.configure({
        apiKey: 'test-api-key'
      })).resolves.not.toThrow();
    });

    it('should throw error without API key', async () => {
      await expect(provider.configure({})).rejects.toThrow('OpenRouter API key is required');
    });
  });

  describe('Availability', () => {
    it('should return false when not configured', async () => {
      const isAvailable = await provider.isAvailable();
      expect(isAvailable).toBe(false);
    });

    it('should return true when properly configured', async () => {
      await provider.configure({ apiKey: 'test-api-key' });
      const isAvailable = await provider.isAvailable();
      expect(isAvailable).toBe(true);
    });
  });

  describe('TextToTextProvider Interface', () => {
    beforeEach(async () => {
      await provider.configure({ apiKey: 'test-api-key' });
    });

    it('should create text-to-text model', async () => {
      const modelId = 'anthropic/claude-3.5-sonnet';
      const model = await provider.createTextToTextModel(modelId);

      expect(model).toBeDefined();
      expect(model.getId()).toBe(modelId);
      expect(model.getProvider()).toBe('openrouter');
    });

    it('should return supported models', () => {
      const supportedModels = provider.getSupportedTextToTextModels();
      expect(supportedModels).toBeInstanceOf(Array);
      expect(supportedModels.length).toBeGreaterThan(0);
    });

    it('should check model support correctly', () => {
      const supportedModel = 'anthropic/claude-3.5-sonnet';
      const unsupportedModel = 'nonexistent/model';

      expect(provider.supportsTextToTextModel(supportedModel)).toBe(true);
      expect(provider.supportsTextToTextModel(unsupportedModel)).toBe(false);
    });
  });

  describe('Service Management', () => {
    it('should handle service management for remote provider', async () => {
      // Remote providers should always return true for service management
      expect(await provider.startService()).toBe(true);
      expect(await provider.stopService()).toBe(true);

      const status = await provider.getServiceStatus();
      expect(status.running).toBe(true);
      expect(typeof status.healthy).toBe('boolean');
    });
  });
});