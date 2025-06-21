/**
 * Provider Role Type Guards
 * 
 * Type guard functions to check if a provider implements specific roles.
 */

import { AudioToTextProvider } from '../interfaces/AudioToTextProvider';
import { TextToAudioProvider } from '../interfaces/TextToAudioProvider';
import { VideoToAudioProvider } from '../interfaces/VideoToAudioProvider';
import { TextToVideoProvider } from '../interfaces/TextToVideoProvider';
import { VideoToVideoProvider } from '../interfaces/VideoToVideoProvider';
import { TextToImageProvider } from '../interfaces/TextToImageProvider';
import { TextToTextProvider } from '../interfaces/TextToTextProvider';

/**
 * Type guards for checking provider roles
 */

export function hasAudioToTextRole(provider: any): provider is AudioToTextProvider {
  return typeof provider.createAudioToTextModel === 'function' &&
         typeof provider.getSupportedAudioToTextModels === 'function';
}

export function hasTextToAudioRole(provider: any): provider is TextToAudioProvider {
  return typeof provider.createTextToAudioModel === 'function' &&
         typeof provider.getSupportedTextToAudioModels === 'function';
}



export function hasVideoToAudioRole(provider: any): provider is VideoToAudioProvider {
  return typeof provider.createVideoToAudioModel === 'function' &&
         typeof provider.getSupportedVideoToAudioModels === 'function';
}

export function hasTextToVideoRole(provider: any): provider is TextToVideoProvider {
  return typeof provider.createTextToVideoModel === 'function' &&
         typeof provider.getSupportedTextToVideoModels === 'function';
}

export function hasVideoToVideoRole(provider: any): provider is VideoToVideoProvider {
  return typeof provider.createVideoToVideoModel === 'function' &&
         typeof provider.getSupportedVideoToVideoModels === 'function';
}

export function hasTextToImageRole(provider: any): provider is TextToImageProvider {
  return typeof provider.createTextToImageModel === 'function' &&
         typeof provider.getSupportedTextToImageModels === 'function';
}

export function hasTextToTextRole(provider: any): provider is TextToTextProvider {
  return typeof provider.createTextToTextModel === 'function' &&
         typeof provider.getSupportedTextToTextModels === 'function';
}

export function hasTextGenerationRole(provider: any): provider is TextToTextProvider {
  return hasTextToTextRole(provider); // TextGeneration is an alias for TextToText
}

/**
 * Utility function to get all roles a provider supports
 */
export function getProviderRoles(provider: any): string[] {
  const roles: string[] = [];

  if (hasAudioToTextRole(provider)) roles.push('audio-to-text');
  if (hasTextToAudioRole(provider)) roles.push('text-to-audio');
  if (hasVideoToAudioRole(provider)) roles.push('video-to-audio');
  if (hasTextToVideoRole(provider)) roles.push('text-to-video');
  if (hasVideoToVideoRole(provider)) roles.push('video-to-video');
  if (hasTextToImageRole(provider)) roles.push('text-to-image');
  if (hasTextToTextRole(provider)) roles.push('text-to-text');
  if (hasTextGenerationRole(provider)) roles.push('text-generation');

  return roles;
}
