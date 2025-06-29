/**
 * OpenAI Text-to-Audio Model
 * 
 * Concrete implementation of TextToAudioModel for OpenAI's TTS models.
 * Supports TTS-1 and TTS-1-HD for high-quality text-to-speech generation.
 */

import { TextToAudioModel, TextToAudioOptions } from '../../models/abstracts/TextToAudioModel';
import { ModelMetadata } from '../../models/abstracts/Model';
import { Audio, TextRole, AudioRole, Text } from '../../assets/roles';
import { OpenAIAPIClient } from './OpenAIAPIClient';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { createGenerationPrompt, extractInputContent } from '../../utils/GenerationPromptHelper';

export interface OpenAITextToAudioOptions extends TextToAudioOptions {
  model?: string;
  voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  response_format?: 'mp3' | 'opus' | 'aac' | 'flac' | 'wav' | 'pcm';
  speed?: number;
}

export interface OpenAITextToAudioConfig {
  apiClient: OpenAIAPIClient;
  modelId: string;
  metadata?: Partial<ModelMetadata>;
}

export class OpenAITextToAudioModel extends TextToAudioModel {
  private apiClient: OpenAIAPIClient;
  private modelId: string;

  constructor(config: OpenAITextToAudioConfig) {
    const metadata: ModelMetadata = {
      id: config.modelId,
      name: config.metadata?.name || `OpenAI ${config.modelId}`,
      description: config.metadata?.description || `OpenAI text-to-audio model: ${config.modelId}`,
      version: config.metadata?.version || '1.0.0',
      provider: 'openai',
      capabilities: ['text-to-audio', 'text-to-speech', 'audio-generation'],
      inputTypes: ['text'],
      outputTypes: ['audio', 'speech'],
      ...config.metadata
    };

    super(metadata);
    this.apiClient = config.apiClient;
    this.modelId = config.modelId;
  }

  /**
   * Transform text to audio using OpenAI TTS
   */
  async transform(
    inputOrText: TextRole | TextRole[] | string | string[],
    options?: OpenAITextToAudioOptions
  ): Promise<Audio> {
    const startTime = Date.now();

    // OpenAI TTS doesn't support voice cloning
    if (options?.voiceToClone) {
      throw new Error('Voice cloning is not supported by OpenAI TTS models. Use basic text-to-speech instead.');
    }

    let textRole: TextRole;
    if (Array.isArray(inputOrText)) {
      textRole = typeof inputOrText[0] === 'string' ? Text.fromString(inputOrText[0]) : inputOrText[0];
    } else {
      textRole = typeof inputOrText === 'string' ? Text.fromString(inputOrText) : inputOrText;
    }

    // Get text from the TextRole
    const text = await textRole.asRole(Text);
    if (!text.isValid()) {
      throw new Error('Invalid text data provided');
    }

    const textContent = text.content;

    // Validate text length
    if (textContent.length > this.getMaxTextLength()) {
      throw new Error(`Text length (${textContent.length}) exceeds maximum allowed length (${this.getMaxTextLength()})`);
    }

    try {
      console.log(`[OpenAITextToAudio] Generating audio with model: ${this.modelId}`);
      console.log(`[OpenAITextToAudio] Text: "${textContent.substring(0, 100)}${textContent.length > 100 ? '...' : ''}"`);
      console.log(`[OpenAITextToAudio] Voice: ${options?.voice || 'alloy'}`);

      // Prepare request for OpenAI TTS API
      const ttsRequest = {
        model: this.modelId,
        input: textContent,
        voice: options?.voice || 'alloy' as const,
        response_format: options?.response_format || 'mp3' as const,
        speed: options?.speed || 1.0
      };

      // Generate audio using OpenAI API
      const audioBuffer = await this.apiClient.generateSpeech(ttsRequest);

      // Save to temporary file
      const tempDir = os.tmpdir();
      const fileExtension = options?.response_format || 'mp3';
      const fileName = `openai_tts_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExtension}`;
      const tempFilePath = path.join(tempDir, fileName);

      fs.writeFileSync(tempFilePath, audioBuffer);

      // Calculate processing time
      const processingTime = Date.now() - startTime;

      console.log(`[OpenAITextToAudio] Audio generated successfully: ${tempFilePath}`);

      // Create Audio result using the existing audioBuffer
      const result = new Audio(
        audioBuffer,
        text.sourceAsset, // Preserve source Asset reference
        {
          format: fileExtension as any,
          processingTime,
          model: this.modelId,
          provider: 'openai',
          voice: options?.voice || 'alloy',
          speed: options?.speed || 1.0,
          textLength: textContent.length,
          estimatedDuration: this.estimateAudioDuration(textContent, options?.speed || 1.0),
          generation_prompt: createGenerationPrompt({
            input: inputOrText, // RAW input object to preserve generation chain
            options: options,
            modelId: this.modelId,
            modelName: this.modelId,
            provider: 'openai',
            transformationType: 'text-to-audio',
            processingTime
          })
        }
      );

      return result;

    } catch (error) {
      throw new Error(`OpenAI TTS generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if the model is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      return await this.apiClient.testConnection();
    } catch (error) {
      console.warn(`OpenAI TTS model ${this.modelId} availability check failed:`, error);
      return false;
    }
  }

  /**
   * Get supported audio output formats
   */
  getSupportedFormats(): string[] {
    return ['mp3', 'opus', 'aac', 'flac', 'wav', 'pcm'];
  }

  /**
   * Get available voice options
   */
  async getAvailableVoices(): Promise<string[]> {
    return ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
  }

  /**
   * Check if voice cloning is supported
   */
  supportsVoiceCloning(): boolean {
    return false; // OpenAI TTS doesn't support voice cloning
  }

  /**
   * Get maximum text length
   */
  getMaxTextLength(): number {
    return 4096; // OpenAI TTS limit
  }

  /**
   * Get model-specific information
   */
  getModelInfo(): { id: string; provider: string; capabilities: string[] } {
    return {
      id: this.modelId,
      provider: 'openai',
      capabilities: ['text-to-audio', 'text-to-speech', 'audio-generation']
    };
  }

  /**
   * Get supported parameters for this model
   */
  getSupportedParameters(): string[] {
    return [
      'voice',
      'response_format',
      'speed'
    ];
  }

  /**
   * Get supported speed range
   */
  getSupportedSpeedRange(): { min: number; max: number; default: number } {
    return {
      min: 0.25,
      max: 4.0,
      default: 1.0
    };
  }

  /**
   * Estimate audio duration based on text length and speed
   */
  estimateAudioDuration(text: string, speed: number = 1.0): number {
    // Rough estimation: ~150 words per minute at normal speed
    const wordsPerMinute = 150 * speed;
    const wordCount = text.split(/\s+/).length;
    const durationMinutes = wordCount / wordsPerMinute;
    return Math.ceil(durationMinutes * 60); // Return duration in seconds
  }

  /**
   * Get cost per character for this model
   */
  getCostPerCharacter(): number {
    const costs: Record<string, number> = {
      'tts-1': 0.000015, // $0.015 per 1K characters
      'tts-1-hd': 0.00003 // $0.030 per 1K characters
    };

    return costs[this.modelId] || 0.000015; // Default to TTS-1 pricing
  }

  /**
   * Estimate cost for text-to-speech generation
   */
  estimateCost(text: string): number {
    const characterCount = text.length;
    const costPerChar = this.getCostPerCharacter();
    return characterCount * costPerChar;
  }

  /**
   * Get voice characteristics
   */
  getVoiceCharacteristics(): Record<string, { gender: string; age: string; description: string }> {
    return {
      'alloy': {
        gender: 'neutral',
        age: 'adult',
        description: 'Balanced and versatile voice'
      },
      'echo': {
        gender: 'male',
        age: 'adult',
        description: 'Clear and articulate male voice'
      },
      'fable': {
        gender: 'male',
        age: 'adult',
        description: 'Warm and expressive male voice'
      },
      'onyx': {
        gender: 'male',
        age: 'adult',
        description: 'Deep and authoritative male voice'
      },
      'nova': {
        gender: 'female',
        age: 'adult',
        description: 'Bright and energetic female voice'
      },
      'shimmer': {
        gender: 'female',
        age: 'adult',
        description: 'Soft and gentle female voice'
      }
    };
  }

  /**
   * Check if model supports streaming
   */
  supportsStreaming(): boolean {
    return false; // OpenAI TTS API doesn't support streaming yet
  }

  /**
   * Get quality level for this model
   */
  getQualityLevel(): 'standard' | 'high' | 'ultra' {
    if (this.modelId.includes('tts-1-hd')) {
      return 'high';
    }
    return 'standard';
  }
}
