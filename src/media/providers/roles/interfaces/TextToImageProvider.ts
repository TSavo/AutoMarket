/**
 * TextToImageProvider Interface
 *
 * Provider role for text-to-image generation capabilities.
 */

import { ServiceManagement } from '../ServiceManagement';

/**
 * Text-to-Image Provider Role
 */
export interface TextToImageProvider extends ServiceManagement {
  createTextToImageModel(modelId: string): Promise<any>; // TODO: Define TextToImageModel
  getSupportedTextToImageModels(): string[];
  supportsTextToImageModel(modelId: string): boolean;
}
