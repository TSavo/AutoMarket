/**
 * Together AI Text-to-Text Model
 * 
 * Concrete implementation of TextToTextModel for Together.ai's unified LLM API.
 * Provides access to open-source models through Together's platform.
 */

import { TextToTextModel, TextToTextOptions } from '../../models/abstracts/TextToTextModel';
import { ModelMetadata } from '../../models/abstracts/Model';
import { Text, TextRole } from '../../assets/roles';
import { TogetherAPIClient } from './TogetherAPIClient';
import { createGenerationPrompt } from '../../utils/GenerationPromptHelper';

export interface TogetherTextToTextOptions extends TextToTextOptions {
  systemPrompt?: string;
  topK?: number;
  repetitionPenalty?: number;
  stop?: string[];
}

export interface TogetherTextToTextConfig {
  apiClient: TogetherAPIClient;
  modelId: string;
  metadata?: Partial<ModelMetadata>;
}

export class TogetherTextToTextModel extends TextToTextModel {
  private apiClient: TogetherAPIClient;
  private modelId: string;

  constructor(config: TogetherTextToTextConfig) {
    const metadata: ModelMetadata = {
      id: config.modelId,
      name: config.metadata?.name || `Together ${config.modelId}`,
      description: config.metadata?.description || `Together AI text-to-text model: ${config.modelId}`,
      version: config.metadata?.version || '1.0.0',
      provider: 'together',
      capabilities: ['text-generation'],
      inputTypes: ['text'],
      outputTypes: ['text'],
      ...config.metadata
    };

    super(metadata);
    this.apiClient = config.apiClient;
    this.modelId = config.modelId;
  }
  /**
   * Transform text to text using Together AI
   */
  async transform(input: TextRole | TextRole[], options?: TogetherTextToTextOptions): Promise<Text> {
    const startTime = Date.now();

    // Handle array input - get first element for single text generation
    const inputRole = Array.isArray(input) ? input[0] : input;

    // Get text from the TextRole
    const text = await inputRole.asText();

    // Validate text data
    if (!text.isValid()) {
      throw new Error('Invalid text data provided');
    }

    try {
      // Generate text using Together AI API
      const generatedText = await this.apiClient.generateText(
        this.modelId,
        text.content,
        {
          temperature: options?.temperature,
          maxTokens: options?.maxOutputTokens,
          topP: options?.topP,
          topK: options?.topK,
          repetitionPenalty: options?.repetitionPenalty,
          systemPrompt: options?.systemPrompt,
          stop: options?.stop
        }
      );

      // Calculate processing time
      const processingTime = Date.now() - startTime;      // Create Text result
      const result = new Text(
        generatedText,
        text.language || 'auto', // Preserve input language
        1.0, // High confidence for successful generation
        {
          processingTime,
          model: this.modelId,
          provider: 'together',
          inputTokens: text.content.split(' ').length, // Rough estimate
          outputTokens: generatedText.split(' ').length, // Rough estimate
          temperature: options?.temperature,
          maxTokens: options?.maxOutputTokens,
          topK: options?.topK,
          repetitionPenalty: options?.repetitionPenalty,
          systemPrompt: options?.systemPrompt,          generation_prompt: createGenerationPrompt({
            input: input, // RAW input object to preserve generation chain
            options: options,
            modelId: this.modelId,
            modelName: this.modelId,
            provider: 'together',
            transformationType: 'text-to-text',
            processingTime
          })
        },
        text.sourceAsset // Preserve source Asset reference
      );

      return result;

    } catch (error) {
      throw new Error(`Together AI text generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if the model is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      return await this.apiClient.testConnection();
    } catch (error) {
      console.warn(`Together AI model ${this.modelId} availability check failed:`, error);
      return false;
    }
  }

  /**
   * Get model-specific information
   */
  getModelInfo(): { id: string; provider: string; capabilities: string[] } {
    return {
      id: this.modelId,
      provider: 'together',
      capabilities: ['text-generation', 'chat', 'completion']
    };
  }

  /**
   * Estimate token count for input text (rough approximation)
   */
  estimateTokens(text: string): number {
    // Very rough estimation: ~4 characters per token for English text
    return Math.ceil(text.length / 4);
  }

  /**
   * Get supported parameters for this model
   */
  getSupportedParameters(): string[] {
    return [
      'temperature',
      'maxOutputTokens', 
      'topP',
      'topK',
      'repetitionPenalty',
      'systemPrompt',
      'stop'
    ];
  }

  /**
   * Get model display name
   */
  getDisplayName(): string {
    // Convert model ID to readable name
    const parts = this.modelId.split('/');
    if (parts.length >= 2) {
      const [org, model] = parts;
      return `${org.charAt(0).toUpperCase() + org.slice(1)} ${model.replace(/-/g, ' ')}`;
    }
    return this.modelId;
  }

  /**
   * Check if this is a free model
   */
  async isFreeModel(): Promise<boolean> {
    try {
      const modelInfo = await this.apiClient.getModelInfo(this.modelId);
      if (modelInfo?.pricing) {
        return modelInfo.pricing.input === 0 && modelInfo.pricing.output === 0;
      }
      // If no pricing info, assume it might be free (Together has many free models)
      return true;
    } catch (error) {
      console.warn(`Could not determine if model ${this.modelId} is free:`, error);
      return false;
    }
  }
}
