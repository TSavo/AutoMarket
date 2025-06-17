import { BaseAsset, MediaType, BaseFilterOptions } from './types';

/**
 * Supported font formats
 */
export enum FontFormat {
  TTF = 'ttf',
  OTF = 'otf',
  WOFF = 'woff',
  WOFF2 = 'woff2'
}

/**
 * Interface for font assets
 */
export interface FontAsset extends BaseAsset {
  type: MediaType.FONT;
  format: FontFormat;
  family: string;
  weight: number; // 100-900
  style: 'normal' | 'italic' | 'oblique';
  isVariable: boolean;
  unicodeRange?: string;
  previewImagePath?: string; // Path to preview image
}

/**
 * Filter options specific to font assets
 */
export interface FontFilterOptions extends BaseFilterOptions {
  format?: FontFormat[];
  family?: string;
  weight?: number | [number, number]; // Single weight or range
  style?: ('normal' | 'italic' | 'oblique')[];
  isVariable?: boolean;
}

/**
 * Type guard to check if an asset is a FontAsset
 */
export function isFontAsset(asset: BaseAsset): asset is FontAsset {
  return asset.type === MediaType.FONT;
}
