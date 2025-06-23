import axios, { AxiosInstance } from 'axios';

export interface OllamaConfig {
  baseUrl?: string;
  timeout?: number;
}

export interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  stream?: boolean;
}

export interface OllamaGenerateResponse {
  response: string;
  model: string;
}

export interface OllamaListResponse {
  models?: { name?: string }[];
}

export class OllamaAPIClient {
  private client: AxiosInstance;
  private config: Required<OllamaConfig>;

  constructor(config: OllamaConfig = {}) {
    this.config = {
      baseUrl: config.baseUrl || 'http://localhost:11434',
      timeout: config.timeout || 300000,
    };

    this.client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.client.get('/api/tags');
      return true;
    } catch {
      return false;
    }
  }

  async generateText(request: OllamaGenerateRequest): Promise<OllamaGenerateResponse> {
    const { data } = await this.client.post('/api/generate', {
      model: request.model,
      prompt: request.prompt,
      stream: request.stream ?? false,
    });
    if (!data || typeof data.response !== 'string') {
      throw new Error('Invalid response from Ollama');
    }
    return { response: data.response, model: data.model || request.model };
  }

  async listModels(): Promise<string[]> {
    try {
      const { data } = await this.client.get<OllamaListResponse>('/api/tags');
      if (!data || !Array.isArray(data.models)) return [];
      return data.models
        .map(m => m?.name)
        .filter((name): name is string => typeof name === 'string');
    } catch (error) {
      console.warn('[OllamaAPIClient] Failed to fetch model list:', error);
      return [];
    }
  }

  async pullModel(name: string): Promise<void> {
    try {
      await this.client.post('/api/pull', { name });
    } catch (error) {
      console.warn(`[OllamaAPIClient] Failed to pull model ${name}:`, error);
    }
  }
}
