/**
 * OpenAI API Client
 *
 * Client for interacting with OpenAI's API.
 * Provides access to GPT models, DALL-E, and TTS services.
 */

import axios, { AxiosInstance, AxiosResponse } from 'axios';
import * as fs from 'fs';
import FormData from 'form-data';

export interface OpenAIConfig {
  apiKey: string;
  baseUrl?: string;
  organization?: string;
  timeout?: number;
}

export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenAIChatRequest {
  model: string;
  messages: OpenAIMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stream?: boolean;
  response_format?: { type: 'text' | 'json_object' };
  seed?: number;
  stop?: string | string[];
}

export interface OpenAIChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface OpenAIImageRequest {
  model: string;
  prompt: string;
  n?: number;
  size?: '256x256' | '512x512' | '1024x1024' | '1792x1024' | '1024x1792';
  quality?: 'standard' | 'hd';
  response_format?: 'url' | 'b64_json';
  style?: 'vivid' | 'natural';
  user?: string;
}

export interface OpenAIImageResponse {
  created: number;
  data: Array<{
    url?: string;
    b64_json?: string;
    revised_prompt?: string;
  }>;
}

export interface OpenAITTSRequest {
  model: string;
  input: string;
  voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  response_format?: 'mp3' | 'opus' | 'aac' | 'flac' | 'wav' | 'pcm';
  speed?: number;
}

export interface OpenAITranscriptionRequest {
  file: string | fs.ReadStream;
  model: string;
  language?: string;
  prompt?: string;
  response_format?: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt';
  temperature?: number;
  timestamp_granularities?: Array<'word' | 'segment'>;
  stream?: boolean;
}

export type OpenAITranslationRequest = Omit<OpenAITranscriptionRequest, 'language' | 'timestamp_granularities' | 'stream'>;

export interface OpenAITranscriptionResponse {
  text: string;
  language?: string;
  duration?: number;
  words?: Array<{ start: number; end: number; word: string }>;
  segments?: Array<{ id: number; start: number; end: number; text: string }>;
}

export interface OpenAIModel {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}

export interface OpenAIModelsResponse {
  object: string;
  data: OpenAIModel[];
}

export class OpenAIAPIClient {
  private client: AxiosInstance;
  private config: OpenAIConfig;

  constructor(config: OpenAIConfig) {
    this.config = config;
    
    this.client = axios.create({
      baseURL: config.baseUrl || 'https://api.openai.com/v1',
      timeout: config.timeout || 60000,
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        ...(config.organization && { 'OpenAI-Organization': config.organization })
      }
    });
  }

  /**
   * Test connection to OpenAI API
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.client.get('/models');
      return true;
    } catch (error) {
      console.warn('OpenAI connection test failed:', error);
      return false;
    }
  }

  /**
   * Get available models from OpenAI
   */
  async getAvailableModels(): Promise<OpenAIModel[]> {
    try {
      const response: AxiosResponse<OpenAIModelsResponse> = await this.client.get('/models');
      return response.data.data;
    } catch (error) {
      throw new Error(`Failed to fetch OpenAI models: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Send chat completion request
   */
  async chatCompletion(request: OpenAIChatRequest): Promise<OpenAIChatResponse> {
    try {
      const response: AxiosResponse<OpenAIChatResponse> = await this.client.post('/chat/completions', request);
      return response.data;
    } catch (error) {
      throw new Error(`OpenAI chat completion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate text using OpenAI models
   */
  async generateText(
    model: string,
    prompt: string,
    options?: {
      temperature?: number;
      maxTokens?: number;
      topP?: number;
      systemPrompt?: string;
      responseFormat?: 'text' | 'json' | { type: 'json_object' };
    }
  ): Promise<string> {
    const messages: OpenAIMessage[] = [];
    
    if (options?.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }
    
    messages.push({ role: 'user', content: prompt });

    const request: OpenAIChatRequest = {
      model,
      messages,
      temperature: options?.temperature,
      max_tokens: options?.maxTokens,
      top_p: options?.topP,
      response_format: options?.responseFormat === 'json' ? { type: 'json_object' } : undefined
    };

    const response = await this.chatCompletion(request);
    return response.choices[0]?.message?.content || '';
  }

  /**
   * Generate image using DALL-E
   */
  async generateImage(request: OpenAIImageRequest): Promise<OpenAIImageResponse> {
    try {
      const response: AxiosResponse<OpenAIImageResponse> = await this.client.post('/images/generations', request);
      return response.data;
    } catch (error) {
      throw new Error(`OpenAI image generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate speech using TTS
   */
  async generateSpeech(request: OpenAITTSRequest): Promise<Buffer> {
    try {
      const response = await this.client.post('/audio/speech', request, {
        responseType: 'arraybuffer'
      });
      return Buffer.from(response.data);
    } catch (error) {
      throw new Error(`OpenAI TTS generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Transcribe audio to text
   */
  async createTranscription(request: OpenAITranscriptionRequest): Promise<OpenAITranscriptionResponse> {
    const form = new FormData();
    form.append('file', typeof request.file === 'string' ? fs.createReadStream(request.file) : request.file);
    form.append('model', request.model);
    if (request.language) form.append('language', request.language);
    if (request.prompt) form.append('prompt', request.prompt);
    if (request.response_format) form.append('response_format', request.response_format);
    if (request.temperature !== undefined) form.append('temperature', String(request.temperature));
    if (request.timestamp_granularities) {
      for (const g of request.timestamp_granularities) {
        form.append('timestamp_granularities[]', g);
      }
    }
    if (request.stream) form.append('stream', 'true');

    try {
      const response = await this.client.post('/audio/transcriptions', form, {
        headers: form.getHeaders()
      });
      return response.data;
    } catch (error) {
      throw new Error(`OpenAI transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Translate audio to English text
   */
  async createTranslation(request: OpenAITranslationRequest): Promise<OpenAITranscriptionResponse> {
    const form = new FormData();
    form.append('file', typeof request.file === 'string' ? fs.createReadStream(request.file) : request.file);
    form.append('model', request.model);
    if (request.prompt) form.append('prompt', request.prompt);
    if (request.response_format) form.append('response_format', request.response_format);
    if (request.temperature !== undefined) form.append('temperature', String(request.temperature));

    try {
      const response = await this.client.post('/audio/translations', form, {
        headers: form.getHeaders()
      });
      return response.data;
    } catch (error) {
      throw new Error(`OpenAI translation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
