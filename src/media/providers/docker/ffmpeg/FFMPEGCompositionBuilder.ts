/**
 * FFMPEGCompositionBuilder - WORKING VERSION
 * 
 * This is the working filter complex generation logic with enhanced smart delegation
 * to FFMPEGVideoFilterModel for simple cases.
 */

import { Video } from '../../../assets/roles';
import { FFMPEGVideoFilterModel } from './FFMPEGVideoFilterModel';
import { IFFMPEGClient } from '../../ffmpeg/IFFMPEGClient';
import { VideoToVideoModel } from '../../../models/abstracts/VideoToVideoModel';

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
 * WORKING VERSION with smart delegation
 */
export class FFMPEGCompositionBuilder {
  private state: CompositionState;
  private filterModel?: FFMPEGVideoFilterModel;
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
  // FLUENT API METHODS
  // ===============================

  compose(...videos: Video[]): FFMPEGCompositionBuilder {
    this.state.videos = [...videos];
    return this;
  }

  addOverlay(video: Video, options: OverlayOptions = {}): FFMPEGCompositionBuilder {
    this.state.overlays.push({ video, options });
    return this;
  }

  prepend(...videos: Video[]): FFMPEGCompositionBuilder {
    this.state.prependVideos.push(...videos);
    return this;
  }

  append(...videos: Video[]): FFMPEGCompositionBuilder {
    this.state.appendVideos.push(...videos);
    return this;
  }

  filter(filterExpression: string): FFMPEGCompositionBuilder {
    this.state.customFilters.push(filterExpression);
    return this;
  }

  options(options: FilterOptions): FFMPEGCompositionBuilder {
    this.state.filterOptions = { ...this.state.filterOptions, ...options };
    return this;
  }

  // ===============================
  // WORKING METHODS FROM HEAD~4
  // ===============================

  /**
   * Build the filter complex string - WORKING VERSION FROM HEAD~4
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

      overlayComposition += `[${nextBase}]`;
      filterParts.push(overlayComposition);

      currentBase = nextBase;
    }

    // Add audio mixing if multiple videos
    const allVideosCount = this.state.videos.length + this.state.overlays.length;
    if (allVideosCount > 1 && this.state.filterOptions.customAudioMapping) {
      const audioInputs = Array.from({ length: allVideosCount }, (_, i) => `[${mainIndices[0] + i}:a]`).join('');
      filterParts.push(`${audioInputs}amix=inputs=${allVideosCount}:duration=longest:normalize=0[${this.state.filterOptions.audioOutputLabel}]`);
    }

    return filterParts.join(';\n');
  }
  
  /**
   * Build filter complex for concatenation - ENHANCED VERSION
   */
  private buildConcatenationFilterComplex(
    prependIndices: number[],
    mainIndices: number[],
    overlayIndices: number[],
    appendIndices: number[]
  ): string {
    const filterParts: string[] = [];
    
    // Combine all video indices for concatenation
    const allVideoIndices = [...prependIndices, ...mainIndices, ...appendIndices];
    
    if (allVideoIndices.length > 1) {
      // Step 1: Format all videos for concatenation
      allVideoIndices.forEach(index => {
        filterParts.push(`[${index}:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30[v${index}]`);
        filterParts.push(`[${index}:a]aresample=44100,aformat=sample_fmts=fltp:channel_layouts=stereo[a${index}]`);
      });

      // Step 2: Concatenate videos and audio (CORRECT INTERLEAVED ORDER)
      // Format: [v0][a0][v1][a1][v2][a2]concat=n=3:v=1:a=1
      const interleavedInputs = allVideoIndices.map(index => `[v${index}][a${index}]`).join('');
      
      filterParts.push(`${interleavedInputs}concat=n=${allVideoIndices.length}:v=1:a=1[concatenated_video][concatenated_audio]`);
      
      // Step 3: Apply overlays if present
      if (this.state.overlays.length > 0) {
        let currentBase = 'concatenated_video';
        
        this.state.overlays.forEach((overlay, i) => {
          const overlayIndex = overlayIndices[i];
          const overlayLabel = `overlay_processed${i}`;
          const nextBase = i === this.state.overlays.length - 1 ? this.state.filterOptions.videoOutputLabel! : `overlay_result${i}`;
          
          // Build sophisticated overlay processing
          let overlayFilter = `[${overlayIndex}:v]`;
          
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
          
          // Scaling
          if (overlay.options.width || overlay.options.height) {
            const width = this.parseSize(overlay.options.width, 'width') || 'iw';
            const height = this.parseSize(overlay.options.height, 'height') || 'ih';
            overlayFilter += `scale=${width}:${height},`;
          }
          
          // Remove trailing comma and add label
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
   * Build overlay position string from options - FROM HEAD~4
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
   * Parse size value to FFmpeg-compatible expression - FROM HEAD~4
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
  // UTILITY METHODS
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

    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  preview(): string {
    return this.buildFilterComplex();
  }
  // ===============================
  // TRANSFORM METHOD - THE KICKER!
  // ===============================
  /**
   * Transform the composition using any VideoToVideoModel
   * @param model The VideoToVideoModel to use for transformation
   * @returns The final composed Video
   */
  async transform(model: VideoToVideoModel): Promise<Video> {
    // Get all videos in the correct order
    const allVideos = this.getAllVideos();
    
    // Build the filter complex
    const filterComplex = this.buildFilterComplex();
    
    // Call model.transform with our videos and filter complex
    const result = await model.transform(allVideos, {
      customFilterComplex: filterComplex,
      outputFormat: 'mp4'
    });
      // Return just the video (clean interface!)
    return result;
  }
}
