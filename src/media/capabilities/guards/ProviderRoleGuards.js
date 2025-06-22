"use strict";
/**
 * Provider Role Type Guards
 *
 * Type guard functions to check if a provider implements specific roles.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasAudioToTextRole = hasAudioToTextRole;
exports.hasTextToAudioRole = hasTextToAudioRole;
exports.hasVideoToAudioRole = hasVideoToAudioRole;
exports.hasTextToVideoRole = hasTextToVideoRole;
exports.hasVideoToVideoRole = hasVideoToVideoRole;
exports.hasTextToImageRole = hasTextToImageRole;
exports.hasTextToTextRole = hasTextToTextRole;
exports.hasTextGenerationRole = hasTextGenerationRole;
exports.getProviderRoles = getProviderRoles;
/**
 * Type guards for checking provider roles
 */
function hasAudioToTextRole(provider) {
    return typeof provider.createAudioToTextModel === 'function' &&
        typeof provider.getSupportedAudioToTextModels === 'function';
}
function hasTextToAudioRole(provider) {
    return typeof provider.createTextToAudioModel === 'function' &&
        typeof provider.getSupportedTextToAudioModels === 'function';
}
function hasVideoToAudioRole(provider) {
    return typeof provider.createVideoToAudioModel === 'function' &&
        typeof provider.getSupportedVideoToAudioModels === 'function';
}
function hasTextToVideoRole(provider) {
    return typeof provider.createTextToVideoModel === 'function' &&
        typeof provider.getSupportedTextToVideoModels === 'function';
}
function hasVideoToVideoRole(provider) {
    return typeof provider.createVideoToVideoModel === 'function' &&
        typeof provider.getSupportedVideoToVideoModels === 'function';
}
function hasTextToImageRole(provider) {
    return typeof provider.createTextToImageModel === 'function' &&
        typeof provider.getSupportedTextToImageModels === 'function';
}
function hasTextToTextRole(provider) {
    return typeof provider.createTextToTextModel === 'function' &&
        typeof provider.getSupportedTextToTextModels === 'function';
}
function hasTextGenerationRole(provider) {
    return hasTextToTextRole(provider); // TextGeneration is an alias for TextToText
}
/**
 * Utility function to get all roles a provider supports
 */
function getProviderRoles(provider) {
    const roles = [];
    if (hasAudioToTextRole(provider))
        roles.push('audio-to-text');
    if (hasTextToAudioRole(provider))
        roles.push('text-to-audio');
    if (hasVideoToAudioRole(provider))
        roles.push('video-to-audio');
    if (hasTextToVideoRole(provider))
        roles.push('text-to-video');
    if (hasVideoToVideoRole(provider))
        roles.push('video-to-video');
    if (hasTextToImageRole(provider))
        roles.push('text-to-image');
    if (hasTextToTextRole(provider))
        roles.push('text-to-text');
    if (hasTextGenerationRole(provider))
        roles.push('text-generation');
    return roles;
}
