import { TextToAudioModel, TextToAudioOptions } from '../../models/abstracts/TextToAudioModel';
import { ModelMetadata } from '../../models/abstracts/Model';
import { Audio, TextRole, Text } from '../../assets/roles';
import { ElevenLabsClient } from './ElevenLabsClient';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { createGenerationPrompt, extractInputContent } from '../../utils/GenerationPromptHelper';

export interface ElevenLabsTTSOptions extends TextToAudioOptions {
  voice?: string;
  model_id?: string;
  voice_settings?: Record<string, any>;
}

export interface ElevenLabsTTSConfig {
  apiClient: ElevenLabsClient;
  voiceId: string;
  modelId?: string;
  metadata?: Partial<ModelMetadata>;
}

export class ElevenLabsTextToAudioModel extends TextToAudioModel {
  private apiClient: ElevenLabsClient;
  private voiceId: string;
  private modelId?: string;

  constructor(config: ElevenLabsTTSConfig) {
    const metadata: ModelMetadata = {
      id: config.voiceId,
      name: config.metadata?.name || `ElevenLabs Voice ${config.voiceId}`,
      description: config.metadata?.description || 'ElevenLabs text-to-speech voice',
      version: config.metadata?.version || '1.0.0',
      provider: 'elevenlabs',
      capabilities: ['text-to-audio', 'text-to-speech'],
      inputTypes: ['text'],
      outputTypes: ['audio'],
      ...config.metadata
    };
    super(metadata);
    this.apiClient = config.apiClient;
    this.voiceId = config.voiceId;
    this.modelId = config.modelId;
  }

  async transform(input: TextRole | TextRole[] | string | string[], options?: ElevenLabsTTSOptions): Promise<Audio> {
    const role = Array.isArray(input) ? input[0] : input;
    
    // Handle both TextRole and string inputs
    let text: Text;
    if (typeof role === 'string') {
      text = Text.fromString(role);
    } else {
      text = await role.asRole(Text);
    }
    
    if (!text.isValid()) throw new Error('Invalid text');

    const voiceId = options?.voice || this.voiceId;
    const model_id = options?.model_id || this.modelId;

    const audioBuffer = await this.apiClient.generateSpeech(voiceId, text.content, { model_id, voice_settings: options?.voice_settings });

    const tempDir = os.tmpdir();
    const fileName = `elevenlabs_${Date.now()}_${Math.random().toString(36).substring(2)}.mp3`;
    const filePath = path.join(tempDir, fileName);
    fs.writeFileSync(filePath, audioBuffer);

    const result = new Audio(audioBuffer, role, {
      format: 'mp3',
      generation_prompt: createGenerationPrompt({
        input: text.content,
        options,
        modelId: voiceId,
        modelName: voiceId,
        provider: 'elevenlabs',
        transformationType: 'text-to-audio'
      })
    });
    return result;
  }

  async isAvailable(): Promise<boolean> {
    return this.apiClient.testConnection();
  }

  getSupportedFormats(): string[] {
    return ['mp3'];
  }

  async getAvailableVoices(): Promise<string[]> {
    const voices = await this.apiClient.getVoices();
    return voices.map(v => v.name);
  }

  supportsVoiceCloning(): boolean {
    return false;
  }

  getMaxTextLength(): number {
    return 10000;
  }
}
