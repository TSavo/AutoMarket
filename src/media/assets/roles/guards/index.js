"use strict";
/**
 * Role Type Guards
 *
 * Type guard functions to check if objects implement specific role interfaces.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasAudioRole = hasAudioRole;
exports.hasVideoRole = hasVideoRole;
exports.hasTextRole = hasTextRole;
exports.hasImageRole = hasImageRole;
/**
 * Type guard to check if an object implements AudioRole
 */
function hasAudioRole(obj) {
    return obj && typeof obj.asAudio === 'function' && typeof obj.canPlayAudioRole === 'function';
}
/**
 * Type guard to check if an object implements VideoRole
 */
function hasVideoRole(obj) {
    return obj && typeof obj.asVideo === 'function' && typeof obj.canPlayVideoRole === 'function';
}
/**
 * Type guard to check if an object implements TextRole
 */
function hasTextRole(obj) {
    return obj && typeof obj.asText === 'function' && typeof obj.canPlayTextRole === 'function';
}
/**
 * Type guard to check if an object implements ImageRole
 */
function hasImageRole(obj) {
    return obj && typeof obj.asImage === 'function' && typeof obj.canPlayImageRole === 'function';
}
