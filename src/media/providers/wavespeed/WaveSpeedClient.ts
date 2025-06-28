/**
 * WaveSpeedClient - API Client for WaveSpeedAI
 *
 * A client for interacting with the WaveSpeedAI REST API.
 * It provides methods for image and video generation.
 */

import axios, { AxiosInstance } from 'axios';
import { MediaCapability, ProviderModel } from '../../types/provider';
import { promises as fs } from 'fs';
import * as path from 'path';
import fetch from 'node-fetch';

export interface WaveSpeedConfig {
  apiKey: string;
  baseUrl?: string;
  discovery?: ModelDiscoveryConfig;
}

export interface ModelDiscoveryConfig {
  openRouterApiKey?: string;
  cacheDir?: string;
  maxCacheAge?: number; // in milliseconds
}

export interface WaveSpeedModelMetadata {
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

export interface WaveSpeedGenerationRequest {
  model: string;
  prompt: string;
  [key: string]: any; // Allow other parameters
}

export interface WaveSpeedGenerationResponse {
  id: string;
  status: 'completed' | 'failed' | 'processing';
  output?: {
    files: {
      url: string;
      content_type: string;
      name: string;
    }[];
  };
  error?: {
    message: string;
  };
}

export interface WaveSpeedModel {
  id: string;
  name: string;
  description: string;
  category: string;
  provider: string;
  pricing?: {
    input?: number;
    output?: number;
    currency: string;
  };
}

export class WaveSpeedError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number,
    public requestId?: string
  ) {
    super(message);
    this.name = 'WaveSpeedError';
  }
}

export class WaveSpeedClient {
  private client: AxiosInstance;
  private config: WaveSpeedConfig;
  private cacheFile: string;

  constructor(config: WaveSpeedConfig) {
    this.config = {
      apiKey: config.apiKey,
      baseUrl: config.baseUrl || 'https://api.wavespeed.ai/api/v3',
      discovery: config.discovery
    };

    this.cacheFile = path.join(
      config.discovery?.cacheDir || process.cwd(),
      'wavespeed_model_data.json'
    );

    if (!this.config.apiKey) {
      throw new WaveSpeedError('WaveSpeedAI API key is required');
    }

    this.client = axios.create({
      baseURL: this.config.baseUrl,
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async testConnection(): Promise<boolean> {
    try {
      // Test connection by checking account balance
      const response = await this.client.get('/balance');
      return response.status === 200;
    } catch (error) {
      console.warn('WaveSpeedAI connection test failed:', error);
      return false;
    }
  }

  /**
   * Get all available models from WaveSpeedAI
   * Since there's no direct models endpoint, we maintain a curated list
   * based on the official documentation
   */
  async getModels(): Promise<WaveSpeedModel[]> {
    // This is based on the comprehensive model list from WaveSpeedAI documentation
    return [
      // FLUX Models - Text to Image
      {
        id: 'wavespeed-ai/flux-dev',
        name: 'FLUX.1 [dev]',
        description: 'Flux-dev text to image model, 12 billion parameter rectified flow transformer',
        category: 'text-to-image',
        provider: 'wavespeed-ai',
        pricing: { currency: 'USD' }
      },
      {
        id: 'wavespeed-ai/flux-dev-ultra-fast',
        name: 'FLUX.1 [dev] Ultra Fast',
        description: 'Ultra fast version of FLUX.1 dev model',
        category: 'text-to-image', 
        provider: 'wavespeed-ai',
        pricing: { currency: 'USD' }
      },
      {
        id: 'wavespeed-ai/flux-dev-lora',
        name: 'FLUX.1 [dev] LoRA',
        description: 'FLUX.1 dev with LoRA support for personalized styles',
        category: 'text-to-image',
        provider: 'wavespeed-ai',
        pricing: { currency: 'USD' }
      },
      {
        id: 'wavespeed-ai/flux-dev-lora-ultra-fast',
        name: 'FLUX.1 [dev] LoRA Ultra Fast',
        description: 'Ultra fast FLUX.1 dev with LoRA support',
        category: 'text-to-image',
        provider: 'wavespeed-ai',
        pricing: { input: 0.006, currency: 'USD' }
      },
      {
        id: 'wavespeed-ai/flux-schnell',
        name: 'FLUX.1 [schnell]',
        description: 'Fastest FLUX model for local development and personal use',
        category: 'text-to-image',
        provider: 'wavespeed-ai',
        pricing: { currency: 'USD' }
      },
      {
        id: 'wavespeed-ai/flux-schnell-lora',
        name: 'FLUX.1 [schnell] LoRA',
        description: 'FLUX.1 schnell with LoRA support',
        category: 'text-to-image',
        provider: 'wavespeed-ai',
        pricing: { currency: 'USD' }
      },

      // FLUX Kontext Models - Image to Image
      {
        id: 'wavespeed-ai/flux-kontext-dev',
        name: 'FLUX.1 Kontext [dev]',
        description: 'State-of-the-art image editing model using text prompts',
        category: 'image-to-image',
        provider: 'wavespeed-ai',
        pricing: { input: 0.025, currency: 'USD' }
      },
      {
        id: 'wavespeed-ai/flux-kontext-dev-ultra-fast',
        name: 'FLUX.1 Kontext [dev] Ultra Fast',
        description: 'Ultra fast image editing with text prompts',
        category: 'image-to-image',
        provider: 'wavespeed-ai',
        pricing: { input: 0.02, currency: 'USD' }
      },
      {
        id: 'wavespeed-ai/flux-kontext-pro',
        name: 'FLUX.1 Kontext [pro]',
        description: 'Professional-grade image editing model',
        category: 'image-to-image',
        provider: 'wavespeed-ai',
        pricing: { currency: 'USD' }
      },
      {
        id: 'wavespeed-ai/flux-kontext-max',
        name: 'FLUX.1 Kontext [max]',
        description: 'Maximum performance image editing model',
        category: 'image-to-image',
        provider: 'wavespeed-ai',
        pricing: { currency: 'USD' }
      },

      // WAN Models - Video Generation
      {
        id: 'wavespeed-ai/wan-2.1/t2v-480p',
        name: 'WAN 2.1 Text-to-Video 480p',
        description: 'Advanced text-to-video model with 480p output',
        category: 'text-to-video',
        provider: 'wavespeed-ai',
        pricing: { currency: 'USD' }
      },
      {
        id: 'wavespeed-ai/wan-2.1/t2v-720p',
        name: 'WAN 2.1 Text-to-Video 720p',
        description: 'High-resolution text-to-video model with 720p output',
        category: 'text-to-video',
        provider: 'wavespeed-ai',
        pricing: { currency: 'USD' }
      },
      {
        id: 'wavespeed-ai/wan-2.1/i2v-480p',
        name: 'WAN 2.1 Image-to-Video 480p',
        description: 'Convert static images to dynamic videos in 480p',
        category: 'image-to-video',
        provider: 'wavespeed-ai',
        pricing: { currency: 'USD' }
      },
      {
        id: 'wavespeed-ai/wan-2.1/i2v-720p',
        name: 'WAN 2.1 Image-to-Video 720p',
        description: 'Convert static images to high-definition 720p videos',
        category: 'image-to-video',
        provider: 'wavespeed-ai',
        pricing: { currency: 'USD' }
      },
      {
        id: 'wavespeed-ai/wan-2.1/i2v-480p-lora',
        name: 'WAN 2.1 Image-to-Video 480p LoRA',
        description: 'Image-to-video with LoRA support for custom styles',
        category: 'image-to-video',
        provider: 'wavespeed-ai',
        pricing: { input: 0.2, currency: 'USD' }
      },
      {
        id: 'wavespeed-ai/wan-2.1/i2v-720p-lora',
        name: 'WAN 2.1 Image-to-Video 720p LoRA',
        description: 'High-res image-to-video with LoRA support',
        category: 'image-to-video',
        provider: 'wavespeed-ai',
        pricing: { currency: 'USD' }
      },

      // ByteDance Seedance Models
      {
        id: 'bytedance/seedance-v1-pro-t2v-480p',
        name: 'Seedance V1 Pro Text-to-Video 480p',
        description: 'ByteDance\'s SOTA video generation model',
        category: 'text-to-video',
        provider: 'bytedance',
        pricing: { input: 0.15, currency: 'USD' }
      },
      {
        id: 'bytedance/seedance-v1-pro-i2v-720p',
        name: 'Seedance V1 Pro Image-to-Video 720p',
        description: 'High-quality image-to-video with superior motion realism',
        category: 'image-to-video',
        provider: 'bytedance',
        pricing: { input: 0.3, currency: 'USD' }
      },
      {
        id: 'bytedance/seedance-v1-pro-i2v-1080p',
        name: 'Seedance V1 Pro Image-to-Video 1080p',
        description: 'Ultra-high-quality 1080p image-to-video generation',
        category: 'image-to-video',
        provider: 'bytedance',
        pricing: { input: 0.6, currency: 'USD' }
      },

      // Kling Models
      {
        id: 'kwaivgi/kling-v2.1-i2v-master',
        name: 'Kling V2.1 Image-to-Video Master',
        description: 'Premium image-to-video with unparalleled motion fluidity',
        category: 'image-to-video',
        provider: 'kwaivgi',
        pricing: { currency: 'USD' }
      },
      {
        id: 'kwaivgi/kling-v2.1-i2v-pro',
        name: 'Kling V2.1 Image-to-Video Pro',
        description: 'Professional-grade video generation with enhanced visual fidelity',
        category: 'image-to-video',
        provider: 'kwaivgi',
        pricing: { currency: 'USD' }
      },

      // MiniMax Hailuo Models
      {
        id: 'minimax/hailuo-02/standard',
        name: 'Hailuo 02 Standard',
        description: 'Next-generation AI video model with 2.5x efficiency improvement',
        category: 'image-to-video',
        provider: 'minimax',
        pricing: { currency: 'USD' }
      },
      {
        id: 'minimax/hailuo-02/pro',
        name: 'Hailuo 02 Pro',
        description: 'Professional Hailuo model for high-quality 6-second videos',
        category: 'image-to-video',
        provider: 'minimax',
        pricing: { currency: 'USD' }
      },

      // Google Models
      {
        id: 'google/veo3',
        name: 'Google Veo 3',
        description: 'Google\'s flagship Veo 3 text to video model with audio',
        category: 'text-to-video',
        provider: 'google',
        pricing: { currency: 'USD' }
      },
      {
        id: 'wavespeed-ai/veo2-t2v',
        name: 'Veo 2 Text-to-Video',
        description: 'Create videos with realistic motion and high quality output',
        category: 'text-to-video',
        provider: 'wavespeed-ai',
        pricing: { currency: 'USD' }
      },
      {
        id: 'wavespeed-ai/veo2-i2v',
        name: 'Veo 2 Image-to-Video',
        description: 'Create videos from images with realistic motion',
        category: 'image-to-video',
        provider: 'wavespeed-ai',
        pricing: { currency: 'USD' }
      },
      {
        id: 'wavespeed-ai/imagen4',
        name: 'Imagen 4',
        description: 'Google\'s highest quality image generation model',
        category: 'text-to-image',
        provider: 'wavespeed-ai',
        pricing: { currency: 'USD' }
      },

      // Audio Models
      {
        id: 'wavespeed-ai/dia-tts',
        name: 'Dia TTS',
        description: 'Generate realistic dialogue from transcripts with emotion control',
        category: 'text-to-audio',
        provider: 'wavespeed-ai',
        pricing: { input: 0.04, currency: 'USD' }
      },

      // 3D Models
      {
        id: 'wavespeed-ai/hunyuan3d-v2-multi-view',
        name: 'Hunyuan 3D V2',
        description: 'Generate 3D models from images using Hunyuan 3D',
        category: 'image-to-3d',
        provider: 'wavespeed-ai',
        pricing: { currency: 'USD' }
      },

      // Video Processing
      {
        id: 'wavespeed-ai/video-upscaler',
        name: 'Video Upscaler',
        description: 'Enhance video resolution and quality using advanced ML models',
        category: 'video-to-video',
        provider: 'wavespeed-ai',
        pricing: { currency: 'USD' }
      },

      // Other Notable Models
      {
        id: 'wavespeed-ai/hidream-i1-full',
        name: 'HiDream I1 Full',
        description: '17B parameter open-source image generation model',
        category: 'text-to-image',
        provider: 'wavespeed-ai',
        pricing: { currency: 'USD' }
      },
      {
        id: 'wavespeed-ai/instant-character',
        name: 'Instant Character',
        description: 'Create consistent characters with diverse poses and styles',
        category: 'image-to-image',
        provider: 'wavespeed-ai',
        pricing: { currency: 'USD' }
      }
    ];
  }

  /**
   * Convert category to MediaCapability
   */
  private categoryToCapability(category: string): MediaCapability[] {
    const categoryMap: Record<string, MediaCapability[]> = {
      'text-to-image': [MediaCapability.TEXT_TO_IMAGE],
      'text-to-video': [MediaCapability.TEXT_TO_VIDEO],
      'image-to-video': [MediaCapability.IMAGE_TO_VIDEO],
      'image-to-image': [MediaCapability.IMAGE_TO_IMAGE],
      'video-to-video': [MediaCapability.VIDEO_TO_VIDEO],
      'text-to-audio': [MediaCapability.TEXT_TO_AUDIO],
      'image-to-3d': [MediaCapability.IMAGE_TO_3D]
    };
    
    return categoryMap[category] || [];
  }

  /**
   * Convert WaveSpeed models to ProviderModel format
   */
  async getProviderModels(): Promise<ProviderModel[]> {
    const models = await this.getModels();
    
    return models.map(model => ({
      id: model.id,
      name: model.name,
      description: model.description,
      capabilities: this.categoryToCapability(model.category),
      parameters: {},
      pricing: model.pricing ? {
        inputCost: model.pricing.input,
        outputCost: model.pricing.output,
        currency: model.pricing.currency
      } : undefined
    }));
  }

  async generate(request: WaveSpeedGenerationRequest): Promise<WaveSpeedGenerationResponse> {
    try {
      const response = await this.client.post('/generate', request);
      return response.data;
    } catch (error: any) {
      throw new WaveSpeedError(
        error.response?.data?.error?.message || error.message,
        'GENERATION_FAILED',
        error.response?.status
      );
    }
  }

  /**
   * Discover models from WaveSpeedAI documentation with caching and AI enhancement
   */
  async discoverModels(config?: ModelDiscoveryConfig): Promise<WaveSpeedModelMetadata[]> {
    const openRouterApiKey = config?.openRouterApiKey || this.config.discovery?.openRouterApiKey;
    const maxCacheAge = config?.maxCacheAge || this.config.discovery?.maxCacheAge || 24 * 60 * 60 * 1000; // 24 hours

    console.log('[WaveSpeedClient] Starting dynamic model discovery...');

    try {
      // 1. Check cache first
      const cached = await this.loadAllFromCache();
      if (cached && cached.length > 0 && (Date.now() - cached[0].lastUpdated) < maxCacheAge) {
        console.log(`[WaveSpeedClient] Using cached models (${cached.length} models)`);
        return cached;
      }

      // 2. Use documented model list as source of truth
      const documentedModels = await this.getDocumentedModels();
      console.log(`[WaveSpeedClient] Found ${documentedModels.length} documented models`);

      // 3. Enhance each model with AI categorization if available
      const enhancedModels: WaveSpeedModelMetadata[] = [];
      
      for (const model of documentedModels) {
        let metadata: WaveSpeedModelMetadata = {
          id: model.id,
          name: model.name,
          category: this.categorizeModel(model.id, model.description),
          description: model.description,
          parameters: this.extractParameters(model.id),
          capabilities: this.extractCapabilities(model.id, model.description),
          tags: this.extractTags(model.id, model.description),
          pricing: 'usage-based',
          lastUpdated: Date.now()
        };

        // Enhance with AI if OpenRouter key available
        if (openRouterApiKey) {
          try {
            const aiEnhancement = await this.enhanceModelWithAI(metadata, openRouterApiKey);
            metadata.category = aiEnhancement.category;
            metadata.capabilities = aiEnhancement.capabilities;
          } catch (error) {
            console.warn(`[WaveSpeedClient] AI enhancement failed for ${model.id}:`, error);
          }
        }

        enhancedModels.push(metadata);
      }

      // 4. Cache the results
      await this.saveAllToCache(enhancedModels);
      
      console.log(`[WaveSpeedClient] Successfully discovered ${enhancedModels.length} models`);
      return enhancedModels;

    } catch (error) {
      console.error('[WaveSpeedClient] Model discovery failed:', error);
      // Fallback to basic documented models
      const fallbackModels = await this.getDocumentedModels();
      return fallbackModels.map(model => ({
        id: model.id,
        name: model.name,
        category: this.categorizeModel(model.id, model.description),
        description: model.description,
        parameters: this.extractParameters(model.id),
        capabilities: this.extractCapabilities(model.id, model.description),
        tags: this.extractTags(model.id, model.description),
        pricing: 'usage-based',
        lastUpdated: Date.now()
      }));
    }
  }

  /**
   * Get documented models list (converted from existing hardcoded models)
   */
  private async getDocumentedModels(): Promise<WaveSpeedModel[]> {
    // Convert the existing hardcoded model list
    return this.getModels();
  }

  /**
   * Categorize model based on ID and description
   */
  private categorizeModel(modelId: string, description: string): string {
    const id = modelId.toLowerCase();
    const desc = description.toLowerCase();

    if (id.includes('t2v') || desc.includes('text-to-video')) return 'text-to-video';
    if (id.includes('i2v') || desc.includes('image-to-video')) return 'image-to-video';
    if (id.includes('v2v') || desc.includes('video-to-video')) return 'video-to-video';
    if (id.includes('kontext') || desc.includes('image editing')) return 'image-to-image';
    if (id.includes('flux') || id.includes('hidream') || desc.includes('image generation')) return 'text-to-image';
    if (desc.includes('audio') || desc.includes('speech')) return 'text-to-audio';
    if (desc.includes('3d')) return 'image-to-3d';

    return 'other';
  }

  /**
   * Extract model parameters based on model type
   */
  private extractParameters(modelId: string): Record<string, any> {
    const baseParams = {
      prompt: {
        type: 'string',
        description: 'Text prompt for generation',
        required: true
      },
      width: {
        type: 'integer',
        description: 'Output width',
        default: 1024,
        min: 256,
        max: 2048
      },
      height: {
        type: 'integer', 
        description: 'Output height',
        default: 1024,
        min: 256,
        max: 2048
      }
    };

    if (modelId.includes('lora')) {
      baseParams['lora_url'] = {
        type: 'string',
        description: 'URL to LoRA weights',
        required: false
      };
    }

    if (modelId.includes('i2v') || modelId.includes('kontext')) {
      baseParams['image'] = {
        type: 'string',
        description: 'Input image URL',
        required: true
      };
    }

    if (modelId.includes('video')) {
      baseParams['duration'] = {
        type: 'number',
        description: 'Video duration in seconds',
        default: 5,
        min: 1,
        max: 30
      };
    }

    return baseParams;
  }

  /**
   * Extract capabilities from model ID and description
   */
  private extractCapabilities(modelId: string, description: string): string[] {
    const capabilities: string[] = [];
    const id = modelId.toLowerCase();
    const desc = description.toLowerCase();

    if (id.includes('ultra-fast') || desc.includes('fast')) capabilities.push('high-speed');
    if (id.includes('lora')) capabilities.push('lora-support');
    if (id.includes('pro') || id.includes('max')) capabilities.push('professional-grade');
    if (desc.includes('480p')) capabilities.push('sd-quality');
    if (desc.includes('720p')) capabilities.push('hd-quality');
    if (desc.includes('1080p')) capabilities.push('full-hd-quality');
    if (desc.includes('editing')) capabilities.push('image-editing');
    if (desc.includes('consistent')) capabilities.push('character-consistency');

    return capabilities;
  }

  /**
   * Extract tags from model ID and description
   */
  private extractTags(modelId: string, description: string): string[] {
    const tags: string[] = [];
    const combined = `${modelId} ${description}`.toLowerCase();

    const tagPatterns = [
      'flux', 'wan', 'seedance', 'hidream', 'lora', 'kontext',
      'text-to-image', 'text-to-video', 'image-to-video', 'image-to-image',
      'ultra-fast', 'professional', 'character', 'editing'
    ];

    for (const pattern of tagPatterns) {
      if (combined.includes(pattern)) {
        tags.push(pattern);
      }
    }

    return tags;
  }

  /**
   * Enhance model with AI categorization using FREE models only
   */
  private async enhanceModelWithAI(model: WaveSpeedModelMetadata, openRouterApiKey: string): Promise<{category: string, capabilities: string[]}> {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openRouterApiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://prizm.ai',
          'X-Title': 'Prizm WaveSpeedAI Model Discovery'
        },
        body: JSON.stringify({
          model: 'deepseek/deepseek-chat:free', // FREE model only
          messages: [
            {
              role: 'system',
              content: `Categorize this WaveSpeedAI model and extract capabilities. Return valid JSON:
{
  "category": "text-to-image|text-to-video|image-to-video|video-to-video|image-to-image|text-to-audio|image-to-3d|other",
  "capabilities": ["capability1", "capability2", "capability3"]
}

Focus on the model's primary purpose and output type.`
            },
            {
              role: 'user',
              content: `Model: ${model.id}
Name: ${model.name}
Description: ${model.description}
Tags: ${model.tags?.join(', ') || 'None'}`
            }
          ],
          max_tokens: 200,
          temperature: 0.1
        })
      });

      if (response.ok) {
        const aiResult = await response.json() as any;
        let content = aiResult.choices[0].message.content;
        
        // Handle markdown-wrapped JSON
        if (content.startsWith('```json')) {
          content = content.replace(/```json\s*/, '').replace(/\s*```$/, '');
        } else if (content.startsWith('```')) {
          content = content.replace(/```\s*/, '').replace(/\s*```$/, '');
        }
        
        const parsed = JSON.parse(content);
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
   * Load all models from cache
   */
  private async loadAllFromCache(): Promise<WaveSpeedModelMetadata[] | null> {
    try {
      const data = await fs.readFile(this.cacheFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return null;
    }
  }

  /**
   * Save all models to cache
   */
  private async saveAllToCache(models: WaveSpeedModelMetadata[]): Promise<void> {
    try {
      const dir = path.dirname(this.cacheFile);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(this.cacheFile, JSON.stringify(models, null, 2));
    } catch (error) {
      console.warn('[WaveSpeedClient] Failed to save cache:', error);
    }
  }

  /**
   * Get available models (with dynamic discovery support)
   */
  async getAvailableModels(): Promise<WaveSpeedModel[]> {
    try {
      const discoveredModels = await this.discoverModels();
      
      // Convert to legacy format for backward compatibility
      return discoveredModels.map(model => ({
        id: model.id,
        name: model.name,
        description: model.description,
        category: model.category,
        provider: model.id.split('/')[0] || 'wavespeed-ai',
        pricing: { currency: 'USD' }
      }));
    } catch (error) {
      console.warn('[WaveSpeedClient] Discovery failed, falling back to hardcoded models');
      return this.getModels();
    }
  }
}
