import axios, { AxiosInstance, AxiosResponse } from 'axios';

export interface AzureOpenAIConfig {
  apiKey: string;
  baseUrl: string;
  apiVersion?: string;
  timeout?: number;
}

export interface AzureOpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AzureOpenAIChatRequest {
  messages: AzureOpenAIMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  stream?: boolean;
}

export interface AzureOpenAIChatResponse {
  id: string;
  object: string;
  created: number;
  choices: Array<{ index: number; message: { role: string; content: string }; finish_reason: string }>;
}

export class AzureOpenAIAPIClient {
  private client: AxiosInstance;
  private config: AzureOpenAIConfig;

  constructor(config: AzureOpenAIConfig) {
    this.config = {
      apiVersion: '2024-02-15-preview',
      timeout: 300000,
      ...config
    };

    this.client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'api-key': this.config.apiKey,
        'Content-Type': 'application/json'
      }
    });
  }

  private chatPath(model: string): string {
    return `/openai/deployments/${model}/chat/completions?api-version=${this.config.apiVersion}`;
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.client.get(`/openai/models?api-version=${this.config.apiVersion}`);
      return true;
    } catch {
      return false;
    }
  }

  async chatCompletion(model: string, request: AzureOpenAIChatRequest): Promise<AzureOpenAIChatResponse> {
    const response: AxiosResponse<AzureOpenAIChatResponse> = await this.client.post(this.chatPath(model), request);
    return response.data;
  }

  async generateText(model: string, prompt: string, options?: { temperature?: number; maxTokens?: number; topP?: number; systemPrompt?: string }): Promise<string> {
    const messages: AzureOpenAIMessage[] = [];
    if (options?.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const request: AzureOpenAIChatRequest = {
      messages,
      temperature: options?.temperature,
      max_tokens: options?.maxTokens,
      top_p: options?.topP
    };

    const response = await this.chatCompletion(model, request);
    if (!response.choices || response.choices.length === 0) {
      throw new Error('No response choices returned from Azure OpenAI');
    }
    return response.choices[0].message.content;
  }
}
