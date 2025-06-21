/**
 * Together AI Provider with TextToText Support
 * 
 * Provider that integrates with Together.ai's unified LLM API.
 * Provides access to open-source models through Together's platform.
 */

import {
  MediaProvider,
  ProviderType,
  MediaCapability,
  ProviderModel,
  ProviderConfig,
  GenerationRequest,
  GenerationResult
} from '../types/provider';
import { TogetherAPIClient, TogetherConfig } from '../clients/TogetherAPIClient';
import { TextToTextProvider, TextToImageProvider, TextToAudioProvider } from './roles';
import { TextToTextModel } from '../models/TextToTextModel';
import { TogetherTextToTextModel } from '../models/TogetherTextToTextModel';
import { TextToImageModel } from '../models/TextToImageModel';
import { TogetherTextToImageModel } from '../models/TogetherTextToImageModel';
import { TextToAudioModel } from '../models/TextToAudioModel';
import { TogetherTextToAudioModel } from '../models/TogetherTextToAudioModel';

export class TogetherProvider implements MediaProvider, TextToTextProvider, TextToImageProvider, TextToAudioProvider {
  readonly id = 'together';
  readonly name = 'Together AI';
  readonly type = ProviderType.REMOTE;
  readonly capabilities = [
    MediaCapability.TEXT_GENERATION,
    MediaCapability.TEXT_TO_TEXT,
    MediaCapability.IMAGE_GENERATION,
    MediaCapability.AUDIO_GENERATION
  ];

  private config?: ProviderConfig;
  private apiClient?: TogetherAPIClient;
  private discoveredModels = new Map<string, ProviderModel>();

  // Pre-configured popular text models
  private popularTextModels = [
    'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
    'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
    'meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo',
    'meta-llama/Llama-3.2-3B-Instruct-Turbo',
    'meta-llama/Llama-3.2-11B-Vision-Instruct-Turbo',
    'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free',
    'deepseek-ai/DeepSeek-R1-Distill-Llama-70B-free',
    'lgai/exaone-3-5-32b-instruct',
    'mistralai/Mixtral-8x7B-Instruct-v0.1',
    'mistralai/Mistral-7B-Instruct-v0.3',
    'Qwen/Qwen2.5-7B-Instruct-Turbo',
    'Qwen/Qwen2.5-72B-Instruct-Turbo',
    'NousResearch/Nous-Hermes-2-Mixtral-8x7B-DPO',
    'teknium/OpenHermes-2.5-Mistral-7B'
  ];

  // Pre-configured popular image models
  private popularImageModels = [
    'black-forest-labs/FLUX.1-schnell-Free',
    'black-forest-labs/FLUX.1-schnell',
    'black-forest-labs/FLUX.1-dev',
    'black-forest-labs/FLUX.1-pro',
    'black-forest-labs/FLUX.1.1-pro',
    'black-forest-labs/FLUX.1-redux',
    'black-forest-labs/FLUX.1-canny',
    'black-forest-labs/FLUX.1-depth',
    'black-forest-labs/FLUX.1-kontext-max',
    'black-forest-labs/FLUX.1-kontext-pro',
    'black-forest-labs/FLUX.1-dev-lora'
  ];

  // Pre-configured audio models
  private popularAudioModels = [
    'cartesia/sonic',
    'cartesia/sonic-2'
  ];

  get models(): ProviderModel[] {
    // Return discovered models if available, otherwise return popular models
    if (this.discoveredModels.size > 0) {
      return Array.from(this.discoveredModels.values());
    }

    // Combine text, image, and audio models
    const textModels = this.popularTextModels.map(modelId => ({
      id: modelId,
      name: this.getModelDisplayName(modelId),
      description: `Together AI text model: ${modelId}`,
      capabilities: [MediaCapability.TEXT_GENERATION, MediaCapability.TEXT_TO_TEXT],
      parameters: {
        temperature: { type: 'number', min: 0, max: 2, default: 0.7 },
        max_tokens: { type: 'number', min: 1, max: 8192, default: 1024 },
        top_p: { type: 'number', min: 0, max: 1, default: 0.9 },
        top_k: { type: 'number', min: 1, max: 100, default: 50 },
        repetition_penalty: { type: 'number', min: 0.1, max: 2, default: 1 }
      },
      pricing: {
        inputCost: 0, // Many Together models are free
        outputCost: 0,
        currency: 'USD'
      }
    }));

    const imageModels = this.popularImageModels.map(modelId => ({
      id: modelId,
      name: this.getModelDisplayName(modelId),
      description: `Together AI image model: ${modelId}`,
      capabilities: [MediaCapability.IMAGE_GENERATION],
      parameters: this.getImageParametersForModel(modelId),
      pricing: {
        inputCost: 0, // Many FLUX models are free
        outputCost: 0,
        currency: 'USD'
      }
    }));

    const audioModels = this.popularAudioModels.map(modelId => ({
      id: modelId,
      name: this.getModelDisplayName(modelId),
      description: `Together AI audio model: ${modelId}`,
      capabilities: [MediaCapability.AUDIO_GENERATION],
      parameters: {
        voice: { type: 'string', default: 'default' },
        speed: { type: 'number', min: 0.5, max: 2.0, default: 1.0 },
        output_format: { type: 'string', enum: ['mp3', 'wav'], default: 'mp3' },
        sample_rate: { type: 'number', enum: [22050, 44100, 48000], default: 44100 }
      },
      pricing: {
        inputCost: 0.065, // Cartesia Sonic pricing: $65 per 1M characters = $0.065 per 1K characters
        outputCost: 0,
        currency: 'USD',
        unit: 'per_1k_characters'
      }
    }));

    return [...textModels, ...imageModels, ...audioModels];
  }

  async configure(config: ProviderConfig): Promise<void> {
    this.config = config;
    
    if (!config.apiKey) {
      throw new Error('Together AI API key is required');
    }

    const togetherConfig: TogetherConfig = {
      apiKey: config.apiKey,
      baseUrl: config.baseUrl || 'https://api.together.xyz/v1',
      timeout: config.timeout || 30000
    };

    this.apiClient = new TogetherAPIClient(togetherConfig);

    // Optionally discover available models
    await this.discoverModels();
  }

  async isAvailable(): Promise<boolean> {
    if (!this.apiClient) {
      return false;
    }

    try {
      return await this.apiClient.testConnection();
    } catch (error) {
      console.warn('Together AI availability check failed:', error);
      return false;
    }
  }

  getModelsForCapability(capability: MediaCapability): ProviderModel[] {
    return this.models.filter(model =>
      model.capabilities.includes(capability)
    );
  }

  async getHealth() {
    const isAvailable = await this.isAvailable();
    
    return {
      status: isAvailable ? 'healthy' as const : 'unhealthy' as const,
      uptime: process.uptime(),
      activeJobs: 0, // Models handle their own jobs
      queuedJobs: 0,
      lastError: isAvailable ? undefined : 'API connection failed'
    };
  }

  // TextToTextProvider interface implementation
  async createTextToTextModel(modelId: string): Promise<TextToTextModel> {
    if (!this.apiClient) {
      throw new Error('Provider not configured');
    }

    if (!this.supportsTextToTextModel(modelId)) {
      throw new Error(`Model '${modelId}' is not supported by Together AI provider`);
    }

    return new TogetherTextToTextModel({
      apiClient: this.apiClient,
      modelId
    });
  }

  getSupportedTextToTextModels(): string[] {
    return this.models.map(model => model.id);
  }

  supportsTextToTextModel(modelId: string): boolean {
    return this.getSupportedTextToTextModels().includes(modelId);
  }

  // TextToImageProvider interface implementation
  async createTextToImageModel(modelId: string): Promise<TextToImageModel> {
    if (!this.apiClient) {
      throw new Error('Provider not configured');
    }

    if (!this.supportsTextToImageModel(modelId)) {
      throw new Error(`Image model '${modelId}' is not supported by Together AI provider`);
    }

    // Get model metadata dynamically
    const modelMetadata = await this.apiClient.getModelInfo(modelId);

    return new TogetherTextToImageModel({
      apiClient: this.apiClient,
      modelId,
      modelMetadata: modelMetadata || undefined
    });
  }

  getSupportedTextToImageModels(): string[] {
    return this.getModelsForCapability(MediaCapability.IMAGE_GENERATION).map(model => model.id);
  }

  supportsTextToImageModel(modelId: string): boolean {
    return this.getSupportedTextToImageModels().includes(modelId);
  }

  // TextToAudioProvider interface implementation
  async createTextToAudioModel(modelId: string): Promise<TextToAudioModel> {
    if (!this.apiClient) {
      throw new Error('Provider not configured');
    }

    if (!this.supportsTextToAudioModel(modelId)) {
      throw new Error(`Audio model '${modelId}' is not supported by Together AI provider`);
    }

    // Get model metadata dynamically
    const modelMetadata = await this.apiClient.getModelInfo(modelId);

    return new TogetherTextToAudioModel({
      apiClient: this.apiClient,
      modelId,
      modelMetadata: modelMetadata || undefined
    });
  }

  getSupportedTextToAudioModels(): string[] {
    return this.getModelsForCapability(MediaCapability.AUDIO_GENERATION).map(model => model.id);
  }

  supportsTextToAudioModel(modelId: string): boolean {
    return this.getSupportedTextToAudioModels().includes(modelId);
  }

  // Service management (no-ops for remote API providers)
  async startService(): Promise<boolean> {
    return true; // Remote APIs are always "started"
  }

  async stopService(): Promise<boolean> {
    return true; // No service to stop for remote APIs
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
    throw new Error('TogetherProvider should use Model instances for generation, not direct generation');
  }

  // Helper methods
  private async discoverModels(): Promise<void> {
    if (!this.apiClient) {
      return;
    }

    try {
      console.log('[TogetherProvider] Starting model discovery...');
      const availableModels = await this.apiClient.getAvailableModels();

      if (!availableModels || !Array.isArray(availableModels)) {
        throw new Error(`Invalid models response: ${typeof availableModels}`);
      }

      console.log(`[TogetherProvider] Retrieved ${availableModels.length} models from API`);

      let textModelCount = 0;
      let imageModelCount = 0;
      let audioModelCount = 0;
      let skippedCount = 0;

      for (const model of availableModels) {
        // Determine model capabilities based on type and name
        const capabilities = this.determineModelCapabilities(model);

        // Skip models that don't match our supported capabilities
        if (capabilities.length === 0) {
          skippedCount++;
          continue;
        }

        // Count by type
        if (capabilities.includes(MediaCapability.TEXT_GENERATION)) {
          textModelCount++;
        }
        if (capabilities.includes(MediaCapability.IMAGE_GENERATION)) {
          imageModelCount++;
        }
        if (capabilities.includes(MediaCapability.AUDIO_GENERATION)) {
          audioModelCount++;
        }

        // Set parameters based on model type
        const parameters = this.getParametersForCapabilities(capabilities, model.id);

        const providerModel: ProviderModel = {
          id: model.id,
          name: model.display_name || model.id,
          description: model.description || `Together AI model: ${model.id}`,
          capabilities,
          parameters,
          pricing: {
            inputCost: model.pricing?.input || 0,
            outputCost: model.pricing?.output || 0,
            currency: 'USD'
          }
        };

        this.discoveredModels.set(model.id, providerModel);
      }

      console.log(`[TogetherProvider] Discovery complete:`);
      console.log(`  - Total discovered: ${this.discoveredModels.size}`);
      console.log(`  - Text models: ${textModelCount}`);
      console.log(`  - Image models: ${imageModelCount}`);
      console.log(`  - Audio models: ${audioModelCount}`);
      console.log(`  - Skipped: ${skippedCount}`);

    } catch (error) {
      console.error('[TogetherProvider] Model discovery failed:', error);
      console.warn('[TogetherProvider] Using popular models fallback');
    }
  }

  private getModelDisplayName(modelId: string): string {
    const parts = modelId.split('/');
    if (parts.length === 2) {
      const [org, model] = parts;
      return `${org.charAt(0).toUpperCase() + org.slice(1)} ${model.replace(/-/g, ' ')}`;
    }
    return modelId;
  }

  /**
   * Get free models available on Together AI
   */
  getFreeModels(): ProviderModel[] {
    return this.models.filter(model => 
      model.pricing?.inputCost === 0 && model.pricing?.outputCost === 0
    );
  }

  /**
   * Check if a specific model is free
   */
  isModelFree(modelId: string): boolean {
    const model = this.models.find(m => m.id === modelId);
    return model ? (model.pricing?.inputCost === 0 && model.pricing?.outputCost === 0) : false;
  }

  /**
   * Determine model capabilities based on model metadata (improved classification)
   */
  private determineModelCapabilities(model: any): MediaCapability[] {
    const capabilities: MediaCapability[] = [];
    const modelId = model.id.toLowerCase();
    const displayName = (model.display_name || '').toLowerCase();
    const description = (model.description || '').toLowerCase();
    const modelType = (model.type || '').toLowerCase();

    // Image generation models - be more comprehensive
    const imageIndicators = [
      'flux', 'stable-diffusion', 'sd-', 'dall-e', 'midjourney', 'imagen',
      'kandinsky', 'playground', 'realvisxl', 'juggernaut', 'dreamshaper',
      'proteus', 'pixart', 'kolors', 'hunyuan', 'recraft'
    ];

    const isImageModel =
      modelType === 'image' ||
      imageIndicators.some(indicator =>
        modelId.includes(indicator) ||
        displayName.includes(indicator) ||
        description.includes(indicator)
      ) ||
      description.includes('image generation') ||
      description.includes('text-to-image') ||
      displayName.includes('image');

    if (isImageModel) {
      capabilities.push(MediaCapability.IMAGE_GENERATION);
    }

    // Text generation models - be more inclusive but exclude image-only models
    const textIndicators = [
      'llama', 'mistral', 'qwen', 'gemma', 'phi', 'deepseek', 'yi', 'nous',
      'openchat', 'wizardlm', 'vicuna', 'alpaca', 'claude', 'gpt', 'palm',
      'flan', 'ul2', 'opt', 'bloom', 'pythia', 'galactica', 'codegen',
      'starcoder', 'santacoder', 'replit', 'incite', 'redpajama', 'falcon',
      'mpt', 'dolly', 'stablelm', 'koala', 'baize', 'chatglm', 'moss',
      'instruct', 'chat', 'turbo', 'base'
    ];

    const isTextModel =
      !isImageModel && ( // Don't classify image models as text models
        modelType === 'chat' ||
        modelType === 'language' ||
        modelType === 'text' ||
        textIndicators.some(indicator =>
          modelId.includes(indicator) ||
          displayName.includes(indicator)
        ) ||
        description.includes('language model') ||
        description.includes('text generation') ||
        description.includes('conversation') ||
        description.includes('instruct') ||
        description.includes('chat') ||
        (!modelType && !isImageModel) // Default to text if no clear type and not image
      );

    if (isTextModel) {
      capabilities.push(MediaCapability.TEXT_GENERATION, MediaCapability.TEXT_TO_TEXT);
    }

    // Audio generation models
    const audioIndicators = [
      'sonic', 'cartesia', 'audio', 'speech', 'voice', 'tts', 'text-to-speech'
    ];

    const isAudioModel =
      modelType === 'audio' ||
      audioIndicators.some(indicator =>
        modelId.includes(indicator) ||
        displayName.includes(indicator) ||
        description.includes(indicator)
      ) ||
      description.includes('audio generation') ||
      description.includes('text-to-audio') ||
      description.includes('text-to-speech');

    if (isAudioModel) {
      capabilities.push(MediaCapability.AUDIO_GENERATION);
    }

    // Debug logging for classification
    if (capabilities.length === 0) {
      console.log(`[TogetherProvider] Unclassified model: ${model.id} (type: ${modelType}, display: ${displayName})`);
    }

    return capabilities;
  }

  /**
   * Get appropriate parameters based on model capabilities (dynamic)
   */
  private getParametersForCapabilities(capabilities: MediaCapability[], modelId?: string): Record<string, any> {
    if (capabilities.includes(MediaCapability.IMAGE_GENERATION)) {
      // For image models, use dynamic parameters
      return this.getImageParametersForModel(modelId || '');
    } else if (capabilities.includes(MediaCapability.AUDIO_GENERATION)) {
      // For audio models, use audio-specific parameters
      return this.getAudioParametersForModel(modelId || '');
    } else {
      // For text models, use standard LLM parameters
      return {
        temperature: { type: 'number', min: 0, max: 2, default: 0.7 },
        max_tokens: { type: 'number', min: 1, max: 8192, default: 1024 },
        top_p: { type: 'number', min: 0, max: 1, default: 0.9 },
        top_k: { type: 'number', min: 1, max: 100, default: 50 },
        repetition_penalty: { type: 'number', min: 0.1, max: 2, default: 1 }
      };
    }
  }

  /**
   * Get models by type for easier access
   */
  getTextModels(): ProviderModel[] {
    return this.getModelsForCapability(MediaCapability.TEXT_GENERATION);
  }

  getImageModels(): ProviderModel[] {
    return this.getModelsForCapability(MediaCapability.IMAGE_GENERATION);
  }

  getAudioModels(): ProviderModel[] {
    return this.getModelsForCapability(MediaCapability.AUDIO_GENERATION);
  }

  /**
   * Get dynamic image parameters based on model metadata
   */
  private getImageParametersForModel(modelId: string): Record<string, any> {
    // TODO: Parse actual parameter schema from model metadata when available
    // For now, return generic image generation parameters
    return {
      width: { type: 'number', min: 256, max: 2048, default: 1024 },
      height: { type: 'number', min: 256, max: 2048, default: 1024 },
      steps: { type: 'number', min: 1, max: 50, default: 20 },
      seed: { type: 'number', min: 0, max: 2147483647, default: null },
      negative_prompt: { type: 'string', default: '' }
    };
  }

  /**
   * Get dynamic audio parameters based on model metadata
   */
  private getAudioParametersForModel(modelId: string): Record<string, any> {
    // TODO: Parse actual parameter schema from model metadata when available
    // For now, return generic audio generation parameters
    return {
      voice: { type: 'string', default: 'default' },
      speed: { type: 'number', min: 0.5, max: 2.0, default: 1.0 },
      output_format: { type: 'string', enum: ['mp3', 'wav'], default: 'mp3' },
      sample_rate: { type: 'number', enum: [22050, 44100, 48000], default: 44100 },
      language: { type: 'string', default: 'en' }
    };
  }
}
