/**
 * Role Type Guards
 * 
 * Type guard functions to check if objects implement specific role interfaces.
 */

import type { AudioRole, VideoRole, TextRole, ImageRole } from '../interfaces';

/**
 * Type guard to check if an object implements AudioRole
 */
export function hasAudioRole(obj: any): obj is AudioRole {
  return obj && typeof obj.asAudio === 'function' && typeof obj.canPlayAudioRole === 'function';
}

/**
 * Type guard to check if an object implements VideoRole
 */
export function hasVideoRole(obj: any): obj is VideoRole {
  return obj && typeof obj.asVideo === 'function' && typeof obj.canPlayVideoRole === 'function';
}

/**
 * Type guard to check if an object implements TextRole
 */
export function hasTextRole(obj: any): obj is TextRole {
  return obj && typeof obj.asText === 'function' && typeof obj.canPlayTextRole === 'function';
}

/**
 * Type guard to check if an object implements ImageRole
 */
export function hasImageRole(obj: any): obj is ImageRole {
  return obj && typeof obj.asImage === 'function' && typeof obj.canPlayImageRole === 'function';
}
