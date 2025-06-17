/**
 * Provider Role Mixin System
 * 
 * Enables providers to implement multiple capability interfaces (like Asset role mixins).
 * Providers can play multiple roles: SpeechToTextProvider, TextToSpeechProvider, etc.
 */

import { SpeechToTextModel } from '../models/SpeechToTextModel';
import { TextToSpeechModel } from '../models/TextToSpeechModel';

/**
 * Provider Role Interfaces - what capabilities a provider can offer
 */

export interface SpeechToTextProvider {
  /**
   * Create a speech-to-text model instance
   */
  createSpeechToTextModel(modelId: string): Promise<SpeechToTextModel>;

  /**
   * Get supported speech-to-text models
   */
  getSupportedSpeechToTextModels(): string[];

  /**
   * Check if provider supports a specific STT model
   */
  supportsSpeechToTextModel(modelId: string): boolean;

  /**
   * Start the underlying service (no-op for remote providers, functional for Docker providers)
   */
  startService(): Promise<boolean>;

  /**
   * Stop the underlying service (no-op for remote providers, functional for Docker providers)
   */
  stopService(): Promise<boolean>;

  /**
   * Get service status (no-op for remote providers, functional for Docker providers)
   */
  getServiceStatus(): Promise<{ running: boolean; healthy: boolean; error?: string }>;
}

export interface TextToSpeechProvider {
  /**
   * Create a text-to-speech model instance
   */
  createTextToSpeechModel(modelId: string): Promise<TextToSpeechModel>;

  /**
   * Get supported text-to-speech models
   */
  getSupportedTextToSpeechModels(): string[];

  /**
   * Check if provider supports a specific TTS model
   */
  supportsTextToSpeechModel(modelId: string): boolean;

  /**
   * Start the underlying service (no-op for remote providers, functional for Docker providers)
   */
  startService(): Promise<boolean>;

  /**
   * Stop the underlying service (no-op for remote providers, functional for Docker providers)
   */
  stopService(): Promise<boolean>;

  /**
   * Get service status (no-op for remote providers, functional for Docker providers)
   */
  getServiceStatus(): Promise<{ running: boolean; healthy: boolean; error?: string }>;
}

export interface TextToImageProvider {
  /**
   * Create a text-to-image model instance
   */
  createTextToImageModel(modelId: string): Promise<any>; // TODO: Define TextToImageModel
  
  /**
   * Get supported text-to-image models
   */
  getSupportedTextToImageModels(): string[];
  
  /**
   * Check if provider supports a specific text-to-image model
   */
  supportsTextToImageModel(modelId: string): boolean;
}

export interface TextGenerationProvider {
  /**
   * Create a text generation model instance
   */
  createTextGenerationModel(modelId: string): Promise<any>; // TODO: Define TextGenerationModel
  
  /**
   * Get supported text generation models
   */
  getSupportedTextGenerationModels(): string[];
  
  /**
   * Check if provider supports a specific text generation model
   */
  supportsTextGenerationModel(modelId: string): boolean;
}

/**
 * Provider Role Mixin Functions (like Asset role mixins)
 */

/**
 * Constructor type for mixin functions
 */
type Constructor<T = {}> = new (...args: any[]) => T;

/**
 * Add SpeechToTextProvider capabilities to a provider
 */
export function withSpeechToTextProvider<T extends Constructor>(Base: T) {
  return class extends Base implements SpeechToTextProvider {
    async createSpeechToTextModel(modelId: string): Promise<SpeechToTextModel> {
      // Delegate to base provider's getModel method
      const model = await (this as any).getModel(modelId);
      
      if (!(model instanceof SpeechToTextModel)) {
        throw new Error(`Model '${modelId}' is not a SpeechToTextModel`);
      }
      
      return model;
    }
    
    getSupportedSpeechToTextModels(): string[] {
      // Filter supported models to only STT models
      const allModels = (this as any).getSupportedModels();
      // TODO: Add model type filtering based on registry metadata
      return allModels.filter((modelId: string) => 
        modelId.includes('stt') || modelId.includes('speech-to-text') || modelId.includes('whisper')
      );
    }
    
    supportsSpeechToTextModel(modelId: string): boolean {
      return this.getSupportedSpeechToTextModels().includes(modelId);
    }
  };
}

/**
 * Add TextToSpeechProvider capabilities to a provider
 */
export function withTextToSpeechProvider<T extends Constructor>(Base: T) {
  return class extends Base implements TextToSpeechProvider {
    async createTextToSpeechModel(modelId: string): Promise<TextToSpeechModel> {
      // Delegate to base provider's getModel method
      const model = await (this as any).getModel(modelId);
      
      if (!(model instanceof TextToSpeechModel)) {
        throw new Error(`Model '${modelId}' is not a TextToSpeechModel`);
      }
      
      return model;
    }
    
    getSupportedTextToSpeechModels(): string[] {
      // Filter supported models to only TTS models
      const allModels = (this as any).getSupportedModels();
      // TODO: Add model type filtering based on registry metadata
      return allModels.filter((modelId: string) => 
        modelId.includes('tts') || modelId.includes('text-to-speech') || modelId.includes('chatterbox')
      );
    }
    
    supportsTextToSpeechModel(modelId: string): boolean {
      return this.getSupportedTextToSpeechModels().includes(modelId);
    }
  };
}

/**
 * Add TextToImageProvider capabilities to a provider
 */
export function withTextToImageProvider<T extends Constructor>(Base: T) {
  return class extends Base implements TextToImageProvider {
    async createTextToImageModel(modelId: string): Promise<any> {
      // Delegate to base provider's getModel method
      const model = await (this as any).getModel(modelId);
      
      // TODO: Add proper type checking when TextToImageModel is defined
      return model;
    }
    
    getSupportedTextToImageModels(): string[] {
      // Filter supported models to only text-to-image models
      const allModels = (this as any).getSupportedModels();
      return allModels.filter((modelId: string) => 
        modelId.includes('image') || modelId.includes('flux') || modelId.includes('dalle')
      );
    }
    
    supportsTextToImageModel(modelId: string): boolean {
      return this.getSupportedTextToImageModels().includes(modelId);
    }
  };
}

/**
 * Add TextGenerationProvider capabilities to a provider
 */
export function withTextGenerationProvider<T extends Constructor>(Base: T) {
  return class extends Base implements TextGenerationProvider {
    async createTextGenerationModel(modelId: string): Promise<any> {
      // Delegate to base provider's getModel method
      const model = await (this as any).getModel(modelId);
      
      // TODO: Add proper type checking when TextGenerationModel is defined
      return model;
    }
    
    getSupportedTextGenerationModels(): string[] {
      // Filter supported models to only text generation models
      const allModels = (this as any).getSupportedModels();
      return allModels.filter((modelId: string) => 
        modelId.includes('gpt') || modelId.includes('llama') || modelId.includes('claude')
      );
    }
    
    supportsTextGenerationModel(modelId: string): boolean {
      return this.getSupportedTextGenerationModels().includes(modelId);
    }
  };
}

/**
 * Type guards for checking provider roles
 */

export function hasSpeechToTextRole(provider: any): provider is SpeechToTextProvider {
  return typeof provider.createSpeechToTextModel === 'function' &&
         typeof provider.getSupportedSpeechToTextModels === 'function';
}

export function hasTextToSpeechRole(provider: any): provider is TextToSpeechProvider {
  return typeof provider.createTextToSpeechModel === 'function' &&
         typeof provider.getSupportedTextToSpeechModels === 'function';
}

export function hasTextToImageRole(provider: any): provider is TextToImageProvider {
  return typeof provider.createTextToImageModel === 'function' &&
         typeof provider.getSupportedTextToImageModels === 'function';
}

export function hasTextGenerationRole(provider: any): provider is TextGenerationProvider {
  return typeof provider.createTextGenerationModel === 'function' &&
         typeof provider.getSupportedTextGenerationModels === 'function';
}

/**
 * Utility function to get all roles a provider supports
 */
export function getProviderRoles(provider: any): string[] {
  const roles: string[] = [];
  
  if (hasSpeechToTextRole(provider)) roles.push('speech-to-text');
  if (hasTextToSpeechRole(provider)) roles.push('text-to-speech');
  if (hasTextToImageRole(provider)) roles.push('text-to-image');
  if (hasTextGenerationRole(provider)) roles.push('text-generation');
  
  return roles;
}
