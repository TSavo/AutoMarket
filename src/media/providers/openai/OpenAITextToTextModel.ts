/**
 * OpenAI Text-to-Text Model
 *
 * Concrete implementation of TextToTextModel for OpenAI's GPT models.
 * Provides access to GPT-4, GPT-3.5-turbo, and other text generation models.
 */

import { TextToTextModel, TextToTextOptions } from '../../models/abstracts/TextToTextModel';
import { ModelMetadata } from '../../models/abstracts/Model';
import { Text, TextRole } from '../../assets/roles';
import { OpenAIAPIClient } from './OpenAIAPIClient';
import { createGenerationPrompt } from '../../utils/GenerationPromptHelper';

export interface OpenAITextToTextOptions extends TextToTextOptions {
  systemPrompt?: string;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string | string[];
  responseFormat?: 'text' | 'json' | { type: 'json_object' };
  seed?: number;
}

export interface OpenAITextToTextConfig {
  apiClient: OpenAIAPIClient;
  modelId: string;
  metadata?: Partial<ModelMetadata>;
}

export class OpenAITextToTextModel extends TextToTextModel {
  private apiClient: OpenAIAPIClient;
  private modelId: string;

  constructor(config: OpenAITextToTextConfig) {
    const metadata: ModelMetadata = {
      id: config.modelId,
      name: config.metadata?.name || `OpenAI ${config.modelId}`,
      description: config.metadata?.description || `OpenAI text-to-text model: ${config.modelId}`,
      version: config.metadata?.version || '1.0.0',
      provider: 'openai',
      capabilities: ['text-generation', 'chat', 'completion'],
      inputTypes: ['text'],
      outputTypes: ['text'],
      ...config.metadata
    };

    super(metadata);
    this.apiClient = config.apiClient;
    this.modelId = config.modelId;
  }

  /**
   * Transform text to text using OpenAI GPT models
   */
  async transform(input: TextRole | TextRole[], options?: OpenAITextToTextOptions): Promise<Text> {
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
      // Generate text using OpenAI API
      const generatedText = await this.apiClient.generateText(
        this.modelId,
        text.content,
        {
          temperature: options?.temperature,
          maxTokens: options?.maxOutputTokens,
          topP: options?.topP,
          systemPrompt: options?.systemPrompt,
          responseFormat: options?.responseFormat
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
          provider: 'openai',
          inputTokens: this.estimateTokens(text.content),
          outputTokens: this.estimateTokens(generatedText),
          temperature: options?.temperature,
          maxTokens: options?.maxOutputTokens,
          systemPrompt: options?.systemPrompt,
          frequencyPenalty: options?.frequencyPenalty,
          presencePenalty: options?.presencePenalty,
          generation_prompt: createGenerationPrompt({
            input: input, // RAW input object to preserve generation chain
            options: options,
            modelId: this.modelId,
            modelName: this.modelId,
            provider: 'openai',
            transformationType: 'text-to-text',
            processingTime
          })
        },
        text.sourceAsset // Preserve source Asset reference
      );

      return result;

    } catch (error) {
      throw new Error(`OpenAI text generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if the model is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      return await this.apiClient.testConnection();
    } catch (error) {
      console.warn(`OpenAI model ${this.modelId} availability check failed:`, error);
      return false;
    }
  }

  /**
   * Get model-specific information
   */
  getModelInfo(): { id: string; provider: string; capabilities: string[] } {
    return {
      id: this.modelId,
      provider: 'openai',
      capabilities: ['text-generation', 'chat', 'completion']
    };
  }

  /**
   * Estimate token count for input text (rough approximation)
   */
  estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token for English text
    // This is a simplified approximation - OpenAI has more sophisticated tokenization
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
      'frequencyPenalty',
      'presencePenalty',
      'systemPrompt',
      'stop',
      'responseFormat',
      'seed'
    ];
  }

  /**
   * Get maximum context length for this model
   */
  getMaxContextLength(): number {
    // Context lengths for common OpenAI models
    const contextLengths: Record<string, number> = {
      'gpt-4': 8192,
      'gpt-4-32k': 32768,
      'gpt-4-turbo': 128000,
      'gpt-4-turbo-preview': 128000,
      'gpt-3.5-turbo': 4096,
      'gpt-3.5-turbo-16k': 16384,
      'text-davinci-003': 4097,
      'text-davinci-002': 4097,
      'text-curie-001': 2049,
      'text-babbage-001': 2049,
      'text-ada-001': 2049
    };

    return contextLengths[this.modelId] || 4096; // Default fallback
  }

  /**
   * Check if model supports function calling
   */
  supportsFunctionCalling(): boolean {
    const functionCallingModels = [
      'gpt-4',
      'gpt-4-turbo',
      'gpt-4-turbo-preview',
      'gpt-3.5-turbo'
    ];

    return functionCallingModels.some(model => this.modelId.includes(model));
  }

  /**
   * Check if model supports JSON mode
   */
  supportsJsonMode(): boolean {
    const jsonModeModels = [
      'gpt-4-turbo',
      'gpt-4-turbo-preview',
      'gpt-3.5-turbo'
    ];

    return jsonModeModels.some(model => this.modelId.includes(model));
  }

  /**
   * Get model cost per token (approximate)
   */
  getCostPerToken(): { input: number; output: number } {
    const costs: Record<string, { input: number; output: number }> = {
      'gpt-4': { input: 0.00003, output: 0.00006 },
      'gpt-4-turbo': { input: 0.00001, output: 0.00003 },
      'gpt-3.5-turbo': { input: 0.0000015, output: 0.000002 }
    };

    // Find matching model (handles versioned model names)
    for (const [modelName, cost] of Object.entries(costs)) {
      if (this.modelId.includes(modelName)) {
        return cost;
      }
    }

    // Default fallback
    return { input: 0.000001, output: 0.000002 };
  }

  /**
   * Estimate cost for a given input/output token count
   */
  estimateCost(inputTokens: number, outputTokens: number): number {
    const costs = this.getCostPerToken();
    return (inputTokens * costs.input) + (outputTokens * costs.output);
  }
}
