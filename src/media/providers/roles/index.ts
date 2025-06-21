/**
 * Provider Roles - Main Export
 *
 * Centralized export for all provider role interfaces, mixins, and guards.
 * This provides a clean API for importing provider role functionality.
 */

// Base interfaces
export type { ServiceManagement } from './ServiceManagement';


// Role interfaces
export type {
  AudioToTextProvider
} from './interfaces/AudioToTextProvider';

export type {
  TextToAudioProvider
} from './interfaces/TextToAudioProvider';

export type { VideoToAudioProvider } from './interfaces/VideoToAudioProvider';
export type { TextToVideoProvider } from './interfaces/TextToVideoProvider';
export type { VideoToVideoProvider } from './interfaces/VideoToVideoProvider';
export type { TextToImageProvider } from './interfaces/TextToImageProvider';
export type { TextToTextProvider } from './interfaces/TextToTextProvider';

// Mixins
export {
  withAudioToTextProvider
} from './mixins/AudioToTextMixin';
export type { Constructor as AudioToTextConstructor } from './mixins/AudioToTextMixin';

export {
  withTextToAudioProvider
} from './mixins/TextToAudioMixin';
export type { Constructor as TextToAudioConstructor } from './mixins/TextToAudioMixin';

export {
  withVideoToAudioProvider
} from './mixins/VideoToAudioMixin';
export type { Constructor as VideoToAudioConstructor } from './mixins/VideoToAudioMixin';

export {
  withTextToImageProvider
} from './mixins/TextToImageMixin';
export type { Constructor as TextToImageConstructor } from './mixins/TextToImageMixin';

export {
  withTextToVideoProvider
} from './mixins/TextToVideoMixin';
export type { Constructor as TextToVideoConstructor } from './mixins/TextToVideoMixin';

export {
  withVideoToVideoProvider
} from './mixins/VideoToVideoMixin';
export type { Constructor as VideoToVideoConstructor } from './mixins/VideoToVideoMixin';

// Guards
export {
  hasAudioToTextRole,
  hasTextToAudioRole,
  hasVideoToAudioRole,
  hasTextToVideoRole,
  hasVideoToVideoRole,
  hasTextToImageRole,
  hasTextToTextRole,
  hasTextGenerationRole,
  getProviderRoles
} from './guards/ProviderRoleGuards';

// Re-export common types
export type Constructor<T = {}> = new (...args: any[]) => T;