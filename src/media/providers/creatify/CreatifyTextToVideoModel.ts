import { TextToVideoModel, TextToVideoOptions } from '../../models/abstracts/TextToVideoModel';
import { ModelMetadata } from '../../models/abstracts/Model';
import { TextRole, Video, Text } from '../../assets/roles';
import { SmartAssetFactory } from '../../assets/SmartAssetFactory';
import { CreatifyClient } from './CreatifyClient';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import fetch from 'node-fetch';

export interface CreatifyTextToVideoOptions extends TextToVideoOptions {
  avatarId?: string;
  voiceId?: string;
}

export interface CreatifyTextToVideoConfig {
  client: CreatifyClient;
  defaultAvatarId?: string;
  defaultVoiceId?: string;
}

export class CreatifyTextToVideoModel extends TextToVideoModel {
  private client: CreatifyClient;
  private defaultAvatarId?: string;
  private defaultVoiceId?: string;

  constructor(config: CreatifyTextToVideoConfig) {
    const metadata: ModelMetadata = {
      id: 'avatar-lipsync',
      name: 'Creatify Avatar Lipsync',
      description: 'Generate avatar videos using Creatify',
      version: '1.0.0',
      provider: 'creatify',
      capabilities: ['text-to-video'],
      inputTypes: ['text'],
      outputTypes: ['video']
    };
    super(metadata);
    this.client = config.client;
    this.defaultAvatarId = config.defaultAvatarId;
    this.defaultVoiceId = config.defaultVoiceId;
  }

  async transform(input: TextRole | TextRole[] | string | string[], options?: CreatifyTextToVideoOptions): Promise<Video> {
    // Handle both array and single input
    const inputRole = Array.isArray(input) ? input[0] : input;
    
    // Handle both TextRole and string inputs
    let text: Text;
    if (typeof inputRole === 'string') {
      text = Text.fromString(inputRole);
    } else {
      text = await inputRole.asRole(Text);
    }
    
    if (!text.isValid()) {
      throw new Error('Invalid text input');
    }

    const avatarId = options?.avatarId || this.defaultAvatarId;
    const voiceId = options?.voiceId || this.defaultVoiceId;
    if (!avatarId || !voiceId) {
      throw new Error('avatarId and voiceId are required');
    }

    const result = await this.client.api.avatar.createAndWaitForLipsync({
      text: text.content,
      creator: avatarId,
      aspect_ratio: (options?.aspectRatio as any) || '16:9',
      voice_id: voiceId
    });

    if (!result.output) {
      throw new Error('Creatify returned no video URL');
    }

    const buffer = await this.downloadFile(result.output);
    const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'creatify-video-'));
    const filePath = path.join(dir, 'video.mp4');
    fs.writeFileSync(filePath, buffer);

    const asset = await SmartAssetFactory.load(filePath);
    const video = await (asset as any).asRole(Video);
    if (video.metadata) {
      Object.assign(video.metadata, {
        url: result.output,
        provider: 'creatify'
      });
    }
    return video;
  }

  private async downloadFile(url: string): Promise<Buffer> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to download ${url}: ${res.statusText}`);
    return Buffer.from(await res.arrayBuffer());
  }

  async isAvailable(): Promise<boolean> {
    return this.client.testConnection();
  }

  getSupportedFormats(): string[] {
    return ['mp4'];
  }

  getSupportedAspectRatios(): string[] {
    return ['16:9', '9:16', '1:1'];
  }

  getSupportedDurationRange() {
    return { min: 1, max: 120 };
  }

  getMaxResolution() {
    return { width: 1920, height: 1080 };
  }

  estimateProcessingTime(prompt: string, options?: CreatifyTextToVideoOptions): number {
    // Placeholder for estimation logic
    return 30; // seconds
  }

  supportsFeature(feature: string): boolean {
    // Placeholder for feature support
    return false;
  }
}
