import axios, { AxiosInstance, AxiosResponse } from 'axios';

export interface MistralConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
}

export interface MistralMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface MistralChatRequest {
  model: string;
  messages: MistralMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  stream?: boolean;
}

export interface MistralChoice {
  index: number;
  message: { role: string; content: string };
  finish_reason: string;
}

export interface MistralChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: MistralChoice[];
}

export interface MistralModel {
  id: string;
}

export interface MistralModelsResponse {
  data: MistralModel[];
}

export class MistralAPIClient {
  private client: AxiosInstance;
  private config: MistralConfig;

  constructor(config: MistralConfig) {
    this.config = {
      baseUrl: 'https://api.mistral.ai/v1',
      timeout: 300000,
      ...config
    };

    this.client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.client.get('/models');
      return true;
    } catch {
      return false;
    }
  }

  async getAvailableModels(): Promise<MistralModel[]> {
    const response: AxiosResponse<MistralModelsResponse> = await this.client.get('/models');
    return response.data.data;
  }

  async chatCompletion(request: MistralChatRequest): Promise<MistralChatResponse> {
    const response: AxiosResponse<MistralChatResponse> = await this.client.post('/chat/completions', request);
    return response.data;
  }

  async generateText(model: string, prompt: string, options?: { temperature?: number; maxTokens?: number; topP?: number; systemPrompt?: string }): Promise<string> {
    const messages: MistralMessage[] = [];
    if (options?.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const request: MistralChatRequest = {
      model,
      messages,
      temperature: options?.temperature,
      max_tokens: options?.maxTokens,
      top_p: options?.topP
    };

    const response = await this.chatCompletion(request);
    if (!response.choices || response.choices.length === 0) {
      throw new Error('No response choices returned from Mistral');
    }
    return response.choices[0].message.content;
  }
}
