/**
 * VideoToAudioMixin
 * 
 * Mixin to add VideoToAudioProvider capabilities to a provider class.
 */

import { VideoToAudioModel } from '../../models/abstracts/VideoToAudioModel';
import { VideoToAudioProvider } from '../interfaces/VideoToAudioProvider';

/**
 * Constructor type for mixin functions
 */
export type Constructor<T = {}> = new (...args: any[]) => T;

/**
 * Add VideoToAudioProvider capabilities to a provider
 */
export function withVideoToAudioProvider<T extends Constructor>(Base: T) {
  return class extends Base implements VideoToAudioProvider {
    async createVideoToAudioModel(modelId: string): Promise<VideoToAudioModel> {
      // Delegate to base provider's getModel method
      const model = await (this as any).getModel(modelId);

      if (!(model instanceof VideoToAudioModel)) {
        throw new Error(`Model '${modelId}' is not a VideoToAudioModel`);
      }

      return model;
    }

    getSupportedVideoToAudioModels(): string[] {
      // Filter supported models to only video-to-audio models
      const allModels = (this as any).getSupportedModels();
      return allModels.filter((modelId: string) =>
        modelId.includes('ffmpeg') || modelId.includes('video-to-audio') || 
        modelId.includes('extract-audio')
      );
    }

    supportsVideoToAudioModel(modelId: string): boolean {
      return this.getSupportedVideoToAudioModels().includes(modelId);
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
