/**
 * FFMPEGVideoComposerModel
 * 
 * Concrete implementation of VideoToVideoModel using FFMPEG Docker service.
 * Handles video composition, overlay, and transformation operations.
 */

import { VideoToVideoModel, VideoCompositionOptions, VideoCompositionResult } from './VideoToVideoModel';
import { Video, VideoRole } from '../assets/roles';
import { VideoInput, castToVideo } from '../assets/casting';
import { ModelMetadata } from './Model';
import { FFMPEGDockerService } from '../services/FFMPEGDockerService';
import { FFMPEGAPIClient } from '../clients/FFMPEGAPIClient';

export interface FFMPEGVideoComposerConfig {
  dockerService: FFMPEGDockerService;
  apiClient: FFMPEGAPIClient;
}

/**
 * FFMPEG-based video composer model for overlay operations
 */
export class FFMPEGVideoComposerModel extends VideoToVideoModel {
  private dockerService: FFMPEGDockerService;
  private apiClient: FFMPEGAPIClient;

  constructor(config: FFMPEGVideoComposerConfig) {
    super({
      id: 'ffmpeg-video-composer',
      name: 'FFMPEG Video Composer',
      description: 'Video composition model using FFMPEG with overlay and positioning capabilities',
      version: '1.0.0',
      capabilities: [
        'video-overlay',
        'video-composition', 
        'smart-positioning',
        'aspect-ratio-handling',
        'multi-format-support'
      ],
      inputTypes: ['video'],
      outputTypes: ['video'],
      provider: 'ffmpeg-docker'
    });

    this.dockerService = config.dockerService;
    this.apiClient = config.apiClient;
  }  /**
   * Transform and compose videos using FFMPEG - supports single or multiple overlays
   */
  async transform(
    baseVideo: VideoInput,
    overlayVideos: VideoInput | VideoInput[],
    options: VideoCompositionOptions = {}
  ): Promise<VideoCompositionResult> {
    // Cast base video to Video role
    const baseVideoRole = await castToVideo(baseVideo);
    
    // Normalize overlayVideos to array and cast all to Video roles
    const overlayArray = Array.isArray(overlayVideos) ? overlayVideos : [overlayVideos];
    const overlayVideoRoles = await Promise.all(overlayArray.map(v => castToVideo(v)));

    // Validate we have at least one overlay
    if (overlayVideoRoles.length === 0) {
      throw new Error('At least one overlay video is required');
    }

    // Set defaults with GPU codec preference
    const compositionOptions = {
      overlayStartTime: options.overlayStartTime ?? 0,
      overlayDuration: options.overlayDuration ?? 0,
      position: options.position ?? 'bottom-right',
      offsetX: options.offsetX ?? 0,
      offsetY: options.offsetY ?? 0,
      overlayWidth: options.overlayWidth ?? '25%',
      overlayHeight: options.overlayHeight ?? '25%',
      maintainAspectRatio: options.maintainAspectRatio ?? true,
      opacity: options.opacity ?? 1.0,
      blendMode: options.blendMode ?? 'normal',
      outputFormat: options.outputFormat ?? 'mp4',
      outputQuality: options.outputQuality ?? 'high',
      outputResolution: options.outputResolution ?? 'original',
      framerate: options.framerate ?? 30,
      codec: options.codec ?? 'h264_nvenc',
      smartPositioning: options.smartPositioning ?? true,
      fallbackPosition: options.fallbackPosition ?? 'bottom-center',
      overlayConfigs: options.overlayConfigs ?? [],
      customFilterComplex: options.customFilterComplex
    };

    try {
      // Prepare all videos for API call
      const allVideos = [baseVideoRole, ...overlayVideoRoles];
      const videoBuffers = allVideos.map(v => v.data);

      // Build filter complex based on configuration
      let filterComplex: string | undefined;

      if (compositionOptions.customFilterComplex) {
        // Use provided custom filter complex
        filterComplex = compositionOptions.customFilterComplex;
      } else if (overlayVideoRoles.length === 1) {
        // Simple 2-video case - let the backend handle with default overlay
        filterComplex = undefined; // Backend will use simple overlay
      } else {
        // Multi-video case - build dynamic filter complex
        filterComplex = this.buildMultiOverlayFilterComplex(
          await this.getVideoMetadata(baseVideoRole),
          await Promise.all(overlayVideoRoles.map(v => this.getVideoMetadata(v))),
          compositionOptions
        );
      }

      // Call unified API
      const compositionResult = await this.apiClient.composeVideo(
        videoBuffers,
        {
          outputFormat: compositionOptions.outputFormat,
          filterComplex,
          codec: compositionOptions.codec,
          videoOutputLabel: 'final_video',
          audioOutputLabel: 'mixed_audio',
          customAudioMapping: !!filterComplex // Use custom audio mixing if we have filter complex
        }
      );

      if (!compositionResult.videoBuffer) {
        throw new Error('Video composition result missing video buffer');
      }
      
      const composedVideo = new Video(
        compositionResult.videoBuffer,
        baseVideoRole.sourceAsset
      );

      // Generate overlay info for metadata
      const overlayInfo = overlayVideoRoles.map((_, index) => {
        const config = compositionOptions.overlayConfigs?.[index] || {};
        return {
          index,
          startTime: config.startTime ?? compositionOptions.overlayStartTime ?? 0,
          duration: config.duration ?? compositionOptions.overlayDuration ?? 0,
          position: config.position ?? compositionOptions.position ?? 'bottom-right',
          finalSize: { width: 0, height: 0 } // Would need metadata calculation for exact size
        };
      });

      return {
        composedVideo,
        metadata: {
          duration: compositionResult.metadata.duration,
          resolution: `${compositionResult.metadata.width}x${compositionResult.metadata.height}`,
          aspectRatio: `${compositionResult.metadata.width}:${compositionResult.metadata.height}`,
          framerate: compositionResult.metadata.framerate,
          baseVideoInfo: {
            duration: compositionResult.metadata.duration,
            resolution: `${compositionResult.metadata.width}x${compositionResult.metadata.height}`
          },
          overlayInfo: {
            count: overlayVideoRoles.length,
            overlays: overlayInfo
          }
        }
      };

    } catch (error) {
      throw new Error(`Video composition failed: ${error.message}`);
    }
  }
  /**
   * Check if the model is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      return await this.dockerService.isHealthy();
    } catch (error) {
      console.warn('FFMPEG Video Composer availability check failed:', error.message);
      return false;
    }
  }

  /**
   * Get Docker service for advanced operations
   */
  getDockerService(): FFMPEGDockerService {
    return this.dockerService;
  }

  /**
   * Get API client for advanced operations
   */
  getAPIClient(): FFMPEGAPIClient {
    return this.apiClient;
  }

  /**
   * Build filter complex for multiple overlays - helper method
   */
  private buildMultiOverlayFilterComplex(
    baseMetadata: any,
    overlayMetadatas: any[],
    options: any
  ): string {
    let filterParts: string[] = [];
    let audioInputs: string[] = [];

    // Process base video
    let currentVideoLabel = '[base_processed]';
    filterParts.push(`[0:v]format=yuv420p${currentVideoLabel}`);
    audioInputs.push('[0:a]');

    // Process each overlay
    overlayMetadatas.forEach((overlayMeta, index) => {
      const inputIndex = index + 1; // Base video is 0, overlays start from 1
      const config = options.overlayConfigs?.[index] || {};
      
      // Merge overlay config with global options
      const overlayOptions = {
        startTime: config.startTime ?? options.overlayStartTime ?? 0,
        duration: config.duration ?? options.overlayDuration ?? 0,
        position: config.position ?? options.position ?? this.getDefaultPosition(index),
        width: config.width ?? options.overlayWidth ?? '25%',
        height: config.height ?? options.overlayHeight ?? '25%',
        opacity: config.opacity ?? options.opacity ?? 1.0,
        offsetX: config.offsetX ?? options.offsetX ?? 0,
        offsetY: config.offsetY ?? options.offsetY ?? 0
      };

      // Calculate overlay size
      const overlaySize = this.calculateOverlaySize(
        baseMetadata.width,
        baseMetadata.height,
        overlayMeta.width,
        overlayMeta.height,
        overlayOptions
      );

      const coordinates = this.calculatePositionCoordinates(
        baseMetadata.width,
        baseMetadata.height,
        overlaySize.width,
        overlaySize.height,
        overlayOptions.position,
        overlayOptions.offsetX,
        overlayOptions.offsetY
      );

      // Build overlay processing chain
      let overlayChain = `[${inputIndex}:v]`;

      // Add timing if specified
      if (overlayOptions.startTime > 0) {
        overlayChain += `tpad=start_duration=${overlayOptions.startTime}:start_mode=add:color=black@0.0,`;
      }

      if (overlayOptions.duration > 0) {
        const totalDuration = overlayOptions.startTime + overlayOptions.duration;
        overlayChain += `trim=duration=${totalDuration},`;
      }

      overlayChain += `setpts=PTS-STARTPTS,`;
      overlayChain += `colorkey=0x000000:0.30:0.10,scale=${overlaySize.width}:${overlaySize.height}`;

      if (overlayOptions.opacity < 1.0) {
        overlayChain += `,format=rgba,colorchannelmixer=aa=${overlayOptions.opacity}`;
      }

      const overlayLabel = `[overlay_${index}]`;
      overlayChain += overlayLabel;
      filterParts.push(overlayChain);

      // Combine current video with this overlay
      const nextVideoLabel = index === overlayMetadatas.length - 1 ? '[final_video]' : `[video_${index + 1}]`;
      filterParts.push(`${currentVideoLabel}${overlayLabel}overlay=format=auto:x=${coordinates.x}:y=${coordinates.y}${nextVideoLabel}`);
      currentVideoLabel = nextVideoLabel;

      // Add audio input
      audioInputs.push(`[${inputIndex}:a]`);
    });

    // Mix all audio streams
    if (audioInputs.length > 1) {
      const audioMixChain = audioInputs.map((input, index) => {
        let chain = input;
        // Add audio timing for overlay audios
        if (index > 0) {
          const config = options.overlayConfigs?.[index - 1] || {};
          const startTime = config.startTime ?? options.overlayStartTime ?? 0;
          const duration = config.duration ?? options.overlayDuration ?? 0;
          
          if (startTime > 0) {
            chain += `adelay=${startTime * 1000}|${startTime * 1000},`;
          }
          if (duration > 0) {
            const totalDuration = startTime + duration;
            chain += `atrim=duration=${totalDuration},`;
          }
        }
        return chain + `aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo[audio_${index}]`;
      });

      filterParts.push(...audioMixChain);

      const audioLabels = audioInputs.map((_, index) => `[audio_${index}]`).join('');
      filterParts.push(`${audioLabels}amix=inputs=${audioInputs.length}:duration=longest:dropout_transition=0[mixed_audio]`);
    } else {
      filterParts.push('[0:a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo[mixed_audio]');
    }

    return filterParts.join(';');
  }

  /**
   * Get video metadata using FFMPEG
   */
  private async getVideoMetadata(video: Video): Promise<{
    width: number;
    height: number;
    duration: number;
    framerate: number;
    aspectRatio: number;
  }> {
    try {
      const metadata = await this.apiClient.getVideoMetadata(video.data);
      
      return {
        width: metadata.width,
        height: metadata.height,
        duration: metadata.duration,
        framerate: metadata.framerate,
        aspectRatio: metadata.width / metadata.height
      };
    } catch (error) {
      // Fallback to basic metadata if available
      if (video.metadata?.width && video.metadata?.height) {
        return {
          width: video.metadata.width,
          height: video.metadata.height,
          duration: video.metadata.duration || 0,
          framerate: video.metadata.framerate || 30,
          aspectRatio: video.metadata.width / video.metadata.height
        };
      }
      throw new Error(`Could not get video metadata: ${error.message}`);
    }
  }

  /**
   * Calculate position coordinates for overlay
   */
  private calculatePositionCoordinates(
    baseWidth: number,
    baseHeight: number,
    overlayWidth: number,
    overlayHeight: number,
    position: VideoCompositionOptions['position'],
    offsetX: number,
    offsetY: number
  ): { x: number; y: number } {
    let x = 0;
    let y = 0;

    // Calculate base position
    switch (position) {
      case 'top-left':
        x = 0;
        y = 0;
        break;
      case 'top-center':
        x = (baseWidth - overlayWidth) / 2;
        y = 0;
        break;
      case 'top-right':
        x = baseWidth - overlayWidth;
        y = 0;
        break;
      case 'center-left':
        x = 0;
        y = (baseHeight - overlayHeight) / 2;
        break;
      case 'center':
        x = (baseWidth - overlayWidth) / 2;
        y = (baseHeight - overlayHeight) / 2;
        break;
      case 'center-right':
        x = baseWidth - overlayWidth;
        y = (baseHeight - overlayHeight) / 2;
        break;
      case 'bottom-left':
        x = 0;
        y = baseHeight - overlayHeight;
        break;
      case 'bottom-center':
        x = (baseWidth - overlayWidth) / 2;
        y = baseHeight - overlayHeight;
        break;
      case 'bottom-right':
      default:
        x = baseWidth - overlayWidth;
        y = baseHeight - overlayHeight;
        break;
    }

    // Apply offsets
    x += offsetX;
    y += offsetY;

    // Ensure coordinates are within bounds
    x = Math.max(0, Math.min(x, baseWidth - overlayWidth));
    y = Math.max(0, Math.min(y, baseHeight - overlayHeight));

    return { x: Math.round(x), y: Math.round(y) };
  }

  /**
   * Calculate overlay size based on percentage or absolute values
   */
  protected calculateOverlaySize(
    baseWidth: number,
    baseHeight: number,
    overlayWidth: number,
    overlayHeight: number,
    options: any
  ): { width: number; height: number } {
    let finalWidth: number;
    let finalHeight: number;

    // Parse width
    if (typeof options.overlayWidth === 'string' && options.overlayWidth.includes('%')) {
      const percentage = parseFloat(options.overlayWidth.replace('%', '')) / 100;
      finalWidth = Math.round(baseWidth * percentage);
    } else {
      finalWidth = parseInt(options.overlayWidth) || Math.round(baseWidth * 0.25);
    }

    // Parse height
    if (typeof options.overlayHeight === 'string' && options.overlayHeight.includes('%')) {
      const percentage = parseFloat(options.overlayHeight.replace('%', '')) / 100;
      finalHeight = Math.round(baseHeight * percentage);
    } else {
      finalHeight = parseInt(options.overlayHeight) || Math.round(baseHeight * 0.25);
    }

    // Maintain aspect ratio if requested
    if (options.maintainAspectRatio) {
      const overlayAspectRatio = overlayWidth / overlayHeight;
      const requestedAspectRatio = finalWidth / finalHeight;
      
      if (requestedAspectRatio > overlayAspectRatio) {
        finalWidth = Math.round(finalHeight * overlayAspectRatio);
      } else {
        finalHeight = Math.round(finalWidth / overlayAspectRatio);
      }
    }

    return { width: finalWidth, height: finalHeight };
  }
  /**
   * Calculate smart position for overlay based on aspect ratios
   */
  protected calculateSmartPosition(
    baseAspectRatio: number,
    overlayAspectRatio: number,
    requestedPosition: VideoCompositionOptions['position'],
    fallbackPosition?: VideoCompositionOptions['position']
  ): VideoCompositionOptions['position'] {
    // Smart positioning logic based on aspect ratios
    // For now, return the requested position or fallback
    return requestedPosition || fallbackPosition || 'bottom-right';
  }

  /**
   * Get default position for overlay based on index
   */
  private getDefaultPosition(index: number): string {
    const positions = [
      'bottom-right',
      'bottom-left', 
      'top-right',
      'top-left',
      'center',
      'bottom-center',
      'top-center',
      'center-left',
      'center-right'
    ];
    return positions[index % positions.length];
  }
}
