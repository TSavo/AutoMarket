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
import { Text, Speech, Audio, hasSpeechRole } from '../assets/roles';
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
   * Transform text to speech using Docker-based Chatterbox - basic TTS
   */
  async transform(input: Text, options?: TextToSpeechOptions): Promise<Speech>;
  
  /**
   * Transform text to speech with voice cloning - dual-signature pattern
   */
  async transform(text: Text, voiceAudio: Speech, options?: TextToSpeechOptions): Promise<Speech>;
  
  /**
   * Implementation for both transform signatures
   */
  async transform(
    input: Text, 
    voiceAudioOrOptions?: Speech | TextToSpeechOptions, 
    options?: TextToSpeechOptions
  ): Promise<Speech> {
    const startTime = Date.now();

    // Cast input to Text
    const text = await castToText(input);
    
    // Validate text data
    if (!text.isValid()) {
      throw new Error('Invalid text data provided');
    }

    // Parse arguments to determine which signature was used
    let voiceAudio: Speech | undefined;
    let actualOptions: TextToSpeechOptions | undefined;
    
    if (voiceAudioOrOptions && hasSpeechRole(voiceAudioOrOptions)) {
      // Second signature: transform(text, voiceSpeech, options)
      voiceAudio = await voiceAudioOrOptions.asSpeech();
      actualOptions = options;
    } else {
      // First signature: transform(text, options)
      voiceAudio = undefined;
      actualOptions = voiceAudioOrOptions as TextToSpeechOptions;
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

      // Handle voice cloning if voiceAudio is provided
      let referenceAudioFilename: string | undefined;
      if (voiceAudio) {
        console.log(`[ChatterboxDockerModel] Voice cloning requested with Audio object`);
        console.log(`[ChatterboxDockerModel] Force upload option: ${actualOptions?.forceUpload}`);
        
        try {
          // Generate a filename for the audio data
          const timestamp = Date.now();
          const format = voiceAudio.getFormat();
          const localFilename = `voice_clone_${timestamp}.${format}`;
          const tempPath = path.join(this.tempDir, localFilename);
          
          // Write audio data to temporary file
          fs.writeFileSync(tempPath, voiceAudio.data);
          console.log(`[ChatterboxDockerModel] Wrote voice audio to temp file: ${tempPath}`);
          
          console.log(`[ChatterboxDockerModel] Local filename: ${localFilename}`);
          
          // Check if file already exists on server (unless force upload is requested)
          if (!actualOptions?.forceUpload) {
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
          if (!referenceAudioFilename || actualOptions?.forceUpload) {
            console.log(`[ChatterboxDockerModel] ${actualOptions?.forceUpload ? 'Force uploading' : 'Uploading'} reference file: ${tempPath}`);
            const uploadResult = await this.apiClient.uploadReferenceAudio(tempPath);
            console.log(`[ChatterboxDockerModel] Upload successful, filename: ${uploadResult.filename}`);
            referenceAudioFilename = uploadResult.filename;
          } else {
            console.log(`[ChatterboxDockerModel] Skipping upload, using existing file: ${referenceAudioFilename}`);
          }
          
          // Clean up temporary file
          this.cleanupTempFile(tempPath);
        } catch (error) {
          console.error('[ChatterboxDockerModel] Upload error:', error);
          throw new Error(`Failed to upload reference audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      } else {
        console.log(`[ChatterboxDockerModel] No voice audio specified, using default voice`);
      }

      // Create TTS request
      console.log(`[ChatterboxDockerModel] Creating TTS request with options:`, {
        speed: actualOptions?.speed,
        voiceCloning: !!voiceAudio,
        outputFormat: actualOptions?.format as 'mp3' | 'wav' || 'mp3'
      });
      
      const request = this.apiClient.createTTSRequest(text.content, {
        speed: actualOptions?.speed || 1.0,
        voiceFile: voiceAudio ? 'voice_clone_mode' : undefined, // Indicates voice cloning mode
        outputFormat: actualOptions?.format as 'mp3' | 'wav' || 'mp3'
      });

      // For basic TTS, set default voice if not voice cloning
      if (!voiceAudio) {
        request.predefined_voice_id = this.getDefaultVoice();
      }

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
