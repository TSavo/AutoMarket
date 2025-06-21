/**
 * Media Module - New Asset-Role System
 * Manages all media assets using the new provider architecture with role-based mixins
 */

// Export Smart Asset Loading System
export { SmartAssetFactory, AssetLoader } from './assets/SmartAssetFactory';

// Export Asset system
export { BaseAsset } from './assets/Asset';

// Export Role-based media types
export {
  Audio,
  Video,
  Text
} from './assets/roles';

// Export Role-based media type formats
export type {
  AudioFormat,
  VideoFormat,
  AudioMetadata,
  VideoMetadata,
  TextMetadata
} from './assets/roles';

// Export Role interfaces
export type {
  AudioRole,
  VideoRole,
  TextRole,
  AnyRole,
  AnyMedia
} from './assets/roles';

// Export Role type guards
export {
  hasAudioRole,
  hasVideoRole,
  hasTextRole
} from './assets/roles';


// Export Provider Capabilities (what providers can do)
export type {
  AudioToTextProvider,
  TextToAudioProvider,
  TextToImageProvider,
  TextToVideoProvider,
  TextToTextProvider,
  VideoToAudioProvider,
  VideoToVideoProvider,
  ServiceManagement
} from './capabilities';

// Export Provider Capability Guards
export {
  hasAudioToTextRole,
  hasTextToAudioRole,
  hasTextToImageRole,
  hasTextToVideoRole,
  hasTextToTextRole,
  hasVideoToAudioRole,
  hasVideoToVideoRole,
  getProviderRoles
} from './capabilities';

// Export Provider Packages (provider-centric organization)
export * from './providers';



// Ingest types excluded from Vercel deployment
// Available in development only

// Composition services excluded from Vercel deployment
// Available in development only
