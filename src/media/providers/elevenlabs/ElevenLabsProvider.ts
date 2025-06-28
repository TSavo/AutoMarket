import {
  MediaProvider,
  ProviderType,
  MediaCapability,
  ProviderModel,
  ProviderConfig
} from '../../types/provider';
import { TextToAudioProvider } from '../../capabilities';
import { ElevenLabsTextToAudioModel } from './ElevenLabsTextToAudioModel';
import { ProviderRegistry } from '../../registry/ProviderRegistry';
import { ElevenLabsClient, ElevenLabsConfig } from './ElevenLabsClient';

export class ElevenLabsProvider implements MediaProvider, TextToAudioProvider {
  async createTextToAudioModel(modelId: string): Promise<ElevenLabsTextToAudioModel> {
    await this.ensureConfigured();
    if (!this.apiClient) throw new Error('Provider not configured');
    return new ElevenLabsTextToAudioModel({ apiClient: this.apiClient, voiceId: modelId });
  }

  getSupportedTextToAudioModels(): string[] {
    return Array.from(this.discoveredModels.keys());
  }

  supportsTextToAudioModel(modelId: string): boolean {
    return this.discoveredModels.has(modelId);
  }

  async startService(): Promise<boolean> { return true; }
  async stopService(): Promise<boolean> { return true; }
  async getServiceStatus() { return { running: true, healthy: await this.isAvailable(), error: undefined }; }

  readonly id = 'elevenlabs';
  readonly name = 'ElevenLabs';
  readonly type = ProviderType.REMOTE;
  readonly capabilities = [MediaCapability.TEXT_TO_AUDIO];

  private config?: ProviderConfig;
  private apiClient?: ElevenLabsClient;
  private discoveredModels = new Map<string, ProviderModel>();
  private configurationPromise: Promise<void> | null = null;

  constructor() {
    this.configurationPromise = this.autoConfigureFromEnv().catch(() => {
      this.configurationPromise = null;
    });
  }

  get models(): ProviderModel[] {
    return Array.from(this.discoveredModels.values());
  }

  private async autoConfigureFromEnv(): Promise<void> {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (apiKey) {
      await this.configure({ apiKey });
    } else {
      throw new Error('No ELEVENLABS_API_KEY found in environment');
    }
  }

  async configure(config: ProviderConfig): Promise<void> {
    this.config = config;
    if (!config.apiKey) throw new Error('ElevenLabs API key is required');

    const clientConfig: ElevenLabsConfig = {
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      timeout: config.timeout
    };
    this.apiClient = new ElevenLabsClient(clientConfig);

    await this.discoverModels();
  }

  async isAvailable(): Promise<boolean> {
    if (!this.apiClient) return false;
    return this.apiClient.testConnection();
  }

  getModelsForCapability(capability: MediaCapability): ProviderModel[] {
    if (capability === MediaCapability.TEXT_TO_AUDIO) return this.models;
    return [];
  }

  async getModel(modelId: string): Promise<any> {
    await this.ensureConfigured();
    if (!this.apiClient) throw new Error('Provider not configured');
    return new ElevenLabsTextToAudioModel({ apiClient: this.apiClient, voiceId: modelId });
  }

  async getHealth() {
    const available = await this.isAvailable();
    return {
      status: available ? 'healthy' as const : 'unhealthy' as const,
      uptime: process.uptime(),
      activeJobs: 0,
      queuedJobs: 0
    };
  }

  private async discoverModels() {
    if (!this.apiClient) return;
    try {
      const voices = await this.apiClient.getVoices();
      for (const v of voices) {
        const model: ProviderModel = {
          id: v.voice_id,
          name: v.name,
          description: 'ElevenLabs voice',
          capabilities: [MediaCapability.TEXT_TO_AUDIO],
          parameters: { model_id: 'eleven_monolingual_v1' }
        };
        this.discoveredModels.set(v.voice_id, model);
      }
    } catch (err) {
      console.warn('ElevenLabs voice discovery failed:', (err as Error).message);
    }
  }

  private async ensureConfigured(): Promise<void> {
    if (this.apiClient) return;
    if (this.configurationPromise) await this.configurationPromise;
    if (!this.apiClient) throw new Error('ElevenLabs provider not configured');
  }
}

ProviderRegistry.getInstance().register('elevenlabs', ElevenLabsProvider);
