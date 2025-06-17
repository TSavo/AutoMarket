/**
 * Media Module for Horizon City Stories
 * Manages all media assets including images, videos, audio, and fonts
 */

// Export main AssetManager class
export { AssetManager } from './AssetManager';

// Export MediaAssetStore
export { MediaAssetStore } from './MediaAssetStore';

// Export types
export {
  MediaType,
  AspectRatio,
  ContentPurpose
} from './types';

// Export type interfaces
export type {
  BaseAsset,
  MediaDatabase,
  BaseFilterOptions
} from './types';

// Export image types
export {
  ImageFormat,
  isImageAsset
} from './image';

// Export image type interfaces
export type {
  ImageAsset,
  ImageFilterOptions
} from './image';

// Export video types
export {
  VideoFormat,
  isVideoAsset
} from './video';

// Export video type interfaces
export type {
  VideoAsset,
  VideoFilterOptions
} from './video';

// Export audio types
export {
  AudioFormat,
  isAudioAsset
} from './audio';

// Export audio type interfaces
export type {
  AudioAsset,
  AudioFilterOptions
} from './audio';

// Export font types
export {
  FontFormat,
  isFontAsset
} from './font';

// Export font type interfaces
export type {
  FontAsset,
  FontFilterOptions
} from './font';

// Ingest types excluded from Vercel deployment
// Available in development only

// Composition services excluded from Vercel deployment
// Available in development only
