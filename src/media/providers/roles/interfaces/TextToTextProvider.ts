/**
 * TextToTextProvider Interface
 *
 * Provider role for text-to-text generation capabilities.
 * Includes LLM chat, completion, and text transformation.
 */

import { TextToTextModel } from '../../../models/TextToTextModel';
import { ServiceManagement } from '../ServiceManagement';

/**
 * Text-to-Text Provider Role
 */
export interface TextToTextProvider extends ServiceManagement {
  createTextToTextModel(modelId: string): Promise<TextToTextModel>;
  getSupportedTextToTextModels(): string[];
  supportsTextToTextModel(modelId: string): boolean;
}
