/**
 * HuggingFaceDockerProvider
 * 
 * Provider implementation for HuggingFace text-to-image models running in Docker containers.
 * Supports dynamic loading of any diffusers-compatible model from HuggingFace Hub.
 */

import { 
  MediaProvider,
  ProviderType,
  MediaCapability,
  ProviderModel,
  ProviderConfig
} from '../../../types/provider';
import { HuggingFaceDockerService } from '../../../services/HuggingFaceDockerService';
import { HuggingFaceAPIClient } from './HuggingFaceAPIClient';
import { HuggingFaceDockerModel } from './HuggingFaceDockerModel';
import { HuggingFaceTextToAudioModel } from './HuggingFaceTextToAudioModel';
import { TextToImageModel } from '../../../models/abstracts/TextToImageModel';
import { TextToAudioModel } from '../../../models/abstracts/TextToAudioModel';
import { TextToImageProvider, TextToAudioProvider } from '../../../capabilities';

/**
 * Provider for HuggingFace text-to-image and text-to-audio models via Docker
 */
export class HuggingFaceDockerProvider implements MediaProvider, TextToImageProvider, TextToAudioProvider {
  readonly id = 'huggingface-docker';
  readonly name = 'HuggingFace Docker Provider';
  readonly type = ProviderType.LOCAL;
  readonly capabilities = [MediaCapability.TEXT_TO_IMAGE, MediaCapability.TEXT_TO_AUDIO];
  readonly models: ProviderModel[] = [];

  private dockerService?: HuggingFaceDockerService;
  private apiClient?: HuggingFaceAPIClient;
  private config?: ProviderConfig;

  /**
   * Get the Docker service instance
   */
  protected async getDockerService(): Promise<HuggingFaceDockerService> {
    if (!this.dockerService) {
      this.dockerService = new HuggingFaceDockerService();
    }
    return this.dockerService;
  }

  /**
   * Get the API client instance
   */
  protected async getAPIClient(): Promise<HuggingFaceAPIClient> {
    if (!this.apiClient) {
      this.apiClient = new HuggingFaceAPIClient();
    }
    return this.apiClient;
  }

  /**
   * Start the Docker service
   */
  async startService(): Promise<boolean> {
    try {
      const dockerService = await this.getDockerService();
      const started = await dockerService.startService();
      
      if (started) {
        // Wait for service to be healthy
        const healthy = await dockerService.waitForHealthy(120000); // 2 minutes
        return healthy;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to start HuggingFace Docker service:', error);
      return false;
    }
  }

  /**
   * Stop the Docker service
   */
  async stopService(): Promise<boolean> {
    try {
      const dockerService = await this.getDockerService();
      return await dockerService.stopService();
    } catch (error) {
      console.error('Failed to stop HuggingFace Docker service:', error);
      return false;
    }
  }

  /**
   * Get service status
   */
  async getServiceStatus(): Promise<any> {
    try {
      const dockerService = await this.getDockerService();
      return await dockerService.getServiceStatus();
    } catch (error) {
      console.error('Failed to get HuggingFace service status:', error);
      return { running: false, healthy: false };
    }
  }

  /**
   * Get available models (dynamic - any HF model ID can be used)
   */
  getAvailableModels(): string[] {
    // Return some popular models as examples, but any HF model ID can be used
    return [
      // Text-to-Image models
      'runwayml/stable-diffusion-v1-5',
      'stabilityai/stable-diffusion-xl-base-1.0',
      'stabilityai/stable-diffusion-2-1',
      'black-forest-labs/FLUX.1-dev',
      'black-forest-labs/FLUX.1-schnell',
      'SimianLuo/LCM_Dreamshaper_v7',
      'prompthero/openjourney-v4',
      'wavymulder/Analog-Diffusion',
      'nitrosocke/Arcane-Diffusion',
      // Text-to-Audio models
      'microsoft/speecht5_tts',
      'facebook/mms-tts-eng',
      'espnet/kan-bayashi_ljspeech_vits',
      'coqui/XTTS-v2',
      'facebook/musicgen-small',
      'facebook/musicgen-medium',
      'facebook/musicgen-large',
      'suno/bark',
      'microsoft/DialoGPT-medium'
    ];
  }

  /**
   * Get text-to-image models only
   */
  getTextToImageModels(): string[] {
    return [
      'runwayml/stable-diffusion-v1-5',
      'stabilityai/stable-diffusion-xl-base-1.0',
      'stabilityai/stable-diffusion-2-1',
      'black-forest-labs/FLUX.1-dev',
      'black-forest-labs/FLUX.1-schnell',
      'SimianLuo/LCM_Dreamshaper_v7',
      'prompthero/openjourney-v4',
      'wavymulder/Analog-Diffusion',
      'nitrosocke/Arcane-Diffusion'
    ];
  }

  /**
   * Get text-to-audio models only
   */
  getTextToAudioModels(): string[] {
    return [
      'microsoft/speecht5_tts',
      'facebook/mms-tts-eng',
      'espnet/kan-bayashi_ljspeech_vits',
      'coqui/XTTS-v2',
      'facebook/musicgen-small',
      'facebook/musicgen-medium',
      'facebook/musicgen-large',
      'suno/bark',
      'microsoft/DialoGPT-medium'
    ];
  }

  /**
   * Determine if a model is text-to-image or text-to-audio based on model ID patterns
   */
  private determineModelType(modelId: string): 'text-to-image' | 'text-to-audio' {
    const textToAudioIndicators = [
      'tts', 'speecht5', 'mms-tts', 'vits', 'xtts', 'musicgen', 'bark', 
      'text-to-speech', 'speech', 'audio', 'voice', 'sound'
    ];
    
    const modelIdLower = modelId.toLowerCase();
    
    // Check if the model ID contains any text-to-audio indicators
    if (textToAudioIndicators.some(indicator => modelIdLower.includes(indicator))) {
      return 'text-to-audio';
    }
    
    // Default to text-to-image (original capability)
    return 'text-to-image';
  }

  /**
   * Create a text-to-image model instance
   */
  async createTextToImageModel(modelId: string): Promise<TextToImageModel> {
    const dockerService = await this.getDockerService();
    const apiClient = await this.getAPIClient();

    // Create Docker-specific model with injected dependencies
    const model = new HuggingFaceDockerModel({
      apiClient,
      modelId,
      autoLoad: true // Enable automatic model loading
    });

    return model;
  }

  /**
   * Create a text-to-audio model instance (TextToAudioProvider interface)
   */
  async createTextToAudioModel(modelId: string): Promise<TextToAudioModel> {
    const dockerService = await this.getDockerService();
    const apiClient = await this.getAPIClient();

    // Create Text-to-Audio model with injected dependencies
    const model = new HuggingFaceTextToAudioModel({
      apiClient,
      modelId,
      autoLoad: true // Enable automatic model loading
    });

    return model;
  }

  /**
   * Get supported text-to-image models (TextToImageProvider interface)
   */
  getSupportedTextToImageModels(): string[] {
    return this.getTextToImageModels();
  }

  /**
   * Get supported text-to-audio models (TextToAudioProvider interface)
   */
  getSupportedTextToAudioModels(): string[] {
    return this.getTextToAudioModels();
  }

  /**
   * Check if provider supports a specific text-to-image model (TextToImageProvider interface)
   */
  supportsTextToImageModel(modelId: string): boolean {
    // HuggingFace provider supports any valid HF model ID for text-to-image
    return typeof modelId === 'string' && modelId.length > 0 && 
           this.determineModelType(modelId) === 'text-to-image';
  }

  /**
   * Check if provider supports a specific text-to-audio model (TextToAudioProvider interface)
   */
  supportsTextToAudioModel(modelId: string): boolean {
    // HuggingFace provider supports any valid HF model ID for text-to-audio
    return typeof modelId === 'string' && modelId.length > 0 && 
           this.determineModelType(modelId) === 'text-to-audio';
  }

  /**
   * Check if provider supports a specific model
   */
  supportsModel(modelId: string): boolean {
    return this.supportsTextToImageModel(modelId) || this.supportsTextToAudioModel(modelId);
  }

  /**
   * Get provider health status (MediaProvider interface)
   */
  async getHealth(): Promise<any> {
    return await this.getServiceHealth();
  }

  /**
   * Get provider information
   */
  getInfo() {
    return {
      description: 'Provides dynamic HuggingFace text-to-image and text-to-audio models via Docker containers',
      dockerImage: 'huggingface-multimodal:latest',
      defaultPort: 8007,
      capabilities: [
        'text-to-image',
        'text-to-audio',
        'text-to-speech',
        'dynamic-model-loading',
        'stable-diffusion',
        'flux',
        'musicgen',
        'speecht5',
        'custom-models'
      ],
      features: [
        'Any HuggingFace diffusers model',
        'Any HuggingFace TTS/audio model',
        'Dynamic model loading',
        'Memory management',
        'GPU acceleration',
        'Model caching',
        'Voice synthesis',
        'Music generation',
        'Speech synthesis'
      ]
    };
  }

  /**
   * Configure the provider
   */
  async configure(config: ProviderConfig): Promise<void> {
    this.config = config;
    // Docker providers typically don't need API keys, but may need service URLs
    if (config.baseUrl) {
      this.apiClient = new HuggingFaceAPIClient({ baseUrl: config.baseUrl });
    }
  }

  /**
   * Check if provider is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const status = await this.getServiceStatus();
      return status.running && status.health === 'healthy';
    } catch {
      return false;
    }
  }

  /**
   * Get models for specific capability
   */
  getModelsForCapability(capability: MediaCapability): ProviderModel[] {
    if (capability === MediaCapability.TEXT_TO_IMAGE) {
      // Return dynamic text-to-image model definitions
      return this.getTextToImageModels().map(modelId => ({
        id: modelId,
        name: `HuggingFace: ${modelId}`,
        description: `Dynamic HuggingFace text-to-image model: ${modelId}`,
        capabilities: [MediaCapability.TEXT_TO_IMAGE],
        parameters: {
          width: { type: 'number', default: 512, min: 64, max: 2048 },
          height: { type: 'number', default: 512, min: 64, max: 2048 },
          numInferenceSteps: { type: 'number', default: 20, min: 1, max: 100 },
          guidanceScale: { type: 'number', default: 7.5, min: 1.0, max: 20.0 },
          seed: { type: 'number', optional: true },
          negativePrompt: { type: 'string', optional: true },
          scheduler: { 
            type: 'string', 
            optional: true,
            options: ['DPMSolverMultistepScheduler', 'EulerDiscreteScheduler', 'DDIMScheduler']
          }
        },
        pricing: {
          inputCost: 0, // Free local service
          outputCost: 0,
          currency: 'USD'
        }
      }));
    } else if (capability === MediaCapability.TEXT_TO_AUDIO) {
      // Return dynamic text-to-audio model definitions
      return this.getTextToAudioModels().map(modelId => ({
        id: modelId,
        name: `HuggingFace: ${modelId}`,
        description: `Dynamic HuggingFace text-to-audio model: ${modelId}`,
        capabilities: [MediaCapability.TEXT_TO_AUDIO],
        parameters: {
          voice: { type: 'string', default: 'default', optional: true },
          speed: { type: 'number', default: 1.0, min: 0.5, max: 2.0 },
          pitch: { type: 'number', default: 0.0, min: -1.0, max: 1.0 },
          volume: { type: 'number', default: 1.0, min: 0.0, max: 1.0 },
          sampleRate: { type: 'number', default: 22050, options: [16000, 22050, 44100, 48000] },
          format: { type: 'string', default: 'wav', options: ['wav', 'mp3', 'flac', 'ogg'] },
          language: { type: 'string', default: 'en', optional: true }
        },
        pricing: {
          inputCost: 0, // Free local service
          outputCost: 0,
          currency: 'USD'
        }
      }));
    }
    return [];
  }

  /**
   * Get a model instance by ID with automatic type detection
   */
  async getModel(modelId: string): Promise<TextToImageModel | TextToAudioModel> {
    if (!await this.isAvailable()) {
      throw new Error('HuggingFace provider is not available');
    }

    // Determine model type based on model ID patterns
    const modelType = this.determineModelType(modelId);
    
    if (modelType === 'text-to-audio') {
      return this.createTextToAudioModel(modelId);
    } else {
      return this.createTextToImageModel(modelId);
    }
  }

  /**
   * Load a specific model in the service
   */
  async loadModel(modelId: string, options?: { force?: boolean; precision?: string }): Promise<any> {
    try {
      const apiClient = await this.getAPIClient();
      return await apiClient.loadModel({
        modelId,
        force: options?.force || false,
        precision: options?.precision as 'fp16' | 'fp32' || 'fp16'
      });
    } catch (error) {
      console.error(`Failed to load model ${modelId}:`, error);
      throw error;
    }
  }

  /**
   * Unload a specific model from the service
   */
  async unloadModel(modelId: string): Promise<any> {
    try {
      const apiClient = await this.getAPIClient();
      return await apiClient.unloadModel(modelId);
    } catch (error) {
      console.error(`Failed to unload model ${modelId}:`, error);
      throw error;
    }
  }

  /**
   * List currently loaded models in the service
   */
  async listLoadedModels(): Promise<any[]> {
    try {
      const apiClient = await this.getAPIClient();
      return await apiClient.listLoadedModels();
    } catch (error) {
      console.error('Failed to list loaded models:', error);
      return [];
    }
  }

  /**
   * Get service health information
   */
  async getServiceHealth(): Promise<any> {
    try {
      const apiClient = await this.getAPIClient();
      return await apiClient.healthCheck();
    } catch (error) {
      console.error('Failed to get service health:', error);
      return { status: 'unhealthy', error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

// Self-register with the provider registry
import { ProviderRegistry } from '../../../registry/ProviderRegistry';
ProviderRegistry.getInstance().register('huggingface-docker', HuggingFaceDockerProvider);
