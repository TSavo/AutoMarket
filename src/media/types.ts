/**
 * Media asset types and interfaces for the Horizon City Stories project
 */

/**
 * Supported media types
 */
export enum MediaType {
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  FONT = 'font'
}

/**
 * Import the unified AspectRatio enum from the common module
 */
import { AspectRatio } from '../common/aspect-ratio/types';

// Re-export AspectRatio
export { AspectRatio };

/**
 * Content purpose tags
 */
export enum ContentPurpose {
  INTRO = 'intro',
  OUTRO = 'outro',
  OVERLAY = 'overlay',
  BACKGROUND = 'background',
  CONTENT = 'content',
  THUMBNAIL = 'thumbnail',
  ICON = 'icon',
  BANNER = 'banner',
  LOGO = 'logo',
  HERO = 'hero',
  PORTRAIT = 'portrait',
  DOCUMENT = 'document',
  FINISHED = 'finished',
  MARKETING = 'marketing'
}

/**
 * Base interface for all media assets
 */
export interface BaseAsset {
  id: string;
  path: string;
  filename: string;
  type: MediaType;
  title: string;
  description?: string;
  tags: string[];
  contentPurpose: ContentPurpose[];
  dateCreated: string; // ISO date string
  dateModified: string; // ISO date string
  author?: string;
  license?: string;
  fileSize: number; // in bytes
  format?: string;
}

/**
 * Image asset interface
 */
export interface ImageAsset extends BaseAsset {
  format: string;
  width: number;
  height: number;
  colorSpace?: string; // e.g., 'RGB', 'CMYK'
  dpi?: number;
}

/**
 * Video asset interface
 */
export interface VideoAsset extends BaseAsset {
  format: string;
  width: number;
  height: number;
  duration: number; // in seconds
  frameRate?: number;
  bitrate?: number; // in bits per second
  thumbnailPath?: string; // Path to the thumbnail image
  hasAudio?: boolean; // Whether the video has audio
  hasCaptions?: boolean; // Whether the video has captions
  transcript?: string; // Generated transcript text
  transcriptLanguage?: string; // Language of the transcript
  transcriptConfidence?: number; // Confidence score from STT
  transcriptGeneratedAt?: string; // ISO date when transcript was generated
}

/**
 * Audio asset interface
 */
export interface AudioAsset extends BaseAsset {
  format: string;
  duration: number; // in seconds
  bitrate: number; // in bits per second
  channels?: number; // 1 for mono, 2 for stereo, etc.
  sampleRate?: number; // in Hz
  hasTranscript?: boolean; // Whether the audio has a transcript
}

/**
 * Font asset interface
 */
export interface FontAsset extends BaseAsset {
  format: string;
  family: string;
  weight: string; // e.g., '400', '700'
  style: string; // e.g., 'normal', 'italic'
  previewImagePath?: string;
  isVariable?: boolean; // Whether the font is a variable font
}

/**
 * Media Database - the structure of the JSON file
 */
export interface MediaDatabase {
  lastUpdated: string; // ISO date string
  assets: BaseAsset[];
}

/**
 * Composition interface for video compositions
 */
export interface Composition {
  id: string;
  title: string;
  description?: string;
  contentAssetId: string;
  introAssetId?: string;
  outroAssetId?: string;
  // Audio assets for each main clip
  contentAudioAssetId?: string;
  introAudioAssetId?: string;
  outroAudioAssetId?: string;
  // Duration for image assets (only required when using image assets)
  contentDuration?: number;
  introDuration?: number;
  outroDuration?: number;
  overlayConfigs?: Array<any>;
  crossfadeDuration: number;
  createdAt: Date;
  updatedAt: Date;
  // Additional properties needed by ProjectList.tsx
  clips?: Array<{
    type: string;
    asset: string;
  }>;
}

/**
 * Base filter options interface
 */
export interface BaseFilterOptions {
  tags?: string[];
  contentPurpose?: ContentPurpose[];
  maxFileSize?: number; // in bytes
  minFileSize?: number; // in bytes
  author?: string;
  license?: string;
  dateCreatedAfter?: string; // ISO date string
  dateCreatedBefore?: string; // ISO date string
  dateModifiedAfter?: string; // ISO date string
  dateModifiedBefore?: string; // ISO date string
  searchText?: string; // Search in title and description
}
