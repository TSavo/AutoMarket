/**
 * TextToAudioModel - Abstract Base Class
 *
 * Abstract base class for text-to-audio models, including text-to-speech (TTS) and 
 * voice cloning capabilities. This class provides a unified interface for transforming
 * text input into audio output using various AI models and services.
 * 
 * ## Features
 * - **Basic Text-to-Speech**: Convert text to natural-sounding speech
 * - **Voice Cloning**: Generate speech using a reference voice sample
 * - **Multi-format Output**: Support for MP3, WAV, and other audio formats
 * - **Customizable Parameters**: Control speed, pitch, volume, and quality
 * - **Asset-Role System**: Automatic type casting and validation
 * - **Provider Agnostic**: Works with any provider implementation
 * 
 * ## Architecture
 * Uses the Asset-role system for type-safe input/output handling with automatic
 * casting between TextRole and AudioRole types. The dual-signature transform
 * pattern supports both basic TTS and voice cloning in a single interface.
 * 
 * ## Usage Patterns
 * 
 * ### Basic Text-to-Speech
 * ```typescript
 * const model = await provider.createTextToAudioModel('tts-model');
 * const text = Text.fromString("Hello world");
 * const audio = await model.transform(text, { voice: 'female', speed: 1.2 });
 * ```
 * 
 * ### Voice Cloning
 * ```typescript
 * const voiceSample = AssetLoader.load('voice-sample.wav');
 * const clonedAudio = await model.transform(text, voiceSample, { quality: 'high' });
 * ```
 * 
 * @abstract
 * @extends Model<TextRole, TextToAudioOptions, Audio>
 */

import { Model, ModelMetadata } from './Model';
import { Audio, AudioRole, TextRole } from '../../assets/roles';

/**
 * Configuration options for text-to-audio transformation.
 * 
 * These options control various aspects of the audio generation process,
 * from voice characteristics to output format and quality settings.
 */
export interface TextToAudioOptions {
  /** Target language for speech synthesis (e.g., 'en', 'es', 'fr') */
  language?: string;
  
  /** Speech rate multiplier (0.5 = half speed, 2.0 = double speed) */
  speed?: number;
  
  /** Force re-upload of audio even if cached version exists */
  forceUpload?: boolean;
  
  /** Output audio format - affects file size and compatibility */
  format?: 'mp3' | 'wav' | 'flac' | 'ogg';
  
  /** Voice identifier or name (provider-specific) */
  voice?: string;
  
  /** Pitch adjustment (-1.0 to 1.0, where 0 is neutral) */
  pitch?: number;
  
  /** Volume level (0.0 to 1.0, where 1.0 is maximum) */
  volume?: number;
  
  /** Audio quality setting affecting bitrate and file size */
  quality?: 'low' | 'medium' | 'high' | 'ultra';
  
  /** Sample rate in Hz (e.g., 22050, 44100, 48000) */
  sampleRate?: number;
  
  /** Additional provider-specific options */
  [key: string]: any;
}



/**
 * Abstract base class for text-to-audio models.
 * 
 * Provides the foundation for all text-to-audio transformation models,
 * ensuring consistent interface and metadata handling across different
 * providers and model implementations.
 */
export abstract class TextToAudioModel extends Model<TextRole, TextToAudioOptions, Audio> {
  /**
   * Initialize a new TextToAudioModel instance.
   * 
   * Automatically enhances the provided metadata to include text-to-audio
   * specific capabilities and supported input/output types.
   * 
   * @param metadata - Model metadata including id, name, capabilities, etc.
   */
  constructor(metadata: ModelMetadata) {
    // Ensure the model supports text-to-audio transformation
    const enhancedMetadata: ModelMetadata = {
      ...metadata,
      inputTypes: Array.from(new Set([...metadata.inputTypes, 'text'])),
      outputTypes: Array.from(new Set([...metadata.outputTypes, 'audio', 'speech'])),
      capabilities: Array.from(new Set([...metadata.capabilities, 'text-to-audio', 'text-to-speech']))
    };
    super(enhancedMetadata);
  }

  /**
   * Transform text to audio using basic text-to-speech.
   * 
   * Converts text input into natural-sounding speech audio using the model's
   * default voice or specified options. This is the primary method for
   * standard text-to-speech operations.
   * 
   * @param input - Text content to be converted to speech
   * @param options - Optional configuration for voice, speed, quality, etc.
   * @returns Promise resolving to generated audio
   * 
   * @example
   * ```typescript
   * const text = Text.fromString("Hello, world!");
   * const audio = await model.transform(text, { 
   *   voice: 'female', 
   *   speed: 1.2,
   *   quality: 'high' 
   * });
   * ```
   */
  abstract transform(input: TextRole, options?: TextToAudioOptions): Promise<Audio>;

  /**
   * Transform text to audio with voice cloning.
   * 
   * Generates speech using a reference voice sample for voice cloning.
   * The model will attempt to replicate the characteristics of the provided
   * voice audio when speaking the input text. Not all models support this feature.
   * 
   * @param text - Text content to be spoken
   * @param voiceAudio - Reference audio sample for voice cloning
   * @param options - Additional configuration options
   * @returns Promise resolving to generated audio with cloned voice
   * 
   * @example
   * ```typescript
   * const text = Text.fromString("Hello in my voice!");
   * const voiceSample = AssetLoader.load('my-voice.wav');
   * const clonedAudio = await model.transform(text, voiceSample, {
   *   quality: 'high',
   *   speed: 1.0
   * });
   * ```
   */
  abstract transform(text: TextRole, voiceAudio: AudioRole, options?: TextToAudioOptions): Promise<Audio>;

  /**
   * Check if the model is currently available and ready for use.
   * 
   * Verifies that the model can be accessed and is operational. This may
   * include checking API connectivity, service health, or local model availability.
   * 
   * @returns Promise resolving to true if model is available, false otherwise
   * 
   * @example
   * ```typescript
   * if (await model.isAvailable()) {
   *   const audio = await model.transform(text);
   * } else {
   *   console.log('Model is not currently available');
   * }
   * ```
   */
  abstract isAvailable(): Promise<boolean>;

  /**
   * Get the list of supported audio output formats.
   * 
   * Returns the audio formats that this model can generate. Common formats
   * include 'mp3', 'wav', 'flac', 'ogg'. The availability depends on the
   * underlying model and provider capabilities.
   * 
   * @returns Array of supported format strings
   */
  abstract getSupportedFormats(): string[];

  /**
   * Get available voice options for this model.
   * 
   * Returns identifiers for voices that can be used with this model.
   * Voice availability varies by provider and model. Some models may
   * support custom voice creation or voice cloning.
   * 
   * @returns Promise resolving to array of available voice identifiers
   */
  abstract getAvailableVoices(): Promise<string[]>;

  /**
   * Check if this model supports voice cloning functionality.
   * 
   * Voice cloning allows using a reference audio sample to generate
   * speech that mimics the voice characteristics of the sample.
   * 
   * @returns True if voice cloning is supported, false otherwise
   */
  abstract supportsVoiceCloning(): boolean;

  /**
   * Get the maximum text length that can be processed in a single request.
   * 
   * Different models have different limits on input text length. This
   * method returns the maximum number of characters that can be processed.
   * For longer texts, consider splitting into smaller chunks.
   * 
   * @returns Maximum text length in characters
   */
  abstract getMaxTextLength(): number;
}


