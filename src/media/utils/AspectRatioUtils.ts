/**
 * Utility functions for aspect ratio calculations
 *
 * This file re-exports the unified aspect ratio utilities
 * from the common module to maintain backward compatibility.
 */

import {
  AspectRatio,
  ASPECT_RATIO_TOLERANCE,
  COMMON_16_9_DIMENSIONS,
  calculateAspectRatio as calculateAspectRatioCommon,
  getAspectRatioString as getAspectRatioStringCommon,
  parseAspectRatio,
  calculateDimensions,
  getGCD
} from '../../common/aspect-ratio';

// Re-export the constants and types
export {
  AspectRatio,
  ASPECT_RATIO_TOLERANCE,
  COMMON_16_9_DIMENSIONS,
  parseAspectRatio,
  calculateDimensions,
  getGCD
};

// Note: getGCD is already re-exported from the common module

/**
 * Calculate aspect ratio from dimensions
 * This is a wrapper around the unified implementation for backward compatibility
 * @param width Width in pixels
 * @param height Height in pixels
 * @param prefix Optional prefix for log messages (e.g., 'Video:', 'Image:')
 * @returns Aspect ratio as enum value or string
 */
export function calculateAspectRatio(
  width: number,
  height: number,
  prefix: string = ''
): AspectRatio | string {
  return calculateAspectRatioCommon(width, height, prefix);
}

/**
 * Get the string representation of an aspect ratio
 * This is a wrapper around the unified implementation for backward compatibility
 * @param aspectRatio Aspect ratio (enum value or string)
 * @returns String representation (e.g., "16:9")
 */
export function getAspectRatioString(aspectRatio: AspectRatio | string): string {
  return getAspectRatioStringCommon(aspectRatio);
}
