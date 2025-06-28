/**
 * HuggingFaceTextToAudioModel - Text-to-Audio implementation for HuggingFace Docker service
 * 
 * Supports HuggingFace text-to-audio models like:
 * - microsoft/speecht5_tts
 * - facebook/mms-tts-eng
 * - espnet/kan-bayashi_ljspeech_vits
 * - coqui/XTTS-v2
 * - facebook/musicgen-small
 * - facebook/musicgen-medium
 * - facebook/musicgen-large
 */

import { TextToAudioModel, TextToAudioOptions } from '../../../models/abstracts/TextToAudioModel';
import { ModelMetadata } from '../../../models/abstracts/Model';
import { Text, Audio, TextRole, AudioRole } from '../../../assets/roles';
import { HuggingFaceAPIClient } from './HuggingFaceAPIClient';
import { createGenerationPrompt, extractInputContent } from '../../../utils/GenerationPromptHelper';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface HuggingFaceTextToAudioConfig {
  apiClient: HuggingFaceAPIClient;
  modelId: string;
  autoLoad?: boolean;
  timeout?: number;
}

/**
 * Text-to-Audio model implementation for HuggingFace Docker service
 */
export class HuggingFaceTextToAudioModel extends TextToAudioModel {
  private apiClient: HuggingFaceAPIClient;
  private modelId: string;
  private autoLoad: boolean;
  private timeout: number;

  constructor(config: HuggingFaceTextToAudioConfig) {
    const metadata: ModelMetadata = {
      id: config.modelId,
      name: `HuggingFace: ${config.modelId}`,
      description: `HuggingFace text-to-audio model: ${config.modelId}`,
      version: '1.0.0',
      provider: 'huggingface-docker',
      capabilities: ['text-to-audio', 'text-to-speech'],
      inputTypes: ['text'],
      outputTypes: ['audio']
    };

    super(metadata);

    this.apiClient = config.apiClient;
    this.modelId = config.modelId;
    this.autoLoad = config.autoLoad || true;
    this.timeout = config.timeout || 120000; // 2 minutes default
  }

  /**
   * Transform text to audio using HuggingFace models
   */
  async transform(input: TextRole | TextRole[] | string | string[], options?: TextToAudioOptions): Promise<Audio> {
    const startTime = Date.now();

    let textRole: TextRole;
    if (Array.isArray(input)) {
      textRole = typeof input[0] === 'string' ? new Text(input[0]) : input[0];
    } else {
      textRole = typeof input === 'string' ? new Text(input) : input;
    }

    // Get text from the TextRole
    const text = await textRole.asText();

    if (!text.isValid()) {
      throw new Error('Invalid text data provided');
    }

    const textContent = text.content;

    try {      // Auto-load model if enabled
      if (this.autoLoad) {
        console.log(`[HuggingFaceTextToAudio] Loading model: ${this.modelId}`);
        await this.apiClient.loadModel({
          modelId: this.modelId,
          force: false
        });
      }      // Prepare request for HuggingFace text-to-audio generation
      const requestPayload = this.createModelSpecificPayload(textContent, options);

      console.log(`[HuggingFaceTextToAudio] Generating audio with model: ${this.modelId}`);
      console.log(`[HuggingFaceTextToAudio] Request payload:`, requestPayload);      // Make request to HuggingFace audio generation endpoint
      const response = await this.generateAudio(requestPayload);

      if (!response.success) {
        throw new Error(`HuggingFace audio generation failed: ${response.error || 'Unknown error'}`);
      }

      // Handle different response types
      let audioBuffer: Buffer;

      if (response.audioBase64) {
        // Base64 encoded audio data
        audioBuffer = Buffer.from(response.audioBase64, 'base64');
      } else if (response.audioUrl) {
        // Download audio from URL
        console.log(`[HuggingFaceTextToAudio] Downloading audio from: ${response.audioUrl}`);
        const audioResponse = await fetch(response.audioUrl);
        if (!audioResponse.ok) {
          throw new Error(`Failed to download audio: ${audioResponse.status}`);
        }
        audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
      } else {
        throw new Error('No audio data found in response');
      }

      if (!audioBuffer || audioBuffer.length === 0) {
        throw new Error('Received empty audio buffer from HuggingFace');
      }

      const processingTime = Date.now() - startTime;

      // Save to temporary file for metadata extraction
      const tempDir = os.tmpdir();
      const tempFileName = `hf_audio_${this.modelId.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.${options?.format || 'wav'}`;
      const localPath = path.join(tempDir, tempFileName);
      fs.writeFileSync(localPath, audioBuffer);

      console.log(`[HuggingFaceTextToAudio] Audio saved to: ${localPath}`);
      console.log(`[HuggingFaceTextToAudio] Audio generated in ${processingTime}ms`);
      console.log(`[HuggingFaceTextToAudio] Audio size: ${audioBuffer.length} bytes`);

      // Create Audio with proper metadata
      const audio = new Audio(
        audioBuffer,
        text.sourceAsset, // Preserve source Asset reference
        {
          format: (options?.format || 'wav') as any,
          fileSize: audioBuffer.length,
          localPath: localPath,
          processingTime,
          model: this.modelId,
          provider: 'huggingface-docker',
          text: textContent,
          voice: options?.voice,
          speed: options?.speed,
          language: options?.language,
          sampleRate: options?.sampleRate || 22050,
          generation_prompt: createGenerationPrompt({
            input: input, // RAW input object to preserve generation chain
            options: options,
            modelId: this.modelId,
            modelName: `HuggingFace: ${this.modelId}`,
            provider: 'huggingface-docker',
            transformationType: 'text-to-audio',
            processingTime: processingTime
          })
        }
      );

      return audio;

    } catch (error) {
      throw new Error(`HuggingFace text-to-audio generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }  /**
   * Generate audio using HuggingFace API
   */
  private async generateAudio(request: any): Promise<any> {
    try {
      // Use the dedicated audio generation endpoint
      const response = await this.apiClient.generateAudio({
        modelId: request.modelId,
        prompt: request.prompt,
        // Pass through audio-specific parameters
        ...request
      });
      
      return {
        success: response.success,
        audioBase64: response.audioBase64, // The service returns audio as base64
        audioUrl: response.audioUrl, // Or as URL
        metadata: response.metadata,
        error: response.error
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check if the model is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Check if API client can reach the service
      const health = await this.apiClient.healthCheck();
      return health.status === 'healthy';
    } catch {
      return false;
    }
  }

  /**
   * Get supported audio formats
   */
  getSupportedFormats(): string[] {
    return ['wav', 'mp3', 'flac', 'ogg'];
  }

  /**
   * Get available voices for this model
   */
  async getAvailableVoices(): Promise<string[]> {
    // Model-specific voice lists based on common HuggingFace TTS models
    if (this.modelId.includes('speecht5')) {
      return ['default', 'speaker_0', 'speaker_1', 'speaker_2', 'speaker_3', 'speaker_4'];
    } else if (this.modelId.includes('mms-tts')) {
      return ['default', 'female', 'male'];
    } else if (this.modelId.includes('vits')) {
      return ['default', 'ljspeech'];
    } else if (this.modelId.includes('xtts')) {
      return ['default', 'custom']; // XTTS supports voice cloning
    } else if (this.modelId.includes('musicgen')) {
      return ['default']; // Music generation doesn't use voices
    }
    
    return ['default'];
  }

  /**
   * Check if this model supports voice cloning
   */
  supportsVoiceCloning(): boolean {
    // Only XTTS models support voice cloning from HuggingFace
    return this.modelId.includes('xtts');
  }

  /**
   * Get maximum text length for this model
   */
  getMaxTextLength(): number {
    if (this.modelId.includes('xtts')) {
      return 5000; // XTTS can handle longer text
    } else if (this.modelId.includes('musicgen')) {
      return 200; // Music generation uses shorter prompts
    } else if (this.modelId.includes('speecht5') || this.modelId.includes('mms-tts')) {
      return 1000; // Standard TTS models
    }
    
    return 500; // Conservative default
  }

  /**
   * Get model display name
   */
  getDisplayName(): string {
    return `HuggingFace: ${this.modelId}`;
  }

  /**
   * Get model information
   */
  getModelInfo(): { id: string; provider: string; capabilities: string[] } {
    return {
      id: this.modelId,
      provider: 'huggingface-docker',
      capabilities: ['text-to-audio', 'text-to-speech']
    };
  }

  /**
   * Get the underlying model ID
   */
  getModelId(): string {
    return this.modelId;
  }

  /**
   * Check if model is loaded
   */
  async isModelLoaded(): Promise<boolean> {
    try {
      const models = await this.apiClient.listLoadedModels();
      return models.some((model: any) => model.id === this.modelId || model.name === this.modelId);
    } catch {
      return false;
    }
  }
  /**
   * Load the model explicitly
   */
  async loadModel(): Promise<void> {
    await this.apiClient.loadModel({
      modelId: this.modelId,
      force: false
    });
  }

  /**
   * Unload the model
   */
  async unloadModel(): Promise<void> {
    await this.apiClient.unloadModel(this.modelId);
  }
  /**
   * Create model-specific payload with proper parameter handling
   */
  private createModelSpecificPayload(textContent: string, options?: TextToAudioOptions): any {
    const basePayload = {
      modelId: this.modelId,
      prompt: textContent
    };

    // Handle Facebook MMS-TTS models - they have very limited parameter support
    if (this.modelId.includes('facebook/mms-tts')) {
      return {
        ...basePayload,
        // Facebook MMS-TTS models are very sensitive to parameters
        // Send minimal parameters to avoid compatibility issues
        format: options?.format || 'wav'
        // Do NOT include: voice, speed, pitch, volume, sample_rate - they cause errors
      };
    }

    // Handle ESPnet VITS models - they are known to be incompatible
    if (this.modelId.includes('espnet') && this.modelId.includes('vits')) {
      // These models are handled by the backend handler which will throw a detailed error
      return basePayload;
    }

    // Handle other models with full parameter support
    return {
      ...basePayload,
      // Audio-specific parameters
      sample_rate: options?.sampleRate || 22050,
      format: options?.format || 'wav',
      voice: options?.voice || 'default',
      speed: options?.speed || 1.0,
      pitch: options?.pitch || 0.0,
      volume: options?.volume || 1.0
    };
  }
}
