/**
 * KokoroDockerModel
 * 
 * Docker-specific implementation of Kokoro TTS model.
 * Based on ChatterboxDockerModel pattern.
 */

import { TextToAudioModel, TextToAudioOptions } from '../../../models/abstracts/TextToAudioModel';
import { KokoroAPIClient, KokoroTTSRequest } from './KokoroAPIClient';
import { KokoroDockerService } from '../../../services/KokoroDockerService';
import { Text, Audio, TextRole, AudioRole, hasAudioRole } from '../../../assets/roles';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Extended options for Kokoro Docker TTS
export interface KokoroDockerTTSOptions extends TextToAudioOptions {
  alpha?: number;      // StyleTTS2 specific parameter
  beta?: number;       // StyleTTS2 specific parameter
  style?: string;      // Style control
  forceUpload?: boolean;
}

/**
 * Configuration for KokoroDockerModel
 */
export interface KokoroDockerModelConfig {
  apiClient?: KokoroAPIClient;
  dockerService?: KokoroDockerService;
  tempDir?: string;
}

/**
 * Docker-specific Kokoro TTS Model implementation
 */
export class KokoroDockerModel extends TextToAudioModel {
  private apiClient: KokoroAPIClient;
  private dockerService: KokoroDockerService;
  private tempDir: string;

  constructor(config: KokoroDockerModelConfig = {}) {
    super({
      id: 'kokoro-docker-tts',
      name: 'Kokoro TTS (Docker)',
      description: 'Kokoro StyleTTS2 text-to-speech model running in Docker container',
      version: '1.0.0',
      provider: 'kokoro-docker',
      capabilities: ['text-to-speech', 'style-control', 'voice-selection'],
      inputTypes: ['text'],
      outputTypes: ['speech', 'audio']
    });

    // Initialize dependencies
    this.apiClient = config.apiClient || new KokoroAPIClient();
    this.dockerService = config.dockerService || new KokoroDockerService();
    this.tempDir = config.tempDir || path.join(os.tmpdir(), 'kokoro-docker');

    // Ensure temp directory exists
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }
  /**
   * Transform text to audio using Docker-based Kokoro TTS
   */
  async transform(input: TextRole | TextRole[] | string | string[], options?: KokoroDockerTTSOptions): Promise<Audio> {
    const startTime = Date.now();

    let textRole: TextRole;
    if (Array.isArray(input)) {
      textRole = typeof input[0] === 'string' ? Text.fromString(input[0]) : input[0];
    } else {
      textRole = typeof input === 'string' ? Text.fromString(input) : input;
    }

    // Get text from the TextRole
    const text = await textRole.asRole(Text);
    
    // Validate text data
    if (!text.isValid()) {
      throw new Error('Invalid text data provided');
    }

    // Ensure service is running
    const serviceStarted = await this.ensureServiceRunning();
    if (!serviceStarted) {
      throw new Error('Failed to start Kokoro Docker service');
    }    // Prepare TTS request
    const ttsRequest: KokoroTTSRequest = {
      text: text.content,
      voice: options?.voice || 'af_bella',  // Use a valid default voice
      speed: options?.speed || 1.0,
      alpha: options?.alpha || 0.3,
      beta: options?.beta || 0.7,
      style: options?.style || 'default',
      language: options?.language || 'en'
    };

    try {
      console.log(`[KokoroDockerModel] Generating TTS for: "${text.content.substring(0, 50)}..."`);
      
      // Generate audio via API
      const response = await this.apiClient.generateTTS(ttsRequest);
      
      if (response.error) {
        throw new Error(`TTS generation failed: ${response.error}`);
      }

      // Handle different response formats
      let audioBuffer: Buffer;
      if (response.audio_data) {
        // Base64 encoded audio
        audioBuffer = Buffer.from(response.audio_data, 'base64');
      } else if (response.audio_url) {
        // Download from URL
        const audioResponse = await fetch(response.audio_url);
        audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
      } else {
        throw new Error('No audio data received from Kokoro API');
      }

      // Save to temporary file
      const tempFilename = `kokoro_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.wav`;
      const tempFilePath = path.join(this.tempDir, tempFilename);
      fs.writeFileSync(tempFilePath, audioBuffer);

      try {
        // Create Audio result with clean interface
        const audio = new Audio(
          audioBuffer,
          text.sourceAsset // Preserve source Asset reference
        );

        console.log(`[KokoroDockerModel] TTS generated successfully: ${audioBuffer.length} bytes`);
        
        return audio;
      } finally {
        // Clean up temporary file
        this.cleanupTempFile(tempFilePath);
      }
    } catch (error) {
      console.error(`[KokoroDockerModel] TTS generation failed:`, error);
      throw new Error(`Kokoro TTS generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if the model is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const serviceHealthy = await this.dockerService.isServiceHealthy();
      const apiAvailable = await this.apiClient.isAvailable();
      return serviceHealthy && apiAvailable;
    } catch {
      return false;
    }
  }

  /**
   * Get available voices
   */
  async getAvailableVoices(): Promise<string[]> {
    try {
      return await this.apiClient.getVoices();
    } catch {
      return ['default', 'af', 'af_bella', 'af_sarah', 'af_sky', 'af_nicole', 'am_adam', 'am_michael'];
    }
  }

  /**
   * Get supported formats
   */
  getSupportedFormats(): string[] {
    return ['wav', 'mp3', 'flac', 'ogg'];
  }

  /**
   * Get maximum text length
   */
  getMaxTextLength(): number {
    return 2000; // Kokoro typically handles shorter texts better
  }

  /**
   * Check if voice cloning is supported
   */
  supportsVoiceCloning(): boolean {
    return false; // Basic Kokoro doesn't support voice cloning
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
    return 'kokoro-docker';
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
   * Get the input schema for this model
   */
  getInputSchema(): any {
    return {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'Text to convert to speech',
          maxLength: this.getMaxTextLength()
        },
        voice: {
          type: 'string',
          description: 'Voice to use for generation',
          enum: ['default', 'af', 'af_bella', 'af_sarah', 'af_sky', 'af_nicole', 'am_adam', 'am_michael']
        },
        speed: {
          type: 'number',
          description: 'Speech speed multiplier',
          minimum: 0.5,
          maximum: 2.0,
          default: 1.0
        },
        alpha: {
          type: 'number',
          description: 'StyleTTS2 alpha parameter',
          minimum: 0.0,
          maximum: 1.0,
          default: 0.3
        },
        beta: {
          type: 'number',
          description: 'StyleTTS2 beta parameter',
          minimum: 0.0,
          maximum: 1.0,
          default: 0.7
        },
        style: {
          type: 'string',
          description: 'Speech style',
          default: 'default'
        }
      },
      required: ['text']
    };
  }

  /**
   * Get the output schema for this model
   */
  getOutputSchema(): any {
    return {
      type: 'object',
      properties: {
        audio: {
          type: 'object',
          description: 'Generated audio'
        },
        metadata: {
          type: 'object',
          properties: {
            duration: { type: 'number' },
            sampleRate: { type: 'number' },
            voice: { type: 'string' },
            model: { type: 'string' }
          }
        }
      }
    };
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
   * Get Docker service for advanced operations
   */
  getDockerService(): KokoroDockerService {
    return this.dockerService;
  }

  /**
   * Get API client for direct access
   */
  getAPIClient(): KokoroAPIClient {
    return this.apiClient;
  }
}
