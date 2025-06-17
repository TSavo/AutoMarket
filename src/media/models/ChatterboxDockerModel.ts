/**
 * ChatterboxDockerModel
 * 
 * Docker-specific implementation of Chatterbox TTS model.
 * This is what the ChatterboxDockerProvider returns.
 * 
 * Coordinates ChatterboxAPIClient and ChatterboxDockerService for Docker-based TTS.
 */

import { TextToSpeechModel, TextToSpeechOptions } from './TextToSpeechModel';
import { ChatterboxAPIClient } from '../clients/ChatterboxAPIClient';
import { ChatterboxDockerService } from '../services/ChatterboxDockerService';
import { Text, Speech } from '../assets/roles';
import { castToText } from '../assets/casting';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Configuration for ChatterboxDockerModel
 */
export interface ChatterboxDockerModelConfig {
  apiClient?: ChatterboxAPIClient;
  dockerService?: ChatterboxDockerService;
  tempDir?: string;
}

/**
 * Docker-specific Chatterbox TTS Model implementation
 */
export class ChatterboxDockerModel extends TextToSpeechModel {
  private readonly apiClient: ChatterboxAPIClient;
  private readonly dockerService: ChatterboxDockerService;
  private readonly tempDir: string;

  constructor(config: ChatterboxDockerModelConfig = {}) {
    super({
      id: 'chatterbox-docker-tts',
      name: 'Chatterbox TTS (Docker)',
      description: 'Chatterbox text-to-speech model running in Docker container',
      version: '1.0.0',
      provider: 'chatterbox-docker',
      capabilities: ['text-to-speech', 'voice-cloning'],
      inputTypes: ['text'],
      outputTypes: ['speech', 'audio']
    });

    // Initialize dependencies
    this.apiClient = config.apiClient || new ChatterboxAPIClient();
    this.dockerService = config.dockerService || new ChatterboxDockerService();
    this.tempDir = config.tempDir || path.join(os.tmpdir(), 'chatterbox-docker');

    // Ensure temp directory exists
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Transform text to speech using Docker-based Chatterbox
   */
  async transform(input: Text, options?: TextToSpeechOptions): Promise<Speech> {
    const startTime = Date.now();

    // Cast input to Text
    const text = castToText(input);
    
    // Validate text data
    if (!text.isValid()) {
      throw new Error('Invalid text data provided');
    }

    try {
      // Ensure Docker service is running
      const serviceStarted = await this.dockerService.startService();
      if (!serviceStarted) {
        throw new Error('Failed to start Chatterbox Docker service');
      }

      // Wait for service to be healthy
      const isHealthy = await this.dockerService.waitForHealthy(30000);
      if (!isHealthy) {
        throw new Error('Chatterbox Docker service is not healthy');
      }

      // Handle voice cloning if voice file is provided
      let referenceAudioFilename: string | undefined;
      if (options?.voiceFile) {
        console.log(`[ChatterboxDockerModel] Voice cloning requested with file: ${options.voiceFile}`);
        console.log(`[ChatterboxDockerModel] Force upload option: ${options.forceUpload}`);
        
        try {
          const localFilename = path.basename(options.voiceFile);
          console.log(`[ChatterboxDockerModel] Local filename: ${localFilename}`);
          
          // Check if file already exists on server (unless force upload is requested)
          if (!options.forceUpload) {
            console.log(`[ChatterboxDockerModel] Checking if file already exists on server...`);
            try {
              const existingFiles = await this.apiClient.getReferenceFiles();
              console.log(`[ChatterboxDockerModel] Existing files on server:`, existingFiles);
              if (existingFiles.includes(localFilename)) {
                console.log(`[ChatterboxDockerModel] Reference file '${localFilename}' already exists on server, skipping upload`);
                referenceAudioFilename = localFilename;
              } else {
                console.log(`[ChatterboxDockerModel] File '${localFilename}' not found on server, will upload`);
              }
            } catch (error) {
              console.warn('[ChatterboxDockerModel] Could not check existing files, proceeding with upload:', error);
            }
          } else {
            console.log(`[ChatterboxDockerModel] Force upload enabled, will upload regardless of existing files`);
          }

          // Upload if file doesn't exist or force upload is requested
          if (!referenceAudioFilename || options.forceUpload) {
            console.log(`[ChatterboxDockerModel] ${options.forceUpload ? 'Force uploading' : 'Uploading'} reference file: ${options.voiceFile}`);
            const uploadResult = await this.apiClient.uploadReferenceAudio(options.voiceFile);
            console.log(`[ChatterboxDockerModel] Upload successful, filename: ${uploadResult.filename}`);
            referenceAudioFilename = uploadResult.filename;
          } else {
            console.log(`[ChatterboxDockerModel] Skipping upload, using existing file: ${referenceAudioFilename}`);
          }
        } catch (error) {
          console.error('[ChatterboxDockerModel] Upload error:', error);
          throw new Error(`Failed to upload reference audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      } else {
        console.log(`[ChatterboxDockerModel] No voice file specified, using default voice`);
      }

      // Create TTS request
      console.log(`[ChatterboxDockerModel] Creating TTS request with options:`, {
        voice: options?.voice,
        speed: options?.speed,
        voiceFile: options?.voiceFile,
        outputFormat: options?.format as 'mp3' | 'wav' || 'mp3'
      });
      
      const request = this.apiClient.createTTSRequest(text.content, {
        voice: options?.voice || this.getDefaultVoice(),
        speed: options?.speed || 1.0,
        voiceFile: options?.voiceFile, // Pass voiceFile to set correct voice_mode
        outputFormat: options?.format as 'mp3' | 'wav' || 'mp3'
      });

      // Set reference audio filename if uploaded
      if (referenceAudioFilename) {
        console.log(`[ChatterboxDockerModel] Setting reference_audio_filename to: ${referenceAudioFilename}`);
        request.reference_audio_filename = referenceAudioFilename;
      }
      
      console.log(`[ChatterboxDockerModel] Final TTS request:`, request);



      // Generate output file path
      const timestamp = Date.now();
      const outputFormat = request.output_format;
      const outputPath = path.join(this.tempDir, `chatterbox_${timestamp}.${outputFormat}`);

      try {
        // Perform TTS generation
        const response = await this.apiClient.generateTTS(request, outputPath);

        // Read generated audio file
        const audioData = fs.readFileSync(outputPath);

        // Process response
        const processingTime = Date.now() - startTime;

        // Create Speech result with clean interface
        const speech = new Speech(
          audioData,
          text.sourceAsset // Preserve source Asset reference
        );

        return speech;

      } finally {
        // Clean up temporary file
        this.cleanupTempFile(outputPath);
      }

    } catch (error) {
      throw new Error(`Chatterbox Docker TTS failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
   * Get supported voices
   */
  async getSupportedVoices(): Promise<string[]> {
    return ['Abigail.wav', 'Emma.wav', 'David.wav'];
  }

  /**
   * Get supported emotions
   */
  getSupportedEmotions(): string[] {
    return ['neutral', 'happy', 'sad', 'excited', 'calm'];
  }

  /**
   * Get supported speaking styles
   */
  getSupportedStyles(): string[] {
    return ['conversational', 'news', 'formal', 'casual'];
  }

  /**
   * Get supported languages
   */
  async getSupportedLanguages(): Promise<string[]> {
    return ['en-US', 'en-GB', 'auto'];
  }

  /**
   * Get supported output formats
   */
  getSupportedFormats(): string[] {
    return ['mp3', 'wav'];
  }

  /**
   * Check if voice cloning is supported
   */
  supportsVoiceCloning(): boolean {
    return true;
  }

  /**
   * Check if SSML markup is supported
   */
  supportsSSML(): boolean {
    return false;
  }

  /**
   * Get default voice
   */
  getDefaultVoice(): string {
    return 'Abigail.wav';
  }

  /**
   * Get maximum text length
   */
  getMaxTextLength(): number {
    return 5000;
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
  getDockerService(): ChatterboxDockerService {
    return this.dockerService;
  }

  /**
   * Get API client for direct access
   */
  getAPIClient(): ChatterboxAPIClient {
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
