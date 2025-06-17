/**
 * SpeechToTextModel - Abstract Base Class
 */

import { ModelMetadata } from './Model';
import { Text } from '../assets/roles';
import { SpeechInput } from '../assets/casting';

export interface SpeechToTextOptions {
  language?: string;
  task?: 'transcribe' | 'translate';
  wordTimestamps?: boolean;
}

/**
 * Abstract base class for speech-to-text models
 */
export abstract class SpeechToTextModel {
  protected metadata: ModelMetadata;

  constructor(metadata: ModelMetadata) {
    this.metadata = metadata;
  }

  /**
   * Transform speech to text
   */
  abstract transform(input: SpeechInput, options?: SpeechToTextOptions): Promise<Text>;

  /**
   * Check if the model is available
   */
  abstract isAvailable(): Promise<boolean>;
}
