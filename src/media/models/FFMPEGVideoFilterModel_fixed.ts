/**
 * FFMPEGVideoFilterModel - Video Composition Implementation
 * 
 * Concrete implementation of VideoToVideoModel using FFmpeg for video composition.
 * Provides both the abstract interface and a fluent API for complex compositions.
 */

import { FFMPEGAPIClient } from '../clients/FFMPEGAPIClient';
import { FFMPEGDockerService } from '../services/FFMPEGDockerService';
import { Video } from '../assets/roles';
import { VideoToVideoModel, VideoCompositionOptions, VideoCompositionResult } from './VideoToVideoModel';
import { VideoInput, castToVideo } from '../assets/casting';
import { ModelMetadata } from './Model';

export interface OverlayOptions {
  x?: string | number;
  y?: string | number;
  width?: string | number;
  height?: string | number;
  startTime?: number;
  duration?: number;
  opacity?: number;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center' | 'custom';
  colorKey?: string;
  colorKeySimilarity?: number;
  colorKeyBlend?: number;
}

export interface FilterOptions {
  outputFormat?: 'mp4' | 'webm' | 'avi' | 'mov';
  codec?: string;
  bitrate?: string;
  fps?: number;
  resolution?: string;
  videoOutputLabel?: string;
  audioOutputLabel?: string;
  customAudioMapping?: boolean;
}

export class FFMPEGVideoFilterModel extends VideoToVideoModel {
  private videos: Video[] = [];
  private overlays: Array<{ video: Video; options: OverlayOptions }> = [];
  private prependVideos: Video[] = [];
  private appendVideos: Video[] = [];
  private customFilters: string[] = [];
  private filterOptions: FilterOptions = {
    videoOutputLabel: 'final_video',
    audioOutputLabel: 'mixed_audio',
    customAudioMapping: true
  };

  constructor(
    private dockerService?: FFMPEGDockerService,
    private apiClient?: FFMPEGAPIClient
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
  }

  // ===============================
  // ABSTRACT METHOD IMPLEMENTATIONS
  // ===============================

  /**
   * Implementation of VideoToVideoModel abstract method
   */
  async transform(
    baseVideo: VideoInput, 
    overlayVideos: VideoInput | VideoInput[], 
    options?: VideoCompositionOptions
  ): Promise<VideoCompositionResult> {
    // Cast inputs to Video objects
    const baseVideoObj = await castToVideo(baseVideo);
    const overlayVideoObjs = Array.isArray(overlayVideos) 
      ? await Promise.all(overlayVideos.map(v => castToVideo(v)))
      : [await castToVideo(overlayVideos)];

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
        position = this.convertPositionToFFmpeg(options.position);
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
      duration: baseVideoObj.getDuration() || 0,
      resolution: options?.outputResolution || '1920x1080',
      aspectRatio: '16:9',
      framerate: options?.framerate || 30,
      baseVideoInfo: {
        duration: baseVideoObj.getDuration() || 0,
        resolution: `${baseVideoObj.getDimensions().width}x${baseVideoObj.getDimensions().height}`
      },
      overlayInfo: {
        count: overlayVideoObjs.length,
        overlays: overlayVideoObjs.map((video, index) => ({
          index,
          startTime: options?.overlayStartTime || 0,
          duration: video.getDuration() || 0,
          position: options?.position || 'bottom-right',
          finalSize: {
            width: video.getDimensions().width || 100,
            height: video.getDimensions().height || 100
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
   * Convert position string to FFmpeg overlay position
   */
  private convertPositionToFFmpeg(position: string): string {
    switch (position) {
      case 'top-left': return 'x=10:y=10';
      case 'top-center': return 'x=(W-w)/2:y=10';
      case 'top-right': return 'x=W-w-10:y=10';
      case 'center-left': return 'x=10:y=(H-h)/2';
      case 'center': return 'x=(W-w)/2:y=(H-h)/2';
      case 'center-right': return 'x=W-w-10:y=(H-h)/2';
      case 'bottom-left': return 'x=10:y=H-h-10';
      case 'bottom-center': return 'x=(W-w)/2:y=H-h-10';
      case 'bottom-right': return 'x=W-w-10:y=H-h-10';
      default: return 'x=W-w-10:y=H-h-10';
    }
  }

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
    this.videos = [...videos];
    return this;
  }

  /**
   * Add an overlay video with options (Fluent API) 
   */
  addOverlay(video: Video, options: OverlayOptions = {}): FFMPEGVideoFilterModel {
    this.overlays.push({ video, options });
    return this;
  }

  /**
   * Add intro video(s) that will be prepended to the main composition
   */
  prepend(...videos: Video[]): FFMPEGVideoFilterModel {
    this.prependVideos.push(...videos);
    return this;
  }

  /**
   * Add outro video(s) that will be appended to the main composition
   */
  append(...videos: Video[]): FFMPEGVideoFilterModel {
    this.appendVideos.push(...videos);
    return this;
  }

  /**
   * Add a custom filter operation
   */
  filter(filterExpression: string): FFMPEGVideoFilterModel {
    this.customFilters.push(filterExpression);
    return this;
  }

  /**
   * Set output options
   */
  options(options: FilterOptions): FFMPEGVideoFilterModel {
    this.filterOptions = { ...this.filterOptions, ...options };
    return this;
  }

  /**
   * Execute the fluent composition and return buffer
   */
  async execute(): Promise<Buffer> {
    if (this.videos.length === 0) {
      throw new Error('No videos provided for composition. Use compose() to add videos first.');
    }

    const filterComplex = this.buildFilterComplex();
    const allVideos = [
      ...this.prependVideos,
      ...this.videos, 
      ...this.overlays.map(o => o.video),
      ...this.appendVideos
    ];
    
    const videoBuffers = allVideos.map(video => video.data);

    if (!this.apiClient) {
      throw new Error('FFMPEGAPIClient is required for execute operation');
    }

    const result = await this.apiClient.filterMultipleVideos(videoBuffers, {
      filterComplex,
      videoOutputLabel: this.filterOptions.videoOutputLabel,
      audioOutputLabel: this.filterOptions.audioOutputLabel,
      customAudioMapping: this.filterOptions.customAudioMapping,
      outputFormat: this.filterOptions.outputFormat,
      codec: this.filterOptions.codec as any,
      bitrate: this.filterOptions.bitrate,
      fps: this.filterOptions.fps,
      resolution: this.filterOptions.resolution
    });

    if (!result.videoBuffer) {
      throw new Error('No video buffer returned from filter operation');
    }

    return result.videoBuffer;
  }

  /**
   * Build the filter complex string from the fluent operations
   */
  private buildFilterComplex(): string {
    if (this.customFilters.length > 0) {
      return this.customFilters.join(';\n');
    }

    const filterParts: string[] = [];
    const hasIntroOutro = this.prependVideos.length > 0 || this.appendVideos.length > 0;
    
    let inputIndex = 0;
    const prependIndices = this.prependVideos.map(() => inputIndex++);
    const mainIndices = this.videos.map(() => inputIndex++);
    const overlayIndices = this.overlays.map(() => inputIndex++);
    const appendIndices = this.appendVideos.map(() => inputIndex++);
    
    if (hasIntroOutro) {
      return this.buildConcatenationFilterComplex(prependIndices, mainIndices, overlayIndices, appendIndices);
    }
    
    // Format base videos
    for (let i = 0; i < this.videos.length; i++) {
      filterParts.push(`[${mainIndices[i]}:v]format=yuv420p[base${i}]`);
    }

    // Process overlays
    let currentBase = 'base0';
    for (let i = 0; i < this.overlays.length; i++) {
      const overlayIndex = overlayIndices[i];
      const overlay = this.overlays[i];
      const overlayLabel = `ov${i}`;
      const nextBase = i === this.overlays.length - 1 ? this.filterOptions.videoOutputLabel! : `tmp${i}`;

      // Build overlay processing
      let overlayFilter = `[${overlayIndex}:v]`;
      
      if (overlay.options.startTime !== undefined) {
        overlayFilter += `tpad=start_duration=${overlay.options.startTime}:start_mode=add:color=black@0.0,setpts=PTS-STARTPTS,`;
      }
      
      if (overlay.options.colorKey) {
        const similarity = overlay.options.colorKeySimilarity || 0.30;
        const blend = overlay.options.colorKeyBlend || 0.10;
        overlayFilter += `colorkey=${overlay.options.colorKey}:${similarity}:${blend},`;
      }

      if (overlay.options.width || overlay.options.height) {
        const width = this.parseSize(overlay.options.width, 'width') || 'iw';
        const height = this.parseSize(overlay.options.height, 'height') || 'ih';
        overlayFilter += `scale=${width}:${height},`;
      }
      
      overlayFilter = overlayFilter.replace(/,$/, '') + `[${overlayLabel}]`;
      filterParts.push(overlayFilter);

      let overlayPosition = this.buildOverlayPosition(overlay.options);
      let overlayComposition = `[${currentBase}][${overlayLabel}]overlay=format=auto:${overlayPosition}`;
      
      if (overlay.options.opacity !== undefined && overlay.options.opacity < 1.0) {
        overlayComposition += `:alpha=${overlay.options.opacity}`;
      }
      
      overlayComposition += `[${nextBase}]`;
      filterParts.push(overlayComposition);
      
      currentBase = nextBase;
    }

    // Add audio mixing if multiple videos
    const allVideosCount = this.videos.length + this.overlays.length;
    if (allVideosCount > 1 && this.filterOptions.customAudioMapping) {
      const audioInputs = Array.from({ length: allVideosCount }, (_, i) => `[${mainIndices[0] + i}:a]`).join('');
      filterParts.push(`${audioInputs}amix=inputs=${allVideosCount}:duration=longest:normalize=0[${this.filterOptions.audioOutputLabel}]`);
    }

    return filterParts.join(';\n');
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
    // Simplified implementation - can be expanded as needed
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
    return this.buildFilterComplex();
  }

  /**
   * Reset the composition builder
   */
  reset(): FFMPEGVideoFilterModel {
    this.videos = [];
    this.overlays = [];
    this.prependVideos = [];
    this.appendVideos = [];
    this.customFilters = [];
    this.filterOptions = {
      videoOutputLabel: 'final_video',
      audioOutputLabel: 'mixed_audio',
      customAudioMapping: true
    };
    return this;
  }
}
