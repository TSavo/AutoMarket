/**
 * WhisperDockerModel
 * 
 * Docker-specific implementation of Whisper STT model.
 * This is what the WhisperDockerProvider returns.
 * 
 * Coordinates WhisperAPIClient and WhisperDockerService for Docker-based Whisper STT.
 */

import { SpeechToTextModel, SpeechToTextOptions } from './SpeechToTextModel';
import { WhisperAPIClient } from '../clients/WhisperAPIClient';
import { WhisperDockerService } from '../services/WhisperDockerService';
import { Speech, Text } from '../assets/roles';
import { SpeechInput, castToSpeech } from '../assets/casting';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Configuration for WhisperDockerModel
 */
export interface WhisperDockerModelConfig {
  apiClient?: WhisperAPIClient;
  dockerService?: WhisperDockerService;
  tempDir?: string;
}

/**
 * Docker-specific Whisper STT Model implementation
 */
export class WhisperDockerModel extends SpeechToTextModel {
  private readonly apiClient: WhisperAPIClient;
  private readonly dockerService: WhisperDockerService;
  private readonly tempDir: string;

  constructor(config: WhisperDockerModelConfig = {}) {
    super({
      id: 'whisper-docker',
      name: 'Whisper STT (Docker)',
      description: 'Docker-based Whisper speech-to-text model',
      version: '1.0.0',
      provider: 'whisper-docker',
      capabilities: ['speech-to-text', 'transcription', 'translation'],
      inputTypes: ['audio', 'speech'],
      outputTypes: ['text']
    });

    // Initialize dependencies
    this.apiClient = config.apiClient || new WhisperAPIClient();
    this.dockerService = config.dockerService || new WhisperDockerService();
    this.tempDir = config.tempDir || path.join(os.tmpdir(), 'whisper-docker');

    // Ensure temp directory exists
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Transform speech to text using Docker-based Whisper
   */
  async transform(input: SpeechInput, options?: SpeechToTextOptions): Promise<Text> {
    const startTime = Date.now();

    // Cast input to Speech
    const speech = castToSpeech(input);
    
    // Validate speech data
    if (!speech.isValid()) {
      throw new Error('Invalid speech data provided');
    }

    try {
      // Ensure Docker service is running
      const serviceStarted = await this.dockerService.startService();
      if (!serviceStarted) {
        throw new Error('Failed to start Whisper Docker service');
      }

      // Wait for service to be healthy
      const isHealthy = await this.dockerService.waitForHealthy(30000);
      if (!isHealthy) {
        throw new Error('Whisper Docker service is not healthy');
      }

      // Save speech data to temporary file
      const tempFilePath = await this.saveSpeechToTempFile(speech);

      try {
        // Create transcription request
        const request = this.apiClient.createTranscriptionRequest(tempFilePath, {
          task: options?.task || 'transcribe',
          language: options?.language, // No fallback to speech metadata - we don't have it
          word_timestamps: options?.wordTimestamps
        });

        // Perform transcription
        const response = await this.apiClient.transcribeAudio(request);

        // Process response
        const processingTime = Date.now() - startTime;

        // Create Text result
        const text = new Text(
          response.text,
          response.language || options?.language || 'auto', // No fallback to speech metadata
          response.confidence || 0.9,
          {
            segments: this.convertToSpeechSegments(response.segments),
            processingTime,
            model: 'whisper-docker',
            provider: 'whisper-docker',
            duration: response.duration
          },
          speech.sourceAsset // Preserve source Asset reference
        );

        return text;

      } finally {
        // Clean up temporary file
        this.cleanupTempFile(tempFilePath);
      }

    } catch (error) {
      throw new Error(`Whisper Docker STT failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if the model is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Check if Docker service is healthy
      const isHealthy = await this.dockerService.isServiceHealthy();
      if (!isHealthy) {
        return false;
      }

      // Check if API client can reach the service
      return await this.apiClient.checkHealth();
    } catch {
      return false;
    }
  }

  /**
   * Get supported formats
   */
  getSupportedFormats(): string[] {
    return this.apiClient.getSupportedFormats();
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages(): string[] {
    return this.apiClient.getSupportedLanguages();
  }

  /**
   * Check if translation is supported
   */
  supportsTranslation(): boolean {
    return true;
  }

  /**
   * Check if speaker diarization is supported
   */
  supportsSpeakerDiarization(): boolean {
    return false; // Whisper doesn't support speaker diarization
  }

  /**
   * Check if real-time processing is supported
   */
  supportsRealTime(): boolean {
    return false; // This Docker implementation is batch-only
  }

  /**
   * Save speech data to temporary file
   */
  private async saveSpeechToTempFile(speech: Speech): Promise<string> {
    const timestamp = Date.now();
    const tempFilePath = path.join(this.tempDir, `whisper_input_${timestamp}.wav`);
    
    try {
      fs.writeFileSync(tempFilePath, speech.data);
      return tempFilePath;
    } catch (error) {
      throw new Error(`Failed to save speech to temp file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convert API response segments to SpeechSegments
   */
  private convertToSpeechSegments(segments?: any[]): any[] {
    if (!segments) return [];

    return segments.map(segment => ({
      start: segment.start,
      end: segment.end,
      text: segment.text,
      confidence: segment.confidence
    }));
  }

  /**
   * Clean up temporary file
   */
  private cleanupTempFile(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch {
      // Ignore cleanup errors
    }
  }

  /**
   * Get Docker service for advanced operations
   */
  getDockerService(): WhisperDockerService {
    return this.dockerService;
  }

  /**
   * Get API client for direct access
   */
  getAPIClient(): WhisperAPIClient {
    return this.apiClient;
  }

  /**
   * Start the underlying Docker service
   */
  async startService(): Promise<boolean> {
    return await this.dockerService.startService();
  }

  /**
   * Stop the underlying Docker service
   */
  async stopService(): Promise<boolean> {
    return await this.dockerService.stopService();
  }

  /**
   * Get service status
   */
  async getServiceStatus(): Promise<{
    running: boolean;
    healthy: boolean;
    error?: string;
  }> {
    try {
      const status = await this.dockerService.getServiceStatus();
      return {
        running: status.running,
        healthy: status.health === 'healthy',
        error: status.health === 'unhealthy' ? 'Service is unhealthy' : undefined
      };
    } catch (error) {
      return {
        running: false,
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
