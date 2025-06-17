/**
 * AudioToTextModel - Abstract Base Class
 * 
 * Abstract base class for all audio-to-text transformation models.
 * Defines the contract for converting audio input to text output.
 */

import { Model, ModelMetadata, TransformationResult } from './Model';
import { Audio } from './Audio';

export interface AudioToTextInput {
  audio: Audio;
  options?: {
    language?: string;
    task?: 'transcribe' | 'translate';
    model?: string;
    wordTimestamps?: boolean;
    temperature?: number;
    [key: string]: any;
  };
}

export interface AudioToTextOutput {
  text: string;
  metadata?: {
    confidence?: number;
    language?: string;
    processingTime?: number;
    segments?: Array<{
      start: number;
      end: number;
      text: string;
      confidence?: number;
    }>;
    model?: string;
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
export abstract class AudioToTextModel extends Model<AudioToTextInput, AudioToTextOutput> {
  constructor(metadata: ModelMetadata) {
    // Ensure the model supports audio-to-text transformation
    const enhancedMetadata: ModelMetadata = {
      ...metadata,
      inputTypes: [...new Set([...metadata.inputTypes, 'audio'])],
      outputTypes: [...new Set([...metadata.outputTypes, 'text'])],
      capabilities: [...new Set([...metadata.capabilities, 'audio-to-text'])]
    };

    super(enhancedMetadata);
  }

  /**
   * Transform audio to text - must be implemented by concrete classes
   */
  abstract transform(input: AudioToTextInput): Promise<TransformationResult<AudioToTextOutput>>;

  /**
   * Get input schema for audio-to-text transformation
   */
  getInputSchema(): AudioToTextSchema['input'] {
    return {
      type: 'object',
      properties: {
        audio: { type: 'object' },
        options: {
          type: 'object',
          properties: {
            language: { type: 'string' },
            task: { type: 'string', enum: ['transcribe', 'translate'] },
            model: { type: 'string' },
            wordTimestamps: { type: 'boolean' },
            temperature: { type: 'number', minimum: 0, maximum: 1 }
          }
        }
      },
      required: ['audio']
    };
  }

  /**
   * Get output schema for audio-to-text transformation
   */
  getOutputSchema(): AudioToTextSchema['output'] {
    return {
      type: 'object',
      properties: {
        text: { type: 'string' },
        metadata: {
          type: 'object',
          properties: {
            confidence: { type: 'number', minimum: 0, maximum: 1 },
            language: { type: 'string' },
            processingTime: { type: 'number' },
            segments: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  start: { type: 'number' },
                  end: { type: 'number' },
                  text: { type: 'string' },
                  confidence: { type: 'number' }
                }
              }
            },
            model: { type: 'string' }
          }
        }
      },
      required: ['text']
    };
  }

  /**
   * Validate audio-to-text input
   */
  protected validateInput(input: AudioToTextInput): boolean {
    if (!input || typeof input !== 'object') {
      return false;
    }

    if (!input.audio || !(input.audio instanceof Audio)) {
      return false;
    }

    if (!input.audio.isValid()) {
      return false;
    }

    // Validate options if provided
    if (input.options) {
      const { task, temperature } = input.options;
      
      if (task !== undefined && !['transcribe', 'translate'].includes(task)) {
        return false;
      }
      
      if (temperature !== undefined && (typeof temperature !== 'number' || temperature < 0 || temperature > 1)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Validate audio-to-text output
   */
  protected validateOutput(output: AudioToTextOutput): boolean {
    if (!output || typeof output !== 'object') {
      return false;
    }

    if (!output.text || typeof output.text !== 'string') {
      return false;
    }

    // Validate segments if provided
    if (output.metadata?.segments) {
      const segments = output.metadata.segments;
      if (!Array.isArray(segments)) {
        return false;
      }

      for (const segment of segments) {
        if (!segment || typeof segment !== 'object') {
          return false;
        }
        
        if (typeof segment.start !== 'number' || typeof segment.end !== 'number') {
          return false;
        }
        
        if (segment.start < 0 || segment.end < segment.start) {
          return false;
        }
        
        if (!segment.text || typeof segment.text !== 'string') {
          return false;
        }
      }
    }

    return true;
  }

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
  ): TransformationResult<AudioToTextOutput> {
    return this.createSuccessResult(
      { text, metadata },
      metadata
    );
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
