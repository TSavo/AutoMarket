/**
 * TextToAudioProvider Interface
 * 
 * Provider role for text-to-audio transformation capabilities.
 * Includes text-to-speech as the primary use case.
 */

import { TextToAudioModel } from '../../../models/TextToAudioModel';
import { ServiceManagement } from '../ServiceManagement';

/**
 * Text-to-Audio Provider Role (includes text-to-speech)
 */
export interface TextToAudioProvider extends ServiceManagement {
  createTextToAudioModel(modelId: string): Promise<TextToAudioModel>;
  getSupportedTextToAudioModels(): string[];
  supportsTextToAudioModel(modelId: string): boolean;
}


