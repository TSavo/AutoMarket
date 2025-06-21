/**
 * Together AI Text-to-Audio Model
 * 
 * Concrete implementation of TextToAudioModel for Together.ai's audio generation API.
 * Supports Cartesia Sonic models for text-to-speech and audio generation.
 */

import { TextToAudioModel, TextToAudioOptions } from '../../models/abstracts/TextToAudioModel';
import { ModelMetadata } from '../../models/abstracts/Model';
import { Audio, TextRole, AudioRole } from '../../assets/roles';
import { TogetherAPIClient, TogetherModel } from './TogetherAPIClient';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface TogetherTextToAudioOptions extends TextToAudioOptions {
  model?: string;
  voice?: string;
  speed?: number;
  output_format?: 'mp3' | 'wav' | 'pcm';
  sample_rate?: number;
  language?: string;
}

export interface TogetherTextToAudioConfig {
  apiClient: TogetherAPIClient;
  modelId: string;
  modelMetadata?: TogetherModel;
  metadata?: Partial<ModelMetadata>;
}

export class TogetherTextToAudioModel extends TextToAudioModel {
  private apiClient: TogetherAPIClient;
  private modelId: string;
  private modelMetadata?: TogetherModel;

  constructor(config: TogetherTextToAudioConfig) {
    const metadata: ModelMetadata = {
      id: config.modelId,
      name: config.metadata?.name || `Together ${config.modelId}`,
      description: config.metadata?.description || `Together AI text-to-audio model: ${config.modelId}`,
      version: config.metadata?.version || '1.0.0',
      provider: 'together',
      capabilities: ['text-to-audio', 'text-to-speech'],
      inputTypes: ['text'],
      outputTypes: ['audio', 'speech'],
      ...config.metadata
    };

    super(metadata);
    this.apiClient = config.apiClient;
    this.modelId = config.modelId;
    this.modelMetadata = config.modelMetadata;
  }
  /**
   * Transform text to audio using Together AI (Cartesia Sonic) - basic TTS
   */
  async transform(input: TextRole, options?: TogetherTextToAudioOptions): Promise<Audio>;

  /**
   * Transform text to audio with voice cloning (not supported by Cartesia Sonic)
   */
  async transform(text: TextRole, voiceAudio: AudioRole, options?: TogetherTextToAudioOptions): Promise<Audio>;

  /**
   * Implementation of transform method
   */
  async transform(
    inputOrText: TextRole,
    optionsOrVoiceAudio?: TogetherTextToAudioOptions | AudioRole,
    voiceOptions?: TogetherTextToAudioOptions
  ): Promise<Audio> {
    const startTime = Date.now();

    // Check if this is voice cloning call (second signature)
    if (optionsOrVoiceAudio && typeof optionsOrVoiceAudio === 'object' && 'asAudio' in optionsOrVoiceAudio) {
      throw new Error('Voice cloning is not supported by Cartesia Sonic models. Use basic text-to-speech instead.');
    }

    // Handle basic text-to-speech (first signature)
    const options = optionsOrVoiceAudio as TogetherTextToAudioOptions | undefined;

    // Get text from the TextRole
    const text = await inputOrText.asText();
    if (!text.isValid()) {
      throw new Error('Invalid text data provided');
    }
    const textContent = text.content;

    try {
      // Prepare request payload for Together AI audio generation
      const requestPayload = this.prepareTogetherAudioInput(textContent, options);

      // Make request to Together AI audio generation endpoint
      console.log(`[TogetherTextToAudio] Making audio request with payload:`, JSON.stringify(requestPayload, null, 2));
      const response = await this.makeAudioRequest(requestPayload);

      // Calculate processing time
      const processingTime = Date.now() - startTime;

      // Handle response and download audio
      if (!response.data || response.data.length === 0) {
        throw new Error('No audio data in response from Together AI');
      }

      const audioResult = response.data[0];
      let audioUrl: string;
      
      if (audioResult.url) {
        audioUrl = audioResult.url;
      } else if (audioResult.b64_json) {
        // For base64, we'd need to create a data URL or save to temp file
        throw new Error('Base64 audio format not yet supported - use URL format');
      } else {
        throw new Error('No audio URL received from Together AI');
      }

      // Download audio following Replicate pattern
      console.log(`[TogetherTextToAudio] Downloading audio from: ${audioUrl}`);
      const audioBuffer = await this.downloadAudio(audioUrl);
      
      // Save to temporary file
      const tempDir = os.tmpdir();
      const tempFileName = `together-audio-${Date.now()}.mp3`;
      const localPath = path.join(tempDir, tempFileName);
      fs.writeFileSync(localPath, audioBuffer);
      
      console.log(`[TogetherTextToAudio] Audio saved to: ${localPath}`);
        // Use SmartAssetFactory to create Asset with automatic metadata extraction
      console.log(`[TogetherTextToAudio] Loading audio asset with metadata extraction...`);
      const { AssetLoader } = await import('../../assets/SmartAssetFactory');
      const smartAsset = AssetLoader.load(localPath);
      const audio = await (smartAsset as any).asAudio();
      
      // Add our custom metadata to the audio
      if (audio.metadata) {
        Object.assign(audio.metadata, {
          url: audioUrl,
          localPath: localPath,
          fileSize: audioBuffer.length,
          processingTime,
          model: this.modelId,
          provider: 'together',
          text: textContent,
          voice: options?.voice,
          speed: options?.speed,
          language: options?.language
        });
      }
      
      console.log(`[TogetherTextToAudio] Audio metadata: duration=${audio.metadata?.duration}s, size=${(audioBuffer.length / 1024).toFixed(1)}KB`);
      
      return audio;

    } catch (error) {
      throw new Error(`Together AI audio generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Prepare input for Together AI audio generation
   */
  private prepareTogetherAudioInput(text: string, options?: TogetherTextToAudioOptions): any {
    const input: any = {
      model: this.modelId,
      input: text,
      voice: options?.voice || 'default',
      output_format: options?.output_format || 'mp3'
    };

    // Add optional parameters
    if (options?.speed !== undefined) {
      input.speed = options.speed;
    }
    
    if (options?.sample_rate !== undefined) {
      input.sample_rate = options.sample_rate;
    }
    
    if (options?.language !== undefined) {
      input.language = options.language;
    }

    // Remove undefined values
    Object.keys(input).forEach(key => {
      if (input[key] === undefined) {
        delete input[key];
      }
    });

    return input;
  }

  /**
   * Make audio generation request to Together AI
   */
  private async makeAudioRequest(payload: any): Promise<any> {
    try {
      // Try the Together AI audio generation endpoint
      const response = await (this.apiClient as any).client.post('/audio/speech', payload);
      
      console.log(`[TogetherTextToAudio] Response status: ${response.status}`);
      console.log(`[TogetherTextToAudio] Response data:`, JSON.stringify(response.data, null, 2).substring(0, 500));
      
      return response.data;
    } catch (error) {
      console.error(`[TogetherTextToAudio] Audio request failed:`, error);
      
      if (error.response) {
        console.error(`[TogetherTextToAudio] Error response:`, error.response.data);
        const errorMessage = error.response.data?.error?.message || error.response.statusText;
        throw new Error(`Together AI API error (${error.response.status}): ${errorMessage}`);
      } else if (error.request) {
        console.error(`[TogetherTextToAudio] No response received:`, error.request);
        throw new Error('Together AI API request failed: No response received');
      } else {
        console.error(`[TogetherTextToAudio] Request setup error:`, error.message);
        throw new Error(`Together AI API request failed: ${error.message}`);
      }
    }
  }

  /**
   * Download audio from URL following Replicate pattern
   */
  private async downloadAudio(url: string, timeout: number = 60000): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const request = require('https').get(url, (response: any) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Download failed with status ${response.statusCode}`));
          return;
        }
        
        const chunks: Buffer[] = [];
        
        response.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });
        
        response.on('end', () => {
          const buffer = Buffer.concat(chunks);
          console.log(`[TogetherTextToAudio] Download complete: ${(buffer.length / 1024).toFixed(2)} KB`);
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
      return await this.apiClient.testConnection();
    } catch (error) {
      console.warn(`Together AI audio model ${this.modelId} availability check failed:`, error);
      return false;
    }
  }

  /**
   * Get model-specific information
   */
  getModelInfo(): { id: string; provider: string; capabilities: string[] } {
    return {
      id: this.modelId,
      provider: 'together',
      capabilities: ['text-to-audio', 'text-to-speech', 'audio-generation']
    };
  }

  /**
   * Get supported parameters for this model
   */
  getSupportedParameters(): string[] {
    return [
      'voice',
      'speed',
      'output_format',
      'sample_rate',
      'language'
    ];
  }
  /**
   * Get available voices for this model
   */
  async getAvailableVoices(): Promise<string[]> {
    // Cartesia Sonic models typically support various voices
    if (this.modelId.includes('sonic')) {
      return [
        'default',
        'male',
        'female',
        'young',
        'old',
        'calm',
        'energetic'
      ];
    }
    
    return ['default'];
  }

  /**
   * Check if this is a free model
   */
  async isFreeModel(): Promise<boolean> {
    try {
      const modelInfo = await this.apiClient.getModelInfo(this.modelId);
      if (modelInfo?.pricing) {
        return modelInfo.pricing.input === 0 && modelInfo.pricing.output === 0;
      }
      // Cartesia Sonic models cost $0.065 per 1K characters (very affordable, not free)
      return false;
    } catch (error) {
      console.warn(`Could not determine if model ${this.modelId} is free:`, error);
      return false;
    }
  }
  /**
   * Get estimated cost for text generation
   */
  getEstimatedCost(text: string): { characters: number; estimatedCost: number; currency: string } {
    const characters = text.length;
    const costPer1KChars = 0.065; // $0.065 per 1K characters
    const estimatedCost = (characters / 1000) * costPer1KChars;

    return {
      characters,
      estimatedCost: Math.round(estimatedCost * 1000) / 1000, // Round to 3 decimal places
      currency: 'USD'
    };
  }

  /**
   * Get supported audio formats
   */
  getSupportedFormats(): string[] {
    return ['mp3', 'wav'];
  }

  /**
   * Check if this model supports voice cloning
   */
  supportsVoiceCloning(): boolean {
    return false; // Cartesia Sonic models don't support voice cloning
  }

  /**
   * Get maximum text length for this model
   */
  getMaxTextLength(): number {
    return 5000; // Typical limit for Cartesia models
  }
}
