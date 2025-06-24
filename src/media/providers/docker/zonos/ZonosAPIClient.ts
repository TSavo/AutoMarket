/**
 * ZonosAPIClient
 * 
 * API client for communicating with Zonos TTS Docker container.
 * Based on the working zonos-client.ts example using @gradio/client.
 */

// Use dynamic import to handle ESM package
let Client: any;

async function getGradioClient() {
  if (!Client) {
    const gradio = await import("@gradio/client");
    Client = gradio.Client;
  }
  return Client;
}
import * as fs from "fs";
import * as path from "path";

/**
 * Emotion configuration for voice synthesis
 */
export interface EmotionConfig {
  happiness?: number;    // 0.0 - 1.0, default: 1.0
  sadness?: number;      // 0.0 - 1.0, default: 0.05
  disgust?: number;      // 0.0 - 1.0, default: 0.05
  fear?: number;         // 0.0 - 1.0, default: 0.05
  surprise?: number;     // 0.0 - 1.0, default: 0.05
  anger?: number;        // 0.0 - 1.0, default: 0.05
  other?: number;        // 0.0 - 1.0, default: 0.1
  neutral?: number;      // 0.0 - 1.0, default: 0.2
}

/**
 * Conditioning parameters for voice synthesis
 */
export interface ConditioningConfig {
  dnsmos?: number;       // 1.0 - 5.0, default: 4.0 (overall audio quality)
  fmax?: number;         // 0 - 24000, default: 24000 (frequency max in Hz)
  vqScore?: number;      // 0.5 - 0.8, default: 0.78 (voice quality score)
  pitchStd?: number;     // 0.0 - 300.0, default: 45.0 (pitch variation)
  speakingRate?: number; // 5.0 - 30.0, default: 15.0 (words per minute)
}

/**
 * Generation parameters for controlling output
 */
export interface GenerationConfig {
  cfgScale?: number;     // 1.0 - 5.0, default: 2.0 (classifier-free guidance)
  seed?: number;         // Random seed, default: random
  randomizeSeed?: boolean; // Whether to randomize seed, default: true
  
  // NovelAI unified sampler
  linear?: number;       // -2.0 - 2.0, default: 0.5
  confidence?: number;   // -2.0 - 2.0, default: 0.40
  quadratic?: number;    // -2.0 - 2.0, default: 0.00
  
  // Legacy sampling
  topP?: number;         // 0.0 - 1.0, default: 0
  minK?: number;         // 0.0 - 1024, default: 0
  minP?: number;         // 0.0 - 1.0, default: 0
}

/**
 * Unconditional toggles - when enabled, the model ignores the corresponding conditioning
 */
export interface UnconditionalConfig {
  speaker?: boolean;     // Ignore speaker conditioning
  emotion?: boolean;     // Ignore emotion conditioning (default: true)
  vqscore?: boolean;     // Ignore VQ score
  fmax?: boolean;        // Ignore frequency max
  pitchStd?: boolean;    // Ignore pitch std
  speakingRate?: boolean; // Ignore speaking rate
  dnsmos?: boolean;      // Ignore DNSMOS
  speakerNoised?: boolean; // Ignore speaker noise flag
}

export interface ZonosTTSRequest {
  text: string;
  modelChoice?: "Zyphra/Zonos-v0.1-transformer" | "Zyphra/Zonos-v0.1-hybrid";
  language?: string;     // Default: "en-us"
  speakerAudio?: string | Buffer; // Path to audio file or audio buffer
  prefixAudio?: string | Buffer;  // Audio to continue from
  speakerNoised?: boolean; // Whether to denoise speaker audio
  emotion?: EmotionConfig;
  conditioning?: ConditioningConfig;
  generation?: GenerationConfig;
  unconditional?: UnconditionalConfig;
}

export interface ZonosTTSResponse {
  audioData?: Float32Array;
  sampleRate: number;
  seed: number;
  url?: string;         // URL to download the audio
  tempPath?: string;    // Temporary file path on server
}

export interface ZonosAPIConfig {
  baseUrl?: string;
  timeout?: number;
  retries?: number;
}

/**
 * Zonos TTS API Client using @gradio/client
 */
export class ZonosAPIClient {
  private client: any = null;
  private baseUrl: string;
  private timeout: number;
  private retries: number;

  constructor(config: ZonosAPIConfig = {}) {
    this.baseUrl = config.baseUrl || 'http://localhost:7860';
    this.timeout = config.timeout || 300000; // 5 minutes
    this.retries = config.retries || 3;
  }

  /**
   * Configure the API client
   */
  configure(config: ZonosAPIConfig): void {
    if (config.baseUrl) this.baseUrl = config.baseUrl;
    if (config.timeout) this.timeout = config.timeout;
    if (config.retries) this.retries = config.retries;
  }
  /**
   * Initialize the client connection
   */
  async connect(): Promise<void> {
    try {
      const ClientClass = await getGradioClient();
      this.client = await ClientClass.connect(this.baseUrl);
      console.log("Connected to Zonos Gradio interface");
    } catch (error) {
      throw new Error(`Failed to connect to Zonos API at ${this.baseUrl}: ${error}`);
    }
  }

  /**
   * Disconnect from the API
   */
  async disconnect(): Promise<void> {
    // Gradio client doesn't have explicit disconnect method
    this.client = null;
  }
  /**
   * Check if the API is available and connect if needed
   */
  async isAvailable(): Promise<boolean> {
    try {
      if (!this.client) {
        await this.connect();
      }
      return this.client !== null;
    } catch {
      return false;
    }
  }

  /**
   * Get available voices (Zonos doesn't have explicit voice endpoints, return default voices)
   */
  async getVoices(): Promise<string[]> {
    // Zonos uses reference audio files for voice cloning rather than predefined voices
    // Return some common voice descriptions
    return [
      'default',
      'male-adult',
      'female-adult', 
      'male-young',
      'female-young',
      'neutral'
    ];
  }
  /**
   * Generate TTS audio using Gradio interface
   */
  async generateTTS(request: ZonosTTSRequest): Promise<ZonosTTSResponse> {
    if (!this.client) {
      await this.connect();
    }

    if (!this.client) {
      throw new Error("Failed to connect to Zonos Gradio interface");
    }

    // Set default values
    const modelChoice = request.modelChoice || "Zyphra/Zonos-v0.1-transformer";
    const language = request.language || "en-us";
    const speakerNoised = request.speakerNoised || false;
    
    // Emotion defaults
    const emotion = {
      happiness: 1.0,
      sadness: 0.05,
      disgust: 0.05,
      fear: 0.05,
      surprise: 0.05,
      anger: 0.05,
      other: 0.1,
      neutral: 0.2,
      ...request.emotion
    };

    // Conditioning defaults
    const conditioning = {
      dnsmos: 4.0,
      fmax: 24000,
      vqScore: 0.78,
      pitchStd: 45.0,
      speakingRate: 15.0,
      ...request.conditioning
    };

    // Generation defaults
    const generation = {
      cfgScale: 2.0,
      seed: request.generation?.seed || Math.floor(Math.random() * 1000000),
      randomizeSeed: request.generation?.randomizeSeed ?? true,
      linear: 0.5,
      confidence: 0.40,
      quadratic: 0.00,
      topP: 0,
      minK: 0,
      minP: 0,
      ...request.generation
    };

    // Unconditional defaults
    const unconditional = {
      speaker: false,
      emotion: true, // Default to unconditional emotion
      vqscore: false,
      fmax: false,
      pitchStd: false,
      speakingRate: false,
      dnsmos: false,
      speakerNoised: false,
      ...request.unconditional
    };

    // Convert unconditional object to array format expected by Gradio
    const unconditionalKeys: string[] = [];
    if (unconditional.speaker) unconditionalKeys.push("speaker");
    if (unconditional.emotion) unconditionalKeys.push("emotion");
    if (unconditional.vqscore) unconditionalKeys.push("vqscore_8");
    if (unconditional.fmax) unconditionalKeys.push("fmax");
    if (unconditional.pitchStd) unconditionalKeys.push("pitch_std");
    if (unconditional.speakingRate) unconditionalKeys.push("speaking_rate");
    if (unconditional.dnsmos) unconditionalKeys.push("dnsmos_ovrl");
    if (unconditional.speakerNoised) unconditionalKeys.push("speaker_noised");    // Handle audio file inputs
    let speakerAudioFile: Buffer | null = null;
    let prefixAudioFile: Buffer | null = null;

    if (request.speakerAudio) {
      speakerAudioFile = await this.handleAudioInput(request.speakerAudio);
    }

    if (request.prefixAudio) {
      prefixAudioFile = await this.handleAudioInput(request.prefixAudio);
    }

    try {
      // Call the Gradio interface using positional arguments (function index 2)
      const result = await this.client.predict(2, [
        modelChoice,                    // model_choice
        request.text,                   // text
        language,                       // language
        speakerAudioFile,              // speaker_audio
        prefixAudioFile,               // prefix_audio
        emotion.happiness,             // emotion1
        emotion.sadness,               // emotion2
        emotion.disgust,               // emotion3
        emotion.fear,                  // emotion4
        emotion.surprise,              // emotion5
        emotion.anger,                 // emotion6
        emotion.other,                 // emotion7
        emotion.neutral,               // emotion8
        conditioning.vqScore,          // vq_single_slider
        conditioning.fmax,             // fmax_slider
        conditioning.pitchStd,         // pitch_std_slider
        conditioning.speakingRate,     // speaking_rate_slider
        conditioning.dnsmos,           // dnsmos_slider
        speakerNoised,                 // speaker_noised_checkbox
        generation.cfgScale,           // cfg_scale_slider
        generation.topP,               // top_p_slider
        generation.minK,               // min_k_slider
        generation.minP,               // min_p_slider
        generation.linear,             // linear_slider
        generation.confidence,         // confidence_slider
        generation.quadratic,          // quadratic_slider
        generation.seed,               // seed_number
        generation.randomizeSeed,      // randomize_seed_toggle
        unconditionalKeys             // unconditional_keys
      ]);

      // Extract audio data from result
      if (result && typeof result === 'object' && 'data' in result) {
        const data = (result as any).data;
        if (Array.isArray(data) && data.length >= 2) {
          const [audioFileData, finalSeed] = data;
          
          if (audioFileData && typeof audioFileData === 'object' && 'url' in audioFileData) {
            return {
              sampleRate: 44100, // Zonos outputs at 44kHz
              seed: finalSeed,
              url: audioFileData.url,
              tempPath: audioFileData.path
            };
          }
        }
      }      throw new Error("Unexpected response format from TTS generation");

    } catch (error) {
      // Provide more detailed error information
      let errorMessage = "Failed to generate speech";
      
      if (error && typeof error === 'object') {
        if ('message' in error) {
          errorMessage += `: ${error.message}`;
        } else {
          errorMessage += `: ${JSON.stringify(error)}`;
        }
      } else if (typeof error === 'string') {
        errorMessage += `: ${error}`;
      } else {
        errorMessage += `: Unknown error occurred`;
      }
      
      console.error('[ZonosAPIClient] TTS generation error:', error);
      throw new Error(errorMessage);
    }
  }

  /**
   * Get service info
   */
  async getServiceInfo(): Promise<any> {
    try {
      if (!this.client) {
        await this.connect();
      }
      if (this.client) {
        return {
          status: 'online',
          serverUrl: this.baseUrl,
          model: 'Zonos StyleTTS2'
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Handle audio input - convert file path to Buffer for Gradio client
   * According to Gradio docs: "For certain inputs, such as images, you should pass in a Buffer, Blob or File"
   */
  private async handleAudioInput(audio: string | Buffer): Promise<Buffer | null> {
    if (Buffer.isBuffer(audio)) {
      return audio;
    }
    
    if (typeof audio === "string") {
      try {
        // Handle relative paths from the current working directory
        let filePath = audio;
        if (!path.isAbsolute(audio)) {
          filePath = path.resolve(process.cwd(), audio);
        }
        
        // Check if file exists
        if (!fs.existsSync(filePath)) {
          console.warn(`Audio file not found: ${filePath}`);
          return null;
        }
        
        // Read file as Buffer - this is what Gradio client expects
        const buffer = fs.readFileSync(filePath);
        console.log(`Successfully loaded audio file: ${filePath} (${buffer.length} bytes)`);
        return buffer;
        
      } catch (error) {
        console.warn(`Could not read audio file ${audio}:`, error);
        return null;
      }
    }
    
    return null;
  }

  /**
   * Download audio from URL and save to file
   */
  async saveAudio(result: ZonosTTSResponse, outputPath: string): Promise<void> {
    if (!result.url) {
      throw new Error("No audio URL available in result");
    }

    try {
      const response = await fetch(result.url);
      if (!response.ok) {
        throw new Error(`Failed to download audio: ${response.statusText}`);
      }
      
      const audioBuffer = await response.arrayBuffer();
      fs.writeFileSync(outputPath, Buffer.from(audioBuffer));
      console.log(`Audio saved to: ${outputPath}`);
    } catch (error) {
      throw new Error(`Failed to save audio: ${error}`);
    }
  }

  /**
   * Download audio from URL and return as buffer
   */
  async getAudioBuffer(result: ZonosTTSResponse): Promise<Buffer> {
    if (!result.url) {
      throw new Error("No audio URL available in result");
    }

    try {
      const response = await fetch(result.url);
      if (!response.ok) {
        throw new Error(`Failed to download audio: ${response.statusText}`);
      }
      
      const audioBuffer = await response.arrayBuffer();
      return Buffer.from(audioBuffer);
    } catch (error) {
      throw new Error(`Failed to get audio buffer: ${error}`);
    }
  }

  /**
   * Quick TTS method with minimal configuration
   */
  async quickTTS(text: string, speakerAudio?: string): Promise<ZonosTTSResponse> {
    return this.generateTTS({
      text,
      speakerAudio,
      // Use defaults for everything else
    });
  }

  /**
   * Get base URL
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Get current configuration
   */
  getConfig(): ZonosAPIConfig {
    return {
      baseUrl: this.baseUrl,
      timeout: this.timeout,
      retries: this.retries
    };
  }
}
