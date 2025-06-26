/**
 * OpenAI Provider with Multi-Modal Support
 * 
 * Provider that integrates with OpenAI's API for text generation, image generation, and text-to-speech.
 * Provides access to GPT models, DALL-E, and TTS through a unified interface.
 */

import { 
  MediaProvider, 
  ProviderType, 
  MediaCapability, 
  ProviderModel, 
  ProviderConfig, 
  GenerationRequest, 
  GenerationResult 
} from '../../types/provider';
import { OpenAIAPIClient, OpenAIConfig } from './OpenAIAPIClient';
import { TextToTextProvider, TextToImageProvider, TextToAudioProvider, AudioToTextProvider } from '../../capabilities';
import { TextToTextModel } from '../../models/abstracts/TextToTextModel';
import { OpenAITextToTextModel } from './OpenAITextToTextModel';
import { TextToImageModel } from '../../models/abstracts/TextToImageModel';
import { OpenAITextToImageModel } from './OpenAITextToImageModel';
import { TextToAudioModel } from '../../models/abstracts/TextToAudioModel';
import { OpenAITextToAudioModel } from './OpenAITextToAudioModel';
import { OpenAIAudioToTextModel } from './OpenAIAudioToTextModel';

export class OpenAIProvider implements MediaProvider, TextToTextProvider, TextToImageProvider, TextToAudioProvider, AudioToTextProvider {
  readonly id = 'openai';
  readonly name = 'OpenAI';
  readonly type = ProviderType.REMOTE;
  readonly capabilities = [
    MediaCapability.TEXT_TO_TEXT,
    MediaCapability.TEXT_TO_IMAGE,
    MediaCapability.TEXT_TO_AUDIO,
    MediaCapability.AUDIO_TO_TEXT
  ];

  private config?: ProviderConfig;
  private apiClient?: OpenAIAPIClient;
  private discoveredModels = new Map<string, ProviderModel>();
  private configurationPromise: Promise<void> | null = null;
  private initTime: number = Date.now();

  get models(): ProviderModel[] {
    return Array.from(this.discoveredModels.values());
  }

  async configure(config: ProviderConfig): Promise<void> {
    this.config = config;
    
    if (!config.apiKey) {
      throw new Error('OpenAI API key is required');
    }

    const openAIConfig: OpenAIConfig = {
      apiKey: config.apiKey,
      organization: config.environment?.OPENAI_ORGANIZATION,
      baseUrl: config.baseUrl
    };

    this.apiClient = new OpenAIAPIClient(openAIConfig);

    // Discover available models
    await this.discoverModels();
  }

  async isAvailable(): Promise<boolean> {
    if (!this.apiClient) {
      return false;
    }

    try {
      return await this.apiClient.testConnection();
    } catch (error) {
      console.warn('OpenAI availability check failed:', error);
      return false;
    }
  }

  getModelsForCapability(capability: MediaCapability): ProviderModel[] {
    return this.models.filter(model => model.capabilities.includes(capability));
  }

  // TextToTextProvider interface implementation
  async createTextToTextModel(modelId: string): Promise<TextToTextModel> {
    await this.ensureConfigured();
    
    if (!this.apiClient) {
      throw new Error('OpenAI provider not configured');
    }

    if (!this.supportsTextToTextModel(modelId)) {
      throw new Error(`Model ${modelId} is not supported for text-to-text generation`);
    }

    return new OpenAITextToTextModel({
      apiClient: this.apiClient,
      modelId
    });
  }

  getSupportedTextToTextModels(): string[] {
    return this.getModelsForCapability(MediaCapability.TEXT_TO_TEXT).map(m => m.id);
  }

  supportsTextToTextModel(modelId: string): boolean {
    const model = this.models.find(m => m.id === modelId);
    return model ? model.capabilities.includes(MediaCapability.TEXT_TO_TEXT) : false;
  }

  // TextToImageProvider interface implementation
  async createTextToImageModel(modelId: string): Promise<TextToImageModel> {
    await this.ensureConfigured();
    
    if (!this.apiClient) {
      throw new Error('OpenAI provider not configured');
    }

    if (!this.supportsTextToImageModel(modelId)) {
      throw new Error(`Model ${modelId} is not supported for text-to-image generation`);
    }

    return new OpenAITextToImageModel({
      apiClient: this.apiClient,
      modelId
    });
  }

  getSupportedTextToImageModels(): string[] {
    return this.getModelsForCapability(MediaCapability.TEXT_TO_IMAGE).map(m => m.id);
  }

  supportsTextToImageModel(modelId: string): boolean {
    const model = this.models.find(m => m.id === modelId);
    return model ? model.capabilities.includes(MediaCapability.TEXT_TO_IMAGE) : false;
  }

  // TextToAudioProvider interface implementation
  async createTextToAudioModel(modelId: string): Promise<TextToAudioModel> {
    await this.ensureConfigured();
    
    if (!this.apiClient) {
      throw new Error('OpenAI provider not configured');
    }

    if (!this.supportsTextToAudioModel(modelId)) {
      throw new Error(`Model ${modelId} is not supported for text-to-audio generation`);
    }

    return new OpenAITextToAudioModel({
      apiClient: this.apiClient,
      modelId
    });
  }

  getSupportedTextToAudioModels(): string[] {
    return this.getModelsForCapability(MediaCapability.TEXT_TO_AUDIO).map(m => m.id);
  }

  supportsTextToAudioModel(modelId: string): boolean {
    const model = this.models.find(m => m.id === modelId);
    return model ? model.capabilities.includes(MediaCapability.TEXT_TO_AUDIO) : false;
  }

  // AudioToTextProvider interface implementation
  async createAudioToTextModel(modelId: string) {
    await this.ensureConfigured();

    if (!this.apiClient) {
      throw new Error('OpenAI provider not configured');
    }

    if (!this.supportsAudioToTextModel(modelId)) {
      throw new Error(`Model ${modelId} is not supported for audio-to-text generation`);
    }

    return new OpenAIAudioToTextModel({
      apiClient: this.apiClient,
      modelId
    });
  }

  getSupportedAudioToTextModels(): string[] {
    return this.getModelsForCapability(MediaCapability.AUDIO_TO_TEXT).map(m => m.id);
  }

  supportsAudioToTextModel(modelId: string): boolean {
    const model = this.models.find(m => m.id === modelId);
    return model ? model.capabilities.includes(MediaCapability.AUDIO_TO_TEXT) : false;
  }

  // ServiceManagement interface implementation
  async startService(): Promise<boolean> {
    // Remote API - no service to start
    return true;
  }

  async stopService(): Promise<boolean> {
    // Remote API - no service to stop
    return true;
  }

  async getServiceStatus(): Promise<{ running: boolean; healthy: boolean; error?: string }> {
    const isAvailable = await this.isAvailable();
    return {
      running: true, // Remote APIs are always "running"
      healthy: isAvailable,
      error: isAvailable ? undefined : 'API connection failed'
    };
  }

  // MediaProvider interface methods (required but delegated to models)
  async generate(request: GenerationRequest): Promise<GenerationResult> {
    throw new Error('OpenAIProvider should use Model instances for generation, not direct generation');
  }

  /**
   * Discover available models from OpenAI API
   */
  private async discoverModels(): Promise<void> {
    if (!this.apiClient) {
      return;
    }

    try {
      const availableModels = await this.apiClient.getAvailableModels();
      
      for (const model of availableModels) {
        console.log(`[OpenAIProvider] Discovered model: ${model.id}`);
        
        // Categorize models based on their ID patterns
        const capabilities = this.categorizeModel(model.id);
        
        if (capabilities.length > 0) {
          const providerModel: ProviderModel = {
            id: model.id,
            name: model.id,
            description: `OpenAI model: ${model.id}`,
            capabilities,
            parameters: this.getModelParameters(model.id, capabilities),
            pricing: this.getModelPricing(model.id)
          };

          this.discoveredModels.set(model.id, providerModel);
        }
      }

      console.log(`[OpenAIProvider] Discovered ${this.discoveredModels.size} models`);
    } catch (error) {
      console.warn('[OpenAIProvider] Model discovery failed, using fallback models:', error.message);
      this.addFallbackModels();
    }
  }

  /**
   * Categorize model based on ID patterns
   */
  private categorizeModel(modelId: string): MediaCapability[] {
    const capabilities: MediaCapability[] = [];
    
    // Text-to-text models (GPT family)
    if (modelId.includes('gpt') || modelId.includes('text-') || modelId.includes('davinci') || 
        modelId.includes('curie') || modelId.includes('babbage') || modelId.includes('ada')) {
      capabilities.push(MediaCapability.TEXT_TO_TEXT);
    }
    
    // Text-to-image models (DALL-E family)
    if (modelId.includes('dall-e')) {
      capabilities.push(MediaCapability.TEXT_TO_IMAGE);
    }
    
    // Text-to-audio models (TTS family)
    if (modelId.includes('tts')) {
      capabilities.push(MediaCapability.TEXT_TO_AUDIO);
    }

    // Audio-to-text models (Whisper/gpt-4o transcribe)
    if (modelId.includes('whisper') || modelId.includes('transcribe')) {
      capabilities.push(MediaCapability.AUDIO_TO_TEXT);
    }
    
    return capabilities;
  }

  /**
   * Get model-specific parameters
   */
  private getModelParameters(modelId: string, capabilities: MediaCapability[]): Record<string, any> {
    const params: Record<string, any> = {};
    
    if (capabilities.includes(MediaCapability.TEXT_TO_TEXT)) {
      params.temperature = { type: 'number', min: 0, max: 2, default: 0.7 };
      params.max_tokens = { type: 'number', min: 1, max: 4096, default: 1024 };
      params.top_p = { type: 'number', min: 0, max: 1, default: 1 };
      params.frequency_penalty = { type: 'number', min: -2, max: 2, default: 0 };
      params.presence_penalty = { type: 'number', min: -2, max: 2, default: 0 };
    }
    
    if (capabilities.includes(MediaCapability.TEXT_TO_IMAGE)) {
      params.size = { type: 'string', options: ['256x256', '512x512', '1024x1024', '1792x1024', '1024x1792'], default: '1024x1024' };
      params.quality = { type: 'string', options: ['standard', 'hd'], default: 'standard' };
      params.style = { type: 'string', options: ['vivid', 'natural'], default: 'vivid' };
      params.n = { type: 'number', min: 1, max: 10, default: 1 };
    }
    
    if (capabilities.includes(MediaCapability.TEXT_TO_AUDIO)) {
      params.voice = { type: 'string', options: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'], default: 'alloy' };
      params.response_format = { type: 'string', options: ['mp3', 'opus', 'aac', 'flac', 'wav', 'pcm'], default: 'mp3' };
      params.speed = { type: 'number', min: 0.25, max: 4.0, default: 1.0 };
    }

    if (capabilities.includes(MediaCapability.AUDIO_TO_TEXT)) {
      params.prompt = { type: 'string' };
      params.language = { type: 'string' };
      params.response_format = { type: 'string', options: ['json', 'text', 'srt', 'verbose_json', 'vtt'], default: 'json' };
      params.temperature = { type: 'number', min: 0, max: 1, default: 0 };
    }
    
    return params;
  }

  /**
   * Get model pricing information
   */
  private getModelPricing(modelId: string): { inputCost?: number; outputCost?: number; currency: string } | undefined {
    // Approximate pricing as of 2024 (per 1K tokens for text models, per image for DALL-E, per character for TTS)
    const pricingMap: Record<string, { inputCost: number; outputCost: number }> = {
      'gpt-4': { inputCost: 0.03, outputCost: 0.06 },
      'gpt-4-turbo': { inputCost: 0.01, outputCost: 0.03 },
      'gpt-3.5-turbo': { inputCost: 0.0015, outputCost: 0.002 },
      'dall-e-3': { inputCost: 0.04, outputCost: 0.04 }, // per image
      'dall-e-2': { inputCost: 0.02, outputCost: 0.02 }, // per image
      'tts-1': { inputCost: 0.015, outputCost: 0.015 }, // per 1K characters
      'tts-1-hd': { inputCost: 0.03, outputCost: 0.03 }, // per 1K characters
      'whisper-1': { inputCost: 0.006, outputCost: 0.006 }, // per minute approx
      'gpt-4o-transcribe': { inputCost: 0.006, outputCost: 0.006 },
      'gpt-4o-mini-transcribe': { inputCost: 0.003, outputCost: 0.003 }
    };

    const pricing = pricingMap[modelId];
    if (pricing) {
      return {
        inputCost: pricing.inputCost,
        outputCost: pricing.outputCost,
        currency: 'USD'
      };
    }

    return undefined;
  }

  /**
   * Add fallback models if discovery fails
   */
  private addFallbackModels(): void {
    const fallbackModels = [
      {
        id: 'gpt-4',
        name: 'GPT-4',
        description: 'OpenAI GPT-4 model',
        capabilities: [MediaCapability.TEXT_TO_TEXT],
        parameters: this.getModelParameters('gpt-4', [MediaCapability.TEXT_TO_TEXT]),
        pricing: this.getModelPricing('gpt-4')
      },
      {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        description: 'OpenAI GPT-3.5 Turbo model',
        capabilities: [MediaCapability.TEXT_TO_TEXT],
        parameters: this.getModelParameters('gpt-3.5-turbo', [MediaCapability.TEXT_TO_TEXT]),
        pricing: this.getModelPricing('gpt-3.5-turbo')
      },
      {
        id: 'dall-e-3',
        name: 'DALL-E 3',
        description: 'OpenAI DALL-E 3 image generation model',
        capabilities: [MediaCapability.TEXT_TO_IMAGE],
        parameters: this.getModelParameters('dall-e-3', [MediaCapability.TEXT_TO_IMAGE]),
        pricing: this.getModelPricing('dall-e-3')
      },
      {
        id: 'tts-1',
        name: 'TTS-1',
        description: 'OpenAI Text-to-Speech model',
        capabilities: [MediaCapability.TEXT_TO_AUDIO],
        parameters: this.getModelParameters('tts-1', [MediaCapability.TEXT_TO_AUDIO]),
        pricing: this.getModelPricing('tts-1')
      },
      {
        id: 'whisper-1',
        name: 'Whisper-1',
        description: 'OpenAI Whisper speech recognition model',
        capabilities: [MediaCapability.AUDIO_TO_TEXT],
        parameters: this.getModelParameters('whisper-1', [MediaCapability.AUDIO_TO_TEXT]),
        pricing: this.getModelPricing('whisper-1')
      },
      {
        id: 'gpt-4o-transcribe',
        name: 'GPT-4o Transcribe',
        description: 'GPT-4o model optimized for transcription',
        capabilities: [MediaCapability.AUDIO_TO_TEXT],
        parameters: this.getModelParameters('gpt-4o-transcribe', [MediaCapability.AUDIO_TO_TEXT]),
        pricing: this.getModelPricing('gpt-4o-transcribe')
      },
      {
        id: 'gpt-4o-mini-transcribe',
        name: 'GPT-4o Mini Transcribe',
        description: 'Smaller GPT-4o model for transcription',
        capabilities: [MediaCapability.AUDIO_TO_TEXT],
        parameters: this.getModelParameters('gpt-4o-mini-transcribe', [MediaCapability.AUDIO_TO_TEXT]),
        pricing: this.getModelPricing('gpt-4o-mini-transcribe')
      }
    ];

    for (const model of fallbackModels) {
      this.discoveredModels.set(model.id, model);
    }
  }

  /**
   * Get a model instance by ID with automatic type detection
   */
  async getModel(modelId: string): Promise<any> {
    await this.ensureConfigured();
    
    const providerModel = this.discoveredModels.get(modelId);
    if (!providerModel) {
      throw new Error(`Model ${modelId} not found in OpenAI provider`);
    }

    // Return appropriate model instance based on capabilities
    if (providerModel.capabilities.includes(MediaCapability.TEXT_TO_TEXT)) {
      return this.createTextToTextModel(modelId);
    } else if (providerModel.capabilities.includes(MediaCapability.TEXT_TO_IMAGE)) {
      return this.createTextToImageModel(modelId);
    } else if (providerModel.capabilities.includes(MediaCapability.TEXT_TO_AUDIO)) {
      return this.createTextToAudioModel(modelId);
    } else if (providerModel.capabilities.includes(MediaCapability.AUDIO_TO_TEXT)) {
      return this.createAudioToTextModel(modelId);
    }
    
    throw new Error(`Unsupported model capabilities for ${modelId}`);
  }

  /**
   * Get provider health and usage statistics
   */
  async getHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    uptime: number;
    activeJobs: number;
    queuedJobs: number;
    lastError?: string;
  }> {
    try {
      await this.ensureConfigured();
      
      // Simple health check - try to test connection
      if (this.apiClient) {
        const connected = await this.apiClient.testConnection();
        if (connected) {
          return {
            status: 'healthy',
            uptime: Date.now() - this.initTime,
            activeJobs: 0, // OpenAI doesn't provide this info
            queuedJobs: 0,  // OpenAI doesn't provide this info
          };
        } else {
          return {
            status: 'degraded',
            uptime: Date.now() - this.initTime,
            activeJobs: 0,
            queuedJobs: 0,
            lastError: 'Connection test failed'
          };
        }
      } else {
        return {
          status: 'unhealthy',
          uptime: 0,
          activeJobs: 0,
          queuedJobs: 0,
          lastError: 'Provider not configured'
        };
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        uptime: Date.now() - this.initTime,
        activeJobs: 0,
        queuedJobs: 0,
        lastError: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Ensure provider is configured
   */
  private async ensureConfigured(): Promise<void> {
    if (this.configurationPromise) {
      await this.configurationPromise;
      return;
    }

    if (!this.apiClient) {
      throw new Error('OpenAI provider not configured. Call configure() first.');
    }
  }
}

// Self-register with the provider registry
import { ProviderRegistry } from '../../registry/ProviderRegistry';
ProviderRegistry.getInstance().register('openai', OpenAIProvider);
