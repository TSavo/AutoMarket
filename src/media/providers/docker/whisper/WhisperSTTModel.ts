/**
 * WhisperSTTModel - Concrete Implementation
 * 
 * Concrete implementation of SpeechToTextModel using Whisper STT.
 * Coordinates WhisperAPIClient and WhisperDockerService for speech recognition.
 */

import { ModelMetadata } from '../../../models/abstracts/Model';
import { Audio, Text, AudioRole } from '../../../assets/roles';
import { WhisperAPIClient } from './WhisperAPIClient';
import { WhisperDockerService } from '../../../services/WhisperDockerService';
import fs from 'fs';
import path from 'path';
import { AudioToTextModel, AudioToTextOptions } from '../../../models/abstracts/AudioToTextModel';

export interface WhisperSTTModelConfig {
  apiClient?: WhisperAPIClient;
  dockerService?: WhisperDockerService;
  baseUrl?: string;
  timeout?: number;
  tempDir?: string;
}

/**
 * Concrete Whisper STT model implementation
 */
export class WhisperSTTModel extends AudioToTextModel {
  private apiClient: WhisperAPIClient;
  private dockerService: WhisperDockerService;
  private tempDir: string;

  constructor(config: WhisperSTTModelConfig = {}) {
    const metadata: ModelMetadata = {
      id: 'whisper-stt',
      name: 'Whisper Speech-to-Text',
      description: 'OpenAI Whisper model for speech recognition and transcription',
      version: '1.0.0',
      provider: 'whisper-docker',
      capabilities: ['speech-to-text', 'speech-recognition', 'transcription', 'translation'],
      inputTypes: ['audio'],
      outputTypes: ['text']
    };

    super(metadata);

    // Initialize API client and Docker service
    this.apiClient = config.apiClient || new WhisperAPIClient(config.baseUrl, config.timeout);
    this.dockerService = config.dockerService || new WhisperDockerService();
    this.tempDir = config.tempDir || path.join(process.cwd(), 'temp', 'whisper');

    // Ensure temp directory exists
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Transform audio to text using Whisper
   */
  async transform(input: AudioRole, options?: AudioToTextOptions): Promise<Text> {
    const startTime = Date.now();

    // Get audio from the AudioRole
    const audio = await input.asAudio();

    // Validate audio data
    if (!audio.isValid()) {
      throw new Error('Invalid audio data provided');
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
        throw new Error('Whisper service is not healthy');
      }

      // Save audio data to temporary file
      const tempFilePath = await this.saveAudioToTempFile(audio);

      try {
        // Create transcription request
        const request = this.apiClient.createTranscriptionRequest(tempFilePath, {
          task: options?.task || 'transcribe',
          language: options?.language || audio.sourceAsset?.metadata?.language,
          word_timestamps: options?.wordTimestamps
        });

        // Perform transcription
        const response = await this.apiClient.transcribeAudio(request);

        // Process response
        const processingTime = Date.now() - startTime;

        // Create Text result
        const text = new Text(
          response.text,
          response.language || options?.language || audio.sourceAsset?.metadata?.language || 'auto',
          response.confidence || 0.9,
          {
            segments: this.convertToSpeechSegments(response.segments),
            processingTime,
            model: 'whisper-1',
            provider: 'whisper-docker',
            duration: response.duration
          },
          audio.sourceAsset // Preserve source Asset reference
        );

        return text;

      } finally {
        // Clean up temporary file
        this.cleanupTempFile(tempFilePath);
      }

    } catch (error) {
      throw new Error(`Whisper STT failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Ensure service is running
   */
  private async ensureServiceRunning(): Promise<boolean> {
    try {
      const serviceStarted = await this.dockerService.startService();
      if (!serviceStarted) {
        return false;
      }

      const isHealthy = await this.dockerService.waitForHealthy(30000);
      return isHealthy;
    } catch {
      return false;
    }
  }

  /**
   * Get provider name
   */
   getProvider(): string {
    return 'whisper-docker';
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
   * Get supported languages for Whisper
   */
  async getSupportedLanguages(): Promise<string[]> {
    return this.apiClient.getSupportedLanguages();
  }

  /**
   * Get maximum audio duration supported (in seconds)
   */
  getMaxAudioDuration(): number {
    return 600; // 10 minutes max for Whisper
  }

  /**
   * Get maximum audio file size supported (in bytes)
   */
  getMaxAudioSize(): number {
    return 25 * 1024 * 1024; // 25MB max for Whisper
  }

  /**
   * Check if speaker diarization is supported
   */
  supportsSpeakerDiarization(): boolean {
    return false; // Whisper doesn't support speaker diarization natively
  }

  /**
   * Check if real-time transcription is supported
   */
  supportsRealTime(): boolean {
    return false; // This implementation doesn't support real-time
  }

  /**
   * Check if translation is supported
   */
  supportsTranslation(): boolean {
    return true; // Whisper supports translation to English
  }

  /**
   * Get supported audio formats
   */
  getSupportedFormats(): string[] {
    return this.apiClient.getSupportedFormats();
  }

  /**
   * Save audio to temporary file for API processing
   */
  private async saveAudioToTempFile(audio: Audio): Promise<string> {
    const timestamp = Date.now();
    const filename = `whisper_${timestamp}.wav`; // Default to WAV for audio
    const filePath = path.join(this.tempDir, filename);

    // Write audio data to file
    fs.writeFileSync(filePath, audio.data);
    return filePath;
  }

  /**
   * Clean up temporary file
   */
  private cleanupTempFile(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.warn(`Failed to cleanup temp file ${filePath}:`, error);
    }
  }

  /**
   * Convert API response segments to SpeechSegments
   */
  private convertToSpeechSegments(segments?: Array<{
    start: number;
    end: number;
    text: string;
  }>): Array<{
    start: number;
    end: number;
    text: string;
    confidence?: number;
  }> | undefined {
    if (!segments) return undefined;

    return segments.map(segment => ({
      start: segment.start,
      end: segment.end,
      text: segment.text,
      confidence: 0.9 // Whisper doesn't provide segment-level confidence
    }));
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
   * Restart the underlying Docker service
   */
  async restartService(): Promise<boolean> {
    return await this.dockerService.restartService();
  }

  /**
   * Get service logs
   */
  async getServiceLogs(lines: number = 100): Promise<string> {
    return await this.dockerService.getLogs(lines);
  }

  /**
   * Get container stats
   */
  async getContainerStats(): Promise<{
    cpuUsage?: string;
    memoryUsage?: string;
    networkIO?: string;
    error?: string;
  }> {
    return await this.dockerService.getContainerStats();
  }
}
