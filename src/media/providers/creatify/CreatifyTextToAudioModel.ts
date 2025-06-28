import { TextToAudioModel, TextToAudioOptions } from '../../models/abstracts/TextToAudioModel';
import { ModelMetadata } from '../../models/abstracts/Model';
import { TextRole, Audio, Text } from '../../assets/roles';
import { SmartAssetFactory } from '../../assets/SmartAssetFactory';
import { CreatifyClient } from './CreatifyClient';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import fetch from 'node-fetch';

export interface CreatifyTextToAudioOptions extends TextToAudioOptions {
  voiceId?: string;
}

export interface CreatifyTextToAudioConfig {
  client: CreatifyClient;
  defaultVoiceId?: string;
}

export class CreatifyTextToAudioModel extends TextToAudioModel {
  private client: CreatifyClient;
  private defaultVoiceId?: string;

  constructor(config: CreatifyTextToAudioConfig) {
    const metadata: ModelMetadata = {
      id: 'creatify-tts',
      name: 'Creatify Text To Speech',
      description: 'Creatify text-to-speech model',
      version: '1.0.0',
      provider: 'creatify',
      capabilities: ['text-to-audio'],
      inputTypes: ['text'],
      outputTypes: ['audio']
    };
    super(metadata);
    this.client = config.client;
    this.defaultVoiceId = config.defaultVoiceId;
  }

  async transform(input: TextRole | TextRole[] | string | string[], options?: CreatifyTextToAudioOptions): Promise<Audio> {
    const role = Array.isArray(input) ? input[0] : input;
    // Handle both TextRole and string inputs
    let text: Text;
    if (typeof role === 'string') {
      text = Text.fromString(role);
    } else {
      text = await role.asText();
    }
    if (!text.isValid()) throw new Error('Invalid text input');
    const voiceId = options?.voiceId || this.defaultVoiceId;
    if (!voiceId) throw new Error('voiceId is required');

    const result = await this.client.api.textToSpeech.createAndWaitForTextToSpeech({
      script: text.content,
      accent: voiceId
    });
    if (!result.output) {
      throw new Error('Creatify returned no audio URL');
    }

    const buffer = await this.downloadFile(result.output);
    const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'creatify-audio-'));
    const filePath = path.join(dir, 'speech.mp3');
    fs.writeFileSync(filePath, buffer);

    const asset = await SmartAssetFactory.load(filePath);
    const audio = await (asset as any).asAudio();
    if (audio.metadata) {
      Object.assign(audio.metadata, { url: result.output, provider: 'creatify' });
    }
    return audio;
  }

  private async downloadFile(url: string): Promise<Buffer> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to download ${url}: ${res.statusText}`);
    return Buffer.from(await res.arrayBuffer());
  }

  async isAvailable() {
    return this.client.testConnection();
  }

  getSupportedFormats(): string[] {
    return ['mp3'];
  }

  async getAvailableVoices(): Promise<string[]> {
    const voices = await this.client.api.avatar.getVoices();
    return voices.map(v => v.id).filter((id): id is string => id !== undefined);
  }

  supportsVoiceCloning(): boolean {
    return false;
  }

  getMaxTextLength(): number {
    return 2000;
  }
}
