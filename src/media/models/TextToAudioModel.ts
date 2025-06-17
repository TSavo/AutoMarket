/**
 * TextToAudioModel - Abstract Base Class
 * 
 * Abstract base class for all text-to-audio transformation models.
 * Defines the contract for converting text input to audio output.
 */

import { Model, ModelMetadata, TransformationResult } from './Model';
import { Audio } from './Audio';

export interface TextToAudioInput {
  text: string;
  options?: {
    voice?: string;
    speed?: number;
    pitch?: number;
    volume?: number;
    format?: string;
    quality?: 'low' | 'medium' | 'high';
    [key: string]: any;
  };
}

export interface TextToAudioOutput {
  audio: Audio;
  metadata?: {
    duration?: number;
    processingTime?: number;
    voice?: string;
    model?: string;
    [key: string]: any;
  };
}

export interface TextToAudioSchema {
  input: {
    type: 'object';
    properties: {
      text: { type: 'string'; minLength: 1 };
      options?: {
        type: 'object';
        properties: {
          voice?: { type: 'string' };
          speed?: { type: 'number'; minimum: 0.1; maximum: 3.0 };
          pitch?: { type: 'number'; minimum: -20; maximum: 20 };
          volume?: { type: 'number'; minimum: 0; maximum: 1 };
          format?: { type: 'string'; enum: ['mp3', 'wav', 'flac', 'm4a', 'ogg'] };
          quality?: { type: 'string'; enum: ['low', 'medium', 'high'] };
        };
      };
    };
    required: ['text'];
  };
  output: {
    type: 'object';
    properties: {
      audio: { type: 'object' }; // Audio class instance
      metadata?: {
        type: 'object';
        properties: {
          duration?: { type: 'number' };
          processingTime?: { type: 'number' };
          voice?: { type: 'string' };
          model?: { type: 'string' };
        };
      };
    };
    required: ['audio'];
  };
}

/**
 * Abstract base class for text-to-audio models
 */
export abstract class TextToAudioModel extends Model<TextToAudioInput, TextToAudioOutput> {
  constructor(metadata: ModelMetadata) {
    // Ensure the model supports text-to-audio transformation
    const enhancedMetadata: ModelMetadata = {
      ...metadata,
      inputTypes: [...new Set([...metadata.inputTypes, 'text'])],
      outputTypes: [...new Set([...metadata.outputTypes, 'audio'])],
      capabilities: [...new Set([...metadata.capabilities, 'text-to-audio'])]
    };

    super(enhancedMetadata);
  }

  /**
   * Transform text to audio - must be implemented by concrete classes
   */
  abstract transform(input: TextToAudioInput): Promise<TransformationResult<TextToAudioOutput>>;

  /**
   * Get input schema for text-to-audio transformation
   */
  getInputSchema(): TextToAudioSchema['input'] {
    return {
      type: 'object',
      properties: {
        text: { type: 'string', minLength: 1 },
        options: {
          type: 'object',
          properties: {
            voice: { type: 'string' },
            speed: { type: 'number', minimum: 0.1, maximum: 3.0 },
            pitch: { type: 'number', minimum: -20, maximum: 20 },
            volume: { type: 'number', minimum: 0, maximum: 1 },
            format: { type: 'string', enum: ['mp3', 'wav', 'flac', 'm4a', 'ogg'] },
            quality: { type: 'string', enum: ['low', 'medium', 'high'] }
          }
        }
      },
      required: ['text']
    };
  }

  /**
   * Get output schema for text-to-audio transformation
   */
  getOutputSchema(): TextToAudioSchema['output'] {
    return {
      type: 'object',
      properties: {
        audio: { type: 'object' },
        metadata: {
          type: 'object',
          properties: {
            duration: { type: 'number' },
            processingTime: { type: 'number' },
            voice: { type: 'string' },
            model: { type: 'string' }
          }
        }
      },
      required: ['audio']
    };
  }

  /**
   * Validate text-to-audio input
   */
  protected validateInput(input: TextToAudioInput): boolean {
    if (!input || typeof input !== 'object') {
      return false;
    }

    if (!input.text || typeof input.text !== 'string' || input.text.trim().length === 0) {
      return false;
    }

    // Validate options if provided
    if (input.options) {
      const { speed, pitch, volume } = input.options;
      
      if (speed !== undefined && (typeof speed !== 'number' || speed < 0.1 || speed > 3.0)) {
        return false;
      }
      
      if (pitch !== undefined && (typeof pitch !== 'number' || pitch < -20 || pitch > 20)) {
        return false;
      }
      
      if (volume !== undefined && (typeof volume !== 'number' || volume < 0 || volume > 1)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Validate text-to-audio output
   */
  protected validateOutput(output: TextToAudioOutput): boolean {
    if (!output || typeof output !== 'object') {
      return false;
    }

    if (!output.audio || !(output.audio instanceof Audio)) {
      return false;
    }

    if (!output.audio.isValid()) {
      return false;
    }

    return true;
  }

  /**
   * Get supported voices (to be implemented by concrete classes)
   */
  abstract getSupportedVoices(): Promise<string[]>;

  /**
   * Get supported output formats (to be implemented by concrete classes)
   */
  abstract getSupportedFormats(): string[];

  /**
   * Get default voice for this model
   */
  abstract getDefaultVoice(): string;

  /**
   * Get maximum text length supported by this model
   */
  abstract getMaxTextLength(): number;

  /**
   * Estimate processing time for given text
   */
  estimateProcessingTime(text: string): number {
    // Default estimation: ~100ms per character, minimum 1 second
    const baseTime = Math.max(1000, text.length * 100);
    return baseTime;
  }

  /**
   * Split long text into chunks if needed
   */
  protected splitText(text: string, maxLength?: number): string[] {
    const limit = maxLength || this.getMaxTextLength();
    
    if (text.length <= limit) {
      return [text];
    }

    const chunks: string[] = [];
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    let currentChunk = '';
    
    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      
      if (currentChunk.length + trimmedSentence.length + 1 <= limit) {
        currentChunk += (currentChunk ? '. ' : '') + trimmedSentence;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk + '.');
        }
        
        // If single sentence is too long, split by words
        if (trimmedSentence.length > limit) {
          const words = trimmedSentence.split(' ');
          let wordChunk = '';
          
          for (const word of words) {
            if (wordChunk.length + word.length + 1 <= limit) {
              wordChunk += (wordChunk ? ' ' : '') + word;
            } else {
              if (wordChunk) {
                chunks.push(wordChunk);
              }
              wordChunk = word;
            }
          }
          
          if (wordChunk) {
            currentChunk = wordChunk;
          } else {
            currentChunk = '';
          }
        } else {
          currentChunk = trimmedSentence;
        }
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk + '.');
    }
    
    return chunks;
  }

  /**
   * Create a text-to-audio specific success result
   */
  protected createTextToAudioResult(
    audio: Audio,
    metadata?: Record<string, any>
  ): TransformationResult<TextToAudioOutput> {
    return this.createSuccessResult(
      { audio, metadata },
      metadata
    );
  }
}
