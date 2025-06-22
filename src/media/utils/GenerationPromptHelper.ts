/**
 * Helper utility for creating generation_prompt metadata
 * 
 * This helper provides a standardized way to create generation_prompt metadata
 * for all models across all providers.
 */

import { GenerationPrompt } from '../assets/Asset';

export interface GenerationPromptConfig {
  input: any;
  options?: any;
  modelId: string;
  modelName?: string;
  provider: string;
  transformationType: string;
  modelMetadata?: any;
  predictionId?: string;
  requestId?: string;
  [key: string]: any;
}

/**
 * Create standardized generation_prompt metadata
 */
export function createGenerationPrompt(config: GenerationPromptConfig): GenerationPrompt {
  return {
    input: config.input,
    options: config.options || {},
    modelId: config.modelId,
    modelName: config.modelName || config.modelId,
    provider: config.provider,
    transformationType: config.transformationType,
    timestamp: new Date(),
    metadata: {
      ...config.modelMetadata,
      ...(config.predictionId && { predictionId: config.predictionId }),
      ...(config.requestId && { requestId: config.requestId }),
      // Include any additional metadata from config
      ...Object.keys(config)
        .filter(key => !['input', 'options', 'modelId', 'modelName', 'provider', 'transformationType', 'modelMetadata', 'predictionId', 'requestId'].includes(key))
        .reduce((acc, key) => ({ ...acc, [key]: config[key] }), {})
    }
  };
}

/**
 * Helper to extract input content from various role types
 */
export function extractInputContent(input: any): string {
  if (typeof input === 'string') {
    return input;
  }
  
  if (input && typeof input === 'object') {
    // For role objects, try to get the content
    if (input.content) {
      return input.content;
    }
    
    // For Text objects
    if (input.asText && typeof input.asText === 'function') {
      return input.content || input.toString();
    }
    
    // For arrays, get first element
    if (Array.isArray(input) && input.length > 0) {
      return extractInputContent(input[0]);
    }
  }
  
  return String(input);
}

export default { createGenerationPrompt, extractInputContent };
