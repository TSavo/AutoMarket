/**
 * TextToTextModel - Abstract Base Class
 * 
 * Abstract base class for text-to-text generation models.
 * Uses Asset-role system with automatic casting.
 */

import { Model, ModelMetadata } from './Model';
import { Text } from '../assets/roles';
import { TextInput } from '../assets/casting';

export interface TextToTextOptions {
  seed?: string;
  temperature?: number;
  topK?: number;
  topP?: number;
  maxOutputTokens?: number;
  [key: string]: any; // Allow model-specific parameters
}

export abstract class TextToTextModel extends Model<TextInput, TextToTextOptions, Text> {
  constructor(metadata: ModelMetadata) {
    super(metadata);
  }

  /**
   * Transform text to text
   */
  abstract transform(input: TextInput, options?: TextToTextOptions): Promise<Text>;

  /**
   * Check if the model is available
   */
  abstract isAvailable(): Promise<boolean>;
}

export default TextToTextModel;
