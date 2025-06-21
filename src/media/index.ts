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

// Export Asset casting utilities
export {
  castToAudio,
  castToVideo,
  castToText,
  castAssetToAllRoles as castToRoles,
  canCastToAudio,
  canCastToVideo,
  canCastToText,
  safeCastToAudio,
  safeCastToVideo,
  safeCastToText,
  getAvailableRoles,
  RoleCastingError
} from './assets/casting';

// Export casting input types
export type {
  AudioInput,
  VideoInput,
  TextInput,
  MediaInput
} from './assets/casting';



// Ingest types excluded from Vercel deployment
// Available in development only

// Composition services excluded from Vercel deployment
// Available in development only
