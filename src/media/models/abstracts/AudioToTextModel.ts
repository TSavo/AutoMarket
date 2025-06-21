/**
 * AudioToTextModel - Abstract Base Class
 * 
 * Abstract base class for all audio-to-text transformation models, including 
 * speech-to-text (STT), audio transcription, and audio translation capabilities.
 * This class provides a unified interface for converting audio input into text output
 * using various AI models and services.
 * 
 * ## Features
 * - **Speech-to-Text**: Convert spoken words to written text
 * - **Audio Transcription**: Transcribe any audio content (music, conversations, etc.)
 * - **Language Translation**: Translate speech from one language to text in another
 * - **Word-level Timestamps**: Get precise timing for each word or phrase
 * - **Confidence Scoring**: Reliability scores for transcription accuracy
 * - **Multiple Formats**: Support for WAV, MP3, FLAC, and other audio formats
 * - **Streaming Support**: Process audio in real-time or batch mode
 * 
 * ## Architecture
 * Uses the Asset-role system for type-safe input/output handling with automatic
 * casting between AudioRole and Text types. Supports both simple transcription
 * and advanced features like translation and word-level timing.
 * 
 * ## Usage Patterns
 * 
 * ### Basic Speech-to-Text
 * ```typescript
 * const model = await provider.createAudioToTextModel('whisper-base');
 * const audio = AssetLoader.load('speech.wav');
 * const result = await model.transform(audio, { language: 'en' });
 * console.log(result.content); // "Hello, this is a test"
 * ```
 * 
 * ### With Word Timestamps
 * ```typescript
 * const result = await model.transform(audio, { 
 *   wordTimestamps: true,
 *   task: 'transcribe'
 * });
 * console.log(result.metadata?.segments); // Array of word timings
 * ```
 * 
 * ### Language Translation
 * ```typescript
 * const result = await model.transform(spanishAudio, {
 *   task: 'translate', // Translate to English
 *   language: 'es'
 * });
 * ```
 * 
 * @abstract
 * @extends Model<AudioRole, AudioToTextOptions, Text>
 */

import { Model, ModelMetadata } from './Model';
import { Audio, AudioRole, Text } from '../../assets/roles';

/**
 * Configuration options for audio-to-text transformation.
 * 
 * These options control various aspects of the transcription and translation process,
 * from language detection to output formatting and quality settings.
 */
export interface AudioToTextOptions {
  /** Source language code (e.g., 'en', 'es', 'fr') for better accuracy */
  language?: string;
  
  /** Operation type: transcribe to same language or translate to target language */
  task?: 'transcribe' | 'translate';
  
  /** Include word-level timestamps in the output */
  wordTimestamps?: boolean;
  
  /** Temperature for model randomness (0.0 = deterministic, 1.0 = creative) */
  temperature?: number;
  
  /** Specific model variant to use (if multiple available) */
  model?: string;
  
  /** Additional provider-specific options */
  [key: string]: any;
}

/**
 * Input structure for audio-to-text operations.
 * 
 * Defines the expected structure when using structured input approach
 * instead of the Asset-role system.
 */
export interface AudioToTextInput {
  /** Audio data to be processed */
  audio: Audio;
  
  /** Processing options */
  options?: {
    /** Source language code for improved accuracy */
    language?: string;
    
    /** Task type: transcribe or translate */
    task?: 'transcribe' | 'translate';
    
    /** Model variant to use */
    model?: string;
    
    /** Include word-level timing information */
    wordTimestamps?: boolean;
    
    /** Model temperature setting */
    temperature?: number;
    
    /** Additional options */
    [key: string]: any;
  };
}

/**
 * Output structure for audio-to-text operations.
 * 
 * Contains the transcribed text along with optional metadata about
 * the transcription process and quality.
 */
export interface AudioToTextOutput {
  /** The transcribed/translated text content */
  text: string;
  
  /** Optional metadata about the transcription */
  metadata?: {
    /** Overall confidence score (0.0 to 1.0) */
    confidence?: number;
    
    /** Detected or specified language */
    language?: string;
    
    /** Processing time in milliseconds */
    processingTime?: number;
    
    /** Word/phrase level segments with timing */
    segments?: Array<{
      /** Start time in seconds */
      start: number;
      
      /** End time in seconds */
      end: number;
      
      /** Text content for this segment */
      text: string;
      
      /** Confidence score for this segment */
      confidence?: number;
    }>;
    
    /** Model used for processing */
    model?: string;
    
    /** Additional metadata */
    [key: string]: any;
  };
}

export interface AudioToTextSchema {
  input: {
    type: 'object';
    properties: {
      audio: { type: 'object' }; // Audio class instance
      options?: {
        type: 'object';
        properties: {
          language?: { type: 'string' };
          task?: { type: 'string'; enum: ['transcribe', 'translate'] };
          model?: { type: 'string' };
          wordTimestamps?: { type: 'boolean' };
          temperature?: { type: 'number'; minimum: 0; maximum: 1 };
        };
      };
    };
    required: ['audio'];
  };
  output: {
    type: 'object';
    properties: {
      text: { type: 'string' };
      metadata?: {
        type: 'object';
        properties: {
          confidence?: { type: 'number'; minimum: 0; maximum: 1 };
          language?: { type: 'string' };
          processingTime?: { type: 'number' };
          segments?: {
            type: 'array';
            items: {
              type: 'object';
              properties: {
                start: { type: 'number' };
                end: { type: 'number' };
                text: { type: 'string' };
                confidence?: { type: 'number' };
              };
            };
          };
          model?: { type: 'string' };
        };
      };
    };
    required: ['text'];
  };
}

/**
 * Abstract base class for audio-to-text models
 */
export abstract class AudioToTextModel extends Model<AudioRole, AudioToTextOptions, Text> {
  constructor(metadata: ModelMetadata) {
    // Ensure the model supports audio-to-text transformation
    const enhancedMetadata: ModelMetadata = {
      ...metadata,
      inputTypes: Array.from(new Set([...metadata.inputTypes, 'audio'])),
      outputTypes: Array.from(new Set([...metadata.outputTypes, 'text'])),
      capabilities: Array.from(new Set([...metadata.capabilities, 'audio-to-text']))
    };

    super(enhancedMetadata);
  }

  /**
   * Transform audio to text - must be implemented by concrete classes
   */
  abstract transform(input: AudioRole, options?: AudioToTextOptions): Promise<Text>;


  /**
   * Get supported audio formats (to be implemented by concrete classes)
   */
  abstract getSupportedFormats(): string[];

  /**
   * Get supported languages (to be implemented by concrete classes)
   */
  abstract getSupportedLanguages(): Promise<string[]>;

  /**
   * Get maximum audio duration supported by this model (in seconds)
   */
  abstract getMaxAudioDuration(): number;

  /**
   * Get maximum audio file size supported by this model (in bytes)
   */
  abstract getMaxAudioSize(): number;

  /**
   * Check if audio format is supported
   */
  isFormatSupported(format: string): boolean {
    return this.getSupportedFormats().includes(format.toLowerCase());
  }

  /**
   * Check if audio meets size requirements
   */
  isAudioSizeValid(audio: Audio): boolean {
    const maxSize = this.getMaxAudioSize();
    return audio.getSize() <= maxSize;
  }

  /**
   * Check if audio duration is valid
   */
  isAudioDurationValid(audio: Audio): boolean {
    const duration = audio.getDuration();
    if (duration === undefined) {
      return true; // Can't validate without duration info
    }
    
    const maxDuration = this.getMaxAudioDuration();
    return duration <= maxDuration;
  }

  /**
   * Validate audio file for processing
   */
  validateAudio(audio: Audio): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!audio.isValid()) {
      errors.push('Audio data is invalid or empty');
    }

    if (!this.isFormatSupported(audio.format)) {
      errors.push(`Audio format '${audio.format}' is not supported`);
    }

    if (!this.isAudioSizeValid(audio)) {
      errors.push(`Audio file size (${audio.getHumanSize()}) exceeds maximum allowed size`);
    }

    if (!this.isAudioDurationValid(audio)) {
      const duration = audio.getHumanDuration();
      errors.push(`Audio duration (${duration}) exceeds maximum allowed duration`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Estimate processing time for given audio
   */
  estimateProcessingTime(audio: Audio): number {
    const duration = audio.getDuration() || 60; // Default to 60 seconds if unknown
    // Default estimation: ~2x real-time processing
    return duration * 2000; // milliseconds
  }

  /**
   * Create an audio-to-text specific success result
   */
  protected createAudioToTextResult(
    text: string,
    metadata?: Record<string, any>
  ): AudioToTextOutput {
    return { text, metadata };
  }

  /**
   * Extract text from segments if available
   */
  protected extractTextFromSegments(segments: Array<{ text: string }>): string {
    return segments.map(segment => segment.text).join(' ').trim();
  }

  /**
   * Calculate overall confidence from segments
   */
  protected calculateOverallConfidence(segments: Array<{ confidence?: number }>): number {
    const confidenceValues = segments
      .map(segment => segment.confidence)
      .filter((confidence): confidence is number => confidence !== undefined);

    if (confidenceValues.length === 0) {
      return 0.9; // Default confidence if none provided
    }

    return confidenceValues.reduce((sum, confidence) => sum + confidence, 0) / confidenceValues.length;
  }
}
