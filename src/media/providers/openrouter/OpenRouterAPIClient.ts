/**
 * OpenRouter API Client
 *
 * Client for interacting with OpenRouter's unified LLM API.
 * Provides access to multiple model providers through a single interface.
 */

import axios, { AxiosInstance, AxiosResponse } from 'axios';

export interface OpenRouterConfig {
  apiKey: string;
  baseUrl?: string;
  httpReferer?: string;
  xTitle?: string;
  timeout?: number;
}

export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenRouterChatRequest {
  model: string;
  messages: OpenRouterMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stream?: boolean;
  response_format?: { type: 'json_object' };
}

export interface OpenRouterChoice {
  index: number;
  message: {
    role: string;
    content: string;
  };
  finish_reason: string;
}

export interface OpenRouterUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface OpenRouterChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: OpenRouterChoice[];
  usage: OpenRouterUsage;
}

export interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  context_length?: number;
  pricing?: {
    prompt: string;
    completion: string;
  };
}

export interface OpenRouterModelsResponse {
  data: OpenRouterModel[];
}

export class OpenRouterAPIClient {
  private client: AxiosInstance;
  private config: OpenRouterConfig;

  constructor(config: OpenRouterConfig) {    this.config = {
      baseUrl: 'https://openrouter.ai/api/v1',
      timeout: 300000,
      ...config
    };

    this.client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        ...(this.config.httpReferer && { 'HTTP-Referer': this.config.httpReferer }),
        ...(this.config.xTitle && { 'X-Title': this.config.xTitle })
      }
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response) {
          const errorMessage = error.response.data?.error?.message || error.response.statusText;
          throw new Error(`OpenRouter API error (${error.response.status}): ${errorMessage}`);
        } else if (error.request) {
          throw new Error('OpenRouter API request failed: No response received');
        } else {
          throw new Error(`OpenRouter API error: ${error.message}`);
        }
      }
    );
  }

  /**
   * Test connection to OpenRouter API
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.getAvailableModels();
      return true;
    } catch (error) {
      console.warn('OpenRouter connection test failed:', error);
      return false;
    }
  }

  /**
   * Get available models from OpenRouter
   */
  async getAvailableModels(): Promise<OpenRouterModel[]> {
    try {
      const response: AxiosResponse<OpenRouterModelsResponse> = await this.client.get('/models');
      return response.data.data;
    } catch (error) {
      throw new Error(`Failed to fetch OpenRouter models: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Send chat completion request
   */
  async chatCompletion(request: OpenRouterChatRequest): Promise<OpenRouterChatResponse> {
    try {
      const response: AxiosResponse<OpenRouterChatResponse> = await this.client.post('/chat/completions', request);
      return response.data;
    } catch (error) {
      throw new Error(`OpenRouter chat completion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  /**
   * Generate text using a specific model
   */
  async generateText(
    modelId: string,
    prompt: string,
    options?: {
      temperature?: number;
      maxTokens?: number;
      topP?: number;
      systemPrompt?: string;
      responseFormat?: 'text' | 'json' | { type: 'json_object' };
    }
  ): Promise<string> {
    const messages: OpenRouterMessage[] = [];

    if (options?.systemPrompt) {
      messages.push({
        role: 'system',
        content: options.systemPrompt
      });
    }

    messages.push({
      role: 'user',
      content: prompt
    });

    // Handle response format conversion
    let response_format: { type: 'json_object' } | undefined;
    if (options?.responseFormat === 'json' || 
        (typeof options?.responseFormat === 'object' && options.responseFormat.type === 'json_object')) {
      response_format = { type: 'json_object' };
    }

    const request: OpenRouterChatRequest = {
      model: modelId,
      messages,
      temperature: options?.temperature,
      max_tokens: options?.maxTokens,
      top_p: options?.topP,
      ...(response_format && { response_format })
    };

    const response = await this.chatCompletion(request);

    if (!response.choices || response.choices.length === 0) {
      throw new Error('No response choices returned from OpenRouter');
    }

    return response.choices[0].message.content;
  }
}