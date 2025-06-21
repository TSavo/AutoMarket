/**
 * Enhanced Asset Role Casting with FFmpeg Support
 * 
 * Provides async versions of role casting that can handle video-to-audio extraction
 * using FFmpeg for intelligent media conversion.
 */

import { Asset } from '../Asset';
import { Audio, hasAudioRole, hasVideoRole } from '../roles';
import { FFmpegService, FFmpegOptions } from '../../services/FFmpegService';

/**
 * Enhanced async casting functions that support FFmpeg extraction
 */
export class EnhancedAssetCasting {
  private static ffmpegService = FFmpegService.getInstance();

  /**
   * Intelligently cast an asset to Audio, with FFmpeg extraction for video files
   */
  static async castToAudioSmart(
    asset: Asset,
    options: FFmpegOptions = {}
  ): Promise<Audio> {
    // If it's already has AudioRole and it's not a video, use normal casting
    if (hasAudioRole(asset) && !this.isVideoFormat(asset)) {
      return asset.asAudio();
    }

    // If it's a video file, extract audio using FFmpeg
    if (this.isVideoFormat(asset)) {
      try {
        const result = await this.ffmpegService.extractAudioFromVideo(
          asset.data,
          {
            outputFormat: 'wav', // Default to WAV for compatibility
            ...options
          }
        );

        // Create new Audio object with extracted audio data
        return new Audio(result.audioBuffer, asset);
      } catch (error) {
        console.error('Failed to extract audio from video, falling back to original data:', error);
        // Fallback to creating Audio from original data
        return new Audio(asset.data, asset);
      }
    }

    // For other formats, try normal audio role casting
    if (hasAudioRole(asset)) {
      return asset.asAudio();
    }

    throw new Error(`Asset cannot be cast to Audio. Format: ${asset.metadata.format}`);
  }
  /**
   * Extract audio from video file path
   */
  static async extractAudioFromVideoFile(
    videoFilePath: string,
    options: FFmpegOptions = {}
  ): Promise<Audio> {
    try {
      const result = await this.ffmpegService.extractAudioFromVideoFile(
        videoFilePath,
        {
          outputFormat: 'wav',
          ...options
        }
      );

      // Create a simple source asset reference
      const sourceAsset = {
        metadata: {
          sourceFile: videoFilePath,
          format: 'audio-extracted',
          originalFormat: videoFilePath.split('.').pop()?.toLowerCase()
        }
      };

      return new Audio(result.audioBuffer, sourceAsset);
    } catch (error) {
      throw new Error(`Failed to extract audio from video file: ${error.message}`);
    }
  }
  /**
   * Check if FFmpeg is available for video processing
   */
  static async isFFmpegAvailable(): Promise<boolean> {
    return this.ffmpegService.isAvailable();
  }

  /**
   * Check if asset is a video format
   */
  private static isVideoFormat(asset: Asset): boolean {
    const videoFormats = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'];
    return videoFormats.includes(asset.metadata.format?.toLowerCase() || '');
  }
}

/**
 * Convenience functions for enhanced casting
 */

/**
 * Smart async version of castToAudio that uses FFmpeg for video files
 */
export async function castToAudioSmart(
  asset: Asset,
  options: FFmpegOptions = {}
): Promise<Audio> {
  return EnhancedAssetCasting.castToAudioSmart(asset, options);
}

/**
 * Extract audio from video file
 */
export async function extractAudioFromVideoFile(
  videoFilePath: string,
  options: FFmpegOptions = {}
): Promise<Audio> {
  return EnhancedAssetCasting.extractAudioFromVideoFile(videoFilePath, options);
}
