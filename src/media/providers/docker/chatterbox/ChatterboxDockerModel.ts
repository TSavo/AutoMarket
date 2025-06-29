/**
 * ChatterboxDockerModel
 * 
 * Docker-specific implementation of Chatterbox TTS model.
 * This is what the ChatterboxDockerProvider returns.
 * 
 * Coordinates ChatterboxAPIClient and ChatterboxDockerService for Docker-based TTS.
 */

import { TextToAudioModel, TextToAudioOptions } from '../../../models/abstracts/TextToAudioModel';
import { ChatterboxAPIClient } from './ChatterboxAPIClient';
import { ChatterboxDockerService } from '../../../services/ChatterboxDockerService';
import { Text, Audio, TextRole, AudioRole, hasAudioRole } from '../../../assets/roles';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Extended options for Chatterbox Docker TTS
export interface ChatterboxDockerTTSOptions extends TextToAudioOptions {
  forceUpload?: boolean;
}

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
export class ChatterboxDockerModel extends TextToAudioModel {
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
   * Transform text to audio using Docker-based Chatterbox TTS
   */
  async transform(input: TextRole | TextRole[] | string | string[], options?: ChatterboxDockerTTSOptions): Promise<Audio> {
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

    // Extract voice cloning audio from options
    let voiceAudio: Audio | undefined;
    if (options?.voiceToClone) {
      voiceAudio = await options.voiceToClone.asRole(Audio);
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
        console.log(`[ChatterboxDockerModel] Force upload option: ${options?.forceUpload}`);
        
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
          if (!options?.forceUpload) {
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
          if (!referenceAudioFilename || options?.forceUpload) {
            console.log(`[ChatterboxDockerModel] ${options?.forceUpload ? 'Force uploading' : 'Uploading'} reference file: ${tempPath}`);
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
        speed: options?.speed,
        voiceCloning: !!voiceAudio,
        outputFormat: options?.format as 'mp3' | 'wav' || 'mp3'
      });
      
      const request = this.apiClient.createTTSRequest(text.content, {
        speed: options?.speed || 1.0,
        voiceFile: voiceAudio ? 'voice_clone_mode' : undefined, // Indicates voice cloning mode
        outputFormat: options?.format as 'mp3' | 'wav' || 'mp3'
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

        // Create Audio result with clean interface
        const audio = new Audio(
          audioData,
          text.sourceAsset // Preserve source Asset reference
        );

        return audio;

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

  /**
   * Get the input schema for this model
   */
  getInputSchema(): any {
    return {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          maxLength: this.getMaxTextLength(),
          description: 'Text content to convert to speech'
        }
      },
      required: ['content']
    };
  }

  /**
   * Get the output schema for this model
   */
  getOutputSchema(): any {
    return {
      type: 'object',
      properties: {
        data: {
          type: 'string',
          format: 'binary',
          description: 'Generated audio data'
        },
        format: {
          type: 'string',
          enum: this.getSupportedFormats(),
          description: 'Audio format'
        }
      },
      required: ['data', 'format']
    };
  }

  /**
   * Get available voices for this model
   */
  async getAvailableVoices(): Promise<string[]> {
    // Return standard voices supported by Chatterbox
    return [
      'en-US-AriaNeural',
      'en-US-DavisNeural', 
      'en-US-GuyNeural',
      'en-US-JennyNeural',
      'en-GB-SoniaNeural',
      'en-AU-NatashaNeural'
    ];
  }
}
