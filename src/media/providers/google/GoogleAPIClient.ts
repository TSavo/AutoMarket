import axios, { AxiosInstance, AxiosResponse } from 'axios';

export interface GoogleConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
}

export interface GoogleContentPart {
  text: string;
}

export interface GoogleContent {
  parts: GoogleContentPart[];
}

export interface GoogleRequest {
  contents: GoogleContent[];
  generationConfig?: {
    temperature?: number;
    maxOutputTokens?: number;
    topP?: number;
  };
}

export interface GoogleCandidate {
  content: { parts: { text: string }[] };
}

export interface GoogleResponse {
  candidates: GoogleCandidate[];
}

export interface GoogleModel {
  name: string;
}

export interface GoogleModelsResponse {
  models: GoogleModel[];
}

export class GoogleAPIClient {
  private client: AxiosInstance;
  private config: GoogleConfig;

  constructor(config: GoogleConfig) {
    this.config = {
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
      timeout: 300000,
      ...config
    };

    this.client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      params: { key: this.config.apiKey }
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

  async getAvailableModels(): Promise<GoogleModel[]> {
    const response: AxiosResponse<GoogleModelsResponse> = await this.client.get('/models');
    return response.data.models;
  }

  async generateText(model: string, prompt: string, options?: { temperature?: number; maxTokens?: number; topP?: number }): Promise<string> {
    const request: GoogleRequest = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: options?.temperature,
        maxOutputTokens: options?.maxTokens,
        topP: options?.topP
      }
    };

    const response: AxiosResponse<GoogleResponse> = await this.client.post(`/models/${model}:generateContent`, request);
    const candidate = response.data.candidates?.[0];
    if (!candidate) {
      throw new Error('No response candidates returned from Google Gemini');
    }
    return candidate.content.parts[0].text;
  }
}
