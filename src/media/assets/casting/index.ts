/**
 * Asset Role Casting System
 * 
 * Provides automatic role casting functionality for Assets when passed to models.
 * Enables seamless conversion from Assets to specific role types with type safety.
 */

import { Asset } from '../Asset';
import {
  Audio, Video, Text,
  AudioRole, VideoRole, TextRole,
  hasAudioRole, hasVideoRole, hasTextRole
} from '../roles';

// ============================================================================
// CASTING FUNCTIONS
// ============================================================================



/**
 * Cast an input to Audio, supporting both direct Audio objects and Assets with AudioRole
 */
export async function castToAudio(input: Audio | (Asset & AudioRole)): Promise<Audio> {
  if (input instanceof Audio) {
    return input;
  }
  
  if (input instanceof Asset && hasAudioRole(input)) {
    return await input.asAudio();
  }
  
  throw new Error('Input cannot be cast to Audio: missing AudioRole capability');
}

/**
 * Cast an input to Video, supporting both direct Video objects and Assets with VideoRole
 */
export async function castToVideo(input: Video | (Asset & VideoRole)): Promise<Video> {
  if (input instanceof Video) {
    return input;
  }
  
  if (input instanceof Asset && hasVideoRole(input)) {
    return await input.asVideo();
  }
  
  throw new Error('Input cannot be cast to Video: missing VideoRole capability');
}

/**
 * Cast an input to Text, supporting both direct Text objects and Assets with TextRole
 */
export async function castToText(input: Text | (Asset & TextRole)): Promise<Text> {
  if (input instanceof Text) {
    return input;
  }
  
  if (input instanceof Asset && hasTextRole(input)) {
    return await input.asText();
  }
  
  throw new Error('Input cannot be cast to Text: missing TextRole capability');
}

// ============================================================================
// TYPE VALIDATION FUNCTIONS
// ============================================================================



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
 * Safely cast to Audio, returning undefined if not possible
 */
export async function safeCastToAudio(input: any): Promise<Audio | undefined> {
  try {
    if (canCastToAudio(input)) {
      return await castToAudio(input);
    }
  } catch {
    // Ignore casting errors
  }
  return undefined;
}

/**
 * Safely cast to Video, returning undefined if not possible
 */
export async function safeCastToVideo(input: any): Promise<Video | undefined> {
  try {
    if (canCastToVideo(input)) {
      return await castToVideo(input);
    }
  } catch {
    // Ignore casting errors
  }
  return undefined;
}

/**
 * Safely cast to Text, returning undefined if not possible
 */
export async function safeCastToText(input: any): Promise<Text | undefined> {
  try {
    if (canCastToText(input)) {
      return await castToText(input);
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
export async function castAssetToAllRoles(asset: Asset): Promise<{
  audio?: Audio;
  video?: Video;
  text?: Text;
}> {
  const result: {
    audio?: Audio;
    video?: Video;
    text?: Text;
  } = {};

  if (hasAudioRole(asset)) {
    result.audio = await asset.asAudio();
  }

  if (hasVideoRole(asset)) {
    result.video = await asset.asVideo();
  }

  if (hasTextRole(asset)) {
    result.text = await asset.asText();
  }

  return result;
}

/**
 * Get all available roles for an Asset
 */
export function getAvailableRoles(asset: Asset): string[] {
  const roles: string[] = [];

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


export async function castToAudioWithError(input: any): Promise<Audio> {
  if (canCastToAudio(input)) {
    return await castToAudio(input);
  }

  const availableRoles = input instanceof Asset ? getAvailableRoles(input) : [];
  throw new RoleCastingError(input, 'audio', availableRoles);
}

export async function castToVideoWithError(input: any): Promise<Video> {
  if (canCastToVideo(input)) {
    return await castToVideo(input);
  }

  const availableRoles = input instanceof Asset ? getAvailableRoles(input) : [];
  throw new RoleCastingError(input, 'video', availableRoles);
}

export async function castToTextWithError(input: any): Promise<Text> {
  if (canCastToText(input)) {
    return await castToText(input);
  }

  const availableRoles = input instanceof Asset ? getAvailableRoles(input) : [];
  throw new RoleCastingError(input, 'text', availableRoles);
}

// ============================================================================
// UTILITY TYPES FOR MODEL INPUTS
// ============================================================================



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
export type MediaInput = AudioInput | VideoInput | TextInput;

