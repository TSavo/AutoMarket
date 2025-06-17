/**
 * Composition.ts
 * 
 * Defines the structure for a complete video composition
 */

import { AspectRatio } from '../../types';
import { VideoAsset } from '../../video';
import { Clip, ClipType } from './Clip';

/**
 * Composition output settings
 */
export interface CompositionOutputSettings {
  width: number;
  height: number;
  frameRate: number;
  aspectRatio: AspectRatio;
  format: string; // e.g., 'mp4'
  codec: string; // e.g., 'h264'
  bitrate: number; // in bits per second
  audioCodec: string; // e.g., 'aac'
  audioBitrate: number; // in bits per second
}

/**
 * Default output settings for compositions
 */
export const DEFAULT_OUTPUT_SETTINGS: CompositionOutputSettings = {
  width: 1920,
  height: 1080,
  frameRate: 30,
  aspectRatio: AspectRatio.LANDSCAPE_WIDESCREEN,
  format: 'mp4',
  codec: 'h264',
  bitrate: 5000000, // 5 Mbps
  audioCodec: 'aac',
  audioBitrate: 192000 // 192 kbps
};

/**
 * Interface for a video composition
 */
export interface Composition {
  id: string;
  title: string;
  description?: string;
  
  // Clips in the composition
  clips: Clip[];
  
  // Output settings
  outputSettings: CompositionOutputSettings;
  
  // Optional metadata
  author?: string;
  dateCreated: string; // ISO date string
  dateModified: string; // ISO date string
  tags: string[];
  
  // Output file path
  outputPath?: string;
  crossfadeDuration?: number;
}

/**
 * Creates a new composition
 * @param title The title of the composition
 * @param clips The clips in the composition
 * @param outputSettings Optional output settings
 * @returns A new Composition object
 */
export function createComposition(
  title: string,
  clips: Clip[],
  outputSettings: Partial<CompositionOutputSettings> = {}
): Composition {
  const now = new Date().toISOString();
  
  return {
    id: `comp_${Date.now()}`,
    title,
    clips,
    outputSettings: { ...DEFAULT_OUTPUT_SETTINGS, ...outputSettings },
    dateCreated: now,
    dateModified: now,
    tags: []
  };
}

/**
 * Calculates the total duration of a composition
 * @param composition The composition to calculate duration for
 * @returns The total duration in seconds
 */
export function getCompositionDuration(composition: Composition): number {
  if (composition.clips.length === 0) {
    return 0;
  }
  
  // Find the clip that ends latest
  const lastEnd = Math.max(
    ...composition.clips.map(clip => clip.startTime + clip.duration)
  );
  
  return lastEnd;
}

/**
 * Validates a composition for any potential issues
 * @param composition The composition to validate
 * @returns Array of validation issues, empty if valid
 */
export function validateComposition(composition: Composition): string[] {
  const issues: string[] = [];
  
  // Check for empty composition
  if (composition.clips.length === 0) {
    issues.push("Composition has no clips");
    return issues;
  }
  
  // Check for missing content clip
  const hasContent = composition.clips.some(clip => clip.type === ClipType.CONTENT);
  if (!hasContent) {
    issues.push("Composition must have at least one content clip");
  }
  
  // Check for overlapping content, intro, or outro clips
  // (overlays are allowed to overlap)
  const mainClips = composition.clips.filter(
    clip => clip.type !== ClipType.OVERLAY
  );
  
  for (let i = 0; i < mainClips.length; i++) {
    const clipA = mainClips[i];
    const clipAEnd = clipA.startTime + clipA.duration;
    
    for (let j = i + 1; j < mainClips.length; j++) {
      const clipB = mainClips[j];
      const clipBEnd = clipB.startTime + clipB.duration;
      
      // Check if clips overlap (excluding intentional crossfades)
      const clipAFadeOut = clipA.fadeOut || 0;
      const clipBFadeIn = clipB.fadeIn || 0;
      
      // Clips overlap if B starts before A ends, accounting for fade transitions
      if (clipB.startTime < clipAEnd - clipAFadeOut) {
        issues.push(`Clips of type ${clipA.type} and ${clipB.type} overlap too much. Check timing.`);
      }
    }
  }
  
  return issues;
}
