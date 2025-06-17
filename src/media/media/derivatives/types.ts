/**
 * Type definitions for derivative media assets
 * 
 * These types are separated to avoid importing heavy processing dependencies
 * when only retrieval functionality is needed
 */

/**
 * Standard derivative types for consistent tagging
 */
export enum DerivativeType {
  THUMBNAIL = 'thumbnail',
  PREVIEW = 'preview',
  SCREENCAP = 'screencap',
  WAVEFORM = 'waveform',
  FONT_SAMPLE = 'font-sample',
  VIDEO_PREVIEW = 'video-preview'
}

/**
 * Derivative asset information
 */
export interface DerivativeAsset {
  /**
   * Unique identifier for the derivative
   */
  id: string;
  
  /**
   * Path to the derivative file
   */
  path: string;
  
  /**
   * Type of derivative (e.g., thumbnail, preview)
   */
  type: DerivativeType;
  
  /**
   * Associated tags for the derivative
   */
  tags: string[];
  
  /**
   * ID of the source asset this derivative was created from
   */
  sourceId: string;
}

/**
 * Options for creating a derivative media asset
 */
export interface DerivativeMediaOptions {
  /**
   * Path to the derivative file
   */
  path: string;
  
  /**
   * Original source asset ID
   */
  sourceAssetId: string;
  
  /**
   * Derivative type for tagging
   */
  type: DerivativeType;
  
  /**
   * Additional tags to associate with the derivative
   */
  tags?: string[];
}
