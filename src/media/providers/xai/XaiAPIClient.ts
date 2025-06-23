import axios, { AxiosInstance, AxiosResponse } from 'axios';

export interface XaiConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
}

export interface XaiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface XaiChatRequest {
  model: string;
  messages: XaiMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  stream?: boolean;
}

export interface XaiChoice {
  index: number;
  message: { role: string; content: string };
  finish_reason: string;
}

export interface XaiChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: XaiChoice[];
}

export interface XaiModel {
  id: string;
}

export interface XaiModelsResponse {
  data: XaiModel[];
}

export class XaiAPIClient {
  private client: AxiosInstance;
  private config: XaiConfig;

  constructor(config: XaiConfig) {
    this.config = {
      baseUrl: 'https://api.groq.com/openai/v1',
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

  async getAvailableModels(): Promise<XaiModel[]> {
    const response: AxiosResponse<XaiModelsResponse> = await this.client.get('/models');
    return response.data.data;
  }

  async chatCompletion(request: XaiChatRequest): Promise<XaiChatResponse> {
    const response: AxiosResponse<XaiChatResponse> = await this.client.post('/chat/completions', request);
    return response.data;
  }

  async generateText(model: string, prompt: string, options?: { temperature?: number; maxTokens?: number; topP?: number; systemPrompt?: string }): Promise<string> {
    const messages: XaiMessage[] = [];
    if (options?.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const request: XaiChatRequest = {
      model,
      messages,
      temperature: options?.temperature,
      max_tokens: options?.maxTokens,
      top_p: options?.topP
    };

    const response = await this.chatCompletion(request);
    if (!response.choices || response.choices.length === 0) {
      throw new Error('No response choices returned from xAI');
    }
    return response.choices[0].message.content;
  }
}
