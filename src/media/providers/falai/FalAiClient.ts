/**
 * FalAiClient - Clean Base API Client
 * 
 * Clean abstraction around the fal.ai client library that provides:
 * - Unified interface for all fal.ai models
 * - Error handling and retry logic
 * - Rate limiting and cost tracking
 * - Asset upload management
 * - Type-safe request/response handling
 */

import * as falLib from '@fal-ai/client';
import { v4 as uuidv4 } from 'uuid';
import fetch from 'node-fetch';
import { promises as fs } from 'fs';
import * as path from 'path';

const fal = falLib.fal;

export interface FalAiConfig {
  apiKey: string;
  timeout?: number;
  retries?: number;
  rateLimit?: {
    requestsPerSecond?: number;
    requestsPerMinute?: number;
  };
  discovery?: ModelDiscoveryConfig;
}

export interface FalAiRequestOptions {
  model: string;
  input: Record<string, any>;
  logs?: boolean;
  onProgress?: (progress: { percentage: number; message?: string }) => void;
}

export interface FalAiResponse<T = any> {
  requestId: string;
  data: T;
  logs?: string[];
  metrics?: {
    duration: number;
    cost?: number;
  };
}

export interface FalAiAssetUpload {
  url: string;
  file_name?: string;
  file_size?: number;
  content_type?: string;
}

export class FalAiError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number,
    public requestId?: string
  ) {
    super(message);
    this.name = 'FalAiError';
  }
}

export interface FalModelMetadata {
  id: string;
  name: string;
  category: string;
  description: string;
  parameters: Record<string, {
    type: string;
    description: string;
    required?: boolean;
    default?: any;
    min?: number;
    max?: number;
    enum?: string[];
  }>;
  capabilities: string[];
  tags: string[];
  pricing?: string;
  lastUpdated: number;
}

export interface ModelDiscoveryConfig {
  openRouterApiKey?: string;
  cacheDir?: string;
  maxCacheAge?: number; // in milliseconds
}

/**
 * Clean abstraction around fal.ai client
 */
export class FalAiClient {
  private config: FalAiConfig;
  private requestCount = 0;
  private lastRequestTime = 0;
  private modelCache: Map<string, FalModelMetadata> = new Map();
  private cacheFile: string;

  constructor(config: FalAiConfig) {
    this.config = config;
    this.cacheFile = path.join(
      config.discovery?.cacheDir || process.cwd(), 
      'fal_model_data.json'
    );
    this.configure();
  }
  /**
   * Configure the underlying fal.ai client
   */
  private configure(): void {
    if (!this.config.apiKey) {
      throw new FalAiError('FAL.ai API key is required');
    }

    if (!this.config.apiKey.startsWith('fal_') && this.config.apiKey.length < 10) {
      throw new FalAiError('Invalid FAL.ai API key format');
    }    // Configure the FAL client - using the correct API structure
    try {
      fal.config({
        credentials: this.config.apiKey
      });
    } catch (error) {
      // Fallback - some versions might use different configuration
      console.warn('Failed to configure fal client:', error);
    }
  }

  /**
   * Test if the client is properly configured and can access the API
   */
  async testConnection(): Promise<boolean> {
    try {
      // FAL doesn't have a dedicated health endpoint, so we validate the key format
      // and attempt a minimal API call if needed
      return this.config.apiKey.startsWith('fal_') || this.config.apiKey.length > 10;
    } catch (error) {
      console.warn('FAL.ai connection test failed:', error);
      return false;
    }
  }  /**
   * Upload an asset (image, video, audio) to fal.ai storage
   */
  async uploadAsset(data: Buffer | Uint8Array, fileName?: string): Promise<FalAiAssetUpload> {
    try {      // Use the storage API - convert Buffer/Uint8Array to Blob
      const blob = new Blob([data]);
      const uploadResult = await fal.storage.upload(blob);

      return {
        url: uploadResult,
        file_name: fileName,
        file_size: data.length,
        content_type: this.inferContentType(fileName)
      };
    } catch (error) {
      throw new FalAiError(
        `Failed to upload asset: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'UPLOAD_FAILED'
      );
    }
  }

  /**
   * Submit a request to a fal.ai model with retry logic and rate limiting
   */
  async invoke<T = any>(options: FalAiRequestOptions): Promise<FalAiResponse<T>> {
    await this.enforceRateLimit();
    
    const requestId = uuidv4();
    const startTime = Date.now();

    try {      const result = await this.executeWithRetry(options, requestId);
      const duration = Date.now() - startTime;

      return {
        requestId,
        data: result as T,
        logs: (result as any).logs || [],
        metrics: {
          duration,
          cost: this.estimateCost(options.model, options.input)
        }
      };
    } catch (error) {
      throw new FalAiError(
        `Request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'REQUEST_FAILED',
        undefined,
        requestId
      );
    }
  }
  /**
   * Submit a request with streaming progress updates
   */
  async invokeWithProgress<T = any>(options: FalAiRequestOptions): Promise<FalAiResponse<T>> {
    await this.enforceRateLimit();
    
    const requestId = uuidv4();
    const startTime = Date.now();

    try {      const result = await fal.subscribe(options.model, {
        input: options.input,
        logs: options.logs !== false,
        onQueueUpdate: (update: any) => {
          if (options.onProgress) {
            const percentage = this.calculateProgress(update);
            options.onProgress({
              percentage,
              message: update.status
            });
          }
        }      });

      const duration = Date.now() - startTime;

      return {
        requestId,
        data: result as T,
        logs: (result as any).logs || [],
        metrics: {
          duration,
          cost: this.estimateCost(options.model, options.input)
        }
      };
    } catch (error) {
      throw new FalAiError(
        `Streaming request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'STREAMING_FAILED',
        undefined,
        requestId
      );
    }
  }

  /**
   * Get information about available models
   */
  async getModelInfo(modelId: string): Promise<any> {
    try {
      // FAL doesn't have a models endpoint, so we return static info
      // This would be extended with actual API calls if available
      return {
        id: modelId,
        status: 'available',
        // Additional model metadata could be fetched here
      };
    } catch (error) {
      throw new FalAiError(
        `Failed to get model info: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'MODEL_INFO_FAILED'
      );
    }
  }
  /**
   * Discover models from OpenRouter API
   */  /**
   * Discover models from fal.ai exclusively (no static registry)
   * Uses web scraping + AI categorization with FREE models only
   */
  async discoverModels(config?: ModelDiscoveryConfig): Promise<FalModelMetadata[]> {
    const openRouterApiKey = config?.openRouterApiKey || this.config.discovery?.openRouterApiKey;
    const cacheDir = config?.cacheDir || './cache';
    const maxCacheAge = config?.maxCacheAge || 24 * 60 * 60 * 1000; // 24 hours

    // Ensure cache directory exists
    await fs.mkdir(cacheDir, { recursive: true });

    console.log('[FalAiClient] Starting dynamic model discovery from fal.ai...');

    try {
      // 1. Scrape fal.ai main models page to get model list
      const modelsPageUrl = 'https://fal.ai/models';
      const response = await fetch(modelsPageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch models page: ${response.status}`);
      }      const html = await response.text();
      
      // 2. Extract model IDs from HTML using basic pattern matching
      const modelIdPattern = /fal-ai\/[\w-]+/g;
      const modelMatches = html.match(modelIdPattern) || [];
      const uniqueModelIds = Array.from(new Set(modelMatches));

      console.log(`[FalAiClient] Found ${uniqueModelIds.length} potential models to discover`);

      // 3. Discover metadata for each model
      const discoveredModels: FalModelMetadata[] = [];
      const batchSize = 5; // Process in small batches to avoid rate limits

      for (let i = 0; i < uniqueModelIds.length; i += batchSize) {
        const batch = uniqueModelIds.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (modelId) => {
          try {
            console.log(`[FalAiClient] Discovering metadata for ${modelId}...`);
            const metadata = await this.getModelMetadata(modelId);
            
            // Only include if we successfully got metadata
            if (metadata && metadata.id) {
              return metadata;
            }
          } catch (error) {
            console.warn(`[FalAiClient] Failed to discover ${modelId}:`, error);
          }
          return null;
        });

        const batchResults = await Promise.all(batchPromises);
        discoveredModels.push(...batchResults.filter(Boolean) as FalModelMetadata[]);

        // Small delay between batches to be respectful
        if (i + batchSize < uniqueModelIds.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      console.log(`[FalAiClient] Successfully discovered ${discoveredModels.length} models`);

      // 4. Use FREE OpenRouter models for AI categorization if available
      if (openRouterApiKey) {
        console.log('[FalAiClient] Enhancing model categorization with FREE AI models...');
        
        for (const model of discoveredModels) {
          try {
            const enhanced = await this.enhanceModelWithAI(model, openRouterApiKey);
            if (enhanced.category !== 'unknown') {
              model.category = enhanced.category;
              model.capabilities = enhanced.capabilities;
            }
          } catch (error) {
            console.warn(`[FalAiClient] AI enhancement failed for ${model.id}:`, error);
          }
        }
      }

      // Cache the discovered models
      this.modelCache = new Map(discoveredModels.map(model => [model.id, model]));
      return discoveredModels;

    } catch (error) {
      console.error('[FalAiClient] Model discovery failed:', error);
      throw new Error(`Failed to discover fal.ai models: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Enhance model with AI categorization using FREE models only
   */
  private async enhanceModelWithAI(model: FalModelMetadata, openRouterApiKey: string): Promise<{category: string, capabilities: string[]}> {
    try {
      const aiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openRouterApiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://prizm.ai',
          'X-Title': 'Prizm fal.ai Model Discovery'
        },
        body: JSON.stringify({
          model: 'deepseek/deepseek-chat:free', // FREE model only
          messages: [
            {
              role: 'system',
              content: `Categorize this fal.ai model and extract capabilities. Return valid JSON:
{
  "category": "text-to-image|text-to-video|image-to-video|video-to-video|image-to-image|text-to-audio|audio-to-audio|other",
  "capabilities": ["capability1", "capability2", "capability3"]
}

Focus on the model's primary purpose and output type.`
            },
            {
              role: 'user',
              content: `Model: ${model.id}
Name: ${model.name || 'Unknown'}
Description: ${model.description || 'No description'}
Tags: ${model.tags?.join(', ') || 'None'}`
            }
          ],
          max_tokens: 200,
          temperature: 0.1
        })
      });

      if (aiResponse.ok) {
        const aiResult = await aiResponse.json() as any;
        const parsed = JSON.parse(aiResult.choices[0].message.content);
        return {
          category: parsed.category || 'unknown',
          capabilities: parsed.capabilities || []
        };
      }
    } catch (error) {
      console.warn(`AI enhancement failed for ${model.id}:`, error);
    }

    return { category: 'unknown', capabilities: [] };
  }
  /**
   * Execute request with retry logic
   */
  private async executeWithRetry(options: FalAiRequestOptions, requestId: string, attempt = 1): Promise<any> {
    try {      return await fal.subscribe(options.model, {
        input: options.input,
        logs: options.logs !== false
      });
    } catch (error) {
      const maxRetries = this.config.retries || 3;
      
      if (attempt < maxRetries && this.isRetryableError(error)) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.executeWithRetry(options, requestId, attempt + 1);
      }
      
      throw error;
    }
  }

  /**
   * Enforce rate limiting
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    const rateLimit = this.config.rateLimit;
    if (rateLimit?.requestsPerSecond) {
      const minInterval = 1000 / rateLimit.requestsPerSecond;
      if (timeSinceLastRequest < minInterval) {
        await new Promise(resolve => setTimeout(resolve, minInterval - timeSinceLastRequest));
      }
    }
    
    this.lastRequestTime = Date.now();
    this.requestCount++;
  }

  /**
   * Check if an error is retryable
   */
  private isRetryableError(error: any): boolean {
    if (!error) return false;
    
    // Retry on network errors, timeouts, and 5xx status codes
    return (
      error.code === 'NETWORK_ERROR' ||
      error.code === 'TIMEOUT' ||
      (error.statusCode >= 500 && error.statusCode < 600) ||
      error.message?.includes('rate limit') ||
      error.message?.includes('timeout')
    );
  }

  /**
   * Calculate progress from fal.ai queue update
   */
  private calculateProgress(update: any): number {
    if (update.status === 'COMPLETED') return 100;
    if (update.status === 'IN_PROGRESS') {
      return update.progress?.percentage || 50;
    }
    if (update.status === 'IN_QUEUE') return 10;
    return 0;
  }

  /**
   * Estimate cost for a request (basic implementation)
   */
  private estimateCost(model: string, input: any): number {
    // Basic cost estimation - would be more sophisticated in practice
    const baseCosts: Record<string, number> = {
      'fal-ai/framepack': 0.15,
      'fal-ai/flux-pro': 0.05,
      'fal-ai/runway-gen3': 0.50,
      'fal-ai/face-swap': 0.25
    };
    
    return baseCosts[model] || 0.10;
  }

  /**
   * Infer content type from file name
   */
  private inferContentType(fileName?: string): string {
    if (!fileName) return 'application/octet-stream';
    
    const ext = fileName.toLowerCase().split('.').pop();
    const mimeTypes: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'mp4': 'video/mp4',
      'webm': 'video/webm',
      'avi': 'video/avi',
      'mov': 'video/quicktime',
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'flac': 'audio/flac'
    };
    
    return mimeTypes[ext || ''] || 'application/octet-stream';
  }

  /**
   * Get client statistics
   */
  getStats(): {
    requestCount: number;
    lastRequestTime: number;
    isConfigured: boolean;
  } {
    return {
      requestCount: this.requestCount,
      lastRequestTime: this.lastRequestTime,
      isConfigured: !!this.config.apiKey
    };
  }

  /**
   * Get model metadata with hybrid caching approach
   */  async getModelMetadata(modelId: string): Promise<FalModelMetadata> {
    // 1. Try loading from cache first
    let cached = await this.loadFromCache(modelId);
    // 2. Check if cache is fresh
    const maxAge = this.config.discovery?.maxCacheAge || (24 * 60 * 60 * 1000); // 24 hours
    if (cached && (Date.now() - cached.lastUpdated) < maxAge) {
      return cached;    }
    // 3. Cache miss or stale - fetch and extract with AI
    const timeoutMs = 60000; // 60 second timeout
    let timeoutId: NodeJS.Timeout | undefined;
    const metadataPromise = this.discoverModelMetadata(modelId);
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error('discoverModelMetadata timeout')), timeoutMs);
    });
    
    try {
      const metadata = await Promise.race([metadataPromise, timeoutPromise]);
      if (timeoutId) clearTimeout(timeoutId); // Clear timeout when main promise resolves
      // 4. Store in cache
      await this.saveToCache(modelId, metadata);
      
      return metadata;
    } catch (error) {
      if (timeoutId) clearTimeout(timeoutId); // Clear timeout on error too
      throw error;
    }
  }
  /**
   * Discover model metadata by scraping and AI extraction
   */  private async discoverModelMetadata(modelId: string): Promise<FalModelMetadata> {
    try {
      // 1. Scrape the model page
      const url = `https://fal.ai/models/${modelId}`;
      
      // Add timeout to fetch
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
        const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Failed to fetch model page: ${response.status}`);
      }      let html: string | null = await response.text();
      
      // 2. Extract with AI using OpenRouter + DeepSeek
      if (!this.config.discovery?.openRouterApiKey) {
        throw new FalAiError('OpenRouter API key required for model discovery');
      }

      // Add timeout to AI call
      const aiController = new AbortController();
      let aiTimeoutId: NodeJS.Timeout | null = null;
      
      try {
        aiTimeoutId = setTimeout(() => aiController.abort(), 30000); // 30s timeout

        const aiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          signal: aiController.signal,
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.discovery.openRouterApiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://prizm.ai',
            'X-Title': 'Prizm Model Discovery'
          },
          body: JSON.stringify({
            model: 'deepseek/deepseek-chat:free',
            messages: [
              {
                role: 'system',
                content: `Extract model information from this fal.ai model page HTML. Return valid JSON with this exact structure:
{
  "id": "model-id-found",
  "name": "model-name-found",
  "category": "model-type",
  "description": "what-model-does",
  "parameters": {
    "param_name": {
      "type": "string|number|boolean|array",
      "description": "parameter description",
      "required": true,
      "default": "default_value",
      "min": 0,
      "max": 100,
      "enum": ["option1", "option2"]
    }
  },
  "capabilities": ["capabilities-mentioned"],
  "tags": ["relevant-tags"]
}

Extract ONLY what you find in the HTML - look for parameter definitions, types, defaults, constraints.`              },
              {
                role: 'user',
                content: `Extract model information from this HTML content:\n\n${html}`
              }
            ],
            response_format: { type: 'json_object' },
            max_tokens: 1000,
            temperature: 0.1          })        });

        if (aiTimeoutId) {
          clearTimeout(aiTimeoutId);
          aiTimeoutId = null;
        }

        if (!aiResponse.ok) {
          throw new Error(`AI extraction failed: ${aiResponse.status}`);
        }        let aiResult: any = await aiResponse.json() as any;
        let extractedData: any = JSON.parse(aiResult.choices[0].message.content);

        // 3. Normalize and return metadata
        const normalizedMetadata = {
          id: extractedData.id || modelId,
          name: extractedData.name || modelId.split('/').pop() || modelId,
          category: extractedData.category || 'unknown',
          description: extractedData.description || 'No description available',
          parameters: this.normalizeParameters(extractedData.parameters || {}),
          capabilities: extractedData.capabilities || [],
          tags: extractedData.tags || [],
          pricing: extractedData.pricing,
          lastUpdated: Date.now()
        };

        // Clear large variables to help GC
        html = null;
        aiResult = null;
        extractedData = null;

        return normalizedMetadata;
        
      } catch (aiError) {
        // Ensure timeout is cleared even on error
        if (aiTimeoutId) {
          clearTimeout(aiTimeoutId);
        }
        // Abort any pending request
        aiController.abort();
        throw aiError;
      }

    } catch (error) {
      throw new FalAiError(
        `Failed to discover model metadata: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DISCOVERY_FAILED'
      );
    }
  }

  /**
   * Load model metadata from cache file
   */
  private async loadFromCache(modelId: string): Promise<FalModelMetadata | null> {
    try {
      const cacheData = await fs.readFile(this.cacheFile, 'utf-8');
      const cache = JSON.parse(cacheData) as Record<string, FalModelMetadata>;
      return cache[modelId] || null;
    } catch (error) {
      // Cache file doesn't exist or is invalid
      return null;
    }
  }

  /**
   * Save model metadata to cache file
   */
  private async saveToCache(modelId: string, metadata: FalModelMetadata): Promise<void> {
    try {
      let cache: Record<string, FalModelMetadata> = {};
      
      // Load existing cache
      try {
        const cacheData = await fs.readFile(this.cacheFile, 'utf-8');
        cache = JSON.parse(cacheData);
      } catch (error) {
        // Cache file doesn't exist, will create new one
      }

      // Update cache
      cache[modelId] = metadata;

      // Ensure cache directory exists
      const dir = path.dirname(this.cacheFile);
      await fs.mkdir(dir, { recursive: true });

      // Save cache
      await fs.writeFile(this.cacheFile, JSON.stringify(cache, null, 2));
      
      console.log(`💾 Cached metadata for ${modelId}`);
    } catch (error) {
      console.warn('Failed to save model cache:', error);
    }
  }

  /**
   * Normalize parameter definitions from AI extraction
   */
  private normalizeParameters(params: any): FalModelMetadata['parameters'] {
    const normalized: FalModelMetadata['parameters'] = {};
    
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string') {
        // Simple string description
        normalized[key] = {
          type: 'string',
          description: value
        };
      } else if (typeof value === 'object' && value !== null) {
        // Structured parameter definition
        const param = value as any;
        normalized[key] = {
          type: param.type || 'string',
          description: param.description || '',
          required: param.required,
          default: param.default,
          min: param.min,
          max: param.max,
          enum: param.enum
        };
      }
    }
    
    return normalized;
  }

  /**
   * Get all cached models
   */
  async getCachedModels(): Promise<FalModelMetadata[]> {
    try {
      const cacheData = await fs.readFile(this.cacheFile, 'utf-8');
      const cache = JSON.parse(cacheData) as Record<string, FalModelMetadata>;
      return Object.values(cache);
    } catch (error) {
      return [];
    }
  }

  /**
   * Clear model cache
   */
  async clearCache(): Promise<void> {
    try {
      await fs.unlink(this.cacheFile);
      this.modelCache.clear();
      console.log('🗑️  Model cache cleared');
    } catch (error) {
      // Cache file doesn't exist
    }
  }

  /**
   * Cleanup method to properly close connections and clear timers
   */
  async cleanup(): Promise<void> {
    try {
      // Clear in-memory cache
      this.modelCache.clear();
      
      // The @fal-ai/client doesn't expose a cleanup method,
      // but we can try to clean up any Node.js agents or connections
      if (global.gc) {
        global.gc(); // Force garbage collection if available
      }
      
      console.log('🧹 FalAiClient cleanup completed');
    } catch (error) {
      console.warn('Failed to cleanup FalAiClient:', error);
    }
  }
}
