/**
 * TextToVideoMixin
 * 
 * Mixin to add TextToVideoProvider capabilities to a provider class.
 */

import { TextToVideoProvider } from '../interfaces/TextToVideoProvider';

/**
 * Constructor type for mixin functions
 */
export type Constructor<T = {}> = new (...args: any[]) => T;

/**
 * Add TextToVideoProvider capabilities to a provider
 */
export function withTextToVideoProvider<T extends Constructor>(Base: T) {
  return class extends Base implements TextToVideoProvider {
    async createTextToVideoModel(modelId: string): Promise<any> {
      // Check if this instance has a direct createTextToVideoModel method (before mixin)
      const baseMethod = (this as any).__proto__.__proto__.createTextToVideoModel;
      if (baseMethod && typeof baseMethod === 'function') {
        console.log('[withTextToVideoProvider] Using base class implementation');
        return await baseMethod.call(this, modelId);
      }
      
      console.log('[withTextToVideoProvider] Using fallback getModel implementation');
      // Fallback: delegate to base provider's getModel method
      const model = await (this as any).getModel(modelId);
      
      // TODO: Add proper type checking when TextToVideoModel is defined
      return model;
    }
    
    getSupportedTextToVideoModels(): string[] {
      // Filter supported models to only text-to-video models
      const allModels = (this as any).getSupportedModels();
      return allModels.filter((modelId: string) => 
        modelId.includes('video') || modelId.includes('runway') || modelId.includes('stable-video') || 
        modelId.includes('luma') || modelId.includes('pika')
      );
    }
    
    supportsTextToVideoModel(modelId: string): boolean {
      return this.getSupportedTextToVideoModels().includes(modelId);
    }
  };
}
