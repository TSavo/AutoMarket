/**
 * Audio Class
 * 
 * Represents audio data with validation and utility methods.
 * Serves as both DTO and rich interface for audio assets.
 * Implements AudioRole to be compatible with model interfaces.
 */

import { AudioMetadata } from '../types';
import { AudioRole } from '../interfaces/AudioRole';
import { AudioFormat } from '../types/formats';

export class Audio implements AudioRole {
  constructor(
    public readonly data: Buffer,
    public readonly sourceAsset?: any,
    public readonly metadata?: AudioMetadata
  ) {}

  isValid(): boolean {
    return this.data && this.data.length > 0;
  }

  toString(): string {
    return `Audio(${this.data.length} bytes)`;
  }

  // AudioRole interface implementation
  async asAudio(): Promise<Audio> {
    return this;
  }
  getAudioMetadata(): AudioMetadata {
    return this.metadata || {
      format: this.getFormat() as AudioFormat,
      duration: this.getDuration(),
      sampleRate: 44100,
      channels: 2
    };
  }

  canPlayAudioRole(): boolean {
    return this.isValid();
  }

  // Rich interface methods for compatibility
  getFormat(): string {
    // Try to get format from source asset metadata
    if (this.sourceAsset?.metadata?.format) {
      return this.sourceAsset.metadata.format;
    }
    // Default fallback
    return 'mp3';
  }

  getDuration(): number | undefined {
    // Try to get duration from source asset metadata  
    return this.sourceAsset?.metadata?.duration;
  }

  getSize(): number {
    return this.data.length;
  }

  getHumanSize(): string {
    const bytes = this.data.length;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  getHumanDuration(): string {
    const duration = this.getDuration();
    if (!duration) return 'unknown';
    
    const minutes = Math.floor(duration / 60);
    const seconds = Math.floor(duration % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  // Property compatibility
  get format(): string {
    return this.getFormat();
  }
}
