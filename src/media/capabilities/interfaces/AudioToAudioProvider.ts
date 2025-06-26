/**
 * AudioToAudioProvider Interface
 * 
 * Provider role for audio-to-audio transformation capabilities.
 * Typically used for audio format conversion, processing, and enhancement.
 */

import { AudioToAudioModel } from '../../models/abstracts/AudioToAudioModel';
import { ServiceManagement } from '../ServiceManagement';

/**
 * Audio-to-Audio Provider Role
 */
export interface AudioToAudioProvider extends ServiceManagement {
  createAudioToAudioModel(modelId: string): Promise<AudioToAudioModel>;
  getSupportedAudioToAudioModels(): string[];
  supportsAudioToAudioModel(modelId: string): boolean;
}
