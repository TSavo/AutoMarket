import { BaseAsset, MediaType, BaseFilterOptions } from './types';

/**
 * Supported audio formats
 */
export enum AudioFormat {
  MP3 = 'mp3',
  WAV = 'wav',
  OGG = 'ogg'
}

/**
 * Interface for audio assets
 */
export interface AudioAsset extends BaseAsset {
  type: MediaType.AUDIO;
  format: AudioFormat;
  duration: number; // in seconds
  bitrate: number; // in kbps
  channels: number; // 1 for mono, 2 for stereo, etc.
  sampleRate: number; // in Hz
  hasTranscript: boolean;
  transcriptPath?: string; // Path to transcript file if available
  waveformImagePath?: string; // Path to waveform image if available
  mood?: string; // Added mood property
}

/**
 * Filter options specific to audio assets
 */
export interface AudioFilterOptions extends BaseFilterOptions {
  format?: AudioFormat[];
  maxDuration?: number; // in seconds
  minDuration?: number; // in seconds
  minBitrate?: number; // in kbps
  maxBitrate?: number; // in kbps
  channels?: number;
  minSampleRate?: number; // in Hz
  maxSampleRate?: number; // in Hz
  hasTranscript?: boolean;
  mood?: string; // Added mood filter
  targetDuration?: number; // Added targetDuration filter
  allowLooping?: boolean; // Added allowLooping filter
  maxLoops?: number; // Added maxLoops filter
}

/**
 * Type guard to check if an asset is an AudioAsset
 */
export function isAudioAsset(asset: BaseAsset): asset is AudioAsset {
  return asset.type === MediaType.AUDIO;
}
