/**
 * Provider Factory
 * 
 * Factory pattern for provider role selection and model creation.
 * Enables clean interface abstraction and provider abstraction.
 */

import { Provider } from './types';
import { providerRegistry } from './ProviderRegistry';
import {
  SpeechToTextProvider,
  TextToSpeechProvider,
  TextToImageProvider,
  TextGenerationProvider,
  hasSpeechToTextRole,
  hasTextToSpeechRole,
  hasTextToImageRole,
  hasTextGenerationRole
} from './ProviderRoles';

/**
 * Factory class for provider role-based selection
 */
export class ProviderFactory {
  /**
   * Get a provider by ID (any provider)
   */
  static getProvider(providerId: string): Provider | undefined {
    return providerRegistry.getProvider(providerId);
  }

  /**
   * Get a provider that supports speech-to-text capabilities
   */
  static getSpeechToTextProvider(providerId: string): SpeechToTextProvider | undefined {
    const provider = providerRegistry.getProvider(providerId);
    
    if (!provider) {
      return undefined;
    }
    
    if (!hasSpeechToTextRole(provider)) {
      throw new Error(`Provider '${providerId}' does not support speech-to-text capabilities`);
    }
    
    return provider;
  }

  /**
   * Get a provider that supports text-to-speech capabilities
   */
  static getTextToSpeechProvider(providerId: string): TextToSpeechProvider | undefined {
    const provider = providerRegistry.getProvider(providerId);
    
    if (!provider) {
      return undefined;
    }
    
    if (!hasTextToSpeechRole(provider)) {
      throw new Error(`Provider '${providerId}' does not support text-to-speech capabilities`);
    }
    
    return provider;
  }

  /**
   * Get a provider that supports text-to-image capabilities
   */
  static getTextToImageProvider(providerId: string): TextToImageProvider | undefined {
    const provider = providerRegistry.getProvider(providerId);
    
    if (!provider) {
      return undefined;
    }
    
    if (!hasTextToImageRole(provider)) {
      throw new Error(`Provider '${providerId}' does not support text-to-image capabilities`);
    }
    
    return provider;
  }

  /**
   * Get a provider that supports text generation capabilities
   */
  static getTextGenerationProvider(providerId: string): TextGenerationProvider | undefined {
    const provider = providerRegistry.getProvider(providerId);
    
    if (!provider) {
      return undefined;
    }
    
    if (!hasTextGenerationRole(provider)) {
      throw new Error(`Provider '${providerId}' does not support text generation capabilities`);
    }
    
    return provider;
  }

  /**
   * Find all providers that support a specific role
   */
  static findSpeechToTextProviders(): SpeechToTextProvider[] {
    return providerRegistry.getProviders().filter(hasSpeechToTextRole);
  }

  static findTextToSpeechProviders(): TextToSpeechProvider[] {
    return providerRegistry.getProviders().filter(hasTextToSpeechRole);
  }

  static findTextToImageProviders(): TextToImageProvider[] {
    return providerRegistry.getProviders().filter(hasTextToImageRole);
  }

  static findTextGenerationProviders(): TextGenerationProvider[] {
    return providerRegistry.getProviders().filter(hasTextGenerationRole);
  }

  /**
   * Get all available providers with their supported roles
   */
  static getProvidersWithRoles(): Array<{
    provider: Provider;
    roles: string[];
  }> {
    return providerRegistry.getProviders().map(provider => ({
      provider,
      roles: this.getProviderRoles(provider)
    }));
  }

  /**
   * Get roles supported by a specific provider
   */
  static getProviderRoles(provider: Provider): string[] {
    const roles: string[] = [];
    
    if (hasSpeechToTextRole(provider)) roles.push('speech-to-text');
    if (hasTextToSpeechRole(provider)) roles.push('text-to-speech');
    if (hasTextToImageRole(provider)) roles.push('text-to-image');
    if (hasTextGenerationRole(provider)) roles.push('text-generation');
    
    return roles;
  }

  /**
   * Check if a provider supports a specific role
   */
  static providerSupportsRole(providerId: string, role: string): boolean {
    const provider = providerRegistry.getProvider(providerId);
    if (!provider) return false;
    
    switch (role) {
      case 'speech-to-text':
        return hasSpeechToTextRole(provider);
      case 'text-to-speech':
        return hasTextToSpeechRole(provider);
      case 'text-to-image':
        return hasTextToImageRole(provider);
      case 'text-generation':
        return hasTextGenerationRole(provider);
      default:
        return false;
    }
  }

  /**
   * Get model directly from provider (convenience method)
   */
  static async getModel(providerId: string, modelId: string): Promise<any> {
    const provider = this.getProvider(providerId);
    
    if (!provider) {
      throw new Error(`Provider '${providerId}' not found`);
    }
    
    return await provider.getModel(modelId);
  }

  /**
   * Get speech-to-text model from provider (convenience method)
   */
  static async getSpeechToTextModel(providerId: string, modelId: string) {
    const provider = this.getSpeechToTextProvider(providerId);
    
    if (!provider) {
      throw new Error(`Speech-to-text provider '${providerId}' not found`);
    }
    
    return await provider.createSpeechToTextModel(modelId);
  }

  /**
   * Get text-to-speech model from provider (convenience method)
   */
  static async getTextToSpeechModel(providerId: string, modelId: string) {
    const provider = this.getTextToSpeechProvider(providerId);
    
    if (!provider) {
      throw new Error(`Text-to-speech provider '${providerId}' not found`);
    }
    
    return await provider.createTextToSpeechModel(modelId);
  }

  /**
   * Get text-to-image model from provider (convenience method)
   */
  static async getTextToImageModel(providerId: string, modelId: string) {
    const provider = this.getTextToImageProvider(providerId);
    
    if (!provider) {
      throw new Error(`Text-to-image provider '${providerId}' not found`);
    }
    
    return await provider.createTextToImageModel(modelId);
  }

  /**
   * Get text generation model from provider (convenience method)
   */
  static async getTextGenerationModel(providerId: string, modelId: string) {
    const provider = this.getTextGenerationProvider(providerId);
    
    if (!provider) {
      throw new Error(`Text generation provider '${providerId}' not found`);
    }
    
    return await provider.createTextGenerationModel(modelId);
  }

  /**
   * List all available models by role
   */
  static getAvailableModelsByRole(): {
    'speech-to-text': Array<{ providerId: string; modelId: string }>;
    'text-to-speech': Array<{ providerId: string; modelId: string }>;
    'text-to-image': Array<{ providerId: string; modelId: string }>;
    'text-generation': Array<{ providerId: string; modelId: string }>;
  } {
    const result = {
      'speech-to-text': [] as Array<{ providerId: string; modelId: string }>,
      'text-to-speech': [] as Array<{ providerId: string; modelId: string }>,
      'text-to-image': [] as Array<{ providerId: string; modelId: string }>,
      'text-generation': [] as Array<{ providerId: string; modelId: string }>
    };

    for (const provider of providerRegistry.getProviders()) {
      if (hasSpeechToTextRole(provider)) {
        for (const modelId of provider.getSupportedSpeechToTextModels()) {
          result['speech-to-text'].push({ providerId: provider.id, modelId });
        }
      }
      
      if (hasTextToSpeechRole(provider)) {
        for (const modelId of provider.getSupportedTextToSpeechModels()) {
          result['text-to-speech'].push({ providerId: provider.id, modelId });
        }
      }
      
      if (hasTextToImageRole(provider)) {
        for (const modelId of provider.getSupportedTextToImageModels()) {
          result['text-to-image'].push({ providerId: provider.id, modelId });
        }
      }
      
      if (hasTextGenerationRole(provider)) {
        for (const modelId of provider.getSupportedTextGenerationModels()) {
          result['text-generation'].push({ providerId: provider.id, modelId });
        }
      }
    }

    return result;
  }
}
