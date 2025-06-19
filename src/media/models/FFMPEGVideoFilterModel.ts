/**
 * FFMPEGVideoFilterModel - Fluent Composition API
 * 
 * Provides a fluent interface for building complex video filter operations
 * that ultimately calls the /video/filter endpoint
 */

import { FFMPEGAPIClient } from '../clients/FFMPEGAPIClient';
import { FFMPEGDockerService } from '../services/FFMPEGDockerService';
import { Video } from '../assets/roles';

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

export class FFMPEGVideoFilterModel {
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
  ) {}

  /**
   * Start composition with a base video or multiple videos
   */
  compose(...videos: Video[]): FFMPEGVideoFilterModel {
    this.videos = [...videos];
    return this;
  }

  /**
   * Add an overlay video with options
   */
  overlay(video: Video, options: OverlayOptions = {}): FFMPEGVideoFilterModel {
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
   * Build the filter complex string from the fluent operations
   */
  private buildFilterComplex(): string {
    if (this.customFilters.length > 0) {
      // If custom filters are provided, use them directly
      return this.customFilters.join(';\n');
    }

    const filterParts: string[] = [];
    const hasIntroOutro = this.prependVideos.length > 0 || this.appendVideos.length > 0;
    
    // Calculate video input indices
    let inputIndex = 0;
    const prependIndices = this.prependVideos.map(() => inputIndex++);
    const mainIndices = this.videos.map(() => inputIndex++);
    const overlayIndices = this.overlays.map(() => inputIndex++);
    const appendIndices = this.appendVideos.map(() => inputIndex++);
    
    const totalVideos = this.videos.length + this.overlays.length;
    
    // If we have intro/outro videos, we need to handle the main composition first, then concatenate
    if (hasIntroOutro) {
      return this.buildConcatenationFilterComplex(prependIndices, mainIndices, overlayIndices, appendIndices);
    }
    
    // Format base videos
    for (let i = 0; i < this.videos.length; i++) {
      filterParts.push(`[${mainIndices[i]}:v]format=yuv420p[base${i}]`);
    }    // Process overlays
    let currentBase = 'base0';
    for (let i = 0; i < this.overlays.length; i++) {
      const overlayIndex = overlayIndices[i];
      const overlay = this.overlays[i];
      const overlayLabel = `ov${i}`;
      const nextBase = i === this.overlays.length - 1 ? this.filterOptions.videoOutputLabel! : `tmp${i}`;

      // Build overlay processing
      let overlayFilter = `[${overlayIndex}:v]`;
      
      // Add timing if specified
      if (overlay.options.startTime !== undefined) {
        overlayFilter += `tpad=start_duration=${overlay.options.startTime}:start_mode=add:color=black@0.0,setpts=PTS-STARTPTS,`;
      }
      
      // Add color key if specified
      if (overlay.options.colorKey) {
        const similarity = overlay.options.colorKeySimilarity || 0.30;
        const blend = overlay.options.colorKeyBlend || 0.10;
        overlayFilter += `colorkey=${overlay.options.colorKey}:${similarity}:${blend},`;
      }

      // Add scaling if specified
      if (overlay.options.width || overlay.options.height) {
        const width = this.parseSize(overlay.options.width, 'width') || 'iw';
        const height = this.parseSize(overlay.options.height, 'height') || 'ih';
        overlayFilter += `scale=${width}:${height},`;
      }
      
      // Remove trailing comma and add label
      overlayFilter = overlayFilter.replace(/,$/, '') + `[${overlayLabel}]`;
      filterParts.push(overlayFilter);

      // Build overlay composition
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
    const filterParts: string[] = [];
    const segments: string[] = [];
    const audioSegments: string[] = [];
    
    // Process prepend videos
    for (let i = 0; i < this.prependVideos.length; i++) {
      const inputIdx = prependIndices[i];
      filterParts.push(`[${inputIdx}:v]format=yuv420p,fps=30,scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2[prep${i}]`);
      filterParts.push(`[${inputIdx}:a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo[prepa${i}]`);
      segments.push(`[prep${i}]`);
      audioSegments.push(`[prepa${i}]`);
    }
    
    // Process main composition (base video + overlays)
    if (this.videos.length > 0) {
      // Format base video
      const baseIdx = mainIndices[0];
      filterParts.push(`[${baseIdx}:v]format=yuv420p[base0]`);
      
      // Process overlays if any
      let currentBase = 'base0';
      for (let i = 0; i < this.overlays.length; i++) {
        const overlayIndex = overlayIndices[i];
        const overlay = this.overlays[i];
        const overlayLabel = `ov${i}`;
        const nextBase = i === this.overlays.length - 1 ? 'main_composed' : `tmp${i}`;

        // Build overlay processing
        let overlayFilter = `[${overlayIndex}:v]`;
        
        // Add timing if specified
        if (overlay.options.startTime !== undefined) {
          overlayFilter += `tpad=start_duration=${overlay.options.startTime}:start_mode=add:color=black@0.0,setpts=PTS-STARTPTS,`;
        }
        
        // Add color key if specified
        if (overlay.options.colorKey) {
          const similarity = overlay.options.colorKeySimilarity || 0.30;
          const blend = overlay.options.colorKeyBlend || 0.10;
          overlayFilter += `colorkey=${overlay.options.colorKey}:${similarity}:${blend},`;
        }

        // Add scaling if specified
        if (overlay.options.width || overlay.options.height) {
          const width = this.parseSize(overlay.options.width, 'width') || 'iw';
          const height = this.parseSize(overlay.options.height, 'height') || 'ih';
          overlayFilter += `scale=${width}:${height},`;
        }
        
        // Remove trailing comma and add label
        overlayFilter = overlayFilter.replace(/,$/, '') + `[${overlayLabel}]`;
        filterParts.push(overlayFilter);

        // Build overlay composition
        let overlayPosition = this.buildOverlayPosition(overlay.options);
        let overlayComposition = `[${currentBase}][${overlayLabel}]overlay=format=auto:${overlayPosition}`;
        
        if (overlay.options.opacity !== undefined && overlay.options.opacity < 1.0) {
          overlayComposition += `:alpha=${overlay.options.opacity}`;
        }
        
        overlayComposition += `[${nextBase}]`;
        filterParts.push(overlayComposition);
        
        currentBase = nextBase;
      }
      
      // Ensure main video is properly scaled and formatted for concatenation
      const mainVideoLabel = this.overlays.length > 0 ? 'main_composed' : 'base0';
      filterParts.push(`[${mainVideoLabel}]fps=30,scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2[main]`);
      
      // Handle main audio - mix if there are overlays
      if (this.overlays.length > 0) {
        const allMainAudioInputs = [baseIdx, ...overlayIndices].map(idx => `[${idx}:a]`).join('');
        const totalMainInputs = 1 + this.overlays.length;
        filterParts.push(`${allMainAudioInputs}amix=inputs=${totalMainInputs}:duration=longest:normalize=0,aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo[maina]`);
      } else {
        filterParts.push(`[${baseIdx}:a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo[maina]`);
      }
      
      segments.push('[main]');
      audioSegments.push('[maina]');
    }
    
    // Process append videos
    for (let i = 0; i < this.appendVideos.length; i++) {
      const inputIdx = appendIndices[i];
      filterParts.push(`[${inputIdx}:v]format=yuv420p,fps=30,scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2[app${i}]`);
      filterParts.push(`[${inputIdx}:a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo[appa${i}]`);
      segments.push(`[app${i}]`);
      audioSegments.push(`[appa${i}]`);
    }
    
    // Concatenate all segments
    const totalSegments = segments.length;
    if (totalSegments > 1) {
      filterParts.push(`${segments.join('')}concat=n=${totalSegments}:v=1:a=0[${this.filterOptions.videoOutputLabel}]`);
      filterParts.push(`${audioSegments.join('')}concat=n=${totalSegments}:v=0:a=1[${this.filterOptions.audioOutputLabel}]`);
    } else {
      // Single segment case
      filterParts.push(`${segments[0]}copy[${this.filterOptions.videoOutputLabel}]`);
      filterParts.push(`${audioSegments[0]}copy[${this.filterOptions.audioOutputLabel}]`);
    }

    return filterParts.join(';\n');
  }

  /**
   * Build overlay position string from options
   */
  private buildOverlayPosition(options: OverlayOptions): string {
    if (options.position) {
      switch (options.position) {
        case 'top-left':
          return 'x=10:y=10';
        case 'top-right':
          return 'x=W-w-10:y=10';
        case 'bottom-left':
          return 'x=10:y=H-h-10';
        case 'bottom-right':
          return 'x=W-w-10:y=H-h-10';
        case 'center':
          return 'x=(W-w)/2:y=(H-h)/2';
        case 'custom':
          return `x=${options.x || 0}:y=${options.y || 0}`;
      }
    }
    
    return `x=${options.x || 0}:y=${options.y || 0}`;
  }  /**
   * Execute the composition by calling the /video/filter endpoint
   */
  async transform(): Promise<Buffer> {
    if (this.videos.length === 0) {
      throw new Error('No videos provided for composition. Use compose() to add videos first.');
    }

    // Build the filter complex
    const filterComplex = this.buildFilterComplex();
    
    // Prepare all videos in correct order: prepend + main + overlays + append
    const allVideos = [
      ...this.prependVideos,
      ...this.videos, 
      ...this.overlays.map(o => o.video),
      ...this.appendVideos
    ];
    
    // Get video buffers from the Video objects
    const videoBuffers = allVideos.map(video => video.data);

    // Call the /video/filter endpoint via API client
    if (!this.apiClient) {
      throw new Error('FFMPEGAPIClient is required for transform operation');
    }

    const result = await this.apiClient.filterMultipleVideos(videoBuffers, {
      filterComplex,
      videoOutputLabel: this.filterOptions.videoOutputLabel,
      audioOutputLabel: this.filterOptions.audioOutputLabel,
      customAudioMapping: this.filterOptions.customAudioMapping,
      outputFormat: this.filterOptions.outputFormat,
      codec: this.filterOptions.codec as 'libx264' | 'libx265' | 'libvpx' | 'h264_nvenc' | 'h265_nvenc' | 'av1_nvenc',
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
  }  /**
   * Parse size value to FFmpeg-compatible expression
   * Converts percentage strings like "25%" to FFmpeg expressions like "iw*0.25"
   */
  private parseSize(size: string | number | undefined, dimension: 'width' | 'height' = 'width'): string | undefined {
    if (size === undefined) return undefined;
    
    // Convert number to string
    const sizeStr = size.toString();
    
    // If it's a percentage, convert to FFmpeg expression
    if (sizeStr.endsWith('%')) {
      const percentage = parseFloat(sizeStr.replace('%', ''));
      const factor = percentage / 100;
      const base = dimension === 'width' ? 'iw' : 'ih';
      return `${base}*${factor}`;
    }
    
    // If it's already a number or FFmpeg expression, return as-is
    return sizeStr;
  }
}
