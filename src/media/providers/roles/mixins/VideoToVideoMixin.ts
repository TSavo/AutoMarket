/**
 * VideoToVideoMixin
 * 
 * Mixin to add VideoToVideoProvider capabilities to a provider class.
 */

import { VideoToVideoProvider } from '../interfaces/VideoToVideoProvider';
import { ServiceManagement } from '../ServiceManagement';

/**
 * Constructor type for mixin functions
 */
export type Constructor<T = {}> = new (...args: any[]) => T;

/**
 * Add VideoToVideoProvider capabilities to a provider
 */
export function withVideoToVideoProvider<T extends Constructor>(Base: T) {
  return class extends Base implements VideoToVideoProvider {
    async createVideoToVideoModel(modelId: string): Promise<any> {
      // Delegate to base provider's getModel method
      const model = await (this as any).getModel(modelId);
      
      // TODO: Add proper type checking when VideoToVideoModel is defined
      return model;
    }
    
    getSupportedVideoToVideoModels(): string[] {
      // Filter supported models to only video-to-video models
      const allModels = (this as any).getSupportedModels();
      return allModels.filter((modelId: string) => 
        modelId.includes('video') || modelId.includes('enhance') || modelId.includes('upscale') ||
        modelId.includes('interpolation') || modelId.includes('stylize')
      );
    }
    
    supportsVideoToVideoModel(modelId: string): boolean {
      return this.getSupportedVideoToVideoModels().includes(modelId);
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
