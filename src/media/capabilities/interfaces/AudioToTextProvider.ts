/**
 * AudioToTextProvider Interface
 * 
 * Provider role for audio-to-text transformation capabilities.
 * Includes speech-to-text as a subset of audio-to-text.
 */

import { AudioToTextModel } from '../../models/abstracts/AudioToTextModel';
import { ServiceManagement } from '../ServiceManagement';

/**
 * Audio-to-Text Provider Role (includes speech-to-text functionality)
 */
export interface AudioToTextProvider extends ServiceManagement {
  createAudioToTextModel(modelId: string): Promise<AudioToTextModel>;
  getSupportedAudioToTextModels(): string[];
  supportsAudioToTextModel(modelId: string): boolean;
}


