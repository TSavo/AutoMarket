import { Client } from "@gradio/client";
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

/**
 * Complete configuration for TTS generation
 */
export interface TTSConfig {
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

/**
 * TTS generation result
 */
export interface TTSResult {
  audioData: Float32Array;
  sampleRate: number;
  seed: number;
}

/**
 * Zonos TTS API Client
 */
export class ZonosClient {
  private client: Client | null = null;
  private baseUrl: string;

  constructor(baseUrl: string = "http://localhost:7860") {
    this.baseUrl = baseUrl;
  }

  /**
   * Initialize the client connection
   */
  async connect(): Promise<void> {
    try {
      this.client = await Client.connect(this.baseUrl);
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
   * Generate speech from text with optional voice cloning and conditioning
   */
  async generateSpeech(config: TTSConfig): Promise<TTSResult> {
    if (!this.client) {
      throw new Error("Client not connected. Call connect() first.");
    }

    // Set default values
    const modelChoice = config.modelChoice || "Zyphra/Zonos-v0.1-transformer";
    const language = config.language || "en-us";
    const speakerNoised = config.speakerNoised || false;
    
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
      ...config.emotion
    };

    // Conditioning defaults
    const conditioning = {
      dnsmos: 4.0,
      fmax: 24000,
      vqScore: 0.78,
      pitchStd: 45.0,
      speakingRate: 15.0,
      ...config.conditioning
    };

    // Generation defaults
    const generation = {
      cfgScale: 2.0,
      seed: config.generation?.seed || Math.floor(Math.random() * 1000000),
      randomizeSeed: config.generation?.randomizeSeed ?? true,
      linear: 0.5,
      confidence: 0.40,
      quadratic: 0.00,
      topP: 0,
      minK: 0,
      minP: 0,
      ...config.generation
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
      ...config.unconditional
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
    let prefixAudioFile: Buffer | { path: string; meta: { _type: string } } | null = null;

    if (config.speakerAudio) {
      speakerAudioFile = await this.handleAudioInput(config.speakerAudio);
    }    if (config.prefixAudio) {
      prefixAudioFile = await this.handleAudioInput(config.prefixAudio);
    } else {
      // Use default silence file if no prefix provided
      prefixAudioFile = {
        path: "assets/silence_100ms.wav",
        meta: { _type: "gradio.FileData" }
      };
    }try {
      // Call the Gradio interface with positional arguments in the correct order
      // Based on the gradio_interface.py inputs order
      const result = await this.client.predict("/generate_audio", [
        modelChoice,                    // model_choice
        config.text,                    // text
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
        unconditionalKeys,             // unconditional_keys
      ]);

      // Extract audio data and sample rate from result
      const [audioTuple, finalSeed] = result.data as [[number, Float32Array], number];
      const [sampleRate, audioData] = audioTuple;

      return {
        audioData,
        sampleRate,
        seed: finalSeed
      };    } catch (error) {
      console.error("Gradio API error:", error);
      throw new Error(`Failed to generate speech: ${JSON.stringify(error, null, 2)}`);
    }
  }
  /**
   * Handle audio input (file path or buffer) and create proper FileData structure
   */
  private async handleAudioInput(audio: string | Buffer): Promise<any> {
    let filePath: string;
    
    if (typeof audio === "string") {
      // It's a file path
      if (!fs.existsSync(audio)) {
        throw new Error(`Audio file not found: ${audio}`);
      }
      filePath = audio;
    } else {
      // It's a buffer - need to write to temp file
      filePath = path.join(process.cwd(), `temp_audio_${Date.now()}.wav`);
      fs.writeFileSync(filePath, audio);
    }

    // Create the FileData structure that Gradio expects
    return {
      path: filePath,
      meta: { _type: "gradio.FileData" }
    };
  }

  /**
   * Save audio result to file
   */
  async saveAudio(result: TTSResult, outputPath: string): Promise<void> {
    // Convert Float32Array to WAV format
    const audioBuffer = this.createWavBuffer(result.audioData, result.sampleRate);
    fs.writeFileSync(outputPath, audioBuffer);
  }

  /**
   * Create WAV file buffer from audio data
   */
  private createWavBuffer(audioData: Float32Array, sampleRate: number): Buffer {
    const length = audioData.length;
    const buffer = Buffer.alloc(44 + length * 2);

    // WAV header
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + length * 2, 4);
    buffer.write('WAVE', 8);
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16);
    buffer.writeUInt16LE(1, 20); // PCM
    buffer.writeUInt16LE(1, 22); // Mono
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(sampleRate * 2, 28);
    buffer.writeUInt16LE(2, 32);
    buffer.writeUInt16LE(16, 34);
    buffer.write('data', 36);
    buffer.writeUInt32LE(length * 2, 40);

    // Convert float32 to int16
    for (let i = 0; i < length; i++) {
      const sample = Math.max(-1, Math.min(1, audioData[i]));
      buffer.writeInt16LE(sample * 0x7FFF, 44 + i * 2);
    }

    return buffer;
  }

  /**
   * Quick TTS method with minimal configuration
   */
  async quickTTS(text: string, speakerAudio?: string): Promise<TTSResult> {
    return this.generateSpeech({
      text,
      speakerAudio,
      // Use defaults for everything else
    });
  }
}
