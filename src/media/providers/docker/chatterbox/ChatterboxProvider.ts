/**
 * Chatterbox TTS Provider (Local)
 * 
 * Supports multiple TTS capabilities through Docker container
 */

import { 
  MediaProvider, 
  ProviderType, 
  MediaCapability, 
  ProviderModel, 
  ProviderConfig, 
  GenerationRequest, 
  GenerationResult, 
  JobStatus 
} from '../../../types/provider';
import { v4 as uuidv4 } from 'uuid';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class ChatterboxProvider implements MediaProvider {
  readonly id = 'chatterbox';
  readonly name = 'Chatterbox TTS';
  readonly type = ProviderType.LOCAL;
  readonly capabilities = [
    MediaCapability.TEXT_TO_AUDIO,
    MediaCapability.TEXT_TO_AUDIO, // Voice cloning is also text-to-audio
    MediaCapability.AUDIO_TO_AUDIO // Audio enhancement
  ];

  private config?: ProviderConfig;
  private dockerImage = 'chatterbox-tts:latest';
  private baseUrl = 'http://localhost:8080';

  /**
   * Constructor automatically configures from environment variables
   */
  constructor() {
    // Auto-configure from environment variables (async but non-blocking)
    this.autoConfigureFromEnv().catch(error => {
      // Silent fail - provider will just not be available until manually configured
    });
  }

  /**
   * Automatically configure from environment variables
   */
  private async autoConfigureFromEnv(): Promise<void> {
    const baseUrl = process.env.CHATTERBOX_DOCKER_URL || 'http://localhost:8004';
    
    try {
      await this.configure({
        baseUrl,
        timeout: 300000,
        retries: 2
      });
    } catch (error) {
      console.warn(`[ChatterboxProvider] Auto-configuration failed: ${error.message}`);
    }
  }

  readonly models: ProviderModel[] = [
    {
      id: 'chatterbox-standard',
      name: 'Chatterbox Standard TTS',
      description: 'High-quality text-to-speech with multiple voices',
      capabilities: [MediaCapability.TEXT_TO_AUDIO],
      parameters: {
        voice: { type: 'string', default: 'en-US-AriaNeural', options: ['en-US-AriaNeural', 'en-US-DavisNeural', 'en-US-GuyNeural'] },
        speed: { type: 'number', default: 1.0, min: 0.5, max: 2.0 },
        pitch: { type: 'number', default: 1.0, min: 0.5, max: 2.0 },
        volume: { type: 'number', default: 1.0, min: 0.1, max: 1.0 }
      },
      pricing: {
        inputCost: 0, // Free local service
        outputCost: 0,
        currency: 'USD'
      }
    },
    {
      id: 'chatterbox-voice-clone',
      name: 'Chatterbox Voice Cloning',
      description: 'Clone voices from audio samples',
      capabilities: [MediaCapability.TEXT_TO_AUDIO], // Voice cloning is text-to-audio with voice input
      parameters: {
        referenceAudio: { type: 'file', required: true },
        text: { type: 'string', required: true },
        similarity: { type: 'number', default: 0.8, min: 0.1, max: 1.0 }
      },
      pricing: {
        inputCost: 0,
        outputCost: 0,
        currency: 'USD'
      }
    }
  ];

  async configure(config: ProviderConfig): Promise<void> {
    this.config = config;
    if (config.dockerImage) {
      this.dockerImage = config.dockerImage;
    }
    if (config.baseUrl) {
      this.baseUrl = config.baseUrl;
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Check if Docker container is running
      const { stdout } = await execAsync(`docker ps --filter "ancestor=${this.dockerImage}" --format "{{.ID}}"`);
      
      if (!stdout.trim()) {
        // Try to start the container
        console.log(`Starting Chatterbox Docker container: ${this.dockerImage}`);
        await execAsync(`docker run -d -p 8080:8080 ${this.dockerImage}`);
        
        // Wait a moment for startup
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

      // Test API endpoint
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch (error) {
      console.warn('Chatterbox provider not available:', error);
      return false;
    }
  }

  getModelsForCapability(capability: MediaCapability): ProviderModel[] {
    return this.models.filter(model => model.capabilities.includes(capability));
  }

  async generate(request: GenerationRequest): Promise<GenerationResult> {
    const jobId = uuidv4();
    
    try {
      const model = this.models.find(m => m.id === request.modelId);
      if (!model) {
        throw new Error(`Model ${request.modelId} not found`);
      }

      let result: any;

      switch (request.capability) {
        case MediaCapability.TEXT_TO_AUDIO:
          result = await this.generateTTS(request, jobId);
          break;
        case MediaCapability.TEXT_TO_AUDIO: // Voice cloning case
          result = await this.generateVoiceClone(request, jobId);
          break;
        default:
          throw new Error(`Capability ${request.capability} not supported`);
      }

      return {
        jobId,
        status: JobStatus.COMPLETED,
        output: result,
        metadata: {
          cost: {
            amount: 0,
            currency: 'USD'
          }
        }
      };
    } catch (error) {
      return {
        jobId,
        status: JobStatus.FAILED,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async generateTTS(request: GenerationRequest, jobId: string) {
    const { text, voice = 'en-US-AriaNeural', speed = 1.0, pitch = 1.0, volume = 1.0 } = request.parameters;

    const response = await fetch(`${this.baseUrl}/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        voice,
        speed,
        pitch,
        volume,
        format: 'wav'
      })
    });

    if (!response.ok) {
      throw new Error(`TTS generation failed: ${response.statusText}`);
    }

    const audioBuffer = await response.arrayBuffer();
    
    return {
      type: 'audio' as const,
      data: Buffer.from(audioBuffer),
      metadata: {
        format: 'wav',
        voice,
        duration: this.estimateAudioDuration(text),
        sampleRate: 22050
      }
    };
  }

  private async generateVoiceClone(request: GenerationRequest, jobId: string) {
    const { referenceAudio, text, similarity = 0.8 } = request.parameters;

    // This would implement voice cloning logic
    // For now, return a placeholder
    throw new Error('Voice cloning not yet implemented');
  }

  private estimateAudioDuration(text: string): number {
    // Rough estimate: ~150 words per minute, ~5 characters per word
    const wordsPerMinute = 150;
    const charactersPerWord = 5;
    const estimatedWords = text.length / charactersPerWord;
    return (estimatedWords / wordsPerMinute) * 60; // seconds
  }

  async getJobStatus(jobId: string): Promise<GenerationResult> {
    // For local providers, jobs complete immediately
    return {
      jobId,
      status: JobStatus.COMPLETED
    };
  }

  async cancelJob(jobId: string): Promise<boolean> {
    // Local jobs can't be cancelled as they complete immediately
    return false;
  }

  async getHealth() {
    const isAvailable = await this.isAvailable();
    
    return {
      status: isAvailable ? 'healthy' as const : 'unhealthy' as const,
      uptime: process.uptime(),
      activeJobs: 0,
      queuedJobs: 0
    };
  }

  /**
   * Get a model instance by ID with automatic type detection
   */
  async getModel(modelId: string): Promise<any> {
    if (!await this.isAvailable()) {
      throw new Error('Chatterbox provider is not available');
    }

    // Check if the model exists
    const model = this.models.find(m => m.id === modelId);
    if (!model) {
      throw new Error(`Model '${modelId}' not found in Chatterbox provider`);
    }

    // Chatterbox only supports text-to-audio models
    if (model.capabilities.includes(MediaCapability.TEXT_TO_AUDIO)) {
      const { ChatterboxTextToAudioModel } = await import('./ChatterboxTextToAudioModel');
      return new ChatterboxTextToAudioModel({
        baseUrl: this.config?.baseUrl || 'http://localhost:8004',
        timeout: this.config?.timeout || 300000
      });
    }

    throw new Error(`Unsupported model type for '${modelId}' in Chatterbox provider`);
  }

}
