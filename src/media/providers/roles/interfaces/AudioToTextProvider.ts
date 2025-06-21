/**
 * AudioToTextProvider Interface
 * 
 * Provider role for audio-to-text transformation capabilities.
 * Includes speech-to-text as a subset of audio-to-text.
 */

import { AudioToTextModel } from '@/media/models/AudioToTextModel';
import { ServiceManagement } from '@/media/providers/roles/ServiceManagement';

/**
 * Audio-to-Text Provider Role (includes speech-to-text functionality)
 */
export interface AudioToTextProvider extends ServiceManagement {
  createAudioToTextModel(modelId: string): Promise<AudioToTextModel>;
  getSupportedAudioToTextModels(): string[];
  supportsAudioToTextModel(modelId: string): boolean;
}


