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
import { Video } from './Video';
import { Text } from './Text';
import { Image } from './Image';

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
    return `AUDIO(${this.data.length} bytes)`;
  }

  // AudioRole interface implementation
  async asRole<T extends Audio | Video | Text | Image>(
    targetType: new (...args: any[]) => T,
    modelId?: string
  ): Promise<T> {
    if (targetType === Audio as any) {
      return this as unknown as T;
    }
    // For other roles, would need provider-based transformation
    throw new Error(`Cannot transform Audio to ${targetType.name} without a provider`);
  }

  canPlayRole<T extends Audio | Video | Text | Image>(
    targetType: new (...args: any[]) => T
  ): boolean {
    // Use synchronous version for immediate checking
    const { canPlayRoleSync } = require('../../RoleTransformation');
    return canPlayRoleSync(this, targetType);
  }

  getAudioMetadata(): AudioMetadata {
    return this.metadata || {
      format: this.getFormat() as AudioFormat,
      duration: this.getDuration(),
      sampleRate: 44100,
      channels: 2
    };
  }

  // Rich interface methods for compatibility
  getFormat(): string {
    // Try to get format from own metadata first
    if (this.metadata?.format) {
      return this.metadata.format;
    }
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
