/**
 * Filters.ts
 * 
 * Defines FFMPEG filter commands for video composition
 */

import { Clip, ClipType, OverlayPosition } from '../models/Clip';
import { Composition } from '../models/Composition';

/**
 * Creates scale and pad filter to handle aspect ratio differences
 * @param inputWidth Original width
 * @param inputHeight Original height
 * @param targetWidth Target width
 * @param targetHeight Target height
 * @returns FFMPEG filter string
 */
export function createScalePadFilter(
  inputWidth: number,
  inputHeight: number,
  targetWidth: number,
  targetHeight: number
): string {
  const inputRatio = inputWidth / inputHeight;
  const targetRatio = targetWidth / targetHeight;
  
  let scaleWidth, scaleHeight, padX, padY;
  
  if (inputRatio > targetRatio) {
    // Input is wider than target, scale to target width and pad height
    scaleWidth = targetWidth;
    scaleHeight = Math.round(targetWidth / inputRatio);
    padX = 0;
    padY = Math.round((targetHeight - scaleHeight) / 2);
  } else {
    // Input is taller than target, scale to target height and pad width
    scaleHeight = targetHeight;
    scaleWidth = Math.round(targetHeight * inputRatio);
    padY = 0;
    padX = Math.round((targetWidth - scaleWidth) / 2);
  }
  
  return `scale=${scaleWidth}:${scaleHeight},pad=${targetWidth}:${targetHeight}:${padX}:${padY}:black`;
}

/**
 * Creates a crossfade filter between two clips
 * @param duration Duration of crossfade in seconds
 * @returns FFMPEG filter string
 */
export function createCrossfadeFilter(duration: number): string {
  const frames = Math.round(duration * 30); // Assuming 30fps
  return `xfade=transition=fade:duration=${duration}:offset=${frames}`;
}

/**
 * Calculates position coordinates for an overlay
 * @param position The overlay position
 * @param overlayWidth Width of the overlay
 * @param overlayHeight Height of the overlay  
 * @param baseWidth Width of the base video
 * @param baseHeight Height of the base video
 * @param scale Scale factor to apply
 * @returns x and y coordinates for the overlay
 */
export function calculateOverlayPosition(
  position: OverlayPosition | { x: number, y: number },
  overlayWidth: number,
  overlayHeight: number,
  baseWidth: number,
  baseHeight: number,
  scale: number = 1.0
): { x: number, y: number } {
  // If position is a custom object with x,y coordinates
  if (typeof position === 'object' && 'x' in position && 'y' in position) {
    return { x: position.x, y: position.y };
  }

  // Apply scale factor to overlay dimensions
  const scaledWidth = overlayWidth * scale;
  const scaledHeight = overlayHeight * scale;
  
  // Calculate padding
  const padding = Math.min(baseWidth, baseHeight) * 0.03; // 3% of the smaller dimension
  
  let x: number, y: number;
  
  // Calculate position based on the OverlayPosition enum
  switch (position) {
    case OverlayPosition.TOP_LEFT:
      x = padding;
      y = padding;
      break;
    case OverlayPosition.TOP_CENTER:
      x = (baseWidth - scaledWidth) / 2;
      y = padding;
      break;
    case OverlayPosition.TOP_RIGHT:
      x = baseWidth - scaledWidth - padding;
      y = padding;
      break;
    case OverlayPosition.MIDDLE_LEFT:
      x = padding;
      y = (baseHeight - scaledHeight) / 2;
      break;
    case OverlayPosition.MIDDLE_CENTER:
      x = (baseWidth - scaledWidth) / 2;
      y = (baseHeight - scaledHeight) / 2;
      break;
    case OverlayPosition.MIDDLE_RIGHT:
      x = baseWidth - scaledWidth - padding;
      y = (baseHeight - scaledHeight) / 2;
      break;
    case OverlayPosition.BOTTOM_LEFT:
      x = padding;
      y = baseHeight - scaledHeight - padding;
      break;
    case OverlayPosition.BOTTOM_CENTER:
      x = (baseWidth - scaledWidth) / 2;
      y = baseHeight - scaledHeight - padding;
      break;
    case OverlayPosition.BOTTOM_RIGHT:
      x = baseWidth - scaledWidth - padding;
      y = baseHeight - scaledHeight - padding;
      break;
    default:
      x = 0;
      y = 0;
  }
  
  return { x: Math.round(x), y: Math.round(y) };
}

/**
 * Creates a generic fade filter (in or out)
 * @param type 'in' or 'out'
 * @param startTime Start time of the fade (seconds from the beginning of the clip segment)
 * @param duration Duration of the fade in seconds
 * @returns FFMPEG filter string
 */
export function createFadeFilter(type: 'in' | 'out', startTime: number, duration: number): string {
  return `fade=t=${type}:st=${startTime}:d=${duration}`;
}

/**
 * Creates a setpts filter to reset timestamp to zero or adjust.
 * Use 'PTS-STARTPTS' to reset relative to the start of the current segment.
 * @param expr PTS expression, defaults to 'PTS-STARTPTS'
 * @returns FFMPEG filter string
 */
export function createSetptsFilter(expr: string = 'PTS-STARTPTS'): string {
  return `setpts=${expr}`;
}

/**
 * Creates a trim filter to select a segment of the input.
 * @param duration Duration of the segment to keep, in seconds.
 * @param start Optional start time of the segment, in seconds. Defaults to 0.
 * @returns FFMPEG filter string
 */
export function createTrimFilter(duration: number, start?: number): string {
  if (start !== undefined) {
    return `trim=start=${start}:duration=${duration},setpts=PTS-STARTPTS`;
  }
  return `trim=duration=${duration},setpts=PTS-STARTPTS`;
}

/**
 * Creates a colorchannelmixer filter to adjust alpha (opacity).
 * @param opacity Value from 0.0 (transparent) to 1.0 (opaque).
 * @returns FFMPEG filter string for adjusting alpha.
 */
export function createAlphaColorChannelMixerFilter(opacity: number): string {
  // This filter works on streams that have an alpha channel (e.g., RGBA).
  // Ensure the input format supports alpha or convert to one that does (e.g., yuva420p for videos, or ensure PNGs are used).
  // The format for colorchannelmixer is complex. For simple opacity on an RGBA source:
  // aa=opacity (alpha of alpha channel = opacity value)
  // For sources without alpha, you might need to add an alpha channel first (e.g., format=rgba, then colorchannelmixer)
  // A common way is: colorchannelmixer=aa=<opacity_value>
  return `colorchannelmixer=aa=${opacity}`;
}

/**
 * Creates an overlay filter command
 * This version assumes the overlay input stream is already prepared (looped, timed, faded, opacity set).
 * It focuses on positioning and the timing of when the overlay appears on the base video.
 * @param overlayClip The overlay clip to position
 * @param baseWidth Width of the base video
 * @param baseHeight Height of the base video
 * @returns FFMPEG filter string
 */
export function createOverlayFilter(
  overlayClip: Clip,
  baseWidth: number,
  baseHeight: number
): string {
  const { asset, position, scale = 1.0 } = overlayClip;

  const coords = calculateOverlayPosition(
    position || OverlayPosition.MIDDLE_CENTER, // Default position
    asset.width, // Common property
    asset.height, // Common property
    baseWidth,
    baseHeight,
    scale
  );

  // The overlay input stream is assumed to be already processed for its own fades/opacity.
  // This filter now just places it at the correct time and position.
  // FFmpeg's overlay filter uses the timeline of the *main* video (first input to overlay filter).
  // So, overlayClip.startTime refers to the main timeline.
  // The overlay input itself should be prepared to play its content starting at its own 0 time.
  let filter = `overlay=${coords.x}:${coords.y}:enable='between(t,${overlayClip.startTime},${overlayClip.startTime + overlayClip.duration})'`;
  
  // If the overlay asset itself has transparency (e.g. PNG, or video with alpha like VP9/ProRes 4444)
  // ffmpeg usually handles it well. format=auto can be good.
  // If specific format needed for alpha blending:
  // filter += ":format=auto"; // or specific like :format=rgba if issues with auto

  return filter;
}

// Remove or update old createFadeInFilter and createFadeOutFilter if createFadeFilter covers them.
// For now, keeping them if they are used elsewhere or if the new one isn't a direct replacement in all contexts.

/**
 * Creates a fade in filter
 * @param duration Duration of fade in seconds
 * @returns FFMPEG filter string
 */
export function createFadeInFilter(duration: number): string {
  return `fade=t=in:st=0:d=${duration}`;
}

/**
 * Creates a fade out filter
 * @param clipDuration Total duration of the clip
 * @param fadeDuration Duration of fade in seconds
 * @returns FFMPEG filter string
 */
export function createFadeOutFilter(clipDuration: number, fadeDuration: number): string {
  const fadeStart = clipDuration - fadeDuration;
  return `fade=t=out:st=${fadeStart}:d=${fadeDuration}`;
}

/**
 * Creates a setpts filter to adjust the timing of a clip
 * @param startTime Start time in seconds
 * @returns FFMPEG filter string
 */
export function createTimingFilter(startTime: number): string {
  return `setpts=PTS-STARTPTS+${startTime}/TB`;
}

/**
 * Creates frame rate conversion filter
 * @param targetFps Target frames per second
 * @returns FFMPEG filter string
 */
export function createFrameRateFilter(targetFps: number): string {
  return `fps=${targetFps}`;
}
