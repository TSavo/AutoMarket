/**
 * OpenAI Audio-to-Text Model
 *
 * Implements audio transcription and translation using OpenAI's API.
 */

import { AudioToTextModel, AudioToTextOptions } from '../../models/abstracts/AudioToTextModel';
import { ModelMetadata } from '../../models/abstracts/Model';
import { Text, AudioRole, Audio } from '../../assets/roles';
import { OpenAIAPIClient, OpenAITranscriptionRequest, OpenAITranslationRequest, OpenAITranscriptionResponse } from './OpenAIAPIClient';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { createGenerationPrompt } from '../../utils/GenerationPromptHelper';

export interface OpenAIAudioToTextOptions extends AudioToTextOptions {
  prompt?: string;
  response_format?: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt';
  timestampGranularities?: Array<'word' | 'segment'>;
  stream?: boolean;
}

export interface OpenAIAudioToTextConfig {
  apiClient: OpenAIAPIClient;
  modelId: string;
  metadata?: Partial<ModelMetadata>;
}

export class OpenAIAudioToTextModel extends AudioToTextModel {
  private apiClient: OpenAIAPIClient;
  private modelId: string;

  constructor(config: OpenAIAudioToTextConfig) {
    const metadata: ModelMetadata = {
      id: config.modelId,
      name: config.metadata?.name || `OpenAI ${config.modelId}`,
      description: config.metadata?.description || `OpenAI audio-to-text model: ${config.modelId}`,
      version: config.metadata?.version || '1.0.0',
      provider: 'openai',
      capabilities: ['audio-to-text', 'transcription', 'translation'],
      inputTypes: ['audio'],
      outputTypes: ['text'],
      ...config.metadata
    };

    super(metadata);
    this.apiClient = config.apiClient;
    this.modelId = config.modelId;
  }

  async transform(input: AudioRole | AudioRole[], options?: OpenAIAudioToTextOptions): Promise<Text> {
    const start = Date.now();
    const role = Array.isArray(input) ? input[0] : input;
    const audio = await role.asRole(Audio);
    const validation = this.validateAudio(audio);
    if (!validation.valid) {
      throw new Error(`Invalid audio input: ${validation.errors.join('; ')}`);
    }

    const tempDir = os.tmpdir();
    const filePath = path.join(tempDir, `openai_stt_${Date.now()}_${Math.random().toString(36).slice(2)}.${audio.format}`);
    fs.writeFileSync(filePath, audio.data);

    try {
      const reqBase: OpenAITranscriptionRequest = {
        file: filePath,
        model: this.modelId,
        language: options?.language,
        prompt: options?.prompt,
        response_format: options?.response_format,
        temperature: options?.temperature,
        timestamp_granularities: options?.timestampGranularities,
        stream: options?.stream
      };

      let response: OpenAITranscriptionResponse;
      if (options?.task === 'translate') {
        const req: OpenAITranslationRequest = {
          file: reqBase.file,
          model: reqBase.model,
          prompt: reqBase.prompt,
          response_format: reqBase.response_format,
          temperature: reqBase.temperature
        };
        response = await this.apiClient.createTranslation(req);
      } else {
        response = await this.apiClient.createTranscription(reqBase);
      }

      const processingTime = Date.now() - start;
      return Text.fromString(
        response.text,
        response.language || options?.language || 'auto',
        1.0,
        {
          processingTime,
          model: this.modelId,
          provider: 'openai',
          duration: response.duration,
          words: response.words,
          segments: response.segments,
          generation_prompt: createGenerationPrompt({
            input,
            options,
            modelId: this.modelId,
            modelName: this.modelId,
            provider: 'openai',
            transformationType: 'audio-to-text',
            processingTime
          })
        },
        audio.sourceAsset
      );
    } finally {
      try { fs.unlinkSync(filePath); } catch {}
    }
  }

  async isAvailable(): Promise<boolean> {
    try { return await this.apiClient.testConnection(); } catch { return false; }
  }

  getSupportedFormats(): string[] {
    return ['flac','mp3','mp4','mpeg','mpga','m4a','ogg','wav','webm'];
  }

  async getSupportedLanguages(): Promise<string[]> {
    return ['auto'];
  }

  getMaxAudioDuration(): number {
    return 600;
  }

  getMaxAudioSize(): number {
    return 25 * 1024 * 1024;
  }
}
