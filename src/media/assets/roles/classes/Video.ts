/**
 * Video Class
 * 
 * Represents video data with format and metadata information.
 * Serves as both DTO and rich interface for video assets.
 * Implements VideoRole to be compatible with model interfaces.
 */

import { VideoFormat, VideoMetadata } from '../types';
import { VideoRole } from '../interfaces/VideoRole';
import { Audio } from './Audio';
import { Text } from './Text';
import { Image } from './Image';

export class Video implements VideoRole {
  constructor(
    public readonly data: Buffer,
    public readonly format: VideoFormat,
    public readonly metadata: VideoMetadata,
    public readonly sourceAsset?: any
  ) {}

  isValid(): boolean {
    return this.data && this.data.length > 0;
  }

  toString(): string {
    return `Video(${this.format}, ${this.data.length} bytes)`;
  }
  // VideoRole interface implementation
  async asRole<T extends Audio | Video | Text | Image>(
    targetType: new (...args: any[]) => T,
    modelId?: string
  ): Promise<T> {
    if (targetType === Video as any) {
      return this as any;
    }
    // For other roles, would need provider-based transformation
    throw new Error(`Cannot transform Video to ${targetType.name} without a provider`);
  }
  canPlayRole<T extends Audio | Video | Text | Image>(
    targetType: new (...args: any[]) => T
  ): boolean {
    // Use synchronous version for immediate checking
    const { canPlayRoleSync } = require('../../RoleTransformation');
    return canPlayRoleSync(this, targetType);
  }

  getVideoMetadata(): VideoMetadata {
    return this.metadata;
  }

  // Rich interface methods for compatibility
  getDuration(): number | undefined {
    return this.metadata.duration;
  }

  getDimensions(): { width: number; height: number } | undefined {
    if (this.metadata.width && this.metadata.height) {
      return { width: this.metadata.width, height: this.metadata.height };
    }
    return undefined;
  }

  getWidth(): number | undefined {
    return this.metadata.width;
  }

  getHeight(): number | undefined {
    return this.metadata.height;
  }

  getSize(): number {
    return this.data.length;
  }

  getFileSize(): number {
    return this.metadata.fileSize || this.data.length;
  }

  getHumanSize(): string {
    const bytes = this.data.length;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }
  getHumanDuration(): string {
    const duration = this.getDuration();
    if (!duration) return 'unknown';
    
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    const seconds = Math.floor(duration % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  getFrameRate(): number | undefined {
    return this.metadata.frameRate;
  }

  hasAudio(): boolean {
    return this.metadata.hasAudio || false;
  }

  // Static factory methods for compatibility
  static fromFile(filePath: string): Video {
    // This would need actual implementation to read file
    throw new Error('Video.fromFile not implemented - use SmartAssetFactory instead');
  }
}
