/**
 * FFMPEGCompositionBuilder - Composition Logic Extraction
 * 
 * Separates the video composition logic from the FFMPEGVideoFilterModel
 * to improve maintainability and testability without changing how the system works.
 */

import { Video } from '../../../assets/roles';

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

export interface CompositionState {
  videos: Video[];
  overlays: Array<{ video: Video; options: OverlayOptions }>;
  prependVideos: Video[];
  appendVideos: Video[];
  customFilters: string[];
  filterOptions: FilterOptions;
}

/**
 * Builder class for FFmpeg video composition operations
 * Extracts all composition logic without changing the external API
 */
export class FFMPEGCompositionBuilder {
  private state: CompositionState;

  constructor(initialState?: Partial<CompositionState>) {
    this.state = {
      videos: [],
      overlays: [],
      prependVideos: [],
      appendVideos: [],
      customFilters: [],
      filterOptions: {
        videoOutputLabel: 'final_video',
        audioOutputLabel: 'mixed_audio',
        customAudioMapping: true
      },
      ...initialState
    };
  }

  // ===============================
  // STATE MANAGEMENT
  // ===============================

  /**
   * Get current composition state
   */
  getState(): CompositionState {
    return { ...this.state };
  }

  /**
   * Update composition state
   */
  setState(newState: Partial<CompositionState>): FFMPEGCompositionBuilder {
    this.state = { ...this.state, ...newState };
    return this;
  }

  /**
   * Reset the composition builder
   */
  reset(): FFMPEGCompositionBuilder {
    this.state = {
      videos: [],
      overlays: [],
      prependVideos: [],
      appendVideos: [],
      customFilters: [],
      filterOptions: {
        videoOutputLabel: 'final_video',
        audioOutputLabel: 'mixed_audio',
        customAudioMapping: true
      }
    };
    return this;
  }

  // ===============================
  // FLUENT API METHODS
  // ===============================

  /**
   * Start composition with a base video or multiple videos
   */
  compose(...videos: Video[]): FFMPEGCompositionBuilder {
    this.state.videos = [...videos];
    return this;
  }

  /**
   * Add an overlay video with options
   */
  addOverlay(video: Video, options: OverlayOptions = {}): FFMPEGCompositionBuilder {
    this.state.overlays.push({ video, options });
    return this;
  }

  /**
   * Add intro video(s) that will be prepended to the main composition
   */
  prepend(...videos: Video[]): FFMPEGCompositionBuilder {
    this.state.prependVideos.push(...videos);
    return this;
  }

  /**
   * Add outro video(s) that will be appended to the main composition
   */
  append(...videos: Video[]): FFMPEGCompositionBuilder {
    this.state.appendVideos.push(...videos);
    return this;
  }

  /**
   * Add a custom filter operation
   */
  filter(filterExpression: string): FFMPEGCompositionBuilder {
    this.state.customFilters.push(filterExpression);
    return this;
  }

  /**
   * Set output options
   */
  options(options: FilterOptions): FFMPEGCompositionBuilder {
    this.state.filterOptions = { ...this.state.filterOptions, ...options };
    return this;
  }

  // ===============================
  // COMPOSITION BUILDING METHODS
  // ===============================
  /**
   * Build the filter complex string from the current composition state
   */
  buildFilterComplex(): string {
    if (this.state.customFilters.length > 0) {
      return this.state.customFilters.join(';\n');
    }

    const filterParts: string[] = [];
    const hasIntroOutro = this.state.prependVideos.length > 0 || this.state.appendVideos.length > 0;
    
    let inputIndex = 0;
    const prependIndices = this.state.prependVideos.map(() => inputIndex++);
    const mainIndices = this.state.videos.map(() => inputIndex++);
    const overlayIndices = this.state.overlays.map(() => inputIndex++);
    const appendIndices = this.state.appendVideos.map(() => inputIndex++);
    
    if (hasIntroOutro) {
      return this.buildConcatenationFilterComplex(prependIndices, mainIndices, overlayIndices, appendIndices);
    }
    
    // Format base videos
    for (let i = 0; i < this.state.videos.length; i++) {
      filterParts.push(`[${mainIndices[i]}:v]format=yuv420p[base${i}]`);
    }

    // Process overlays - EXACT COPY FROM ORIGINAL
    let currentBase = 'base0';
    for (let i = 0; i < this.state.overlays.length; i++) {
      const overlayIndex = overlayIndices[i];
      const overlay = this.state.overlays[i];
      const overlayLabel = `ov${i}`;
      const nextBase = i === this.state.overlays.length - 1 ? this.state.filterOptions.videoOutputLabel! : `tmp${i}`;

      // Build overlay processing - EXACT COPY FROM ORIGINAL
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

    // Add audio mixing if multiple videos - EXACT COPY FROM ORIGINAL
    const allVideosCount = this.state.videos.length + this.state.overlays.length;
    if (allVideosCount > 1 && this.state.filterOptions.customAudioMapping) {
      const audioInputs = Array.from({ length: allVideosCount }, (_, i) => `[${mainIndices[0] + i}:a]`).join('');
      filterParts.push(`${audioInputs}amix=inputs=${allVideosCount}:duration=longest:normalize=0[${this.state.filterOptions.audioOutputLabel}]`);
    }

    return filterParts.join(';\n');
  }

  /**
   * Get all videos in the composition order
   */
  getAllVideos(): Video[] {
    return [
      ...this.state.prependVideos,
      ...this.state.videos, 
      ...this.state.overlays.map(o => o.video),
      ...this.state.appendVideos
    ];
  }

  /**
   * Get video buffers for API calls
   */
  getVideoBuffers(): Buffer[] {
    return this.getAllVideos().map(video => video.data);
  }

  /**
   * Preview the filter complex that would be generated
   */
  preview(): string {
    return this.buildFilterComplex();
  }

  /**
   * Validate the current composition
   */
  validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (this.state.videos.length === 0) {
      errors.push('No videos provided for composition. Use compose() to add videos first.');
    }

    // Additional validation rules can be added here

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // ===============================
  // PRIVATE HELPER METHODS
  // ===============================
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
    
    // If we have intro/outro videos, we need to handle concatenation
    const allVideoIndices = [...prependIndices, ...mainIndices, ...appendIndices];
    
    if (allVideoIndices.length > 1) {
      // Format all videos for concatenation
      allVideoIndices.forEach(index => {
        filterParts.push(`[${index}:v]format=yuv420p,scale=1920:1080[v${index}]`);
        filterParts.push(`[${index}:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[a${index}]`);
      });
      
      // Build concatenation filter
      const videoInputs = allVideoIndices.map(index => `[v${index}]`).join('');
      const audioInputs = allVideoIndices.map(index => `[a${index}]`).join('');
      
      filterParts.push(`${videoInputs}${audioInputs}concat=n=${allVideoIndices.length}:v=1:a=1[concatenated_video][concatenated_audio]`);
      
      // Apply overlays to the concatenated video if any
      if (this.state.overlays.length > 0) {
        let currentBase = 'concatenated_video';
        
        this.state.overlays.forEach((overlay, i) => {
          const overlayIndex = overlayIndices[i];
          const overlayLabel = `ov${i}`;
          const nextBase = i === this.state.overlays.length - 1 ? this.state.filterOptions.videoOutputLabel! : `concat_tmp${i}`;
          
          // Process overlay
          filterParts.push(`[${overlayIndex}:v]format=yuv420p,scale=320:240[${overlayLabel}]`);
          
          // Apply overlay
          const position = this.buildOverlayPosition(overlay.options);
          filterParts.push(`[${currentBase}][${overlayLabel}]overlay=${position}[${nextBase}]`);
          
          currentBase = nextBase;
        });
        
        // Output final audio
        filterParts.push(`[concatenated_audio]copy[${this.state.filterOptions.audioOutputLabel}]`);
      } else {
        // No overlays, just copy the concatenated result
        filterParts.push(`[concatenated_video]copy[${this.state.filterOptions.videoOutputLabel}]`);
        filterParts.push(`[concatenated_audio]copy[${this.state.filterOptions.audioOutputLabel}]`);
      }
    } else {
      // Only one video, simpler processing
      filterParts.push(`[0:v]format=yuv420p[${this.state.filterOptions.videoOutputLabel}]`);
      if (this.state.filterOptions.customAudioMapping) {
        filterParts.push(`[0:a]aformat=sample_fmts=fltp:sample_rates=44100[${this.state.filterOptions.audioOutputLabel}]`);
      }
    }
    
    return filterParts.join(';\n');
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
   * Convert position string to FFmpeg overlay position (static method for external use)
   */
  static convertPositionToFFmpeg(position: string): string {
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
}
