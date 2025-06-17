import { BaseAsset, MediaType, AspectRatio, BaseFilterOptions } from './types';

/**
 * Supported image formats
 */
export enum ImageFormat {
  PNG = 'png',
  JPG = 'jpg',
  JPEG = 'jpeg',
  WEBP = 'webp',
  AVIF = 'avif',
  SVG = 'svg',
  GIF = 'gif'
}

/**
 * Interface for image assets
 */
export interface ImageAsset extends BaseAsset {
  type: MediaType.IMAGE;
  format: ImageFormat;
  width: number; // in pixels
  height: number; // in pixels
  aspectRatio: AspectRatio | string; // Can be standard ratio or custom
  alt?: string; // Alternative text for accessibility
  optimized: boolean; // Has the image been optimized?
  hasResponsiveVersions: boolean; // Are there responsive versions available?
  responsiveVersions?: string[]; // Paths to responsive versions if available
  colorSpace?: string; // Color space (e.g., 'sRGB', 'Adobe RGB')
  dpi?: number; // DPI (dots per inch) of the image
}

/**
 * Filter options specific to image assets
 */
export interface ImageFilterOptions extends BaseFilterOptions {
  format?: ImageFormat[];
  aspectRatio?: AspectRatio | string;
  maxWidth?: number; // in pixels
  minWidth?: number; // in pixels
  maxHeight?: number; // in pixels
  minHeight?: number; // in pixels
  optimized?: boolean;
  hasResponsiveVersions?: boolean;
}

/**
 * Type guard to check if an asset is an ImageAsset
 */
export function isImageAsset(asset: BaseAsset): asset is ImageAsset {
  return asset.type === MediaType.IMAGE;
}
