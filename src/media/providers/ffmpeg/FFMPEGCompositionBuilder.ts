/**
 * FFMPEGCompositionBuilder - COMPLETE WORKING VERSION (Copied for new FFMPEG Provider)
 * 
 * This is the complete working filter complex generation logic with enhanced smart delegation
 * to FFMPEGVideoToVideoModel for simple cases.
 */

import { Video } from '../../assets/roles';
import { FFMPEGVideoToVideoModel } from './FFMPEGVideoToVideoModel';
import { IFFMPEGClient } from './IFFMPEGClient';
import { VideoToVideoModel } from '../../models/abstracts/VideoToVideoModel';

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
  blendMode?: 'normal' | 'screen' | 'overlay' | 'multiply';
  fadeIn?: number;
  fadeOut?: number;
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
  callbacks?: {
    onFilterUpdate?: (filterComplex: string) => void;
    onValidation?: (result: { isValid: boolean; errors: string[] }) => void;
  };
}

/**
 * Builder class for FFmpeg video composition operations
 * COMPLETE WORKING VERSION with smart delegation - adapted for new FFMPEG Provider
 */
export class FFMPEGCompositionBuilder {
  private state: CompositionState;
  private filterModel?: FFMPEGVideoToVideoModel;
  private apiClient?: IFFMPEGClient;

  constructor(initialState?: Partial<CompositionState>, apiClient?: IFFMPEGClient) {
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
    
    this.apiClient = apiClient;
  }

  // ===============================
  // STATE MANAGEMENT
  // ===============================

  getState(): CompositionState {
    return { ...this.state };
  }

  setState(newState: Partial<CompositionState>): FFMPEGCompositionBuilder {
    this.state = { ...this.state, ...newState };
    return this;
  }

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
  // COMPOSITION METHODS
  // ===============================

  /**
   * Set the main video(s) for composition
   */
  compose(videos: Video | Video[]): FFMPEGCompositionBuilder {
    this.state.videos = Array.isArray(videos) ? videos : [videos];
    this.notifyFilterUpdate();
    return this;
  }

  /**
   * Add video(s) to be prepended before the main composition
   */
  prepend(videos: Video | Video[]): FFMPEGCompositionBuilder {
    const videosArray = Array.isArray(videos) ? videos : [videos];
    this.state.prependVideos.push(...videosArray);
    this.notifyFilterUpdate();
    return this;
  }

  /**
   * Add video(s) to be appended after the main composition
   */
  append(videos: Video | Video[]): FFMPEGCompositionBuilder {
    const videosArray = Array.isArray(videos) ? videos : [videos];
    this.state.appendVideos.push(...videosArray);
    this.notifyFilterUpdate();
    return this;
  }

  /**
   * Add overlay video with positioning and timing options
   */
  addOverlay(video: Video, options: OverlayOptions = {}): FFMPEGCompositionBuilder {
    this.state.overlays.push({ video, options });
    this.notifyFilterUpdate();
    return this;
  }

  /**
   * Add audio track (placeholder - to be implemented)
   */
  addAudioTrack(audio: any): FFMPEGCompositionBuilder {
    // Audio track implementation would go here
    return this;
  }

  /**
   * Set filter options for the composition
   */
  setFilterOptions(options: Partial<FilterOptions>): FFMPEGCompositionBuilder {
    this.state.filterOptions = { ...this.state.filterOptions, ...options };
    this.notifyFilterUpdate();
    return this;
  }

  /**
   * Add custom filter string
   */
  addCustomFilter(filter: string): FFMPEGCompositionBuilder {
    this.state.customFilters.push(filter);
    this.notifyFilterUpdate();
    return this;
  }

  /**
   * Set callback for filter updates
   */
  onFilterUpdate(callback: (filterComplex: string) => void): FFMPEGCompositionBuilder {
    if (!this.state.callbacks) {
      this.state.callbacks = {};
    }
    this.state.callbacks.onFilterUpdate = callback;
    return this;
  }

  /**
   * Set callback for validation updates
   */
  onValidation(callback: (result: { isValid: boolean; errors: string[] }) => void): FFMPEGCompositionBuilder {
    if (!this.state.callbacks) {
      this.state.callbacks = {};
    }
    this.state.callbacks.onValidation = callback;
    return this;
  }

  // ===============================
  // FILTER GENERATION - COMPLETE WORKING VERSION
  // ===============================

  /**
   * Build the complete filter complex - EXACT COPY FROM WORKING VERSION
   */
  buildFilterComplex(): string {
    const filterParts: string[] = [];
    
    // Add custom filters first
    filterParts.push(...this.state.customFilters);

    const hasIntroOutro = this.state.prependVideos.length > 0 || this.state.appendVideos.length > 0;

    // Track input indices
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

    // Process overlays - EXACT COPY FROM WORKING VERSION
    let currentBase = 'base0';
    for (let i = 0; i < this.state.overlays.length; i++) {
      const overlayIndex = overlayIndices[i];
      const overlay = this.state.overlays[i];
      const overlayLabel = `ov${i}`;
      const nextBase = i === this.state.overlays.length - 1 ? this.state.filterOptions.videoOutputLabel! : `tmp${i}`;

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

      if (overlay.options.startTime !== undefined || overlay.options.duration !== undefined) {
        overlayComposition += ':enable=';
        if (overlay.options.startTime !== undefined && overlay.options.duration !== undefined) {
          const endTime = overlay.options.startTime + overlay.options.duration;
          overlayComposition += `'between(t,${overlay.options.startTime},${endTime})'`;
        } else if (overlay.options.startTime !== undefined) {
          overlayComposition += `'gte(t,${overlay.options.startTime})'`;
        }
      }

      overlayComposition += `[${nextBase}]`;
      filterParts.push(overlayComposition);
      currentBase = nextBase;
    }

    // Handle audio mixing
    if (this.state.filterOptions.customAudioMapping && this.state.videos.length > 0) {
      const audioInputs = [...mainIndices, ...overlayIndices].map(i => `[${i}:a]`).join('');
      const totalInputs = mainIndices.length + overlayIndices.length;
      filterParts.push(`${audioInputs}amix=inputs=${totalInputs}:duration=longest:normalize=0[${this.state.filterOptions.audioOutputLabel}]`);
    }

    // If no overlays, ensure we have video output
    if (this.state.overlays.length === 0) {
      filterParts.push(`[base0]copy[${this.state.filterOptions.videoOutputLabel}]`);
      if (this.state.videos.length > 0) {
        filterParts.push(`[${mainIndices[0]}:a]copy[${this.state.filterOptions.audioOutputLabel}]`);
      }
    }

    return filterParts.join(';\n');
  }

  /**
   * Build concatenation filter complex - EXACT COPY FROM WORKING VERSION
   */
  private buildConcatenationFilterComplex(prependIndices: number[], mainIndices: number[], overlayIndices: number[], appendIndices: number[]): string {
    const filterParts: string[] = [];
    
    // Create concatenation sequence
    const sequentialIndices = [...prependIndices, ...mainIndices, ...appendIndices];
    
    if (sequentialIndices.length > 1) {
      const concatInputs = sequentialIndices.map(i => `[${i}:v][${i}:a]`).join('');
      filterParts.push(`${concatInputs}concat=n=${sequentialIndices.length}:v=1:a=1[concatenated_video][concatenated_audio]`);
      
      // Process overlays on top of concatenated video
      if (this.state.overlays.length > 0) {
        let currentBase = 'concatenated_video';
        
        this.state.overlays.forEach((overlay, i) => {
          const overlayIndex = overlayIndices[i];
          const overlayLabel = `overlay_${i}`;
          const nextBase = i === this.state.overlays.length - 1 ? this.state.filterOptions.videoOutputLabel! : `composed_${i}`;

          // Process overlay video
          let overlayFilter = `[${overlayIndex}:v]`;
          
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
          
          // Build overlay composition
          const overlayPosition = this.buildOverlayPosition(overlay.options);
          let overlayComposition = `[${currentBase}][${overlayLabel}]overlay=format=auto:${overlayPosition}`;
          
          if (overlay.options.opacity !== undefined && overlay.options.opacity < 1.0) {
            overlayComposition += `:alpha=${overlay.options.opacity}`;
          }
          
          overlayComposition += `[${nextBase}]`;
          filterParts.push(overlayComposition);
          
          currentBase = nextBase;
        });
        
        // Mix concatenated audio with overlay audio if needed
        const overlayAudioInputs = overlayIndices.map(i => `[${i}:a]`);
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
    } else {
      // Single video - fallback to simple processing
      filterParts.push(`[0:v]format=yuv420p[${this.state.filterOptions.videoOutputLabel}]`);
      filterParts.push(`[0:a]copy[${this.state.filterOptions.audioOutputLabel}]`);
    }
    
    return filterParts.join(';\n');
  }

  /**
   * Build overlay position string from options - EXACT COPY FROM WORKING VERSION
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
   * Parse size value to FFmpeg-compatible expression - EXACT COPY FROM WORKING VERSION
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

  // ===============================
  // UTILITY METHODS - EXACT COPY FROM WORKING VERSION
  // ===============================

  getAllVideos(): Video[] {
    return [
      ...this.state.prependVideos,
      ...this.state.videos, 
      ...this.state.overlays.map(o => o.video),
      ...this.state.appendVideos
    ];
  }

  validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (this.state.videos.length === 0 && this.state.prependVideos.length === 0 && this.state.appendVideos.length === 0) {
      errors.push('No videos provided for composition. Use compose() to add videos first.');
    }

    const result = {
      isValid: errors.length === 0,
      errors
    };

    this.notifyValidation(result);
    return result;
  }
  
  preview(): string {
    return this.buildFilterComplex();
  }

  /**
   * Notify filter update callback
   */
  private notifyFilterUpdate(): void {
    if (this.state.callbacks?.onFilterUpdate) {
      try {
        const filterComplex = this.buildFilterComplex();
        this.state.callbacks.onFilterUpdate(filterComplex);
      } catch (error) {
        // Ignore errors during filter generation for updates
      }
    }
  }

  /**
   * Notify validation callback
   */
  private notifyValidation(result: { isValid: boolean; errors: string[] }): void {
    if (this.state.callbacks?.onValidation) {
      this.state.callbacks.onValidation(result);
    }
  }

  // ===============================
  // TRANSFORM METHOD - THE MAIN METHOD!
  // ===============================
  /**
   * Transform the composition using any VideoToVideoModel
   * @param model The VideoToVideoModel to use for transformation
   * @returns The final composed Video
   */
  async transform(model: VideoToVideoModel): Promise<Video> {
    // Validate first
    const validation = this.validate();
    if (!validation.isValid) {
      throw new Error(`Composition validation failed: ${validation.errors.join(', ')}`);
    }

    // Get all videos in the correct order
    const allVideos = this.getAllVideos();
    
    // Build the filter complex
    const filterComplex = this.buildFilterComplex();
    
    // Call model.transform with our videos and filter complex
    const result = await model.transform(allVideos, {
      customFilterComplex: filterComplex,
      outputFormat: this.state.filterOptions.outputFormat || 'mp4',
      videoOutputLabel: this.state.filterOptions.videoOutputLabel,
      audioOutputLabel: this.state.filterOptions.audioOutputLabel,
      customAudioMapping: this.state.filterOptions.customAudioMapping
    });

    // Return just the video (clean interface!)
    return result;
  }
}
