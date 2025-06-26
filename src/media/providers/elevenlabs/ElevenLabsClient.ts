import axios, { AxiosInstance } from 'axios';

export interface ElevenLabsConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
}

export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  labels?: Record<string, string>;
}

export class ElevenLabsClient {
  private client: AxiosInstance;

  constructor(private config: ElevenLabsConfig) {
    this.client = axios.create({
      baseURL: config.baseUrl || 'https://api.elevenlabs.io/v1',
      timeout: config.timeout || 60000,
      headers: {
        'xi-api-key': config.apiKey,
        'Content-Type': 'application/json'
      }
    });
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.client.get('/voices');
      return true;
    } catch {
      return false;
    }
  }

  async getVoices(): Promise<ElevenLabsVoice[]> {
    const res = await this.client.get('/voices');
    return res.data.voices as ElevenLabsVoice[];
  }

  async generateSpeech(voiceId: string, text: string, options?: { model_id?: string; voice_settings?: Record<string, any> }): Promise<Buffer> {
    const body: any = { text };
    if (options?.model_id) body.model_id = options.model_id;
    if (options?.voice_settings) body.voice_settings = options.voice_settings;
    const res = await this.client.post(`/text-to-speech/${voiceId}/stream`, body, { responseType: 'arraybuffer' });
    return Buffer.from(res.data);
  }
}
