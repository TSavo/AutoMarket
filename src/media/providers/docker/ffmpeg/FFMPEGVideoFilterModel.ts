/**
 * FFMPEGVideoFilterModel - Video Composition Implementation
 * 
 * Concrete implementation of VideoToVideoModel using FFmpeg for video composition.
 * Provides both the abstract interface and a fluent API for complex compositions.
 */

import { FFMPEGAPIClient, IFFMPEGClient } from './FFMPEGAPIClient';
import { FFMPEGDockerService } from '../../../services/FFMPEGDockerService';
import { Video, VideoRole } from '../../../assets/roles';
import { VideoToVideoModel, VideoCompositionOptions, VideoCompositionResult } from '../../../models/abstracts/VideoToVideoModel';
import { ModelMetadata } from '../../../models/abstracts/Model';
import { FFMPEGCompositionBuilder, OverlayOptions, FilterOptions } from './FFMPEGCompositionBuilder';

// Re-export interfaces for backward compatibility
export type { OverlayOptions, FilterOptions };

export class FFMPEGVideoFilterModel extends VideoToVideoModel {
  private compositionBuilder: FFMPEGCompositionBuilder;
  constructor(
    private dockerService?: FFMPEGDockerService,
    private apiClient?: IFFMPEGClient
  ) {
    const metadata: ModelMetadata = {
      id: 'ffmpeg-video-filter',
      name: 'FFmpeg Video Filter',
      description: 'FFmpeg-based video composition and filtering model',
      version: '1.0.0',
      provider: 'ffmpeg-docker',
      capabilities: ['video-to-video', 'video-composition', 'video-overlay'],
      inputTypes: ['video'],
      outputTypes: ['video']
    };
    super(metadata);
    
    this.compositionBuilder = new FFMPEGCompositionBuilder();
  }

  // ===============================
  // ABSTRACT METHOD IMPLEMENTATIONS
  // ===============================
  /**
   * Implementation of VideoToVideoModel abstract method
   */  async transform(
    baseVideo: VideoRole, 
    overlayVideos: VideoRole | VideoRole[], 
    options?: VideoCompositionOptions
  ): Promise<VideoCompositionResult> {
    // Get Video objects from the VideoRoles
    const baseVideoObj = await baseVideo.asVideo();
    const overlayVideoObjs = Array.isArray(overlayVideos) 
      ? await Promise.all(overlayVideos.map(v => v.asVideo()))
      : [await overlayVideos.asVideo()];

    // Build filter complex using simplified logic
    const filterParts: string[] = [];
    
    filterParts.push(`[0:v]format=yuv420p[base]`);
    
    let currentBase = 'base';
    overlayVideoObjs.forEach((overlayVideo, index) => {
      const overlayIndex = index + 1;
      const nextBase = index === overlayVideoObjs.length - 1 ? 'final_video' : `tmp${index}`;
      
      filterParts.push(`[${overlayIndex}:v]format=yuv420p[ov${index}]`);
      
      let position = 'x=W-w-10:y=H-h-10'; // default bottom-right
      if (options?.position) {
        position = FFMPEGCompositionBuilder.convertPositionToFFmpeg(options.position);
      }
      
      filterParts.push(`[${currentBase}][ov${index}]overlay=${position}[${nextBase}]`);
      currentBase = nextBase;
    });

    const filterComplex = filterParts.join(';\n');
    
    // Prepare video buffers
    const allVideos = [baseVideoObj, ...overlayVideoObjs];
    const videoBuffers = allVideos.map(video => video.data);

    if (!this.apiClient) {
      throw new Error('FFMPEGAPIClient is required for transform operation');
    }

    const result = await this.apiClient.filterMultipleVideos(videoBuffers, {
      filterComplex,
      videoOutputLabel: 'final_video',
      audioOutputLabel: 'mixed_audio',
      customAudioMapping: true,
      outputFormat: options?.outputFormat as any
    });

    if (!result.videoBuffer) {
      throw new Error('No video buffer returned from filter operation');
    }

    // Create result Video object
    const composedVideo = new Video(
      result.videoBuffer,
      options?.outputFormat || 'mp4',
      { format: options?.outputFormat || 'mp4' }
    );

    // Build metadata
    const metadata = {
      duration: baseVideoObj.getDuration() || 0,      resolution: options?.outputResolution || '1920x1080',
      aspectRatio: '16:9',
      framerate: options?.framerate || 30,
      baseVideoInfo: {
        duration: baseVideoObj.getDuration() || 0,
        resolution: `${baseVideoObj.getDimensions()?.width || 1920}x${baseVideoObj.getDimensions()?.height || 1080}`
      },
      overlayInfo: {
        count: overlayVideoObjs.length,
        overlays: overlayVideoObjs.map((video, index) => ({
          index,
          startTime: options?.overlayStartTime || 0,
          duration: video.getDuration() || 0,
          position: options?.position || 'bottom-right',
          finalSize: {
            width: video.getDimensions()?.width || 100,
            height: video.getDimensions()?.height || 100
          }
        }))
      }
    };

    return { composedVideo, metadata };
  }

  /**
   * Check if the model is available
   */
  async isAvailable(): Promise<boolean> {
    return this.apiClient !== undefined;
  }
  // ===============================
  // HELPER METHODS (FROM VIDEOMODTOVIDEOMODEL)
  // ===============================

  /**
   * Calculate smart positioning based on aspect ratios (moved from VideoToVideoModel)
   */
  protected calculateSmartPosition(
    baseAspectRatio: number,
    overlayAspectRatio: number,
    requestedPosition: VideoCompositionOptions['position'],
    fallbackPosition: VideoCompositionOptions['fallbackPosition'] = 'bottom-center'
  ): VideoCompositionOptions['position'] {
    const isBasePortrait = baseAspectRatio < 1;
    const isOverlayPortrait = overlayAspectRatio < 1;
    
    const aspectRatioDifference = Math.abs(baseAspectRatio - overlayAspectRatio);
    
    if (aspectRatioDifference > 1) {
      if (requestedPosition?.includes('left') || requestedPosition?.includes('right')) {
        return requestedPosition.replace('left', 'center').replace('right', 'center') as VideoCompositionOptions['position'];
      }
    }
    
    return requestedPosition || fallbackPosition;
  }

  /**
   * Calculate overlay size based on composition options and aspect ratios (moved from VideoToVideoModel)
   */
  protected calculateOverlaySize(
    baseWidth: number,
    baseHeight: number,
    overlayWidth: number,
    overlayHeight: number,
    options: VideoCompositionOptions
  ): { width: number; height: number } {
    let finalWidth = overlayWidth;
    let finalHeight = overlayHeight;
    
    if (typeof options.overlayWidth === 'string' && options.overlayWidth.endsWith('%')) {
      const percentage = parseFloat(options.overlayWidth) / 100;
      finalWidth = baseWidth * percentage;
    } else if (typeof options.overlayWidth === 'number') {
      finalWidth = options.overlayWidth;
    }
    
    if (typeof options.overlayHeight === 'string' && options.overlayHeight.endsWith('%')) {
      const percentage = parseFloat(options.overlayHeight) / 100;
      finalHeight = baseHeight * percentage;
    } else if (typeof options.overlayHeight === 'number') {
      finalHeight = options.overlayHeight;
    }
    
    if (options.maintainAspectRatio !== false) {
      const originalAspectRatio = overlayWidth / overlayHeight;
      
      if (options.overlayWidth && !options.overlayHeight) {
        finalHeight = finalWidth / originalAspectRatio;
      } else if (options.overlayHeight && !options.overlayWidth) {
        finalWidth = finalHeight * originalAspectRatio;
      }
    }
    
    return { width: Math.round(finalWidth), height: Math.round(finalHeight) };
  }

  // ===============================
  // FLUENT API METHODS (ORIGINAL DESIGN)
  // ===============================
  /**
   * Start composition with a base video or multiple videos (Fluent API)
   */
  compose(...videos: Video[]): FFMPEGVideoFilterModel {
    this.compositionBuilder.compose(...videos);
    return this;
  }

  /**
   * Add an overlay video with options (Fluent API) 
   */
  addOverlay(video: Video, options: OverlayOptions = {}): FFMPEGVideoFilterModel {
    this.compositionBuilder.addOverlay(video, options);
    return this;
  }

  /**
   * Add intro video(s) that will be prepended to the main composition
   */
  prepend(...videos: Video[]): FFMPEGVideoFilterModel {
    this.compositionBuilder.prepend(...videos);
    return this;
  }

  /**
   * Add outro video(s) that will be appended to the main composition
   */
  append(...videos: Video[]): FFMPEGVideoFilterModel {
    this.compositionBuilder.append(...videos);
    return this;
  }

  /**
   * Add a custom filter operation
   */
  filter(filterExpression: string): FFMPEGVideoFilterModel {
    this.compositionBuilder.filter(filterExpression);
    return this;
  }

  /**
   * Set output options
   */
  options(options: FilterOptions): FFMPEGVideoFilterModel {
    this.compositionBuilder.options(options);
    return this;
  }  /**
   * Execute the fluent composition and return buffer
   */
  async execute(): Promise<Buffer> {
    const validation = this.compositionBuilder.validate();
    if (!validation.isValid) {
      throw new Error(validation.errors.join('; '));
    }

    if (!this.apiClient) {
      throw new Error('FFMPEGAPIClient is required for execute operation');
    }

    // Check if we need concatenation preprocessing
    if (this.compositionBuilder.requiresConcatenationPreprocessing()) {
      return this.executeWithConcatenationPreprocessing();
    } else {
      return this.executeDirectly();
    }
  }

  /**
   * Execute with hybrid approach: concat demuxer + overlay filters
   */
  private async executeWithConcatenationPreprocessing(): Promise<Buffer> {
    const state = this.compositionBuilder.getState();
    
    // Step 1: Concatenate videos using concat demuxer
    const videosToConcat = this.compositionBuilder.getVideosForConcatenationPreprocessing();
    const concatenatedBuffer = await this.concatenateVideosWithDemuxer(videosToConcat);
    
    // Step 2: Apply overlays to concatenated video (if any)
    if (state.overlays.length > 0) {
      const filterComplex = this.compositionBuilder.buildFilterComplex();
      const overlayVideoBuffers = state.overlays.map(o => o.video.data);
      const allBuffers = [concatenatedBuffer, ...overlayVideoBuffers];
      
      const result = await this.apiClient.filterMultipleVideos(allBuffers, {
        filterComplex,
        videoOutputLabel: state.filterOptions.videoOutputLabel,
        audioOutputLabel: state.filterOptions.audioOutputLabel,
        customAudioMapping: state.filterOptions.customAudioMapping,
        outputFormat: state.filterOptions.outputFormat,
        codec: state.filterOptions.codec as any,
        bitrate: state.filterOptions.bitrate,
        fps: state.filterOptions.fps,
        resolution: state.filterOptions.resolution
      });

      if (!result.videoBuffer) {
        throw new Error('No video buffer returned from overlay operation');
      }

      return result.videoBuffer;
    } else {
      // No overlays, just return concatenated video
      return concatenatedBuffer;
    }
  }

  /**
   * Execute directly without concatenation preprocessing
   */
  private async executeDirectly(): Promise<Buffer> {
    const filterComplex = this.compositionBuilder.buildFilterComplex();
    const videoBuffers = this.compositionBuilder.getVideoBuffers();
    const state = this.compositionBuilder.getState();

    const result = await this.apiClient.filterMultipleVideos(videoBuffers, {
      filterComplex,
      videoOutputLabel: state.filterOptions.videoOutputLabel,
      audioOutputLabel: state.filterOptions.audioOutputLabel,
      customAudioMapping: state.filterOptions.customAudioMapping,
      outputFormat: state.filterOptions.outputFormat,
      codec: state.filterOptions.codec as any,
      bitrate: state.filterOptions.bitrate,
      fps: state.filterOptions.fps,
      resolution: state.filterOptions.resolution
    });

    if (!result.videoBuffer) {
      throw new Error('No video buffer returned from filter operation');
    }

    return result.videoBuffer;
  }

  /**
   * Concatenate videos using FFmpeg's concat demuxer (reliable method)
   */
  private async concatenateVideosWithDemuxer(videos: any[]): Promise<Buffer> {
    // TODO: Implement concat demuxer in FFMPEGLocalClient
    // For now, use a placeholder that calls the local client's method
    if ('concatWithDemuxer' in this.apiClient) {
      const videoBuffers = videos.map(v => v.data);
      return (this.apiClient as any).concatWithDemuxer(videoBuffers);
    } else {
      throw new Error('Concat demuxer not supported by current API client');
    }
  }
  /**
   * Build the filter complex string from the fluent operations
   */
  private buildFilterComplex(): string {
    return this.compositionBuilder.buildFilterComplex();
  }
  /**
   * Build filter complex for concatenation with intro/outro videos
   */
  private buildConcatenationFilterComplex(
    prependIndices: number[], 
    mainIndices: number[], 
    overlayIndices: number[], 
    appendIndices: number[]
  ): string {
    // Delegate to composition builder - this could be expanded if needed
    return `[0:v]format=yuv420p[final_video]`;
  }

  /**
   * Build overlay position string from options
   */
  private buildOverlayPosition(options: OverlayOptions): string {
    if (options.position) {
      switch (options.position) {
        case 'top-left': return 'x=10:y=10';
        case 'top-right': return 'x=W-w-10:y=10';
        case 'bottom-left': return 'x=10:y=H-h-10';
        case 'bottom-right': return 'x=W-w-10:y=H-h-10';
        case 'center': return 'x=(W-w)/2:y=(H-h)/2';
        case 'custom': return `x=${options.x || 0}:y=${options.y || 0}`;
      }
    }
    
    return `x=${options.x || 0}:y=${options.y || 0}`;
  }

  /**
   * Parse size value to FFmpeg-compatible expression
   */
  private parseSize(size: string | number | undefined, dimension: 'width' | 'height' = 'width'): string | undefined {
    if (size === undefined) return undefined;
    
    const sizeStr = size.toString();
    
    if (sizeStr.endsWith('%')) {
      const percentage = parseFloat(sizeStr.replace('%', ''));
      const factor = percentage / 100;
      const base = dimension === 'width' ? 'iw' : 'ih';
      return `${base}*${factor}`;
    }
    
    return sizeStr;
  }

  /**
   * Preview the filter complex that would be generated
   */
  preview(): string {
    return this.compositionBuilder.preview();
  }

  /**
   * Reset the composition builder
   */
  reset(): FFMPEGVideoFilterModel {
    this.compositionBuilder.reset();
    return this;
  }
}
