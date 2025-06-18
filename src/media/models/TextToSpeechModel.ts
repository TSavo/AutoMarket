/**
 * TextToSpeechModel - Abstract Base Class
 *
 * Abstract base class for text-to-speech models.
 * Uses Asset-role system with automatic casting.
 */

import { Model, ModelMetadata, TransformationResult } from './Model';
import { Text, Speech, Audio, TextRole, SpeechRole } from '../assets/roles';
import { Asset } from '../assets/Asset';
import { TextInput, castToText } from '../assets/casting';

export interface TextToSpeechOptions {
  language?: string;
  speed?: number;
  forceUpload?: boolean;  // Force upload even if file already exists on server
  format?: 'mp3' | 'wav'; // Output audio format
}

/**
 * Abstract base class for text-to-speech models
 */
export abstract class TextToSpeechModel {
  protected metadata: ModelMetadata;

  constructor(metadata: ModelMetadata) {
    this.metadata = metadata;
  }

  /**
   * Transform text to speech - basic TTS
   */
  abstract transform(input: TextInput, options?: TextToSpeechOptions): Promise<Speech>;

  /**
   * Transform text to speech with voice cloning - dual-signature pattern
   */
  abstract transform(text: TextInput, voiceAudio: Speech, options?: TextToSpeechOptions): Promise<Speech>;

  /**
   * Check if the model is available
   */
  abstract isAvailable(): Promise<boolean>;

}
