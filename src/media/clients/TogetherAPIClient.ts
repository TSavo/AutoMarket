/**
 * Together AI API Client
 * 
 * Client for interacting with Together.ai's unified LLM API.
 * Provides access to multiple open-source models through Together's platform.
 */

import axios, { AxiosInstance, AxiosResponse } from 'axios';

export interface TogetherConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
}

export interface TogetherMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface TogetherChatRequest {
  model: string;
  messages: TogetherMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  top_k?: number;
  repetition_penalty?: number;
  stream?: boolean;
  stop?: string[];
}

export interface TogetherChoice {
  index: number;
  message: {
    role: string;
    content: string;
  };
  finish_reason: string;
}

export interface TogetherUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface TogetherChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: TogetherChoice[];
  usage: TogetherUsage;
}

export interface TogetherModel {
  id: string;
  object: string;
  created: number;
  owned_by: string;
  display_name?: string;
  description?: string;
  context_length?: number;
  type?: string;
  pricing?: {
    input: number;
    output: number;
  };
}

export interface TogetherModelsResponse {
  data?: TogetherModel[];
  models?: TogetherModel[];
}

export class TogetherAPIClient {
  private client: AxiosInstance;
  private config: TogetherConfig;

  constructor(config: TogetherConfig) {
    this.config = {
      baseUrl: 'https://api.together.xyz/v1',
      timeout: 600000, // Increase timeout for image generation
      ...config
    };

    this.client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response) {
          const errorMessage = error.response.data?.error?.message || error.response.statusText;
          throw new Error(`Together AI API error (${error.response.status}): ${errorMessage}`);
        } else if (error.request) {
          throw new Error('Together AI API request failed: No response received');
        } else {
          throw new Error(`Together AI API error: ${error.message}`);
        }
      }
    );
  }

  /**
   * Test connection to Together AI API
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.getAvailableModels();
      return true;
    } catch (error) {
      console.warn('Together AI connection test failed:', error);
      return false;
    }
  }

  /**
   * Get available models from Together AI
   */
  async getAvailableModels(): Promise<TogetherModel[]> {
    try {
      console.log('[TogetherAPIClient] Fetching models from /models endpoint...');
      const response: AxiosResponse<TogetherModelsResponse> = await this.client.get('/models');

      console.log(`[TogetherAPIClient] Response status: ${response.status}`);
      console.log(`[TogetherAPIClient] Response data type: ${typeof response.data}`);

      if (!response.data) {
        throw new Error('No data in response');
      }

      // Handle different response formats
      let models: TogetherModel[];
      if (Array.isArray(response.data)) {
        // Direct array response
        models = response.data;
      } else if (response.data.data && Array.isArray(response.data.data)) {
        // Wrapped in data property
        models = response.data.data;
      } else if (response.data.models && Array.isArray(response.data.models)) {
        // Wrapped in models property
        models = response.data.models;
      } else {
        console.error('[TogetherAPIClient] Unexpected response format:', JSON.stringify(response.data, null, 2).substring(0, 500));
        throw new Error(`Unexpected response format: ${typeof response.data}`);
      }

      console.log(`[TogetherAPIClient] Successfully parsed ${models.length} models`);
      return models;

    } catch (error) {
      console.error('[TogetherAPIClient] Failed to fetch models:', error);
      throw new Error(`Failed to fetch Together AI models: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Send chat completion request
   */
  async chatCompletion(request: TogetherChatRequest): Promise<TogetherChatResponse> {
    try {
      const response: AxiosResponse<TogetherChatResponse> = await this.client.post('/chat/completions', request);
      return response.data;
    } catch (error) {
      throw new Error(`Together AI chat completion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      topK?: number;
      repetitionPenalty?: number;
      systemPrompt?: string;
      stop?: string[];
    }
  ): Promise<string> {
    const messages: TogetherMessage[] = [];
    
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

    const request: TogetherChatRequest = {
      model: modelId,
      messages,
      temperature: options?.temperature,
      max_tokens: options?.maxTokens,
      top_p: options?.topP,
      top_k: options?.topK,
      repetition_penalty: options?.repetitionPenalty,
      stop: options?.stop
    };

    const response = await this.chatCompletion(request);
    
    if (!response.choices || response.choices.length === 0) {
      throw new Error('No response choices returned from Together AI');
    }

    return response.choices[0].message.content;
  }

  /**
   * Get model information by ID
   */
  async getModelInfo(modelId: string): Promise<TogetherModel | null> {
    try {
      const models = await this.getAvailableModels();
      if (!models || !Array.isArray(models)) {
        console.warn(`No models available for lookup of ${modelId}`);
        return null;
      }
      return models.find(model => model.id === modelId) || null;
    } catch (error) {
      console.warn(`Failed to get model info for ${modelId}:`, error);
      return null;
    }
  }
}
