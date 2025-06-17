import { VideoAsset } from '../../../video';

/**
 * Position preset options for overlay positioning
 */
export enum PositionPreset {
  BOTTOM_CENTER = 'bottom-center',
  BOTTOM_LEFT = 'bottom-left',
  BOTTOM_RIGHT = 'bottom-right',
  TOP_CENTER = 'top-center',
  TOP_LEFT = 'top-left',
  TOP_RIGHT = 'top-right',
  CENTER_LEFT = 'center-left',
  CENTER_RIGHT = 'center-right',
  CENTER = 'center',
}

/**
 * Legacy position enum for backward compatibility
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
}

/**
 * Size preset options for overlay sizing
 */
export enum SizePreset {
  QUARTER = 25,
  HALF = 50,
  THREE_QUARTER = 75,
  FULL = 100,
}

/**
 * Overlay configuration interface
 */
export interface OverlayConfig {
  assetId: string;
  startTime: number | string; // Number of seconds or percentage string (e.g., "50%")
  endTime?: number | string; // Number of seconds or percentage string
  duration?: number; // Duration in seconds
  position: {
    preset?: PositionPreset;
    x?: number; // Custom percentage (0-100) from left edge
    y?: number; // Custom percentage (0-100) from top edge
    size?: number; // Size as percentage of original
  };
  opacity?: number; // 0.0-1.0 for transparency
  transition?: {
    fadeIn?: number; // Fade in duration in seconds
    fadeOut?: number; // Fade out duration in seconds
  };
  zIndex?: number; // For overlapping overlays (higher = in front)
}

/**
 * Overlay configuration component props
 */
export interface OverlayConfigFormProps {
  asset: VideoAsset;
  contentDuration: number;
  initialConfig?: OverlayConfig;
  onSave: (config: OverlayConfig) => void;
  onCancel: () => void;
}