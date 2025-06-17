/**
 * VideoAssetClass
 *
 * Class for video assets with video-specific functionality.
 */

import { MediaType, AspectRatio, ContentPurpose } from './types';
import { VideoAsset, VideoFormat } from './video';
import { BaseAssetClass } from './BaseAssetClass';
import { calculateAspectRatio, getAspectRatioString } from './utils/AspectRatioUtils';

/**
 * Class for video assets
 */
export class VideoAssetClass extends BaseAssetClass implements VideoAsset {
  type: MediaType.VIDEO;
  format: VideoFormat;
  width: number;
  height: number;
  aspectRatio: AspectRatio | string;
  duration: number;
  hasAudio: boolean;
  hasCaptions: boolean;
  hasTransparency: boolean;
  captionPaths?: string[];
  thumbnailPath?: string;
  frameRate?: number;
  bitrate?: number;
  codec?: string;
  audioCodec?: string;
  resolution?: string;

  /**
   * Create a new VideoAssetClass
   * @param asset The video asset data to initialize with
   */
  constructor(asset: VideoAsset) {
    super(asset);

    this.format = asset.format;
    this.width = asset.width;
    this.height = asset.height;
    this.duration = asset.duration;
    this.frameRate = asset.frameRate;
    this.bitrate = asset.bitrate;
    this.thumbnailPath = asset.thumbnailPath;
    this.hasAudio = asset.hasAudio;
    this.hasCaptions = asset.hasCaptions;
    this.hasTransparency = asset.hasTransparency !== undefined ? asset.hasTransparency : false;
    this.aspectRatio = asset.aspectRatio;
    this.captionPaths = asset.captionPaths;
    this.codec = asset.codec;
    this.audioCodec = asset.audioCodec;
    this.resolution = asset.resolution;
  }

  /**
   * Set the thumbnail path for the video
   * @param path Path to the thumbnail
   */
  public setThumbnailPath(path: string | undefined): void {
    if (!path || path.trim() === '') {
      return;
    }

    this.thumbnailPath = path.trim();
    this.updateModifiedDate();
  }

  /**
   * Set the dimensions of the video
   * @param width Width in pixels
   * @param height Height in pixels
   */
  public setDimensions(width: number, height: number): void {
    if (width <= 0 || height <= 0) {
      return;
    }

    this.width = width;
    this.height = height;

    // Add dimension tags
    this.addTagValue('width', width);
    this.addTagValue('height', height);

    // Calculate and set aspect ratio
    this.calculateAndSetAspectRatio(width, height);

    this.updateModifiedDate();
  }

  /**
   * Calculate and set the aspect ratio based on dimensions
   * @param width Width in pixels
   * @param height Height in pixels
   */
  private calculateAndSetAspectRatio(width: number, height: number): void {
    // Use the common utility function to calculate aspect ratio
    const aspectRatio = calculateAspectRatio(width, height, 'Video:');

    // Set the aspect ratio property
    this.aspectRatio = aspectRatio;

    // Add the aspect ratio tag
    const aspectRatioString = getAspectRatioString(aspectRatio);
    this.addTagValue('aspectRatio', aspectRatioString);
  }

  // getGCD method removed - now using the common utility in AspectRatioUtils

  /**
   * Clear the thumbnail path
   * @returns True if a thumbnail path was cleared, false if there was no thumbnail path
   */
  public clearThumbnailPath(): boolean {
    if (this.thumbnailPath) {
      this.thumbnailPath = undefined;
      this.updateModifiedDate();
      return true;
    }

    return false;
  }

  /**
   * Set the frame rate for the video
   * @param fps Frame rate in frames per second
   */
  public setFrameRate(fps: number): void {
    if (fps <= 0) {
      return;
    }

    this.frameRate = fps;
    this.setTagValue('fps', fps);
    this.updateModifiedDate();
  }

  /**
   * Set the bitrate for the video
   * @param bitrate Bitrate in bits per second
   */
  public setBitrate(bitrate: number): void {
    if (bitrate <= 0) {
      return;
    }

    this.bitrate = bitrate;
    const bitrateMbps = Math.round(bitrate / 1000000 * 10) / 10; // Convert to Mbps with 1 decimal
    this.setTagValue('bitrate', `${bitrateMbps}Mbps`);
    this.updateModifiedDate();
  }

  /**
   * Set the video codec
   * @param codec Video codec name
   */
  public setCodec(codec: string): void {
    if (!codec || codec.trim() === '') {
      return;
    }

    this.codec = codec.trim();
    this.setTagValue('codec', this.codec);
    this.updateModifiedDate();
  }

  /**
   * Set the audio codec
   * @param codec Audio codec name
   */
  public setAudioCodec(codec: string): void {
    if (!codec || codec.trim() === '') {
      return;
    }

    this.audioCodec = codec.trim();
    this.setTagValue('audioCodec', this.audioCodec);
    this.updateModifiedDate();
  }

  /**
   * Set whether the video has audio
   * @param hasAudio Whether the video has audio
   */
  public setHasAudio(hasAudio: boolean): void {
    this.hasAudio = hasAudio;
    this.setTagValue('audio', hasAudio);
    this.updateModifiedDate();
  }

  /**
   * Set the duration of the video
   * @param duration Duration in seconds
   */
  public setDuration(duration: number): void {
    if (duration <= 0) {
      return;
    }

    this.duration = duration;

    // Add duration tags in different formats
    const durationMinutes = Math.floor(duration / 60);
    const durationSeconds = Math.round(duration % 60);

    this.setTagValue('length', `${durationMinutes}m${durationSeconds}s`);
    this.setTagValue('duration', Math.round(duration));

    this.updateModifiedDate();
  }

  /**
   * Set the resolution label
   * @param resolution Resolution label (SD, HD, FHD, 2K, 4K, etc.)
   */
  public setResolution(resolution: string): void {
    if (!resolution || resolution.trim() === '') {
      return;
    }

    this.resolution = resolution.trim();
    this.setTagValue('resolution', this.resolution);
    this.updateModifiedDate();
  }

  /**
   * Set the transparency status and add appropriate tags
   * @param hasTransparency Whether the video has an alpha channel
   */
  public setTransparency(hasTransparency: boolean): void {
    this.hasTransparency = hasTransparency;
    
    // Add appropriate tag
    if (hasTransparency) {
      this.addTag('transparent:true');
      
      // If it has transparency, it's likely meant to be an overlay
      // Add the OVERLAY content purpose if not already present
      if (!this.contentPurpose.includes(ContentPurpose.OVERLAY)) {
        this.contentPurpose.push(ContentPurpose.OVERLAY);
      }
    } else {
      this.addTag('transparent:false');
    }
    
    this.updateModifiedDate();
  }

  /**
   * Add a video-specific tag
   * @param tag The tag to add
   * @returns True if the tag was added, false if it already existed
   */
  public addVideoTag(tag: string): boolean {
    // Add a prefix to indicate it's a video-specific tag
    return this.addTag(`video:${tag}`);
  }

  /**
   * Convert the class instance to a plain object
   * @returns Plain object representation of the video asset
   */
  public toObject(): VideoAsset {
    const baseObject = super.toObject();

    return {
      ...baseObject,
      type: MediaType.VIDEO, // Explicitly set the type to ensure it's correct
      format: this.format,
      width: this.width,
      height: this.height,
      duration: this.duration,
      frameRate: this.frameRate,
      bitrate: this.bitrate,
      thumbnailPath: this.thumbnailPath,
      hasAudio: this.hasAudio,
      hasCaptions: this.hasCaptions,
      hasTransparency: this.hasTransparency,
      aspectRatio: this.aspectRatio,
      captionPaths: this.captionPaths,
      codec: this.codec,
      audioCodec: this.audioCodec,
      resolution: this.resolution
    };
  }
}
