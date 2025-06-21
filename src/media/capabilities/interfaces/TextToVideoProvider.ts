/**
 * TextToVideoProvider Interface
 * 
 * Provider role for text-to-video generation capabilities.
 */

import { TextToVideoModel } from '../../models/abstracts/TextToVideoModel';

/**
 * Text-to-Video Provider Role
 */
export interface TextToVideoProvider {
  createTextToVideoModel(modelId: string): Promise<TextToVideoModel>;
  getSupportedTextToVideoModels(): string[];
  supportsTextToVideoModel(modelId: string): boolean;
}
