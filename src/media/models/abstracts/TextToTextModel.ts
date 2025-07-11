/**
 * TextToTextModel - Abstract Base Class
 * 
 * Abstract base class for text-to-text generation models.
 * Uses Asset-role system with automatic casting.
 */

import { Model, ModelMetadata } from './Model';
import { Text, TextRole } from '../../assets/roles';

export interface TextToTextOptions {
  seed?: string | number;
  temperature?: number;
  topK?: number;
  topP?: number;
  maxOutputTokens?: number;
  /** Response format for structured output */
  responseFormat?: 'text' | 'json' | { type: 'json_object' };
  [key: string]: any; // Allow model-specific parameters
}

export abstract class TextToTextModel extends Model<TextRole, TextToTextOptions, Text> {
  constructor(metadata: ModelMetadata) {
    super(metadata);
  }

  /**
   * Transform text to text
   */
  abstract transform(input: TextRole | TextRole[], options?: TextToTextOptions): Promise<Text>;

  /**
   * Check if the model is available
   */
  abstract isAvailable(): Promise<boolean>;
}

export default TextToTextModel;
