/**
 * Chatterbox TTS Provider (Local)
 * 
 * Supports multiple TTS capabilities through Docker container
 */

import { 
  MediaProvider, 
  ProviderType, 
  MediaCapability, 
  ProviderModel, 
  ProviderConfig 
} from '../../../types/provider';
import { DockerComposeService } from '../../../services/DockerComposeService';
import { ChatterboxAPIClient } from './ChatterboxAPIClient';
import { TextToAudioModel } from '../../../models/abstracts/TextToAudioModel';
import { TextToAudioProvider } from '../../../capabilities';

export class ChatterboxProvider implements MediaProvider, TextToAudioProvider {
  readonly id = 'chatterbox';
  readonly name = 'Chatterbox TTS';
  readonly type = ProviderType.LOCAL;
  readonly capabilities = [
    MediaCapability.TEXT_TO_AUDIO,
    MediaCapability.TEXT_TO_AUDIO, // Voice cloning is also text-to-audio
    MediaCapability.AUDIO_TO_AUDIO // Audio enhancement
  ];

  private config?: ProviderConfig;
  private dockerServiceManager?: DockerComposeService;
  private apiClient?: ChatterboxAPIClient;

  /**
   * Constructor automatically configures from environment variables
   */
  constructor() {
    // Auto-configure from environment variables (async but non-blocking)
    this.autoConfigureFromEnv().catch(error => {
      // Silent fail - provider will just not be available until manually configured
    });
  }

  private async autoConfigureFromEnv(): Promise<void> {
    const serviceUrl = process.env.CHATTERBOX_DOCKER_URL || 'github:your-org/chatterbox-docker-service'; // Example GitHub URL
    
    try {
      const { ServiceRegistry } = await import('../../../registry/ServiceRegistry');
      const serviceRegistry = ServiceRegistry.getInstance();
      this.dockerServiceManager = await serviceRegistry.getService(serviceUrl) as DockerComposeService;
      
      const serviceInfo = this.dockerServiceManager.getServiceInfo();
      if (serviceInfo.ports && serviceInfo.ports.length > 0) {
        const port = serviceInfo.ports[0];
        this.apiClient = new ChatterboxAPIClient({ baseUrl: `http://localhost:${port}` });
      }

      await this.configure({
        serviceUrl,
        timeout: 300000,
        retries: 2
      });
    } catch (error) {
      console.warn(`[ChatterboxProvider] Auto-configuration failed: ${error.message}`);
    }
  }

  readonly models: ProviderModel[] = [
    {
      id: 'chatterbox-standard',
      name: 'Chatterbox Standard TTS',
      description: 'High-quality text-to-speech with multiple voices',
      capabilities: [MediaCapability.TEXT_TO_AUDIO],
      parameters: {
        voice: { type: 'string', default: 'en-US-AriaNeural', options: ['en-US-AriaNeural', 'en-US-DavisNeural', 'en-US-GuyNeural'] },
        speed: { type: 'number', default: 1.0, min: 0.5, max: 2.0 },
        pitch: { type: 'number', default: 1.0, min: 0.5, max: 2.0 },
        volume: { type: 'number', default: 1.0, min: 0.1, max: 1.0 }
      },
      pricing: {
        inputCost: 0, // Free local service
        outputCost: 0,
        currency: 'USD'
      }
    },
    {
      id: 'chatterbox-voice-clone',
      name: 'Chatterbox Voice Cloning',
      description: 'Clone voices from audio samples',
      capabilities: [MediaCapability.TEXT_TO_AUDIO], // Voice cloning is text-to-audio with voice input
      parameters: {
        referenceAudio: { type: 'file', required: true },
        text: { type: 'string', required: true },
        similarity: { type: 'number', default: 0.8, min: 0.1, max: 1.0 }
      },
      pricing: {
        inputCost: 0,
        outputCost: 0,
        currency: 'USD'
      }
    }
  ];

  async configure(config: ProviderConfig): Promise<void> {
    this.config = config;
    if (config.baseUrl && !this.apiClient) {
      this.apiClient = new ChatterboxAPIClient({ baseUrl: config.baseUrl });
    }
  }

  async isAvailable(): Promise<boolean> {
    if (!this.dockerServiceManager) {
      return false;
    }
    const status = await this.dockerServiceManager.getServiceStatus();
    return status.running && status.health === 'healthy';
  }

  getModelsForCapability(capability: MediaCapability): ProviderModel[] {
    return this.models.filter(model => model.capabilities.includes(capability));
  }

  

  async getHealth(): Promise<any> {
    if (!this.dockerServiceManager) {
      return {
        status: 'unhealthy',
        details: { error: 'Docker service manager not initialized' }
      };
    }
    const status = await this.dockerServiceManager.getServiceStatus();
    return {
      status: status.health,
      details: status
    };
  }

  /**
   * Get a model instance by ID with automatic type detection
   */
  async getModel(modelId: string): Promise<any> {
    if (!await this.isAvailable()) {
      throw new Error('Chatterbox provider is not available');
    }

    // Check if the model exists
    const model = this.models.find(m => m.id === modelId);
    if (!model) {
      throw new Error(`Model '${modelId}' not found in Chatterbox provider`);
    }

    // Chatterbox only supports text-to-audio models
    if (model.capabilities.includes(MediaCapability.TEXT_TO_AUDIO)) {
      const { ChatterboxTextToAudioModel } = await import('./ChatterboxTextToAudioModel');
      return new ChatterboxTextToAudioModel({
        apiClient: this.apiClient!,
        baseUrl: this.apiClient?.baseUrl || 'http://localhost:8004',
        timeout: this.config?.timeout || 300000
      });
    }

    throw new Error(`Unsupported model type for '${modelId}' in Chatterbox provider`);
  }

}