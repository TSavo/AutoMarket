import { MediaType, BaseAsset } from '../types';

export interface AudioTrack extends BaseAsset {
  type: MediaType.AUDIO;
  duration: number; // in seconds
  artist?: string;
  album?: string;
  genre?: string;
  format?: string; // e.g., 'mp3', 'wav', 'aac'
  codec?: string; // e.g., 'mp3', 'pcm_s16le', 'aac'
  bitrate?: number; // in bps
  sampleRate?: number; // in Hz
  channels?: number;
  channelLayout?: string;
  mood?: string; // For the audio library feature
}

export const AUDIO_MIME_TYPES: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.aac': 'audio/aac',
  '.ogg': 'audio/ogg',
  '.flac': 'audio/flac',
  '.m4a': 'audio/mp4',
};

export const AUDIO_EXTENSIONS = Object.keys(AUDIO_MIME_TYPES);
