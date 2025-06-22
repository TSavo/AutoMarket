/**
 * Media Metadata Interfaces
 * 
 * Metadata structures for different media types.
 */

import { AudioFormat, VideoFormat, ImageFormat } from './formats';

export interface AudioMetadata {
  format: AudioFormat;
  duration?: number;
  bitrate?: number;
  sampleRate?: number;
  channels?: number;
  fileSize?: number;
  sourceFile?: string;
  generation_prompt?: GenerationPrompt;
  [key: string]: any;
}

export interface VideoMetadata {
  format: VideoFormat;
  duration?: number;
  width?: number;
  height?: number;
  frameRate?: number;
  codec?: string;
  hasAudio?: boolean;
  fileSize?: number;
  sourceFile?: string;
  generation_prompt?: GenerationPrompt;
  [key: string]: any;
}

export interface TextMetadata {
  language?: string;
  confidence?: number;
  encoding?: string;
  wordCount?: number;
  sourceFile?: string;
  generation_prompt?: GenerationPrompt;
  [key: string]: any;
}

export interface ImageMetadata {
  format: ImageFormat;
  width?: number;
  height?: number;
  fileSize?: number;
  sourceFile?: string;
  generation_prompt?: GenerationPrompt;
  [key: string]: any;
}

// GenerationPrompt interface for transformation metadata
export interface GenerationPrompt {
  // Original input data
  input: any;
  
  // Transform options/parameters used
  options?: any;
  
  // Model information
  modelId?: string;
  modelName?: string;
  provider?: string;
  
  // Transformation context
  transformationType?: string; // e.g., 'text-to-image', 'image-to-video', etc.
  timestamp?: Date;
  
  // Additional context
  metadata?: {
    [key: string]: any;
  };
}
