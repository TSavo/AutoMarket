/**
 * TextToSpeechModel - Abstract Base Class
 *
 * Abstract base class for text-to-speech models.
 * Uses Asset-role system with automatic casting.
 */

import { Model, ModelMetadata, TransformationResult } from './Model';
import { Text, Speech, TextRole, SpeechRole } from '../assets/roles';
import { Asset } from '../assets/Asset';
import { TextInput, castToText } from '../assets/casting';

export interface TextToSpeechOptions {
  voice?: string;
  language?: string;
  speed?: number;
  voiceFile?: string;     // Path to reference audio file for voice cloning
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
   * Transform text to speech - must be implemented by concrete classes
   */
  abstract transform(input: TextInput, options?: TextToSpeechOptions): Promise<Speech>;

  /**
   * Check if the model is available
   */
  abstract isAvailable(): Promise<boolean>;

}
