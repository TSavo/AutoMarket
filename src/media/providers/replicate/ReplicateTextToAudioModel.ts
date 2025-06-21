/**
 * Replicate Text-to-Audio Model Implementation
 * 
 * Specific model implementation for Replicate text-to-audio models.
 * Implements TextToAudioModel interface and uses Replicate API.
 */

import { ModelMetadata } from '../../models/abstracts/Model';
import { TextToAudioModel, TextToAudioOptions } from '../../models/abstracts/TextToAudioModel';
import { ReplicateClient, ReplicateModelMetadata } from './ReplicateClient';
import { Text, Audio, TextRole, AudioRole } from '../../assets/roles';
import Replicate from 'replicate';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface ReplicateModelConfig {
  client: ReplicateClient;
  modelMetadata: ReplicateModelMetadata;
  replicateClient: Replicate;
}

/**
 * ReplicateTextToAudioModel - Implements TextToAudioModel for Replicate TTS models
 * 
 * Takes Replicate TTS model metadata (like chatterbox) and uses Replicate API for TTS
 */
export class ReplicateTextToAudioModel extends TextToAudioModel {
  private client: ReplicateClient;
  private modelMetadata: ReplicateModelMetadata;
  private replicateClient: Replicate;

  constructor(config: ReplicateModelConfig) {
    // Create metadata for TextToAudioModel
    const metadata: ModelMetadata = {
      id: config.modelMetadata.id,
      name: config.modelMetadata.name || config.modelMetadata.id,
      description: config.modelMetadata.description || '',
      version: '1.0.0',
      provider: 'replicate',
      capabilities: ['text-to-speech', 'text-to-audio'],
      inputTypes: ['text'],
      outputTypes: ['audio']
    };

    super(metadata);

    this.client = config.client;
    this.modelMetadata = config.modelMetadata;
    this.replicateClient = config.replicateClient;
  }

  /**
   * Transform text to audio using specific Replicate TTS model  */
  async transform(input: TextRole, options?: TextToAudioOptions): Promise<Audio>;
  async transform(text: TextRole, voiceAudio: AudioRole, options?: TextToAudioOptions): Promise<Audio>;
  async transform(input: TextRole, voiceAudioOrOptions?: AudioRole | TextToAudioOptions, options?: TextToAudioOptions): Promise<Audio> {
    // Get text from the TextRole
    const text = await input.asText();

    if (!text.isValid()) {
      throw new Error('Invalid text data provided');
    }

    // Parse arguments to determine which signature was used
    let voiceAudio: AudioRole | undefined;
    let actualOptions: TextToAudioOptions | undefined;

    if (voiceAudioOrOptions && typeof voiceAudioOrOptions === 'object' && 'asAudio' in voiceAudioOrOptions) {
      // Second signature: transform(text, voiceAudio, options)
      voiceAudio = voiceAudioOrOptions as AudioRole;
      actualOptions = options;
    } else {
      // First signature: transform(text, options)
      voiceAudio = undefined;
      actualOptions = voiceAudioOrOptions as TextToAudioOptions;    }

    try {
      // Convert AudioRole to Audio if provided
      let voiceAudioData: Audio | undefined;
      if (voiceAudio) {
        voiceAudioData = await voiceAudio.asAudio();
      }

      // Prepare input for this specific Replicate TTS model
      const replicateInput = this.prepareReplicateInput(text.content, voiceAudioData, actualOptions);

      console.log(`[ReplicateTextToAudio] Generating speech with model: ${this.modelMetadata.id}`);
      console.log(`[ReplicateTextToAudio] Input:`, replicateInput);

      // Create prediction using Replicate API
      const prediction = await this.replicateClient.predictions.create({
        version: this.modelMetadata.id,
        input: replicateInput
      });

      console.log(`[ReplicateTextToAudio] Prediction created:`, prediction.id);

      // Wait for prediction to complete
      const completedPrediction = await this.waitForPrediction(prediction.id);

      if (completedPrediction.status === 'failed') {
        throw new Error(`Replicate prediction failed: ${completedPrediction.error}`);
      }

      if (!completedPrediction.output) {
        throw new Error('Replicate prediction completed but no output received');
      }

      // Download the generated audio
      const audioUrl = Array.isArray(completedPrediction.output) 
        ? completedPrediction.output[0] 
        : completedPrediction.output;

      console.log(`[ReplicateTextToAudio] Downloading audio from:`, audioUrl);
      const audioData = await this.downloadAudio(audioUrl);

      // Create Audio result
      const audio = new Audio(
        audioData,
        text.sourceAsset // Preserve source Asset reference
      );

      return audio;

    } catch (error) {
      throw new Error(`Replicate TTS failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Prepare input for specific Replicate TTS model based on its parameters
   */
  private prepareReplicateInput(text: string, voiceAudio?: Audio, options?: TextToAudioOptions): any {
    const input: any = {
      text: text
    };

    // Add model-specific parameters based on the model's parameter schema
    const params = this.modelMetadata.parameters || {};

    // Add voice cloning if provided and model supports it
    if (voiceAudio && params.voice_audio) {
      console.log('Voice cloning requested but file upload not yet implemented');
      // TODO: Upload voice audio file to Replicate and get URL
    }

    // Add common TTS options if model supports them
    if (options?.language && params.language) {
      input.language = options.language;
    }

    if (options?.speed && params.speed) {
      input.speed = options.speed;
    }

    if (options?.voice && params.voice) {
      input.voice = options.voice;
    }

    return input;
  }

  /**
   * Wait for Replicate prediction to complete
   */
  private async waitForPrediction(predictionId: string, maxWaitTime: number = 300000): Promise<any> {
    const startTime = Date.now();
    const pollInterval = 2000; // 2 seconds

    while (Date.now() - startTime < maxWaitTime) {
      const prediction = await this.replicateClient.predictions.get(predictionId);
      
      console.log(`[ReplicateTextToAudio] Prediction status: ${prediction.status}`);

      if (prediction.status === 'succeeded' || prediction.status === 'failed') {
        return prediction;
      }

      // Wait before polling again
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error(`Prediction ${predictionId} timed out after ${maxWaitTime}ms`);
  }

  /**
   * Download audio from URL
   */
  private async downloadAudio(url: string): Promise<Buffer> {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to download audio: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Check if the model is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Test connection to Replicate API
      const models = await this.replicateClient.models.list();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get supported voices (model-specific)
   */
  async getSupportedVoices(): Promise<string[]> {
    // This would depend on the specific model's capabilities
    // For now, return empty array as most Replicate TTS models don't expose voice lists
    return [];
  }

  /**
   * Get supported output formats
   */
  getSupportedFormats(): string[] {
    // Most Replicate TTS models output WAV or MP3
    return ['wav', 'mp3'];
  }

  /**
   * Get default voice
   */
  getDefaultVoice(): string {
    return 'default';
  }

  /**
   * Get maximum text length
   */
  getMaxTextLength(): number {
    // Conservative default - actual limit depends on the specific model
    return 1000;
  }
}

export default ReplicateTextToAudioModel;


