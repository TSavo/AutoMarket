import {
  MediaProvider,
  ProviderType,
  MediaCapability,
  ProviderModel,
  ProviderConfig,
  GenerationRequest,
  GenerationResult
} from '../../types/provider';
import { TextToVideoProvider, TextToAudioProvider } from '../../capabilities';
import { TextToVideoModel } from '../../models/abstracts/TextToVideoModel';
import { TextToAudioModel } from '../../models/abstracts/TextToAudioModel';
import { CreatifyClient, CreatifyConfig } from './CreatifyClient';
import { CreatifyTextToVideoModel } from './CreatifyTextToVideoModel';
import { CreatifyTextToAudioModel } from './CreatifyTextToAudioModel';

export class CreatifyProvider implements MediaProvider, TextToVideoProvider, TextToAudioProvider {
  readonly id = 'creatify';
  readonly name = 'Creatify';
  readonly type = ProviderType.REMOTE;
  readonly capabilities = [MediaCapability.TEXT_TO_VIDEO, MediaCapability.TEXT_TO_AUDIO];

  private config?: ProviderConfig & { apiId?: string };
  private client?: CreatifyClient;

  get models(): ProviderModel[] {
    return [
      {
        id: 'avatar-lipsync',
        name: 'Creatify Avatar Lipsync',
        description: 'Generate avatar videos from text',
        capabilities: [MediaCapability.TEXT_TO_VIDEO],
        parameters: {
          text: { type: 'string' },
          avatarId: { type: 'string' },
          voiceId: { type: 'string' },
          aspect_ratio: { type: 'string', default: '16:9' }
        }
      },
      {
        id: 'creatify-tts',
        name: 'Creatify TTS',
        description: 'Text to speech via Creatify',
        capabilities: [MediaCapability.TEXT_TO_AUDIO],
        parameters: {
          text: { type: 'string' },
          voiceId: { type: 'string' }
        }
      }
    ];
  }

  async configure(config: ProviderConfig & { apiId?: string }): Promise<void> {
    this.config = config;
    const apiId = config.apiId || config.environment?.CREATIFY_API_ID || process.env.CREATIFY_API_ID;
    const apiKey = config.apiKey || process.env.CREATIFY_API_KEY;
    if (!apiId || !apiKey) {
      throw new Error('Creatify API credentials are required');
    }
    const clientConfig: CreatifyConfig = { apiId, apiKey, baseUrl: config.baseUrl };
    this.client = new CreatifyClient(clientConfig);
  }

  async isAvailable(): Promise<boolean> {
    return this.client ? this.client.testConnection() : false;
  }

  getModelsForCapability(capability: MediaCapability): ProviderModel[] {
    return this.models.filter(m => m.capabilities.includes(capability));
  }

  async createTextToVideoModel(modelId: string): Promise<TextToVideoModel> {
    if (!this.client) throw new Error('Provider not configured');
    if (modelId !== 'avatar-lipsync') throw new Error(`Unsupported model ${modelId}`);
    return new CreatifyTextToVideoModel({
      client: this.client,
      defaultVoiceId: process.env.CREATIFY_ACCENT
    });
  }
  getSupportedTextToVideoModels(): string[] { return ['avatar-lipsync']; }
  supportsTextToVideoModel(modelId: string): boolean { return modelId === 'avatar-lipsync'; }

  async createTextToAudioModel(modelId: string): Promise<TextToAudioModel> {
    if (!this.client) throw new Error('Provider not configured');
    if (modelId !== 'creatify-tts') throw new Error(`Unsupported model ${modelId}`);
    return new CreatifyTextToAudioModel({
      client: this.client,
      defaultVoiceId: process.env.CREATIFY_ACCENT
    });
  }
  getSupportedTextToAudioModels(): string[] { return ['creatify-tts']; }
  supportsTextToAudioModel(modelId: string): boolean { return modelId === 'creatify-tts'; }

  async startService(): Promise<boolean> { return true; }
  async stopService(): Promise<boolean> { return true; }
  async getServiceStatus() { return { running: true, healthy: await this.isAvailable(), error: undefined }; }

  async generate(request: GenerationRequest): Promise<GenerationResult> {
    throw new Error('CreatifyProvider should use Model instances for generation');
  }

  async getModel(modelId: string): Promise<any> {
    if (modelId === 'avatar-lipsync') return this.createTextToVideoModel(modelId);
    if (modelId === 'creatify-tts') return this.createTextToAudioModel(modelId);
    throw new Error(`Unknown model ${modelId}`);
  }

  async getHealth() {
    const healthy = await this.isAvailable();
    return { status: healthy ? 'healthy' as const : 'unhealthy' as const, uptime: process.uptime(), activeJobs: 0, queuedJobs: 0 };
  }

  constructor() {
    this.autoConfigureFromEnv().catch(() => {});
  }

  private async autoConfigureFromEnv(): Promise<void> {
    const apiId = process.env.CREATIFY_API_ID;
    const apiKey = process.env.CREATIFY_API_KEY;
    if (apiId && apiKey) {
      await this.configure({ apiId, apiKey });
    }
  }
}

import { ProviderRegistry } from '../../registry/ProviderRegistry';
ProviderRegistry.getInstance().register('creatify', CreatifyProvider);
export default CreatifyProvider;
