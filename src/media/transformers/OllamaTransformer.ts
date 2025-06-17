/**
 * Ollama Text→Text Transformer
 * 
 * Implements MediaTransformer interface for local text transformations using Ollama
 * Based on existing integration in ScriptGeneratorStateHandler.ts
 */

import { 
  MediaTransformer, 
  MediaInput, 
  MediaOutput, 
  TransformCapability,
  createMediaOutput 
} from '../types/MediaTransformer';
import fetch from 'node-fetch';

export interface OllamaConfig {
  baseUrl?: string;
  model?: string;
  temperature?: number;
  topP?: number;
  maxTokens?: number;
}

export interface OllamaTransformOptions {
  model?: string;
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  systemPrompt?: string;
  stream?: boolean;
}

/**
 * Ollama Transformer for text→text transformations
 * 
 * Supports various text transformation tasks:
 * - Text generation and completion
 * - Text summarization
 * - Text rewriting and style transfer
 * - Question answering
 * - Translation
 */
export class OllamaTransformer implements MediaTransformer {
  readonly id = 'ollama';
  readonly name = 'Ollama Local LLM';
  readonly type = 'local' as const;
  readonly transforms: TransformCapability[] = [
    {
      input: 'text',
      output: 'text',
      description: 'Transform text using local Ollama models (generation, summarization, rewriting, etc.)'
    }
  ];

  private config: OllamaConfig;

  constructor(config: OllamaConfig = {}) {
    this.config = {
      baseUrl: config.baseUrl || process.env.OLLAMA_URL || 'http://localhost:11434',
      model: config.model || 'deepseek-r1:7b',
      temperature: config.temperature || 0.7,
      topP: config.topP || 0.9,
      maxTokens: config.maxTokens || 200
    };
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/tags`, {
        method: 'GET',
        timeout: 5000
      });
      return response.ok;
    } catch (error) {
      console.warn('Ollama not available:', error);
      return false;
    }
  }

  async transform(input: MediaInput, outputType: 'text', options?: OllamaTransformOptions): Promise<MediaOutput> {
    // Validate input type
    if (input.type !== 'text') {
      throw new Error(`OllamaTransformer only supports text input, received: ${input.type}`);
    }

    // Validate output type
    if (outputType !== 'text') {
      throw new Error(`OllamaTransformer only outputs text, requested: ${outputType}`);
    }

    try {
      const prompt = typeof input.data === 'string' ? input.data : input.data.toString('utf-8');
      const result = await this.generateText(prompt, options);

      return createMediaOutput('text', result.text, {
        model: result.model,
        promptTokens: result.promptTokens,
        completionTokens: result.completionTokens,
        totalTokens: result.totalTokens,
        processingTime: result.processingTime,
        service: 'ollama',
        ...result.metadata
      });
    } catch (error) {
      throw new Error(`Ollama transformation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate text using Ollama API
   */
  private async generateText(prompt: string, options?: OllamaTransformOptions) {
    const startTime = Date.now();
    
    const requestBody = {
      model: options?.model || this.config.model,
      prompt: this.buildPrompt(prompt, options?.systemPrompt),
      stream: options?.stream || false,
      options: {
        temperature: options?.temperature || this.config.temperature,
        top_p: options?.topP || this.config.topP,
        max_tokens: options?.maxTokens || this.config.maxTokens
      }
    };

    const response = await fetch(`${this.config.baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      timeout: 60000 // 1 minute timeout
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const endTime = Date.now();

    // Process the response
    const processedText = this.processResponse(data.response);

    return {
      text: processedText,
      model: requestBody.model,
      promptTokens: data.prompt_eval_count || 0,
      completionTokens: data.eval_count || 0,
      totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
      processingTime: endTime - startTime,
      metadata: {
        evalDuration: data.eval_duration,
        loadDuration: data.load_duration,
        promptEvalDuration: data.prompt_eval_duration,
        totalDuration: data.total_duration
      }
    };
  }

  /**
   * Build the complete prompt with optional system prompt
   */
  private buildPrompt(userPrompt: string, systemPrompt?: string): string {
    if (systemPrompt) {
      return `${systemPrompt}\n\nUser: ${userPrompt}\n\nAssistant:`;
    }
    return userPrompt;
  }

  /**
   * Process AI response (based on ScriptGeneratorStateHandler logic)
   */
  private processResponse(response: string): string {
    try {
      // Clean up the response
      let text = response.trim();

      // Remove common AI response prefixes
      text = text.replace(/^(Assistant:|AI:|Response:)\s*/i, '');

      // Ensure it ends with proper punctuation
      if (!/[.!?]$/.test(text)) {
        text += '.';
      }

      return text;
    } catch (error) {
      console.warn('Error processing Ollama response:', error);
      return response.trim();
    }
  }

  /**
   * Get available models from Ollama
   */
  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/tags`);
      if (response.ok) {
        const data = await response.json();
        return data.models?.map((model: any) => model.name) || [];
      }
      return [];
    } catch (error) {
      console.warn('Failed to get Ollama models:', error);
      return [];
    }
  }

  /**
   * Get transformer information
   */
  getInfo() {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      transforms: this.transforms,
      status: 'unknown' as const // Will be determined by isAvailable()
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<OllamaConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}
