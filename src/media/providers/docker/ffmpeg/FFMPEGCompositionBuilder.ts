/**
 * FFMPEGCompositionBuilder - Clean DRY Implementation
 * 
 * Builds sophisticated video compositions with proper concatenation and overlay support.
 * Fixes the concatenation issue with a cleaner architecture.
 */

import { Video, VideoRole } from '../../../assets/roles';

export interface OverlayOptions {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  opacity?: number;
  width?: string | number;
  height?: string | number;
  colorKey?: string;
  colorKeySimilarity?: number;
  colorKeyBlend?: number;
  startTime?: number;
  duration?: number;
}

export interface FilterOptions {
  videoOutputLabel: string;
  audioOutputLabel: string;
  customAudioMapping: boolean;
}

interface OverlayEntry {
  video: Video;
  options: OverlayOptions;
}

interface CompositionState {
  prependVideos: Video[];
  videos: Video[];
  appendVideos: Video[];
  overlays: OverlayEntry[];
  filterOptions: FilterOptions;
  customFilters: string[];
}

interface InputIndexMapping {
  prependIndices: number[];
  mainIndices: number[];
  appendIndices: number[];
  overlayIndices: number[];
  totalConcatInputs: number;
}

export class FFMPEGCompositionBuilder {
  private state: CompositionState;

  constructor() {
    this.state = {
      prependVideos: [],
      videos: [],
      appendVideos: [],
      overlays: [],
      filterOptions: {
        videoOutputLabel: 'final_video',
        audioOutputLabel: 'mixed_audio',
        customAudioMapping: true
      },
      customFilters: []
    };
  }

  // ===============================
  // PUBLIC API METHODS
  // ===============================

  /**
   * Add main composition video(s)
   */
  compose(...videos: VideoRole[]): this {
    const videoObjects = videos.map(v => v instanceof Video ? v : v as Video);
    this.state.videos.push(...videoObjects);
    return this;
  }

  /**
   * Add prepend video(s) (intro)
   */
  prepend(...videos: VideoRole[]): this {
    const videoObjects = videos.map(v => v instanceof Video ? v : v as Video);
    this.state.prependVideos.push(...videoObjects);
    return this;
  }

  /**
   * Add append video(s) (outro)
   */
  append(...videos: VideoRole[]): this {
    const videoObjects = videos.map(v => v instanceof Video ? v : v as Video);
    this.state.appendVideos.push(...videoObjects);
    return this;
  }

  /**
   * Add overlay video with sophisticated options
   */
  addOverlay(video: VideoRole, options: OverlayOptions = {}): this {
    const videoObject = video instanceof Video ? video : video as Video;
    this.state.overlays.push({
      video: videoObject,
      options: {
        position: 'top-right',
        opacity: 1.0,
        ...options
      }
    });
    return this;
  }

  /**
   * Add custom filter
   */
  filter(filterExpression: string): this {
    this.state.customFilters.push(filterExpression);
    return this;
  }

  /**
   * Set output options
   */
  options(options: Partial<FilterOptions>): this {
    this.state.filterOptions = { ...this.state.filterOptions, ...options };
    return this;
  }

  /**
   * Reset the composition
   */
  reset(): this {
    this.state = {
      prependVideos: [],
      videos: [],
      appendVideos: [],
      overlays: [],
      filterOptions: {
        videoOutputLabel: 'final_video',
        audioOutputLabel: 'mixed_audio',
        customAudioMapping: true
      },
      customFilters: []
    };
    return this;
  }

  // ===============================
  // FILTER COMPLEX GENERATION
  // ===============================

  /**
   * Build the complete filter complex
   */  buildFilterComplex(): string {
    if (this.state.customFilters.length > 0) {
      return this.state.customFilters.join(';\n');
    }

    const indexMapping = this.getInputIndexMapping();
    const hasConcatenation = indexMapping.totalConcatInputs > 1;
    
    if (hasConcatenation) {
      // For concatenation scenarios, we'll use a hybrid approach:
      // 1. FFmpeg concat demuxer for basic concatenation (handled by FFMPEGVideoFilterModel)
      // 2. Filter complex for overlays only (if any)
      console.log('ℹ️  Concatenation detected - will use concat demuxer + overlay filter approach');
      
      if (this.state.overlays.length > 0) {
        // Build filter for overlays on the already-concatenated video (input 0)
        return this.buildOverlayOnlyFilter();
      } else {
        // No overlays, just concatenation (handled externally)
        return this.buildSimplePassthroughFilter();
      }
    } else {
      return this.buildPureOverlayFilter(indexMapping);
    }
  }

  /**
   * Preview the filter complex
   */
  preview(): string {
    return this.buildFilterComplex();
  }

  // ===============================
  // INPUT MANAGEMENT
  // ===============================

  /**
   * Get all videos in correct order for FFmpeg
   */
  getAllVideos(): Video[] {
    return [
      ...this.state.prependVideos,
      ...this.state.videos,
      ...this.state.appendVideos,
      ...this.state.overlays.map(o => o.video)
    ];
  }

  /**
   * Get video buffers for FFmpeg
   */
  getVideoBuffers(): Buffer[] {
    return this.getAllVideos().map(video => video.data);
  }

  /**
   * Get composition state
   */
  getState(): CompositionState {
    return { ...this.state };
  }

  /**
   * Validate composition
   */
  validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (this.state.videos.length === 0) {
      errors.push('No videos provided for composition. Use compose() to add videos first.');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if this composition requires concatenation preprocessing
   */
  requiresConcatenationPreprocessing(): boolean {
    const indexMapping = this.getInputIndexMapping();
    return indexMapping.totalConcatInputs > 1;
  }

  /**
   * Get videos that need to be concatenated first (preprocessing step)
   */
  getVideosForConcatenationPreprocessing(): Video[] {
    return this.getVideosForConcatenation();
  }

  /**
   * Get videos for concatenation (excluding overlays)
   */
  getVideosForConcatenation(): Video[] {
    return [
      ...this.state.prependVideos,
      ...this.state.videos,
      ...this.state.appendVideos
    ];
  }

  // ===============================
  // PRIVATE METHODS
  // ===============================

  /**
   * Get input index mapping for filter generation
   */
  private getInputIndexMapping(): InputIndexMapping {
    let inputIndex = 0;
    
    const prependIndices = this.state.prependVideos.map(() => inputIndex++);
    const mainIndices = this.state.videos.map(() => inputIndex++);
    const appendIndices = this.state.appendVideos.map(() => inputIndex++);
    const overlayIndices = this.state.overlays.map(() => inputIndex++);
    
    return {
      prependIndices,
      mainIndices,
      appendIndices,
      overlayIndices,
      totalConcatInputs: prependIndices.length + mainIndices.length + appendIndices.length
    };
  }  /**
   * Build concatenation filter complex using proper FFmpeg concat filter syntax
   */
  private buildConcatenationFilter(indexMapping: InputIndexMapping): string {
    const filterParts: string[] = [];
    
    const allConcatIndices = [
      ...indexMapping.prependIndices,
      ...indexMapping.mainIndices,
      ...indexMapping.appendIndices
    ];

    // Step 1: Normalize all input streams to consistent format
    // This ensures all videos have the same resolution, frame rate, and audio format
    allConcatIndices.forEach(index => {
      filterParts.push(`[${index}:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30[v${index}]`);
      filterParts.push(`[${index}:a]aresample=44100,aformat=sample_fmts=fltp:channel_layouts=stereo[a${index}]`);
    });

    // Step 2: Build concat filter with proper syntax
    // Format: [v0][v1][v2][a0][a1][a2]concat=n=3:v=1:a=1[concatenated_video][concatenated_audio]
    const videoInputs = allConcatIndices.map(i => `[v${i}]`).join('');
    const audioInputs = allConcatIndices.map(i => `[a${i}]`).join('');
    
    filterParts.push(`${videoInputs}${audioInputs}concat=n=${allConcatIndices.length}:v=1:a=1[concatenated_video][concatenated_audio]`);

    // Step 3: Handle overlays if present
    if (this.state.overlays.length > 0) {
      // Format overlay streams
      indexMapping.overlayIndices.forEach(index => {
        filterParts.push(`[${index}:v]scale=1920:1080:force_original_aspect_ratio=decrease[ov${index}]`);
        filterParts.push(`[${index}:a]aresample=44100,aformat=sample_fmts=fltp:channel_layouts=stereo[oa${index}]`);
      });

      // Apply overlay chain
      const finalVideo = this.buildOverlayChain('concatenated_video', indexMapping.overlayIndices);
      filterParts.push(...finalVideo.filters);
      
      // Mix concatenated audio with overlay audio
      const overlayAudioInputs = indexMapping.overlayIndices.map(i => `[oa${i}]`);
      if (overlayAudioInputs.length > 0) {
        const allAudioInputs = [`[concatenated_audio]`, ...overlayAudioInputs].join('');
        const totalAudioInputs = 1 + overlayAudioInputs.length;
        filterParts.push(`${allAudioInputs}amix=inputs=${totalAudioInputs}:duration=longest:normalize=0[${this.state.filterOptions.audioOutputLabel}]`);
      } else {
        filterParts.push(`[concatenated_audio]copy[${this.state.filterOptions.audioOutputLabel}]`);
      }
    } else {
      // No overlays - just copy concatenated streams
      filterParts.push(`[concatenated_video]copy[${this.state.filterOptions.videoOutputLabel}]`);
      filterParts.push(`[concatenated_audio]copy[${this.state.filterOptions.audioOutputLabel}]`);
    }

    return filterParts.join(';\n');
  }

  /**
   * Build pure overlay filter complex
   */
  private buildPureOverlayFilter(indexMapping: InputIndexMapping): string {
    const filterParts: string[] = [];
    
    // Format base video
    filterParts.push(`[${indexMapping.mainIndices[0]}:v]format=yuv420p[base0]`);

    if (this.state.overlays.length > 0) {
      // Apply overlay chain
      const result = this.buildOverlayChain('base0', indexMapping.overlayIndices);
      filterParts.push(...result.filters);
      
      // Mix audio from all inputs
      const allAudioInputs = [
        ...indexMapping.mainIndices,
        ...indexMapping.overlayIndices
      ];
      
      if (allAudioInputs.length > 1) {
        const audioStreams = allAudioInputs.map(i => `[${i}:a]`).join('');
        filterParts.push(`${audioStreams}amix=inputs=${allAudioInputs.length}:duration=longest:normalize=0[${this.state.filterOptions.audioOutputLabel}]`);
      } else {
        filterParts.push(`[${indexMapping.mainIndices[0]}:a]copy[${this.state.filterOptions.audioOutputLabel}]`);
      }
    } else {
      // No overlays
      filterParts.push(`[base0]copy[${this.state.filterOptions.videoOutputLabel}]`);
      filterParts.push(`[${indexMapping.mainIndices[0]}:a]copy[${this.state.filterOptions.audioOutputLabel}]`);
    }

    return filterParts.join(';\n');
  }
  /**
   * Build sophisticated overlay processing chain with proper stream handling
   */
  private buildOverlayChain(baseLabel: string, overlayIndices: number[]): { filters: string[] } {
    const filters: string[] = [];
    let currentBase = baseLabel;

    this.state.overlays.forEach((overlay, i) => {
      const overlayIndex = overlayIndices[i];
      const overlayLabel = `ov_processed${i}`;
      const nextBase = i === this.state.overlays.length - 1 
        ? this.state.filterOptions.videoOutputLabel! 
        : `overlay_result${i}`;

      // Build sophisticated overlay processing
      let overlayFilter = `[ov${overlayIndex}]`;
      
      // Time padding for delayed start
      if (overlay.options.startTime !== undefined) {
        overlayFilter += `tpad=start_duration=${overlay.options.startTime}:start_mode=add:color=black@0.0,setpts=PTS-STARTPTS,`;
      }
      
      // Color keying for green screen effects
      if (overlay.options.colorKey) {
        const similarity = overlay.options.colorKeySimilarity || 0.30;
        const blend = overlay.options.colorKeyBlend || 0.10;
        overlayFilter += `colorkey=${overlay.options.colorKey}:${similarity}:${blend},`;
      }

      // Additional scaling if needed (on top of the base normalization)
      if (overlay.options.width || overlay.options.height) {
        const width = this.parseSize(overlay.options.width, 'width') || 'iw';
        const height = this.parseSize(overlay.options.height, 'height') || 'ih';
        overlayFilter += `scale=${width}:${height},`;
      }
      
      // Remove trailing comma and add label
      overlayFilter = overlayFilter.replace(/,$/, '') + `[${overlayLabel}]`;
      filters.push(overlayFilter);

      // Build overlay composition
      const overlayPosition = this.buildOverlayPosition(overlay.options);
      let overlayComposition = `[${currentBase}][${overlayLabel}]overlay=format=auto:${overlayPosition}`;
      
      if (overlay.options.opacity !== undefined && overlay.options.opacity < 1.0) {
        overlayComposition += `:alpha=${overlay.options.opacity}`;
      }
      
      overlayComposition += `[${nextBase}]`;
      filters.push(overlayComposition);
      
      currentBase = nextBase;
    });

    return { filters };
  }

  /**
   * Parse size value (percentage or pixels)
   */
  private parseSize(size: string | number | undefined, dimension: 'width' | 'height'): string {
    if (!size) return dimension === 'width' ? 'iw' : 'ih';
    
    if (typeof size === 'number') {
      return size.toString();
    }
    
    if (size.endsWith('%')) {
      const percentage = parseFloat(size.replace('%', '')) / 100;
      return dimension === 'width' ? `iw*${percentage}` : `ih*${percentage}`;
    }
    
    return size;
  }

  /**
   * Build overlay position string
   */
  private buildOverlayPosition(options: OverlayOptions): string {
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
      default:
        return 'x=W-w-10:y=10'; // Default to top-right
    }
  }

  /**
   * Build overlay-only filter (assumes input 0 is already concatenated video)
   */
  private buildOverlayOnlyFilter(): string {
    const filterParts: string[] = [];
    
    // Format base video (the pre-concatenated input)
    filterParts.push(`[0:v]format=yuv420p[base0]`);

    // Apply overlays - overlay videos start from input 1
    let currentBase = 'base0';
    for (let i = 0; i < this.state.overlays.length; i++) {
      const overlayIndex = i + 1; // Overlays start at input 1 (input 0 is concatenated video)
      const overlay = this.state.overlays[i];
      const overlayLabel = `ov${i}`;
      const nextBase = i === this.state.overlays.length - 1 ? this.state.filterOptions.videoOutputLabel! : `overlay_tmp${i}`;

      // Build sophisticated overlay processing
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

    // Mix audio from concatenated video and overlays
    const totalInputs = 1 + this.state.overlays.length; // 1 concatenated + N overlays
    if (totalInputs > 1) {
      const audioInputs = Array.from({ length: totalInputs }, (_, i) => `[${i}:a]`).join('');
      filterParts.push(`${audioInputs}amix=inputs=${totalInputs}:duration=longest:normalize=0[${this.state.filterOptions.audioOutputLabel}]`);
    } else {
      filterParts.push(`[0:a]copy[${this.state.filterOptions.audioOutputLabel}]`);
    }

    return filterParts.join(';\n');
  }

  /**
   * Simple passthrough filter (no processing needed)
   */
  private buildSimplePassthroughFilter(): string {
    return `[0:v]copy[${this.state.filterOptions.videoOutputLabel}];[0:a]copy[${this.state.filterOptions.audioOutputLabel}]`;
  }
}
