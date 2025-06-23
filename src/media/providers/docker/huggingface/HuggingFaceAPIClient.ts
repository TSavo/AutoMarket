/**
 * HuggingFaceAPIClient
 * 
 * API client for communicating with the HuggingFace Docker service.
 * Handles dynamic model loading and text-to-image generation requests.
 */

import axios, { AxiosInstance, AxiosResponse } from 'axios';

export interface HuggingFaceDockerConfig {
  baseUrl?: string;
  timeout?: number;
  retries?: number;
}

export interface HuggingFaceModelInfo {
  modelId: string;
  loaded: boolean;
  memoryUsage?: number;
  loadTime?: number;
  capabilities: string[];
  parameters: Record<string, any>;
}

export interface HuggingFaceGenerationRequest {
  modelId: string;
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  numInferenceSteps?: number;
  guidanceScale?: number;
  seed?: number;
  scheduler?: string;
  [key: string]: any; // Allow model-specific parameters
}

export interface HuggingFaceGenerationResponse {
  success: boolean;
  imageUrl?: string;
  imageBase64?: string;
  audioUrl?: string;
  audioBase64?: string;
  metadata: {
    modelId: string;
    generationTime: number;
    parameters: Record<string, any>;
    seed?: number;
  };
  error?: string;
}

export interface ModelLoadRequest {
  modelId: string;
  force?: boolean;
  precision?: 'fp16' | 'fp32';
  device?: 'cuda' | 'cpu' | 'auto';
}

export interface ModelLoadResponse {
  success: boolean;
  modelId: string;
  loadTime: number;
  memoryUsage: number;
  error?: string;
}

export interface ServiceHealthResponse {
  status: 'healthy' | 'unhealthy';
  loadedModels: string[];
  memoryUsage: {
    total: number;
    used: number;
    available: number;
  };
  gpuInfo?: {
    available: boolean;
    name: string;
    memoryTotal: number;
    memoryUsed: number;
  };
}

/**
 * API client for HuggingFace Docker service
 */
export class HuggingFaceAPIClient {
  private client: AxiosInstance;
  private config: HuggingFaceDockerConfig;

  constructor(config: HuggingFaceDockerConfig = {}) {
    this.config = {
      baseUrl: config.baseUrl || 'http://localhost:8007',
      timeout: config.timeout || 300000, // 5 minutes for model loading
      retries: config.retries || 3
    };

    this.client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('[HuggingFaceAPIClient] Request failed:', error.message);
        
        // Extract detailed error message from response body if available
        if (error.response?.data?.detail) {
          // Enhance the error with detailed server message
          const enhancedError = new Error(error.response.data.detail);
          enhancedError.name = error.name;
          enhancedError.stack = error.stack;
          return Promise.reject(enhancedError);
        }
        
        return Promise.reject(error);
      }
    );
  }

  /**
   * Check if the service is healthy and ready
   */
  async healthCheck(): Promise<ServiceHealthResponse> {
    try {
      const response: AxiosResponse<ServiceHealthResponse> = await this.client.get('/health');
      return response.data;
    } catch (error) {
      throw new Error(`Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Load a model dynamically from HuggingFace Hub
   */
  async loadModel(request: ModelLoadRequest): Promise<ModelLoadResponse> {
    try {
      console.log(`[HuggingFaceAPIClient] Loading model: ${request.modelId}`);
      const response: AxiosResponse<ModelLoadResponse> = await this.client.post('/models/load', request);
      console.log(`[HuggingFaceAPIClient] Model loaded successfully: ${request.modelId}`);
      return response.data;
    } catch (error) {
      // The detailed error message is now enhanced by the interceptor
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[HuggingFaceAPIClient] Failed to load model ${request.modelId}:`, message);
      throw new Error(`Failed to load model ${request.modelId}: ${message}`);
    }
  }

  /**
   * Get information about a loaded model
   */
  async getModelInfo(modelId: string): Promise<HuggingFaceModelInfo> {
    try {
      const response: AxiosResponse<HuggingFaceModelInfo> = await this.client.get(`/models/${encodeURIComponent(modelId)}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get model info for ${modelId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate audio from text using a loaded model
   */
  async generateAudio(request: HuggingFaceGenerationRequest): Promise<HuggingFaceGenerationResponse> {
    try {
      console.log(`[HuggingFaceAPIClient] Generating audio with model: ${request.modelId}`);
      const response: AxiosResponse<HuggingFaceGenerationResponse> = await this.client.post('/generate/audio', request);
      console.log(`[HuggingFaceAPIClient] Audio generated successfully`);
      return response.data;
    } catch (error) {
      // The detailed error message is now enhanced by the interceptor
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[HuggingFaceAPIClient] Audio generation failed:`, message);
      throw new Error(`Audio generation failed: ${message}`);
    }
  }

  /**
   * Generate an image from text using a loaded model
   */
  async generateImage(request: HuggingFaceGenerationRequest): Promise<HuggingFaceGenerationResponse> {
    try {
      console.log(`[HuggingFaceAPIClient] Generating image with model: ${request.modelId}`);
      const response: AxiosResponse<HuggingFaceGenerationResponse> = await this.client.post('/generate', request);
      console.log(`[HuggingFaceAPIClient] Image generated successfully`);
      return response.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[HuggingFaceAPIClient] Image generation failed:`, message);
      throw new Error(`Image generation failed: ${message}`);
    }
  }

  /**
   * Unload a model to free memory
   */
  async unloadModel(modelId: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await this.client.delete(`/models/${encodeURIComponent(modelId)}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to unload model ${modelId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List all loaded models
   */
  async listLoadedModels(): Promise<HuggingFaceModelInfo[]> {
    try {
      const response: AxiosResponse<HuggingFaceModelInfo[]> = await this.client.get('/models');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to list models: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Test connection to the service
   */
  async testConnection(): Promise<boolean> {
    try {
      const health = await this.healthCheck();
      return health.status === 'healthy';
    } catch {
      return false;
    }
  }
}
