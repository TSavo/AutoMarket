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
}
