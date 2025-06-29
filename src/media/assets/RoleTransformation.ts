/**
 * Role Transformation Utilities
 * 
 * Core utilities for the unified asRole<T>() pattern.
 * Provides type-safe role transformations using automatic provider discovery.
 */

import { MediaProvider, MediaCapability } from '../types/provider';
import { ProviderRegistry } from '../registry/ProviderRegistry';
import { Audio, Video, Text, Image } from './roles';
import { AudioAsset, VideoAsset, TextAsset, ImageAsset } from './types';

// Provider capability interfaces (only import existing ones)
import { AudioToTextProvider } from '../capabilities/interfaces/AudioToTextProvider';
import { VideoToAudioProvider } from '../capabilities/interfaces/VideoToAudioProvider';
import { VideoToVideoProvider } from '../capabilities/interfaces/VideoToVideoProvider';
import { TextToAudioProvider } from '../capabilities/interfaces/TextToAudioProvider';
import { TextToVideoProvider } from '../capabilities/interfaces/TextToVideoProvider';
import { TextToImageProvider } from '../capabilities/interfaces/TextToImageProvider';
import { TextToTextProvider } from '../capabilities/interfaces/TextToTextProvider';
import { AudioToAudioProvider } from '../capabilities/interfaces/AudioToAudioProvider';

/**
 * Type mapping for role target types to their corresponding classes
 */
export type RoleTargetType = Audio | Video | Text | Image;

/**
 * Type mapping for provider capability lookup based on source and target roles
 * Only includes conversions that have corresponding provider interfaces
 */
export interface ProviderCapabilityMap {
  // Audio source conversions
  'audio->text': AudioToTextProvider;
  'audio->audio': AudioToAudioProvider;
  
  // Video source conversions  
  'video->audio': VideoToAudioProvider;
  'video->video': VideoToVideoProvider;
  
  // Text source conversions
  'text->audio': TextToAudioProvider;
  'text->video': TextToVideoProvider;
  'text->image': TextToImageProvider;
  'text->text': TextToTextProvider;
}

/**
 * Provider capability enum mapping for registry lookup
 * Only includes conversions that have corresponding MediaCapability values
 */
export const CAPABILITY_MAP: Record<string, MediaCapability> = {
  // Audio transformations
  'audio->text': MediaCapability.AUDIO_TO_TEXT,
  'audio->audio': MediaCapability.AUDIO_TO_AUDIO,
  
  // Video transformations  
  'video->audio': MediaCapability.VIDEO_TO_AUDIO,
  'video->video': MediaCapability.VIDEO_TO_VIDEO,
  'video->image': MediaCapability.VIDEO_TO_IMAGE,
  
  // Text transformations
  'text->audio': MediaCapability.TEXT_TO_AUDIO,
  'text->video': MediaCapability.TEXT_TO_VIDEO,
  'text->image': MediaCapability.TEXT_TO_IMAGE,
  'text->text': MediaCapability.TEXT_TO_TEXT,
  
  // Image transformations
  'image->video': MediaCapability.IMAGE_TO_VIDEO,
  'image->image': MediaCapability.IMAGE_TO_IMAGE,
  'image->text': MediaCapability.IMAGE_TO_TEXT,
};



/**
 * Determine the source role type from an asset
 */
export function determineSourceRole(asset: any): string {
  if (asset instanceof AudioAsset) return 'audio';
  if (asset instanceof VideoAsset) return 'video';
  if (asset instanceof TextAsset) return 'text';
  if (asset instanceof ImageAsset) return 'image';

  // Fallback for older assets or non-standard types
  if (asset.canPlayAudioRole && asset.canPlayAudioRole()) return 'audio';
  if (asset.canPlayVideoRole && asset.canPlayVideoRole()) return 'video';
  if (asset.canPlayTextRole && asset.canPlayTextRole()) return 'text';
  if (asset.canPlayImageRole && asset.canPlayImageRole()) return 'image';
  
  // Fallback: try to determine from metadata format
  const format = asset.metadata?.format?.toLowerCase() || '';
  
  // Audio formats
  if (['mp3', 'wav', 'flac', 'm4a', 'ogg', 'aac', 'opus'].includes(format)) return 'audio';
  
  // Video formats  
  if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'].includes(format)) return 'video';
  
  // Image formats
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(format)) return 'image';
  
  // Text formats
  if (['txt', 'md', 'json', 'xml', 'html', 'csv'].includes(format)) return 'text';
  
  throw new Error(`Cannot determine source role for asset with format: ${format}`);
}

/**
 * Determine target role from target type constructor
 */
export function determineTargetRole(targetType: any): string {
  if (targetType === Audio) return 'audio';
  if (targetType === Video) return 'video';
  if (targetType === Text) return 'text';
  if (targetType === Image) return 'image';
  
  throw new Error(`Unsupported target role type: ${targetType?.name || targetType}`);
}

/**
 * Universal role transformation method
 * 
 * @param sourceAsset - The asset to transform from
 * @param targetType - The target role class (Audio, Video, Text, Image)
 * @param modelId - Optional model ID (defaults to 'default')
 * @returns Promise resolving to the target role instance
 */
export async function asRole<T extends RoleTargetType>(
  sourceAsset: any,
  targetType: new (...args: any[]) => T,
  modelId: string = 'default'
): Promise<T> {
  try {
    // Determine source and target roles
    const sourceRole = determineSourceRole(sourceAsset);
    const targetRole = determineTargetRole(targetType);

    // If it's an identity transform, just return the original asset
    if (sourceRole === targetRole) {
      return sourceAsset as T;
    }
    
    // Create capability key
    const capabilityKey = `${sourceRole}->${targetRole}` as keyof ProviderCapabilityMap;
    
    // Get the capability enum value
    const capability = CAPABILITY_MAP[capabilityKey];
    if (!capability) {
      throw new Error(`Unsupported role conversion: ${sourceRole} -> ${targetRole}`);
    }
    
    // Get provider registry and find best provider for capability
    const registry = ProviderRegistry.getInstance();
    const provider = await registry.findBestProvider(capability);
    
    if (!provider) {
      throw new Error(`No provider found for capability: ${capability}`);
    }
    
    // Get model from provider - use capability-based selection if modelId is 'default'
    let model;
    if (modelId === 'default') {
      // Use capability-based selection for default model requests
      if ('getModelByCapability' in provider && typeof provider.getModelByCapability === 'function') {
        model = await (provider as any).getModelByCapability(capability);
      } else {
        // Fallback: get any model for this capability by checking provider models
        const models = (provider as any).models || [];
        const capableModel = models.find((m: any) => m.capabilities?.includes(capability));
        if (!capableModel) {
          throw new Error(`Provider ${provider.name} has no supported models for capability ${capability}`);
        }
        model = await provider.getModel(capableModel.id);
      }
    } else {
      // Use specific model ID
      model = await provider.getModel(modelId);
    }
    
    const result = await model.transform(sourceAsset);
    
    return result as T;
    
  } catch (error) {
    console.error(`Role transformation failed (${sourceAsset?.constructor?.name} -> ${targetType?.name}):`, error);
    throw error;
  }
}

/**
 * Check if a role conversion is supported (i.e., if we have a provider for it)
 * @param sourceAsset - Source asset to convert from
 * @param targetType - Target role class to convert to
 * @returns Promise<boolean> indicating if the conversion is supported
 */
export async function canPlayRole<T extends Audio | Video | Text | Image>(
  sourceAsset: any,
  targetType: new (...args: any[]) => T
): Promise<boolean> {
  try {
    // Determine source and target roles
    const sourceRole = determineSourceRole(sourceAsset);
    const targetRole = determineTargetRole(targetType);
    
    // If already the same type, return true
    if (sourceRole === targetRole) {
      return true;
    }
    
    // Create capability key
    const capabilityKey = `${sourceRole}->${targetRole}` as keyof ProviderCapabilityMap;
    
    // Check if capability mapping exists
    const capability = CAPABILITY_MAP[capabilityKey];
    if (!capability) {
      return false; // Unsupported conversion
    }
    
    // Check if we have a provider for this capability
    const registry = ProviderRegistry.getInstance();
    const provider = await registry.findBestProvider(capability);
    
    return !!provider; // Return true if provider exists
    
  } catch (error) {
    // If any error occurs during checking, assume not supported
    return false;
  }
}

/**
 * Synchronous version of canPlayRole for immediate capability checking
 * Note: This doesn't check actual provider availability, only if the conversion mapping exists
 */
export function canPlayRoleSync<T extends Audio | Video | Text | Image>(
  sourceAsset: any,
  targetType: new (...args: any[]) => T
): boolean {
  try {
    // Determine source and target roles
    const sourceRole = determineSourceRole(sourceAsset);
    const targetRole = determineTargetRole(targetType);
    
    // If already the same type, return true
    if (sourceRole === targetRole) {
      return true;
    }
    
    // Create capability key
    const capabilityKey = `${sourceRole}->${targetRole}` as keyof ProviderCapabilityMap;
    
    // Check if capability mapping exists
    const capability = CAPABILITY_MAP[capabilityKey];
    return !!capability; // Return true if mapping exists
    
  } catch (error) {
    return false;
  }
}
