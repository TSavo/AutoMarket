/**
 * Clip.ts
 * 
 * Defines the structure for a video clip in a composition
 */

import { VideoAsset } from '../../video';
import { ImageAsset } from '../../image'; // Added import for ImageAsset
import { AspectRatio } from '../../types';

/**
 * Clip types in a composition
 */
export enum ClipType {
  INTRO = 'intro',
  CONTENT = 'content',
  OUTRO = 'outro',
  OVERLAY = 'overlay'
}

/**
 * Clip position options for overlay clips
 */
export enum OverlayPosition {
  TOP_LEFT = 'top-left',
  TOP_CENTER = 'top-center',
  TOP_RIGHT = 'top-right',
  MIDDLE_LEFT = 'middle-left',
  MIDDLE_CENTER = 'middle-center',
  MIDDLE_RIGHT = 'middle-right',
  BOTTOM_LEFT = 'bottom-left',
  BOTTOM_CENTER = 'bottom-center',
  BOTTOM_RIGHT = 'bottom-right',
  CUSTOM = 'custom' // For custom x,y positioning
}

/**
 * Interface for a video clip in a composition
 */
export interface Clip {
  id?: string; // Added optional ID for clips
  // Basic properties
  asset: VideoAsset | ImageAsset; // Allow ImageAsset for overlays
  type: ClipType;
  
  // Timing properties
  startTime: number; // Start time in the composition (seconds)
  duration: number; // Duration of the clip (seconds)
  
  // Processing options
  resizeToFit?: boolean; // Whether to resize the clip to fit the composition dimensions
  mute?: boolean; // Whether to mute the audio for this clip
  
  // Scale and position (for overlays)
  scale?: number; // Scale factor (1.0 = 100%)
  position?: OverlayPosition | { x: number, y: number }; // Position for overlays
  opacity?: number; // 0.0-1.0 for transparency
  // Transitions
  fadeIn?: number; // Fade in duration in seconds
  fadeOut?: number; // Fade out duration in seconds
  
  // Audio
  audioAssetId?: string; // ID of an audio asset to play with this clip
}

/**
 * Creates a basic clip from a VideoAsset
 * @param asset The video asset to use
 * @param type The type of clip
 * @param startTime The start time in the composition
 * @returns A basic Clip object
 */
export function createClip(asset: VideoAsset, type: ClipType, startTime: number): Clip {
  return {
    asset,
    type,
    startTime,
    duration: asset.duration,
    resizeToFit: true
  };
}

/**
 * Creates an intro clip with a fade out
 * @param asset The video asset to use
 * @param startTime The start time in the composition
 * @returns An intro clip with fade out
 */
export function createIntroClip(asset: VideoAsset, startTime: number): Clip {
  return {
    asset,
    type: ClipType.INTRO,
    startTime,
    duration: asset.duration,
    resizeToFit: true,
    fadeOut: 0.5 // Default 0.5s fade out
  };
}

/**
 * Creates a content clip
 * @param asset The video asset to use
 * @param startTime The start time in the composition
 * @returns A content clip
 */

/**
 * Creates a content clip from a VideoAsset or ImageAsset
 * @param asset The video or image asset to use
 * @param startTime The start time in the composition
 * @param duration Optional duration (required for images)
 * @returns A content clip
 */
export function createContentClip(asset: VideoAsset | ImageAsset, startTime: number, duration?: number): Clip {
  return {
    asset,
    type: ClipType.CONTENT,
    startTime,
    duration: (asset as any).duration ?? duration ?? 5, // Use asset.duration if present, else provided duration, else default 5s
    resizeToFit: true
  };
}

/**
 * Creates an outro clip with a fade in
 * @param asset The video asset to use
 * @param startTime The start time in the composition
 * @returns An outro clip with fade in
 */
export function createOutroClip(asset: VideoAsset, startTime: number): Clip {
  return {
    asset,
    type: ClipType.OUTRO,
    startTime,
    duration: asset.duration,
    resizeToFit: true,
    fadeIn: 0.5 // Default 0.5s fade in
  };
}

/**
 * Creates an overlay clip with position and opacity controls
 * @param asset The video asset to use
 * @param startTime The start time in the composition
 * @param position The position of the overlay
 * @param scale Optional scale factor (default 1.0)
 * @param opacity Optional opacity value (default 1.0)
 * @returns An overlay clip
 */
export function createOverlayClip(
  asset: VideoAsset | ImageAsset,
  startTime: number,
  position: OverlayPosition | { x: number, y: number } = OverlayPosition.TOP_RIGHT,
  scale: number = 1.0,
  opacity: number = 1.0
): Clip {
  return {
    asset,
    type: ClipType.OVERLAY,
    startTime,
    duration: 'duration' in asset ? asset.duration : 5,
    resizeToFit: false, // Overlays don't resize to fit by default
    mute: true, // Overlays are muted by default
    position,
    scale,
    opacity,
    fadeIn: 0.3, // Default fade in for overlay
    fadeOut: 0.3 // Default fade out for overlay
  };
}

/**
 * Creates a content clip from a VideoAsset or ImageAsset
 * @param asset The video or image asset to use
 * @param startTime The start time in the composition
 * @returns A content clip
 */
