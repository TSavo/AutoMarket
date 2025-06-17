import { BaseAsset, MediaType, AspectRatio, BaseFilterOptions } from './types';

/**
 * Supported video formats
 */
export enum VideoFormat {
  MP4 = 'mp4',
  WEBM = 'webm'
}

/**
 * Interface for video assets
 */
export interface VideoAsset extends BaseAsset {
  type: MediaType.VIDEO;
  format: VideoFormat;
  width: number; // in pixels
  height: number; // in pixels
  aspectRatio: AspectRatio | string; // Can be standard ratio or custom
  duration: number; // in seconds
  hasAudio: boolean;
  hasCaptions: boolean;
  hasTransparency: boolean; // Whether the video has an alpha channel (transparency)
  captionPaths?: string[]; // Paths to caption files if available
  thumbnailPath?: string; // Path to thumbnail image
  frameRate?: number; // Frames per second
  bitrate?: number; // Bits per second
  codec?: string; // Video codec (e.g., h264, vp9)
  audioCodec?: string; // Audio codec (e.g., aac, opus)
  resolution?: string; // Human-readable resolution (SD, HD, 4K, etc.)
}

/**
 * Filter options specific to video assets
 */
export interface VideoFilterOptions extends BaseFilterOptions {
  format?: VideoFormat[];
  aspectRatio?: AspectRatio | string;
  maxWidth?: number; // in pixels
  minWidth?: number; // in pixels
  maxHeight?: number; // in pixels
  minHeight?: number; // in pixels
  maxDuration?: number; // in seconds
  minDuration?: number; // in seconds
  hasAudio?: boolean;
  hasCaptions?: boolean;
  hasTransparency?: boolean; // Filter by transparency (alpha channel) status
  minFrameRate?: number; // Minimum frames per second
  maxFrameRate?: number; // Maximum frames per second
  minBitrate?: number; // Minimum bits per second
  maxBitrate?: number; // Maximum bits per second
  codec?: string[]; // Video codec(s) to filter by
  audioCodec?: string[]; // Audio codec(s) to filter by
  resolution?: string[]; // Resolution(s) to filter by (SD, HD, 4K, etc.)
}

/**
 * Type guard to check if an asset is a VideoAsset
 */
export function isVideoAsset(asset: BaseAsset): asset is VideoAsset {
  return asset.type === MediaType.VIDEO;
}
