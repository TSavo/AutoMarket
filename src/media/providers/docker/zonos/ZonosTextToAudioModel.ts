/**
 * ZonosTextToAudioModel
 * 
 * Zonos TTS model implementation following the TextToAudioModel pattern.
 * Based on ChatterboxTextToAudioModel and KokoroDockerModel patterns.
 */

import { TextToAudioModel, TextToAudioOptions } from '../../../models/abstracts/TextToAudioModel';
import { Audio, AudioRole, TextRole, Text } from '../../../assets/roles';
import { ZonosDockerService } from '../../../services/ZonosDockerService';
import { ZonosAPIClient, ZonosTTSRequest, EmotionConfig, ConditioningConfig, GenerationConfig, UnconditionalConfig } from './ZonosAPIClient';
import { createGenerationPrompt, extractInputContent } from '../../../utils/GenerationPromptHelper';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { AudioSequenceBuilder, SequenceOptions } from '../../../../zonos-example/audio-sequence-builder';

export interface ZonosDockerTTSOptions extends TextToAudioOptions {
  // Model selection
  modelChoice?: "Zyphra/Zonos-v0.1-transformer" | "Zyphra/Zonos-v0.1-hybrid";
  language?: string;
    // Voice settings (Zonos-specific)
  speakerAudio?: string | Buffer;    // Voice cloning audio (Zonos-specific)
  prefixAudio?: string | Buffer;     // Audio to continue from
  speakerNoised?: boolean;           // Whether to denoise speaker audio
  
  // Emotion, conditioning, generation, and unconditional configs
  emotion?: EmotionConfig;
  conditioning?: ConditioningConfig;
  generation?: GenerationConfig;
  unconditional?: UnconditionalConfig;
  
  // Sequence options for long text generation
  sequence?: SequenceOptions;
  enableSequenceBuilding?: boolean; // Whether to use sequence building for long texts
  maxSingleChunkLength?: number;    // Maximum characters per single generation (default: 200)
}

export interface ZonosDockerModelConfig {
  dockerService?: ZonosDockerService;
  apiClient?: ZonosAPIClient;
  tempDir?: string;
}

/**
 * Docker-specific Zonos TTS Model implementation
 */
export class ZonosTextToAudioModel extends TextToAudioModel {
  private apiClient: ZonosAPIClient;
  private dockerService: ZonosDockerService;
  private tempDir: string;

  constructor(config: ZonosDockerModelConfig = {}) {
    super({
      id: 'zonos-docker-tts',
      name: 'Zonos TTS (Docker)',
      description: 'Zonos StyleTTS2 text-to-speech model running in Docker container',
      version: '1.0.0',
      provider: 'zonos-docker',
      capabilities: ['text-to-speech', 'voice-cloning', 'emotion-control', 'style-control'],
      inputTypes: ['text'],
      outputTypes: ['speech', 'audio']
    });

    // Initialize dependencies
    this.apiClient = config.apiClient || new ZonosAPIClient();
    this.dockerService = config.dockerService || new ZonosDockerService();
    this.tempDir = config.tempDir || path.join(os.tmpdir(), 'zonos-docker');

    // Ensure temp directory exists
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Transform text to audio using Docker-based Zonos TTS
   */
  async transform(input: TextRole | TextRole[] | string | string[], options?: ZonosDockerTTSOptions): Promise<Audio> {
    const startTime = Date.now();

    // Handle both array and single input
    const inputRole = Array.isArray(input) ? input[0] : input;

    // Handle both TextRole and string inputs
    let text: Text;
    if (typeof inputRole === 'string') {
      text = Text.fromString(inputRole);
    } else {
      text = await inputRole.asText();
    }
    
    // Validate text data
    if (!text.isValid()) {
      throw new Error('Invalid text data provided');
    }

    // Check if we should use sequence building for long texts
    const maxSingleChunkLength = options?.maxSingleChunkLength || 200;
    const enableSequenceBuilding = options?.enableSequenceBuilding ?? (text.content.length > maxSingleChunkLength);
    
    if (enableSequenceBuilding && text.content.length > maxSingleChunkLength) {
      console.log(`[ZonosTextToAudioModel] Text length ${text.content.length} exceeds ${maxSingleChunkLength}, using sequence building`);
      // If inputRole is a string, convert it to a TextRole (using Text class)
      const textRole = typeof inputRole === 'string' ? text : inputRole;
      return await this.transformWithSequenceBuilder(textRole, text, options);
    }    // Ensure service is running
    const serviceStarted = await this.ensureServiceRunning();
    if (!serviceStarted) {
      throw new Error('Failed to start Zonos Docker service');
    }    // Connect to API client if not already connected
    if (!await this.apiClient.isAvailable()) {
      await this.apiClient.connect();
    }

    // Handle voice cloning - map standard interface to Zonos-specific
    let speakerAudio = options?.speakerAudio;
      // Support standard voiceToClone interface
    if (options?.voiceToClone && !speakerAudio) {
      const voiceRole = options.voiceToClone;
      
      try {
        // Get the audio data from the AudioRole
        const audioData = await voiceRole.asAudio();
        
        if (audioData.data && Buffer.isBuffer(audioData.data)) {
          speakerAudio = audioData.data;
          console.log('[ZonosTextToAudioModel] Using voiceToClone audio buffer for voice cloning');
        } else if (audioData.metadata?.localPath) {
          speakerAudio = audioData.metadata.localPath;
          console.log(`[ZonosTextToAudioModel] Using voiceToClone file path: ${audioData.metadata.localPath}`);
        } else {
          console.warn('[ZonosTextToAudioModel] voiceToClone audio has no usable data, ignoring voice cloning');
        }
      } catch (error) {
        console.warn('[ZonosTextToAudioModel] Failed to process voiceToClone:', error);
      }
    }    // Map standard language codes to Zonos-supported ones
    const language = this.mapLanguageCode(options?.language || "en-us");

    // Prepare TTS request
    const ttsRequest: ZonosTTSRequest = {
      text: text.content,
      modelChoice: options?.modelChoice || "Zyphra/Zonos-v0.1-transformer",
      language: language,
      speakerAudio: speakerAudio, // Use processed speaker audio (from voiceToClone or speakerAudio)
      prefixAudio: options?.prefixAudio,
      speakerNoised: options?.speakerNoised || false,
      emotion: options?.emotion,
      conditioning: options?.conditioning,
      generation: options?.generation,
      unconditional: options?.unconditional
    };

    try {
      console.log(`[ZonosTextToAudioModel] Generating TTS for: "${text.content.substring(0, 50)}..."`);
        // Generate audio via API
      const response = await this.apiClient.generateTTS(ttsRequest);
      
      // Handle different response formats
      let audioBuffer: Buffer;
      if (response.audioData) {
        // Float32Array audio data (convert to WAV buffer if needed)
        // For now, expect URL-based download
        throw new Error('Float32Array audio data handling not yet implemented');
      } else if (response.url) {
        // Download from URL
        audioBuffer = await this.apiClient.getAudioBuffer(response);
      } else {
        throw new Error('No audio data received from Zonos API');
      }

      // Save to temporary file
      const tempFileName = `zonos-audio-${Date.now()}.wav`;
      const localPath = path.join(this.tempDir, tempFileName);
      fs.writeFileSync(localPath, audioBuffer);

      const processingTime = Date.now() - startTime;
      
      console.log(`[ZonosTextToAudioModel] Audio saved to: ${localPath}`);
      console.log(`[ZonosTextToAudioModel] Audio generated in ${processingTime}ms`);
      console.log(`[ZonosTextToAudioModel] Audio size: ${audioBuffer.length} bytes`);

      // Create Audio with proper metadata
      const audio = new Audio(
        audioBuffer,
        text.sourceAsset, // Preserve source Asset reference
        {
          format: 'wav' as any,
          fileSize: audioBuffer.length,
          localPath: localPath,
          processingTime,
          model: 'zonos-docker-tts',
          provider: 'zonos-docker',
          text: text.content,          // Zonos-specific metadata
          modelChoice: ttsRequest.modelChoice,
          language: ttsRequest.language,
          seed: response.seed,
          sample_rate: response.sampleRate,
          voiceCloning: !!(options?.speakerAudio),
          emotionSettings: {
            happiness: ttsRequest.emotion?.happiness || 1.0,
            sadness: ttsRequest.emotion?.sadness || 0.05,
            neutral: ttsRequest.emotion?.neutral || 0.2
          },
          conditioningSettings: {
            vqScore: ttsRequest.conditioning?.vqScore || 0.78,
            speakingRate: ttsRequest.conditioning?.speakingRate || 15.0,
            pitchStd: ttsRequest.conditioning?.pitchStd || 45.0
          },
          generation_prompt: createGenerationPrompt({
            input: inputRole, // RAW input object to preserve generation chain
            options: options,
            modelId: 'zonos-docker-tts',
            modelName: 'Zonos StyleTTS2 (Docker)',
            provider: 'zonos-docker',
            transformationType: 'text-to-audio',
            modelMetadata: {
              modelChoice: ttsRequest.modelChoice,
              emotionControl: true,
              voiceCloning: true
            },
            processingTime
          })
        });
      
      console.log(`[ZonosTextToAudioModel] Audio metadata: sample_rate=${response.sampleRate}Hz, size=${(audioBuffer.length / 1024).toFixed(1)}KB`);
      
      return audio;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(`[ZonosTextToAudioModel] Audio generation failed after ${processingTime}ms:`, error);
      throw error;
    }
  }

  /**
   * Transform long text to audio using sequence building
   */
  private async transformWithSequenceBuilder(inputRole: TextRole, text: any, options?: ZonosDockerTTSOptions): Promise<Audio> {
    const startTime = Date.now();

    // Ensure service is running
    const serviceStarted = await this.ensureServiceRunning();
    if (!serviceStarted) {
      throw new Error('Failed to start Zonos Docker service');
    }

    // Connect to API client
    await this.apiClient.connect();

    // Setup sequence builder with proper speaker audio
    let speakerAudioPath: string | undefined;
    if (options?.speakerAudio) {
      if (typeof options.speakerAudio === 'string') {
        speakerAudioPath = options.speakerAudio;
      } else if (Buffer.isBuffer(options.speakerAudio)) {
        // Save buffer to temporary file
        const tempFileName = `speaker-audio-${Date.now()}.wav`;
        speakerAudioPath = path.join(this.tempDir, tempFileName);
        fs.writeFileSync(speakerAudioPath, options.speakerAudio);
      }
    }

    if (!speakerAudioPath) {
      throw new Error('Speaker audio is required for sequence building');
    }

    const sequenceOptions: SequenceOptions = {
      speakerAudio: speakerAudioPath,
      maxChunkLength: options?.sequence?.maxChunkLength || 200,
      pauseAtParagraphs: options?.sequence?.pauseAtParagraphs ?? true,
      pauseDuration: options?.sequence?.pauseDuration || 400,
      pauseBetweenChunks: options?.sequence?.pauseBetweenChunks ?? true,
      chunkPauseDuration: options?.sequence?.chunkPauseDuration || 150,
      outputFormat: options?.sequence?.outputFormat || 'wav',
      mp3Quality: options?.sequence?.mp3Quality || 2,
      voice: {
        conditioning: {
          dnsmos: options?.conditioning?.dnsmos || 4.0,
          fmax: options?.conditioning?.fmax || 24000,
          speakingRate: options?.conditioning?.speakingRate || 15.0,
          pitchStd: options?.conditioning?.pitchStd || 45.0,
          vqScore: options?.conditioning?.vqScore || 0.78,
          ...options?.sequence?.voice?.conditioning
        },
        generation: {
          cfgScale: options?.generation?.cfgScale || 2.0,
          randomizeSeed: options?.generation?.randomizeSeed ?? true,
          baseSeed: options?.generation?.seed || 90000,
          ...options?.sequence?.voice?.generation
        },
        emotion: {
          happiness: options?.emotion?.happiness || 1.0,
          sadness: options?.emotion?.sadness || 0.05,
          neutral: options?.emotion?.neutral || 0.2,
          ...options?.sequence?.voice?.emotion
        }
      }
    };

    const sequenceBuilder = new AudioSequenceBuilder(this.apiClient.getBaseUrl(), sequenceOptions);
    await sequenceBuilder.connect();

    try {
      // Generate combined audio using sequence builder
      const tempFileName = `zonos-sequence-${Date.now()}.${sequenceOptions.outputFormat}`;
      const localPath = path.join(this.tempDir, tempFileName);
      
      console.log(`[ZonosTextToAudioModel] Building audio sequence for text: "${text.content.substring(0, 50)}..."`);
      
      await sequenceBuilder.buildSequence(text.content, localPath, `seq-${Date.now()}`);

      // Read the generated audio file
      const audioBuffer = fs.readFileSync(localPath);
      const processingTime = Date.now() - startTime;

      console.log(`[ZonosTextToAudioModel] Sequence audio saved to: ${localPath}`);
      console.log(`[ZonosTextToAudioModel] Sequence generated in ${processingTime}ms`);
      console.log(`[ZonosTextToAudioModel] Sequence size: ${audioBuffer.length} bytes`);

      // Create Audio with proper metadata
      const audio = new Audio(
        audioBuffer,
        text.sourceAsset, // Preserve source Asset reference
        {
          format: sequenceOptions.outputFormat as any,
          fileSize: audioBuffer.length,
          localPath: localPath,
          processingTime,
          model: 'zonos-docker-tts-sequence',
          provider: 'zonos-docker',
          text: text.content,
          // Zonos-specific metadata
          modelChoice: options?.modelChoice || "Zyphra/Zonos-v0.1-transformer",
          language: options?.language || "en-us",
          sampleRate: 44100, // Zonos outputs at 44kHz
          voiceCloning: true, // Sequence building requires speaker audio
          isSequence: true,
          sequenceOptions,          emotionSettings: sequenceOptions.voice?.emotion || {},
          conditioningSettings: sequenceOptions.voice?.conditioning || {},
          generation_prompt: createGenerationPrompt({
            input: inputRole, // RAW input object to preserve generation chain
            options: options,
            modelId: 'zonos-docker-tts-sequence',
            modelName: 'Zonos StyleTTS2 Sequence (Docker)',
            provider: 'zonos-docker',
            transformationType: 'text-to-audio-sequence',
            modelMetadata: {
              modelChoice: options?.modelChoice,
              emotionControl: true,
              voiceCloning: true,
              sequenceBuilding: true
            },
            processingTime
          })
        });
      
      console.log(`[ZonosTextToAudioModel] Sequence metadata: sample_rate=44100Hz, size=${(audioBuffer.length / 1024).toFixed(1)}KB`);
      
      return audio;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(`[ZonosTextToAudioModel] Sequence generation failed after ${processingTime}ms:`, error);
      throw error;
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
   * Get available voices (Zonos uses voice cloning rather than predefined voices)
   */
  async getAvailableVoices(): Promise<string[]> {
    try {
      return await this.apiClient.getVoices();
    } catch {
      return ['default', 'male-adult', 'female-adult', 'neutral'];
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
    return 5000; // Zonos typically handles moderate text lengths
  }

  /**
   * Check if voice cloning is supported
   */
  supportsVoiceCloning(): boolean {
    return true; // Zonos supports voice cloning via speaker audio
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
    return 'zonos-docker';
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
   * Get Docker service for advanced operations
   */
  getDockerService(): ZonosDockerService {
    return this.dockerService;
  }

  /**
   * Get API client for direct access
   */
  getAPIClient(): ZonosAPIClient {
    return this.apiClient;
  }
  /**
   * Map standard language codes to Zonos-supported language codes
   */
  private mapLanguageCode(language: string): string {
    const languageMapping: Record<string, string> = {
      'en': 'en-us',
      'english': 'en-us',
      'es': 'es',
      'spanish': 'es',
      'fr': 'fr-fr',
      'french': 'fr-fr',
      'de': 'de',
      'german': 'de',
      'it': 'it',
      'italian': 'it',
      'pt': 'pt',
      'portuguese': 'pt',
      'ru': 'ru',
      'russian': 'ru',
      'ja': 'ja',
      'japanese': 'ja',
      'ko': 'ko',
      'korean': 'ko',
      'zh': 'cmn',
      'chinese': 'cmn',
      'mandarin': 'cmn'
    };

    const mappedLanguage = languageMapping[language.toLowerCase()] || language;
    const supportedLanguages = this.getSupportedLanguages();
    
    if (!supportedLanguages.includes(mappedLanguage)) {
      console.warn(`[ZonosTextToAudioModel] Language '${language}' (mapped to '${mappedLanguage}') is not in the supported list. Falling back to 'en-us'.`);
      console.warn(`[ZonosTextToAudioModel] Supported languages: ${supportedLanguages.slice(0, 10).join(', ')}... (${supportedLanguages.length} total)`);
      return 'en-us';
    }
    
    if (mappedLanguage !== language) {
      console.log(`[ZonosTextToAudioModel] Mapped language '${language}' to '${mappedLanguage}'`);
    }
    
    return mappedLanguage;
  }

  /**
   * Get supported language codes for Zonos TTS
   */
  getSupportedLanguages(): string[] {
    return [
      'af', 'am', 'an', 'ar', 'as', 'az', 'ba', 'bg', 'bn', 'bpy', 'bs', 'ca', 
      'cmn', 'cs', 'cy', 'da', 'de', 'el', 'en-029', 'en-gb', 'en-gb-scotland', 
      'en-gb-x-gbclan', 'en-gb-x-gbcwmd', 'en-gb-x-rp', 'en-us', 'eo', 'es', 
      'es-419', 'et', 'eu', 'fa', 'fa-latn', 'fi', 'fr-be', 'fr-ch', 'fr-fr', 
      'ga', 'gd', 'gn', 'grc', 'gu', 'hak', 'hi', 'hr', 'ht', 'hu', 'hy', 'hyw', 
      'ia', 'id', 'is', 'it', 'ja', 'jbo', 'ka', 'kk', 'kl', 'kn', 'ko', 'kok', 
      'ku', 'ky', 'la', 'lfn', 'lt', 'lv', 'mi', 'mk', 'ml', 'mr', 'ms', 'mt', 
      'my', 'nb', 'nci', 'ne', 'nl', 'om', 'or', 'pa', 'pap', 'pl', 'pt', 'pt-br', 
      'py', 'quc', 'ro', 'ru', 'ru-lv', 'sd', 'shn', 'si', 'sk', 'sl', 'sq', 'sr', 
      'sv', 'sw', 'ta', 'te', 'tn', 'tr', 'tt', 'ur', 'uz', 'vi', 'vi-vn-x-central', 
      'vi-vn-x-south', 'yue'
    ];
  }
}
