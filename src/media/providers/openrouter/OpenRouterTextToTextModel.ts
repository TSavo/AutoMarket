/**
 * OpenRouter Text-to-Text Model
 *
 * Concrete implementation of TextToTextModel for OpenRouter's unified LLM API.
 * Provides access to multiple model providers through OpenRouter.
 */

import { TextToTextModel, TextToTextOptions } from '../../models/abstracts/TextToTextModel';
import { ModelMetadata } from '../../models/abstracts/Model';
import { Text, TextRole } from '../../assets/roles';
import { OpenRouterAPIClient } from './OpenRouterAPIClient';

export interface OpenRouterTextToTextOptions extends TextToTextOptions {
  systemPrompt?: string;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

export interface OpenRouterTextToTextConfig {
  apiClient: OpenRouterAPIClient;
  modelId: string;
  metadata?: Partial<ModelMetadata>;
}

export class OpenRouterTextToTextModel extends TextToTextModel {
  private apiClient: OpenRouterAPIClient;
  private modelId: string;

  constructor(config: OpenRouterTextToTextConfig) {
    const metadata: ModelMetadata = {
      id: config.modelId,
      name: config.metadata?.name || `OpenRouter ${config.modelId}`,
      description: config.metadata?.description || `OpenRouter text-to-text model: ${config.modelId}`,
      version: config.metadata?.version || '1.0.0',
      provider: 'openrouter',
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
   * Transform text to text using OpenRouter
   */
  async transform(input: TextRole, options?: OpenRouterTextToTextOptions): Promise<Text> {
    const startTime = Date.now();    // Get text from the TextRole
    const text = await input.asText();

    // Validate text data
    if (!text.isValid()) {
      throw new Error('Invalid text data provided');
    }

    try {
      // Generate text using OpenRouter API
      const generatedText = await this.apiClient.generateText(
        this.modelId,
        text.content,
        {
          temperature: options?.temperature,
          maxTokens: options?.maxOutputTokens,
          topP: options?.topP,
          systemPrompt: options?.systemPrompt
        }
      );

      // Calculate processing time
      const processingTime = Date.now() - startTime;

      // Create Text result
      const result = new Text(
        generatedText,
        text.language || 'auto', // Preserve input language
        1.0, // High confidence for successful generation
        {
          processingTime,
          model: this.modelId,
          provider: 'openrouter',
          inputTokens: text.content.split(' ').length, // Rough estimate
          outputTokens: generatedText.split(' ').length, // Rough estimate
          temperature: options?.temperature,
          maxTokens: options?.maxOutputTokens,
          systemPrompt: options?.systemPrompt
        },
        text.sourceAsset // Preserve source Asset reference
      );

      return result;

    } catch (error) {
      throw new Error(`OpenRouter text generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if the model is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      return await this.apiClient.testConnection();
    } catch (error) {
      console.warn(`OpenRouter model ${this.modelId} availability check failed:`, error);
      return false;
    }
  }

  /**
   * Get model-specific information
   */
  getModelInfo(): { id: string; provider: string; capabilities: string[] } {
    return {
      id: this.modelId,
      provider: 'openrouter',
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
      'systemPrompt',
      'frequencyPenalty',
      'presencePenalty'
    ];
  }
}