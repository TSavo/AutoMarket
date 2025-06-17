/**
 * ChatterboxTTSModel - Concrete Implementation
 * 
 * Concrete implementation of TextToSpeechModel using Chatterbox TTS.
 * Coordinates ChatterboxAPIClient and ChatterboxDockerService for speech synthesis.
 */

import { TextToSpeechModel, TextToSpeechOptions } from './TextToSpeechModel';
import { ModelMetadata, TransformationResult } from './Model';
import { Text, Speech } from '../assets/roles';
import { TextInput, castToText } from '../assets/casting';
import { ChatterboxAPIClient } from '../clients/ChatterboxAPIClient';
import { ChatterboxDockerService } from '../services/ChatterboxDockerService';
import fs from 'fs';
import path from 'path';

// Voice information interface
export interface VoiceInfo {
  id: string;
  name: string;
  language: string;
  gender: 'male' | 'female' | 'neutral';
  age: 'child' | 'young' | 'adult' | 'elderly';
  style: string[];
  emotions: string[];
}

export interface ChatterboxTTSModelConfig {
  apiClient?: ChatterboxAPIClient;
  dockerService?: ChatterboxDockerService;
  baseUrl?: string;
  timeout?: number;
  tempDir?: string;
}

/**
 * Concrete Chatterbox TTS model implementation
 */
export class ChatterboxTTSModel extends TextToSpeechModel {
  private apiClient: ChatterboxAPIClient;
  private dockerService: ChatterboxDockerService;
  private tempDir: string;

  constructor(config: ChatterboxTTSModelConfig = {}) {
    const metadata: ModelMetadata = {
      id: 'chatterbox-tts',
      name: 'Chatterbox Text-to-Speech',
      description: 'Chatterbox TTS model for high-quality speech synthesis with voice cloning',
      version: '1.0.0',
      provider: 'chatterbox-docker',
      capabilities: ['text-to-speech', 'speech-synthesis', 'voice-cloning'],
      inputTypes: ['text'],
      outputTypes: ['audio']
    };

    super(metadata);

    // Initialize API client and Docker service
    this.apiClient = config.apiClient || new ChatterboxAPIClient(config.baseUrl, config.timeout);
    this.dockerService = config.dockerService || new ChatterboxDockerService();
    this.tempDir = config.tempDir || path.join(process.cwd(), 'temp', 'chatterbox');

    // Ensure temp directory exists
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Transform text to speech using Chatterbox
   */
  async transform(input: TextInput, options?: TextToSpeechOptions): Promise<Speech> {
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
        throw new Error('Chatterbox service is not healthy');
      }

      // Handle voice cloning if voice file is provided
      let referenceAudioFilename: string | undefined;
      if (options?.voiceFile) {
        console.log(`[ChatterboxTTS] Voice cloning requested with file: ${options.voiceFile}`);
        console.log(`[ChatterboxTTS] Force upload option: ${options.forceUpload}`);
        
        try {
          const localFilename = path.basename(options.voiceFile);
          console.log(`[ChatterboxTTS] Local filename: ${localFilename}`);
          
          // Check if file already exists on server (unless force upload is requested)
          if (!options.forceUpload) {
            console.log(`[ChatterboxTTS] Checking if file already exists on server...`);
            try {
              const existingFiles = await this.apiClient.getReferenceFiles();
              console.log(`[ChatterboxTTS] Existing files on server:`, existingFiles);
              if (existingFiles.includes(localFilename)) {
                console.log(`[ChatterboxTTS] Reference file '${localFilename}' already exists on server, skipping upload`);
                referenceAudioFilename = localFilename;
              } else {
                console.log(`[ChatterboxTTS] File '${localFilename}' not found on server, will upload`);
              }
            } catch (error) {
              console.warn('[ChatterboxTTS] Could not check existing files, proceeding with upload:', error);
            }
          } else {
            console.log(`[ChatterboxTTS] Force upload enabled, will upload regardless of existing files`);
          }

          // Upload if file doesn't exist or force upload is requested
          if (!referenceAudioFilename || options.forceUpload) {
            console.log(`[ChatterboxTTS] ${options.forceUpload ? 'Force uploading' : 'Uploading'} reference file: ${options.voiceFile}`);
            const uploadResult = await this.apiClient.uploadReferenceAudio(options.voiceFile);
            console.log(`[ChatterboxTTS] Upload successful, filename: ${uploadResult.filename}`);
            referenceAudioFilename = uploadResult.filename;
          } else {
            console.log(`[ChatterboxTTS] Skipping upload, using existing file: ${referenceAudioFilename}`);
          }
        } catch (error) {
          console.error('[ChatterboxTTS] Upload error:', error);
          throw new Error(`Failed to upload reference audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      } else {
        console.log(`[ChatterboxTTS] No voice file specified, using default voice`);
      }

      // Create TTS request
      console.log(`[ChatterboxTTS] Creating TTS request with options:`, {
        voice: options?.voice,
        speed: options?.speed,
        voiceFile: options?.voiceFile,
        outputFormat: options?.format as 'mp3' | 'wav' || 'mp3'
      });
      
      const request = this.apiClient.createTTSRequest(text.content, {
        voice: options?.voice,
        speed: options?.speed,
        voiceFile: options?.voiceFile, // Pass voiceFile to set correct voice_mode
        outputFormat: options?.format as 'mp3' | 'wav' || 'mp3'
      });

      // Set reference audio filename if uploaded
      if (referenceAudioFilename) {
        console.log(`[ChatterboxTTS] Setting reference_audio_filename to: ${referenceAudioFilename}`);
        request.reference_audio_filename = referenceAudioFilename;
      }
      
      console.log(`[ChatterboxTTS] Final TTS request:`, request);

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
      throw new Error(`Chatterbox TTS failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
  private getProvider(): string {
    return 'chatterbox-docker';
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
   * Get detailed voice information
   */
  async getVoiceInfo(): Promise<VoiceInfo[]> {
    // Chatterbox has predefined voices - this would typically come from the API
    return [
      {
        id: 'Abigail.wav',
        name: 'Abigail',
        language: 'en-US',
        gender: 'female',
        age: 'adult',
        style: ['conversational', 'friendly'],
        emotions: ['neutral', 'happy', 'calm']
      },
      {
        id: 'Emma.wav',
        name: 'Emma',
        language: 'en-US',
        gender: 'female',
        age: 'young',
        style: ['conversational', 'energetic'],
        emotions: ['neutral', 'excited', 'happy']
      },
      {
        id: 'David.wav',
        name: 'David',
        language: 'en-US',
        gender: 'male',
        age: 'adult',
        style: ['formal', 'news'],
        emotions: ['neutral', 'calm']
      }
    ];
  }

  /**
   * Get supported voices (simple list)
   */
  async getSupportedVoices(): Promise<string[]> {
    const voiceInfo = await this.getVoiceInfo();
    return voiceInfo.map(voice => voice.id);
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
    return false; // Chatterbox doesn't support SSML in this implementation
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
    return 5000; // 5000 characters
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
