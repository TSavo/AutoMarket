/**
 * Media Clients Index
 * 
 * Exports all media client functionality including FFMPEG clients
 */

// FFMPEG API Client (original service-based client)
export {
  FFMPEGAPIClient,
  type FFMPEGClientConfig,
  type AudioExtractionOptions,
  type AudioConversionOptions,
  type AudioExtractionResult,
  type ServiceHealth,
  type VideoCompositionOptions,
  type VideoCompositionResult,
  type ApiResponse
} from './FFMPEGAPIClient';

// FFMPEG Local Client (new local implementation)
export {
  FFMPEGLocalClient,
  type FFMPEGLocalConfig
} from './FFMPEGLocalClient';

// FFMPEG Client Factory and utilities
export {
  FFMPEGClientFactory,
  FFMPEGClientWrapper,
  type IFFMPEGClient,
  type FFMPEGClientType,
  type FFMPEGFactoryConfig,
  createFFMPEGClient,
  createFFMPEGAPIClient,
  createFFMPEGLocalClient,
  createFFMPEGClientFromEnv
} from './FFMPEGClientFactory';

// Other existing clients
export { ChatterboxAPIClient } from './ChatterboxAPIClient';
export { WhisperAPIClient } from './WhisperAPIClient';

// Re-export default factory for convenience
export { default as FFMPEGFactory } from './FFMPEGClientFactory';
