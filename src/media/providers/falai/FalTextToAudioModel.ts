/**
 * Fal.ai Text-to-Audio Model Implementation
 * 
 * Specific model implementation for fal.ai text-to-audio models.
 * Implements TextToAudioModel interface and uses fal.ai API.
 */

import { ModelMetadata } from '../../models/abstracts/Model';
import { TextToAudioModel, TextToAudioOptions } from '../../models/abstracts/TextToAudioModel';
import { Audio, TextRole, AudioRole, Text } from '../../assets/roles';
import { FalAiClient, FalModelMetadata } from './FalAiClient';
import { SmartAssetFactory } from '../../assets/SmartAssetFactory';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { createGenerationPrompt, extractInputContent } from '../../utils/GenerationPromptHelper';

export interface FalModelConfig {
  client: FalAiClient;
  modelMetadata: FalModelMetadata;
  falAiClient: FalAiClient;
}

/**
 * FalTextToAudioModel - Implements TextToAudioModel for fal.ai models like XTTS-v2, Bark, etc.
 */
export class FalTextToAudioModel extends TextToAudioModel {
  private client: FalAiClient;
  private modelMetadata: FalModelMetadata;
  private falAiClient: FalAiClient;

  constructor(config: FalModelConfig) {
    // Create metadata for TextToAudioModel
    const metadata: ModelMetadata = {
      id: config.modelMetadata.id,
      name: config.modelMetadata.name || config.modelMetadata.id,
      description: config.modelMetadata.description || '',
      version: '1.0.0',
      provider: 'fal-ai',
      capabilities: ['text-to-audio', 'text-to-speech'],
      inputTypes: ['text'],
      outputTypes: ['audio', 'speech']
    };

    super(metadata);

    this.client = config.client;
    this.modelMetadata = config.modelMetadata;
    this.falAiClient = config.falAiClient;
  }
  /**
   * Transform text to audio using fal.ai models
   */
  async transform(
    inputOrText: TextRole | TextRole[] | string | string[],
    options?: TextToAudioOptions
  ): Promise<Audio> {
    const startTime = Date.now();

    // Handle array input - get first element for single audio generation
    const inputRole = Array.isArray(inputOrText) ? inputOrText[0] : inputOrText;

    // Extract voice cloning audio from options
    let voiceAudio: AudioRole | undefined;
    if (options?.voiceToClone) {
      voiceAudio = options.voiceToClone;
    }

    // Get text from the TextRole
    // Handle both TextRole and string inputs
    let text: Text;
    if (typeof inputRole === 'string') {
      text = Text.fromString(inputRole);
    } else {
      text = await inputRole.asText();
    }
    if (!text.isValid()) {
      throw new Error('Invalid text data provided');
    }

    const textContent = text.content;

    try {
      // Handle voice cloning if voice audio is provided
      let voiceUrl: string | undefined;
      if (voiceAudio) {
        const voice = await voiceAudio.asAudio();
        console.log(`[FalTextToAudio] Uploading voice sample to fal.ai...`);
        const voiceUploadResult = await this.falAiClient.uploadAsset(voice.data, 'voice_sample.wav');
        voiceUrl = voiceUploadResult.url;
        console.log(`[FalTextToAudio] Voice sample uploaded: ${voiceUrl}`);
      }

      // Prepare request payload for fal.ai audio generation
      const falInput = this.prepareFalInput(textContent, voiceUrl, options);

      // Make request to fal.ai audio generation endpoint
      console.log(`[FalTextToAudio] Generating audio with model: ${this.modelMetadata.id}`);
      console.log(`[FalTextToAudio] Input:`, falInput);
      
      const result = await this.falAiClient.invoke({
        model: this.modelMetadata.id,
        input: falInput,
        logs: true
      });

      // Calculate processing time
      const processingTime = Date.now() - startTime;

      console.log(`[FalTextToAudio] Generation completed:`, result);

      // Handle response and download audio
      if (result.data) {
        let audioUrl: string;
        
        if (Array.isArray(result.data.audios)) {
          // Multiple audio files - take first one
          audioUrl = result.data.audios[0].url;
        } else if (result.data.audio) {
          // Single audio object
          audioUrl = typeof result.data.audio === 'string' 
            ? result.data.audio 
            : result.data.audio.url;
        } else if (typeof result.data === 'string') {
          // Direct URL
          audioUrl = result.data;
        } else {
          throw new Error('Unexpected output format from fal.ai');
        }

        // Download audio following pattern from other models
        console.log(`[FalTextToAudio] Downloading audio from: ${audioUrl}`);
        const audioBuffer = await this.downloadAudio(audioUrl);

        // Save to temporary file
        const tempDir = os.tmpdir();
        const tempFileName = `fal-audio-${Date.now()}.wav`;
        const localPath = path.join(tempDir, tempFileName);
        fs.writeFileSync(localPath, audioBuffer);
        
        console.log(`[FalTextToAudio] Audio saved to: ${localPath}`);

        // Use SmartAssetFactory to create Asset with automatic metadata extraction
        console.log(`[FalTextToAudio] Loading audio asset with metadata extraction...`);        const smartAsset = await SmartAssetFactory.load(localPath);
        const audio = await (smartAsset as any).asAudio();
          // Add our custom metadata to the audio
        if (audio.metadata) {
          Object.assign(audio.metadata, {
            url: audioUrl,
            localPath: localPath,
            fileSize: audioBuffer.length,
            processingTime,
            model: this.modelMetadata.id,
            provider: 'fal-ai',
            text: textContent,
            voice: options?.voice,
            speed: options?.speed,
            language: options?.language,
            voiceCloning: !!voiceAudio,
            generation_prompt: createGenerationPrompt({
              input: inputOrText, // RAW input object to preserve generation chain
              options: options,
              modelId: this.modelMetadata.id,
              modelName: this.modelMetadata.name,
              provider: 'fal-ai',
              transformationType: 'text-to-audio',
              modelMetadata: {
                falModelParameters: this.modelMetadata.parameters,
                modelVersion: this.modelMetadata.id
              },
              requestId: result.requestId
            })
          });
        }
        
        console.log(`[FalTextToAudio] Audio metadata: duration=${audio.metadata?.duration}s, size=${(audioBuffer.length / 1024).toFixed(1)}KB`);
        
        return audio;

      } else {
        throw new Error('No audio data in response from fal.ai');
      }

    } catch (error) {
      throw new Error(`fal.ai audio generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Prepare input for fal.ai audio generation
   */
  private prepareFalInput(text: string, voiceUrl?: string, options?: TextToAudioOptions): any {
    const input: any = {
      text: text
    };

    // Add model-specific parameters based on the model's parameter schema
    const params = this.modelMetadata.parameters || {};

    // Voice parameters
    if (options?.voice && params.voice) {
      input.voice = options.voice;
    }

    if (voiceUrl && params.voice_sample) {
      input.voice_sample = voiceUrl;
    }

    if (options?.language && params.language) {
      input.language = options.language;
    }

    if (options?.speed && params.speed) {
      input.speed = options.speed;
    }

    if (options?.pitch && params.pitch) {
      input.pitch = options.pitch;
    }

    if (options?.volume && params.volume) {
      input.volume = options.volume;
    }

    if (options?.format && params.format) {
      input.format = options.format;
    }

    if (options?.quality && params.quality) {
      input.quality = options.quality;
    }

    // XTTS-v2 specific parameters
    if (this.modelMetadata.id.includes('xtts')) {
      input.enable_text_splitting = true; // Better handling of long text
      if (params.temperature) {
        input.temperature = 0.7; // Good balance for voice synthesis
      }
    }

    // Bark specific parameters
    if (this.modelMetadata.id.includes('bark')) {
      if (params.use_small_models) {
        input.use_small_models = false; // Use full models for better quality
      }
    }

    return input;
  }

  /**
   * Download audio from URL
   */
  private async downloadAudio(url: string, timeout: number = 600000): Promise<Buffer> {
    const https = require('https');
    const http = require('http');
    
    return new Promise((resolve, reject) => {
      const client = url.startsWith('https:') ? https : http;
      
      const request = client.get(url, (response: any) => {
        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
          return;
        }
        
        const chunks: Buffer[] = [];
        let totalSize = 0;
        const contentLength = parseInt(response.headers['content-length'] || '0');
        
        response.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
          totalSize += chunk.length;
          
          if (contentLength > 0) {
            const progress = (totalSize / contentLength * 100).toFixed(1);
            console.log(`[FalTextToAudio] Download progress: ${progress}%`);
          }
        });
        
        response.on('end', () => {
          const buffer = Buffer.concat(chunks);
          console.log(`[FalTextToAudio] Download complete: ${(buffer.length / 1024).toFixed(2)} KB`);
          resolve(buffer);
        });
        
        response.on('error', reject);
      });
      
      request.on('error', reject);
      request.setTimeout(timeout, () => {
        request.destroy();
        reject(new Error(`Download timeout after ${timeout}ms`));
      });
    });
  }

  /**
   * Check if the model is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      return await this.client.testConnection();
    } catch {
      return false;
    }
  }

  /**
   * Get supported audio formats
   */
  getSupportedFormats(): string[] {
    // fal.ai typically supports these formats
    return ['wav', 'mp3', 'flac'];
  }

  /**
   * Get model display name
   */
  getDisplayName(): string {
    return this.modelMetadata.name || this.modelMetadata.id;
  }

  /**
   * Get model-specific parameters
   */
  getSupportedParameters(): string[] {
    return Object.keys(this.modelMetadata.parameters || {});
  }

  /**
   * Get available voices for this model
   */
  async getAvailableVoices(): Promise<string[]> {
    // Model-specific voice lists
    if (this.modelMetadata.id.includes('xtts')) {
      return ['male_1', 'male_2', 'female_1', 'female_2', 'custom']; // XTTS supports custom voices
    } else if (this.modelMetadata.id.includes('bark')) {
      return ['speaker_0', 'speaker_1', 'speaker_2', 'speaker_3', 'speaker_4', 'speaker_5']; // Bark speakers
    }
    return ['default'];
  }

  /**
   * Check if this model supports voice cloning
   */
  supportsVoiceCloning(): boolean {
    return this.modelMetadata.id.includes('xtts'); // XTTS supports voice cloning
  }

  /**
   * Get maximum text length for this model
   */
  getMaxTextLength(): number {
    if (this.modelMetadata.id.includes('xtts')) {
      return 5000; // XTTS can handle longer text
    } else if (this.modelMetadata.id.includes('bark')) {
      return 500; // Bark is better with shorter text
    }
    return 1000; // Default limit
  }
}

export default FalTextToAudioModel;
