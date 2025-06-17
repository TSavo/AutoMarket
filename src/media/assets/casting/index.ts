/**
 * Asset Role Casting System
 * 
 * Provides automatic role casting functionality for Assets when passed to models.
 * Enables seamless conversion from Assets to specific role types with type safety.
 */

import { Asset } from '../Asset';
import { 
  Speech, Audio, Video, Text,
  SpeechRole, AudioRole, VideoRole, TextRole,
  hasSpeechRole, hasAudioRole, hasVideoRole, hasTextRole
} from '../roles';

// ============================================================================
// CASTING FUNCTIONS
// ============================================================================

/**
 * Cast an input to Speech, supporting Speech objects and anything with SpeechRole
 */
export function castToSpeech(input: Speech | Audio | Video | (Asset & SpeechRole)): Speech {
  if (input instanceof Speech) {
    return input;
  }

  if (hasSpeechRole(input)) {
    return input.asSpeech();
  }

  throw new Error('Input cannot be cast to Speech: missing SpeechRole capability');
}

/**
 * Cast an input to Audio, supporting both direct Audio objects and Assets with AudioRole
 */
export function castToAudio(input: Audio | (Asset & AudioRole)): Audio {
  if (input instanceof Audio) {
    return input;
  }
  
  if (input instanceof Asset && hasAudioRole(input)) {
    return input.asAudio();
  }
  
  throw new Error('Input cannot be cast to Audio: missing AudioRole capability');
}

/**
 * Cast an input to Video, supporting both direct Video objects and Assets with VideoRole
 */
export function castToVideo(input: Video | (Asset & VideoRole)): Video {
  if (input instanceof Video) {
    return input;
  }
  
  if (input instanceof Asset && hasVideoRole(input)) {
    return input.asVideo();
  }
  
  throw new Error('Input cannot be cast to Video: missing VideoRole capability');
}

/**
 * Cast an input to Text, supporting both direct Text objects and Assets with TextRole
 */
export function castToText(input: Text | (Asset & TextRole)): Text {
  if (input instanceof Text) {
    return input;
  }
  
  if (input instanceof Asset && hasTextRole(input)) {
    return input.asText();
  }
  
  throw new Error('Input cannot be cast to Text: missing TextRole capability');
}

// ============================================================================
// TYPE VALIDATION FUNCTIONS
// ============================================================================

/**
 * Check if input can be cast to Speech
 */
export function canCastToSpeech(input: any): input is Speech | Audio | Video | (Asset & SpeechRole) {
  return input instanceof Speech || hasSpeechRole(input);
}

/**
 * Check if input can be cast to Audio
 */
export function canCastToAudio(input: any): input is Audio | (Asset & AudioRole) {
  return input instanceof Audio || (input instanceof Asset && hasAudioRole(input));
}

/**
 * Check if input can be cast to Video
 */
export function canCastToVideo(input: any): input is Video | (Asset & VideoRole) {
  return input instanceof Video || (input instanceof Asset && hasVideoRole(input));
}

/**
 * Check if input can be cast to Text
 */
export function canCastToText(input: any): input is Text | (Asset & TextRole) {
  return input instanceof Text || (input instanceof Asset && hasTextRole(input));
}

// ============================================================================
// SAFE CASTING FUNCTIONS (RETURN UNDEFINED ON FAILURE)
// ============================================================================

/**
 * Safely cast to Speech, returning undefined if not possible
 */
export function safeCastToSpeech(input: any): Speech | undefined {
  try {
    if (canCastToSpeech(input)) {
      return castToSpeech(input);
    }
  } catch {
    // Ignore casting errors
  }
  return undefined;
}

/**
 * Safely cast to Audio, returning undefined if not possible
 */
export function safeCastToAudio(input: any): Audio | undefined {
  try {
    if (canCastToAudio(input)) {
      return castToAudio(input);
    }
  } catch {
    // Ignore casting errors
  }
  return undefined;
}

/**
 * Safely cast to Video, returning undefined if not possible
 */
export function safeCastToVideo(input: any): Video | undefined {
  try {
    if (canCastToVideo(input)) {
      return castToVideo(input);
    }
  } catch {
    // Ignore casting errors
  }
  return undefined;
}

/**
 * Safely cast to Text, returning undefined if not possible
 */
export function safeCastToText(input: any): Text | undefined {
  try {
    if (canCastToText(input)) {
      return castToText(input);
    }
  } catch {
    // Ignore casting errors
  }
  return undefined;
}

// ============================================================================
// MULTI-ROLE CASTING FUNCTIONS
// ============================================================================

/**
 * Cast Asset to multiple roles it supports
 */
export function castAssetToAllRoles(asset: Asset): {
  speech?: Speech;
  audio?: Audio;
  video?: Video;
  text?: Text;
} {
  const result: {
    speech?: Speech;
    audio?: Audio;
    video?: Video;
    text?: Text;
  } = {};

  if (hasSpeechRole(asset)) {
    result.speech = asset.asSpeech();
  }

  if (hasAudioRole(asset)) {
    result.audio = asset.asAudio();
  }

  if (hasVideoRole(asset)) {
    result.video = asset.asVideo();
  }

  if (hasTextRole(asset)) {
    result.text = asset.asText();
  }

  return result;
}

/**
 * Get all available roles for an Asset
 */
export function getAvailableRoles(asset: Asset): string[] {
  const roles: string[] = [];

  if (hasSpeechRole(asset)) {
    roles.push('speech');
  }

  if (hasAudioRole(asset)) {
    roles.push('audio');
  }

  if (hasVideoRole(asset)) {
    roles.push('video');
  }

  if (hasTextRole(asset)) {
    roles.push('text');
  }

  return roles;
}

// ============================================================================
// CASTING ERROR TYPES
// ============================================================================

/**
 * Error thrown when role casting fails
 */
export class RoleCastingError extends Error {
  constructor(
    public readonly input: any,
    public readonly targetRole: string,
    public readonly availableRoles: string[] = []
  ) {
    super(`Cannot cast input to ${targetRole}. Available roles: ${availableRoles.join(', ') || 'none'}`);
    this.name = 'RoleCastingError';
  }
}

/**
 * Enhanced casting functions that provide better error messages
 */
export function castToSpeechWithError(input: any): Speech {
  if (canCastToSpeech(input)) {
    return castToSpeech(input);
  }

  const availableRoles = input instanceof Asset ? getAvailableRoles(input) : [];
  throw new RoleCastingError(input, 'speech', availableRoles);
}

export function castToAudioWithError(input: any): Audio {
  if (canCastToAudio(input)) {
    return castToAudio(input);
  }

  const availableRoles = input instanceof Asset ? getAvailableRoles(input) : [];
  throw new RoleCastingError(input, 'audio', availableRoles);
}

export function castToVideoWithError(input: any): Video {
  if (canCastToVideo(input)) {
    return castToVideo(input);
  }

  const availableRoles = input instanceof Asset ? getAvailableRoles(input) : [];
  throw new RoleCastingError(input, 'video', availableRoles);
}

export function castToTextWithError(input: any): Text {
  if (canCastToText(input)) {
    return castToText(input);
  }

  const availableRoles = input instanceof Asset ? getAvailableRoles(input) : [];
  throw new RoleCastingError(input, 'text', availableRoles);
}

// ============================================================================
// UTILITY TYPES FOR MODEL INPUTS
// ============================================================================

/**
 * Type for inputs that can be cast to Speech
 */
export type SpeechInput = Speech | Audio | Video | (Asset & SpeechRole);

/**
 * Type for inputs that can be cast to Audio
 */
export type AudioInput = Audio | (Asset & AudioRole);

/**
 * Type for inputs that can be cast to Video
 */
export type VideoInput = Video | (Asset & VideoRole);

/**
 * Type for inputs that can be cast to Text
 */
export type TextInput = Text | (Asset & TextRole);

/**
 * Union type for any media input
 */
export type MediaInput = SpeechInput | AudioInput | VideoInput | TextInput;
