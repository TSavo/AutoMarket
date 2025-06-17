/**
 * Media System Types (Vercel-safe)
 * 
 * This file contains core media types that might be needed by non-excluded components.
 * These are type-only definitions without any implementation dependencies.
 */

/**
 * Base media types
 */
export enum MediaType {
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  FONT = 'font'
}

/**
 * Content purpose enumeration
 */
export enum ContentPurpose {
  STORY_ILLUSTRATION = 'story_illustration',
  CHARACTER_PORTRAIT = 'character_portrait',
  LOCATION_IMAGE = 'location_image',
  BACKGROUND = 'background',
  OVERLAY = 'overlay',
  LOGO = 'logo',
  ICON = 'icon',
  THUMBNAIL = 'thumbnail',
  PREVIEW = 'preview',
  MARKETING = 'marketing',
  SOCIAL_MEDIA = 'social_media',
  PRINT = 'print',
  WEB = 'web',
  MOBILE = 'mobile',
  OTHER = 'other'
}

/**
 * Aspect ratio enumeration
 */
export enum AspectRatio {
  SQUARE = '1:1',
  LANDSCAPE = '16:9',
  PORTRAIT = '9:16',
  ULTRAWIDE = '21:9',
  CLASSIC = '4:3',
  CINEMA = '2.35:1',
  VERTICAL = '3:4',
  INSTAGRAM_STORY = '9:16',
  INSTAGRAM_POST = '1:1',
  YOUTUBE_THUMBNAIL = '16:9',
  CUSTOM = 'custom'
}

/**
 * Base asset interface
 */
export interface BaseAsset {
  id: string;
  filename: string;
  originalFilename: string;
  path: string;
  url: string;
  mediaType: MediaType;
  mimeType: string;
  fileSize: number;
  contentPurpose: ContentPurpose;
  tags: string[];
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Image asset interface
 */
export interface ImageAsset extends BaseAsset {
  mediaType: MediaType.IMAGE;
  width: number;
  height: number;
  aspectRatio: AspectRatio;
  format: string;
  colorSpace?: string;
  hasAlpha?: boolean;
}

/**
 * Video asset interface
 */
export interface VideoAsset extends BaseAsset {
  mediaType: MediaType.VIDEO;
  width: number;
  height: number;
  aspectRatio: AspectRatio;
  duration: number;
  frameRate: number;
  bitrate: number;
  format: string;
  codec: string;
  hasAudio: boolean;
}

/**
 * Audio asset interface
 */
export interface AudioAsset extends BaseAsset {
  mediaType: MediaType.AUDIO;
  duration: number;
  bitrate: number;
  sampleRate: number;
  channels: number;
  format: string;
  codec: string;
}

/**
 * Font asset interface
 */
export interface FontAsset extends BaseAsset {
  mediaType: MediaType.FONT;
  fontFamily: string;
  fontStyle: string;
  fontWeight: string;
  format: string;
  subset?: string;
}

/**
 * Options for media ingest operations
 */
export interface MediaIngestOptions {
  generateDerivatives?: boolean;
  extractMetadata?: boolean;
  customMetadata?: Record<string, any>;
  tags?: string[];
  contentPurpose?: ContentPurpose;
}

/**
 * Result of a media ingest operation
 */
export interface MediaIngestResult {
  asset: BaseAsset;
  warnings?: string[];
  derivativesGenerated?: boolean;
  extractedMetadata?: Record<string, any>;
}
