/**
 * TextToAudioModel - Abstract Base Class
 *
 * Abstract base class for text-to-audio models (including text-to-speech).
 * Uses Asset-role system with automatic casting.
 */

import { Model, ModelMetadata } from './Model';
import { Audio } from '../assets/roles';
import { TextInput } from '../assets/casting';

export interface TextToAudioOptions {
  language?: string;
  speed?: number;
  forceUpload?: boolean;  // Force upload even if file already exists on server
  format?: 'mp3' | 'wav'; // Output audio format
  voice?: string;
  pitch?: number;
  volume?: number;
  quality?: 'low' | 'medium' | 'high';
}



/**
 * Abstract base class for text-to-audio models
 */
export abstract class TextToAudioModel extends Model<TextInput, TextToAudioOptions, Audio> {
  constructor(metadata: ModelMetadata) {
    // Ensure the model supports text-to-audio transformation
    const enhancedMetadata: ModelMetadata = {
      ...metadata,
      inputTypes: [...new Set([...metadata.inputTypes, 'text'])],
      outputTypes: [...new Set([...metadata.outputTypes, 'audio', 'speech'])],
      capabilities: [...new Set([...metadata.capabilities, 'text-to-audio', 'text-to-speech'])]
    };
    super(enhancedMetadata);
  }

  /**
   * Transform text to audio - basic TTS
   */
  abstract transform(input: TextInput, options?: TextToAudioOptions): Promise<Audio>;

  /**
   * Transform text to audio with voice cloning - dual-signature pattern
   */
  abstract transform(text: TextInput, voiceAudio: Audio, options?: TextToAudioOptions): Promise<Audio>;

  /**
   * Check if the model is available
   */
  abstract isAvailable(): Promise<boolean>;

}


