/**
 * TextToAudioMixin
 * 
 * Mixin to add TextToAudioProvider capabilities to a provider class.
 */

import { TextToAudioModel } from '../../../models/TextToAudioModel';
import { TextToAudioProvider } from '../interfaces/TextToAudioProvider';

/**
 * Constructor type for mixin functions
 */
export type Constructor<T = {}> = new (...args: any[]) => T;

/**
 * Add TextToAudioProvider capabilities to a provider
 */
export function withTextToAudioProvider<T extends Constructor>(Base: T) {
  return class extends Base implements TextToAudioProvider {
    async createTextToAudioModel(modelId: string): Promise<TextToAudioModel> {
      // Delegate to base provider's getModel method
      const model = await (this as any).getModel(modelId);

      if (!(model instanceof TextToAudioModel)) {
        throw new Error(`Model '${modelId}' is not a TextToAudioModel`);
      }

      return model;
    }



    getSupportedTextToAudioModels(): string[] {
      // Filter supported models to only TTS/TTA models
      const allModels = (this as any).getSupportedModels();
      return allModels.filter((modelId: string) =>
        modelId.includes('tts') || modelId.includes('text-to-speech') || 
        modelId.includes('text-to-audio') || modelId.includes('chatterbox')
      );
    }



    supportsTextToAudioModel(modelId: string): boolean {
      return this.getSupportedTextToAudioModels().includes(modelId);
    }



    async startService(): Promise<boolean> {
      // Delegate to base provider's startService method if it exists
      if (typeof (this as any).startService === 'function') {
        return await (this as any).startService();
      }
      return true; // No-op for providers that don't need service management
    }

    async stopService(): Promise<boolean> {
      // Delegate to base provider's stopService method if it exists
      if (typeof (this as any).stopService === 'function') {
        return await (this as any).stopService();
      }
      return true; // No-op for providers that don't need service management
    }

    async getServiceStatus(): Promise<{ running: boolean; healthy: boolean; error?: string }> {
      // Delegate to base provider's getServiceStatus method if it exists
      if (typeof (this as any).getServiceStatus === 'function') {
        return await (this as any).getServiceStatus();
      }
      return { running: true, healthy: true }; // Default for providers that don't manage services
    }
  };
}


