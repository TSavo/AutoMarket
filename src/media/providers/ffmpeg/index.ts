/**
 * FFMPEG Provider Package
 * 
 * Generic FFMPEG provider that works with any client implementation.
 * Supports both Docker-based and local HTTP clients.
 */

export { FFMPEGProvider } from './FFMPEGProvider';
export { FFMPEGVideoToVideoModel } from './FFMPEGVideoToVideoModel';
export { FFMPEGCompositionBuilder } from './FFMPEGCompositionBuilder';
export type { IFFMPEGClient } from './IFFMPEGClient';
export type { 
  AudioConversionOptions, 
  AudioExtractionOptions, 
  AudioExtractionResult, 
  HealthCheckResult,
  VideoCompositionOptions,
  VideoCompositionResult,
  OverlayOptions,
  FilterOptions,
  CompositionState
} from './IFFMPEGClient';
